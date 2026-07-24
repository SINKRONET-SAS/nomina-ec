// ============================================================
// SKNOMINA - Reportes tabulares de nomina
// ============================================================
const ExcelJS = require('exceljs');
const pdfmake = require('pdfmake/build/pdfmake');
pdfmake.vfs = require('pdfmake/build/vfs_fonts');
const { s3Upload } = require('../config/s3');
const db = require('../config/database');
const { toMoneyString } = require('../utils/money');
const { recordAudit } = require('./auditService');
const {
  buildAccountingEntries,
  buildBenefitsMatrixRows,
  buildEmployeeDetailRows,
  getAccountingMappings,
  linesForPayrollRow,
} = require('./payrollAccountingService');

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const PDF_MIME = 'application/pdf';
const CSV_MIME = 'text/csv; charset=utf-8';

const REPORT_TYPES = {
  PAYROLL_SUMMARY: 'summary',
  PAYROLL_DETAIL_TABULAR: 'detail',
  PAYROLL_ACCOUNTING_ENTRIES: 'accounting',
  PAYROLL_EMPLOYEE_DETAIL: 'employee_detail',
  PAYROLL_NOVELTY_MATRIX: 'novelty_matrix',
  PAYROLL_BENEFITS_MATRIX: 'benefits_matrix',
  PAYROLL_BENEFIT_MOVEMENT_BALANCE: 'benefit_movement_balance',
  PAYROLL_ACCOUNTING_REPORT: 'accounting_report',
};

const BENEFIT_MOVEMENT_TYPES = new Set([
  'anticipo',
  'prestamo',
  'beneficio_recurrente',
  'descuento_recurrente',
]);

const BENEFIT_MOVEMENT_LABELS = {
  anticipo: 'Anticipo',
  prestamo: 'Prestamo',
  beneficio_recurrente: 'Beneficio recurrente',
  descuento_recurrente: 'Descuento recurrente',
};

const BENEFIT_MOVEMENT_NATURE = {
  anticipo: 'deduccion',
  prestamo: 'deduccion',
  beneficio_recurrente: 'ingreso',
  descuento_recurrente: 'deduccion',
};

const FORMAT_MIME = {
  xlsx: XLSX_MIME,
  pdf: PDF_MIME,
  csv: CSV_MIME,
};

async function generarReporteNomina({
  tenantId,
  anio,
  mes,
  reportCode = 'PAYROLL_DETAIL_TABULAR',
  format = 'xlsx',
  filters = {},
  context = {},
}) {
  const normalizedReportCode = String(reportCode || '').trim().toUpperCase();
  const normalizedFormat = String(format || '').trim().toLowerCase();

  if (!REPORT_TYPES[normalizedReportCode]) {
    throw new Error(`Reporte de nómina no soportado: ${reportCode}`);
  }

  if (!FORMAT_MIME[normalizedFormat]) {
    throw new Error(`Formato de reporte no soportado: ${format}`);
  }

  if (normalizedReportCode !== 'PAYROLL_SUMMARY' && normalizedFormat === 'pdf') {
    throw new Error(`${normalizedReportCode} se exporta como XLSX o CSV para mantener formato tabular auditable`);
  }

  const isBenefitMovementBalanceReport = normalizedReportCode === 'PAYROLL_BENEFIT_MOVEMENT_BALANCE';
  const rows = isBenefitMovementBalanceReport
    ? await getBenefitLedgerRows(tenantId, Number(anio), Number(mes), filters)
    : await getPayrollRows(tenantId, Number(anio), Number(mes), filters);

  if (rows.length === 0) {
    const emptySubject = isBenefitMovementBalanceReport ? 'beneficios' : 'nóminas';
    throw new Error(`No hay ${emptySubject} para el periodo y filtros solicitados`);
  }

  const tenant = await getTenant(tenantId);
  const reportOptions = {};
  reportOptions.accountingMode = normalizeAccountingMode(filters.accountingMode);
  if (normalizedReportCode === 'PAYROLL_ACCOUNTING_REPORT') {
    reportOptions.accountingMappings = await getAccountingMappings(tenantId, {
      anio: Number(anio),
      mes: Number(mes),
      userId: context.userId || null,
    });
  }
  const exportRows = normalizedFormat === 'pdf'
    ? []
    : isBenefitMovementBalanceReport
      ? rows
      : rowsForReport(rows, normalizedReportCode, Number(anio), Number(mes), reportOptions);
  const selectedColumns = normalizedFormat === 'pdf'
    ? []
    : selectReportColumns(normalizedReportCode, exportRows, filters.columns);
  const buffer = normalizedFormat === 'pdf'
    ? await buildSummaryPdf({ tenant, anio, mes, rows, filters, context })
    : normalizedFormat === 'csv'
      ? buildCsv({ exportRows, reportCode: normalizedReportCode, columns: selectedColumns })
      : await buildWorkbook({ tenant, anio, mes, exportRows, reportCode: normalizedReportCode, filters, context, columns: selectedColumns });

  const scopeSuffix = buildScopeSuffix(filters);
  const fileName = `${normalizedReportCode}_${anio}${String(mes).padStart(2, '0')}${scopeSuffix}.${normalizedFormat}`;
  const key = `reportes/${tenantId}/nomina/${fileName}`;
  const url = await s3Upload(buffer, key, FORMAT_MIME[normalizedFormat]);

  if (context.correlationId) {
    await recordAudit({
      tenantId,
      userId: context.userId || null,
      correlationId: context.correlationId,
      action: 'generar_reporte_nomina',
      entity: 'nominas',
      newData: {
        anio: Number(anio),
        mes: Number(mes),
        reportCode: normalizedReportCode,
        format: normalizedFormat,
        totalFilas: rows.length,
        filters: sanitizeFilters(filters),
      },
      ipAddress: context.ipAddress || null,
    });
  }

  return {
    url,
    fileName,
    contentType: FORMAT_MIME[normalizedFormat],
    reportCode: normalizedReportCode,
    format: normalizedFormat,
    totalFilas: normalizedFormat === 'pdf' ? rows.length : exportRows.length,
    resumen: isBenefitMovementBalanceReport ? summarizeBenefitLedgerRows(exportRows) : summarizeRows(rows),
  };
}

async function generarConsolidadoAnualNomina({
  tenantId,
  anio,
  reportCode = 'PAYROLL_DETAIL_TABULAR',
  filters = {},
  context = {},
}) {
  const normalizedReportCode = String(reportCode || '').trim().toUpperCase();
  if (!REPORT_TYPES[normalizedReportCode] || normalizedReportCode === 'PAYROLL_SUMMARY') {
    throw new Error(`Reporte anual de nómina no soportado: ${reportCode}`);
  }

  const tenant = await getTenant(tenantId);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SKNOMINA';
  workbook.created = new Date();
  workbook.modified = new Date();
  const reportOptions = {};
  reportOptions.accountingMode = normalizeAccountingMode(filters.accountingMode);
  if (normalizedReportCode === 'PAYROLL_ACCOUNTING_REPORT') {
    reportOptions.accountingMappings = await getAccountingMappings(tenantId, {
      anio: Number(anio),
      mes: null,
      userId: context.userId || null,
    });
  }

  const annualSummary = {
    totalFilas: 0,
    totalIngresos: 0,
    totalDeducciones: 0,
    netoRecibir: 0,
    costoEmpleador: 0,
    saldoInicial: 0,
    movimientoAnual: 0,
    saldoFinal: 0,
  };
  const isBenefitMovementBalanceReport = normalizedReportCode === 'PAYROLL_BENEFIT_MOVEMENT_BALANCE';

  if (isBenefitMovementBalanceReport) {
    const exportRows = await getBenefitLedgerRows(tenantId, Number(anio), null, filters);
    const sheet = workbook.addWorksheet('Ledger beneficios');
    sheet.columns = selectReportColumns(normalizedReportCode, exportRows, filters.columns);
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    exportRows.forEach((row) => sheet.addRow(row));
    sheet.getRow(1).font = { bold: true };
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columns.length },
    };

    Object.assign(annualSummary, summarizeBenefitLedgerRows(exportRows));
  } else {
    for (let mes = 1; mes <= 12; mes += 1) {
      const rows = await getPayrollRows(tenantId, Number(anio), mes, filters);
      if (rows.length === 0) continue;

      const exportRows = rowsForReport(rows, normalizedReportCode, Number(anio), mes, reportOptions);
      const sheet = workbook.addWorksheet(`${String(mes).padStart(2, '0')}-${anio}`);
      sheet.columns = selectReportColumns(normalizedReportCode, exportRows, filters.columns);
      sheet.views = [{ state: 'frozen', ySplit: 1 }];
      exportRows.forEach((row) => sheet.addRow(row));
      sheet.getRow(1).font = { bold: true };
      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: sheet.columns.length },
      };

      const monthSummary = summarizeRows(rows);
      annualSummary.totalFilas += exportRows.length;
      annualSummary.totalIngresos += monthSummary.totalIngresos;
      annualSummary.totalDeducciones += monthSummary.totalDeducciones;
      annualSummary.netoRecibir += monthSummary.netoRecibir;
      annualSummary.costoEmpleador += monthSummary.costoEmpleador;
    }
  }

  if (annualSummary.totalFilas === 0) {
    const emptySubject = isBenefitMovementBalanceReport ? 'beneficios' : 'nóminas';
    throw new Error(`No hay ${emptySubject} para el año ${anio} y filtros solicitados.`);
  }

  const auditSheet = workbook.addWorksheet('Auditoria');
  auditSheet.columns = [
    { header: 'Campo', key: 'campo', width: 30 },
    { header: 'Valor', key: 'valor', width: 90 },
  ];
  [
    ['Empresa', tenant.razon_social],
    ['RUC', tenant.ruc || ''],
    ['Año', String(anio)],
    ['Reporte', normalizedReportCode],
    ['Formato', 'xlsx'],
    ['Filtros', JSON.stringify(sanitizeFilters(filters))],
    ['Total filas', String(annualSummary.totalFilas)],
    ['Total ingresos', toMoneyString(annualSummary.totalIngresos)],
    ['Total deducciones', toMoneyString(annualSummary.totalDeducciones)],
    ['Neto recibir', toMoneyString(annualSummary.netoRecibir)],
    ['Costo empleador', toMoneyString(annualSummary.costoEmpleador)],
    ['Saldo inicial beneficios', toMoneyString(annualSummary.saldoInicial)],
    ['Movimiento anual beneficios', toMoneyString(annualSummary.movimientoAnual)],
    ['Saldo final beneficios', toMoneyString(annualSummary.saldoFinal)],
    ['Generado en', new Date().toISOString()],
    ['Correlation ID', context.correlationId || ''],
  ].forEach(([campo, valor]) => auditSheet.addRow({ campo, valor }));
  auditSheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const scopeSuffix = buildScopeSuffix(filters);
  const fileName = `PAYROLL_ANUAL_${normalizedReportCode}_${anio}${scopeSuffix}.xlsx`;
  const key = `reportes/${tenantId}/nomina/anual/${fileName}`;
  const url = await s3Upload(buffer, key, XLSX_MIME);

  if (context.correlationId) {
    await recordAudit({
      tenantId,
      userId: context.userId || null,
      correlationId: context.correlationId,
      action: 'generar_reporte_nomina_anual',
      entity: 'nominas',
      newData: {
        anio: Number(anio),
        reportCode: normalizedReportCode,
        format: 'xlsx',
        totalFilas: annualSummary.totalFilas,
        filters: sanitizeFilters(filters),
      },
      ipAddress: context.ipAddress || null,
    });
  }

  return {
    url,
    fileName,
    contentType: XLSX_MIME,
    reportCode: normalizedReportCode,
    format: 'xlsx',
    totalFilas: annualSummary.totalFilas,
    resumen: annualSummary,
  };
}

async function getTenant(tenantId) {
  const result = await db.query('SELECT id, ruc, razon_social, nombre_comercial, configuracion FROM tenants WHERE id = $1', [tenantId]);
  if (result.rows.length === 0) {
    throw new Error('Tenant no encontrado');
  }
  return result.rows[0];
}

async function getPayrollRows(tenantId, anio, mes, filters = {}) {
  const where = ['n.tenant_id = $1', 'n.anio = $2', 'n.mes = $3'];
  const params = [tenantId, anio, mes];

  addFilter(where, params, 'n.empleado_id', filters.employeeId);
  addFilter(where, params, 'e.departamento', filters.department);
  addPositionFilter(where, params, filters.position);
  addFilter(where, params, "COALESCE(ou.cost_center_code, e.departamento, '')", filters.costCenter);

  const result = await db.query(`
    SELECT
      n.id,
      n.calculation_batch_id,
      n.empleado_id,
      n.anio,
      n.mes,
      n.dias_trabajados,
      n.sueldo_bruto,
      n.horas_extras_50,
      n.horas_extras_100,
      n.total_ingresos,
      n.aporte_iess_personal,
      n.impuesto_renta,
      n.anticipos,
      n.prestamos,
      n.total_deducciones,
      n.neto_recibir,
      n.estado,
      n.detalle_calculo,
      e.cedula,
      e.nombres,
      e.apellidos,
      COALESCE(jp.name, e.cargo) AS cargo,
      jp.code AS cargo_codigo,
      jp.salary_min AS cargo_salary_min,
      jp.salary_max AS cargo_salary_max,
      e.departamento,
      COALESCE(ou.code, '') AS unidad_codigo,
      COALESCE(ou.name, e.departamento, '') AS unidad_nombre,
      COALESCE(ou.unit_type, CASE WHEN e.departamento <> '' THEN 'departamento' ELSE '' END) AS unidad_tipo,
      COALESCE(ou.cost_center_code, '') AS centro_costo,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'concept_code', pcl.concept_code,
          'calculation_batch_id', pcl.calculation_batch_id,
          'concept_label', pcl.concept_label,
          'category', pcl.category,
          'amount', pcl.amount,
          'source', pcl.source,
          'source_id', pcl.source_id,
          'source_version', pcl.source_version,
          'legal_parameter_key', pcl.legal_parameter_key,
          'cost_center_code', pcl.cost_center_code,
          'organization_unit_code', pcl.organization_unit_code,
          'position_code', pcl.position_code,
          'metadata', pcl.metadata
        ) ORDER BY pcl.category, pcl.concept_code, pcl.source_id)
        FROM payroll_calculation_lines pcl
        WHERE pcl.payroll_id = n.id
      ), '[]'::jsonb) AS calculation_lines
    FROM nominas n
    JOIN empleados e ON e.id = n.empleado_id
    LEFT JOIN job_positions jp
      ON jp.id = e.position_id
     AND jp.tenant_id = e.tenant_id
    LEFT JOIN organization_units ou
      ON ou.tenant_id = e.tenant_id
      AND ou.status = 'activo'
      AND (
        ou.id = jp.organization_unit_id
        OR ou.code = e.unidad_organizativa_codigo
        OR ou.code = e.departamento
        OR ou.name = e.departamento
        OR ou.cost_center_code = e.departamento
      )
    WHERE ${where.join(' AND ')}
    ORDER BY e.departamento, e.apellidos, e.nombres
  `, params);

  return result.rows;
}

async function getBenefitLedgerRows(tenantId, anio, mes = null, filters = {}) {
  const periodEnd = periodNumber(anio, mes || 12);
  const where = [
    'b.tenant_id = $1',
    "b.estado IN ('aprobado', 'descontado', 'anulado')",
    '(b.anio_inicio * 100 + b.mes_inicio) <= $2',
  ];
  const params = [tenantId, periodEnd];

  addFilter(where, params, 'b.empleado_id', filters.employeeId);
  addFilter(where, params, 'e.departamento', filters.department);
  addPositionFilter(where, params, filters.position);
  addFilter(where, params, "COALESCE(ou.cost_center_code, e.departamento, '')", filters.costCenter);

  const result = await db.query(`
    SELECT
      b.id,
      b.empleado_id,
      b.tipo,
      b.descripcion,
      b.monto_total,
      b.saldo_pendiente,
      b.cuota_mensual,
      b.anio_inicio,
      b.mes_inicio,
      b.estado,
      b.metadata,
      e.cedula,
      e.nombres,
      e.apellidos,
      e.departamento,
      COALESCE(jp.name, e.cargo) AS cargo,
      jp.code AS cargo_codigo,
      COALESCE(ou.name, e.departamento, '') AS unidad_nombre,
      COALESCE(ou.cost_center_code, '') AS centro_costo
    FROM beneficios_empleados b
    JOIN empleados e ON e.id = b.empleado_id
    LEFT JOIN job_positions jp
      ON jp.id = e.position_id
     AND jp.tenant_id = e.tenant_id
    LEFT JOIN organization_units ou
      ON ou.tenant_id = e.tenant_id
      AND ou.status = 'activo'
      AND (
        ou.id = jp.organization_unit_id
        OR ou.code = e.unidad_organizativa_codigo
        OR ou.code = e.departamento
        OR ou.name = e.departamento
        OR ou.cost_center_code = e.departamento
      )
    WHERE ${where.join(' AND ')}
    ORDER BY e.departamento, e.apellidos, e.nombres, b.anio_inicio, b.mes_inicio, b.created_at
  `, params);

  return buildBenefitLedgerRows(result.rows, anio, mes);
}

function buildBenefitLedgerRows(rows, anio, mes = null) {
  const periodStart = periodNumber(anio, mes || 1);
  const periodEnd = periodNumber(anio, mes || 12);

  return rows
    .map((row) => mapBenefitLedgerRow(row, anio, mes, periodStart, periodEnd))
    .filter((row) => row.saldoInicial > 0 || row.movimientoAnual > 0 || row.saldoFinal > 0)
    .sort((left, right) => String(left.empleado).localeCompare(String(right.empleado))
      || String(left.tipoBeneficio).localeCompare(String(right.tipoBeneficio))
      || String(left.inicioBeneficio).localeCompare(String(right.inicioBeneficio))
      || String(left.beneficioId).localeCompare(String(right.beneficioId)));
}

function mapBenefitLedgerRow(row, anio, mes, periodStart, periodEnd) {
  const metadata = normalizeDetail(row.metadata);
  const discounts = Array.isArray(metadata.descuentosNomina) ? metadata.descuentosNomina : [];
  const movements = discounts.map(normalizeBenefitDiscount).filter(Boolean);
  const movementInPeriod = movements.filter((movement) => movement.period >= periodStart && movement.period <= periodEnd);
  const movementAfterPeriod = movements.filter((movement) => movement.period > periodEnd);
  const missingPeriodCount = discounts.length - movements.length;
  const movimientoAnual = roundCurrency(movementInPeriod.reduce((sum, movement) => sum + movement.amount, 0));
  const movimientoPosterior = roundCurrency(movementAfterPeriod.reduce((sum, movement) => sum + movement.amount, 0));
  const saldoFinal = roundCurrency(numberValue(row.saldo_pendiente) + movimientoPosterior);
  const saldoInicial = roundCurrency(saldoFinal + movimientoAnual);
  const tipo = normalizeBenefitType(row.tipo);
  const periodos = [...new Set(movementInPeriod.map((movement) => movement.label))].sort();
  const beneficio = String(row.descripcion || '').trim() || BENEFIT_MOVEMENT_LABELS[tipo] || tipo;

  return {
    periodo: mes ? `${String(mes).padStart(2, '0')}/${anio}` : String(anio),
    cedula: row.cedula,
    empleado: `${row.apellidos} ${row.nombres}`.trim(),
    departamento: row.departamento,
    cargo: row.cargo,
    cargoCodigo: row.cargo_codigo || '',
    unidad: row.unidad_nombre,
    centroCosto: row.centro_costo,
    beneficioId: row.id,
    tipoBeneficio: BENEFIT_MOVEMENT_LABELS[tipo] || tipo,
    beneficio,
    estadoBeneficio: row.estado,
    naturaleza: BENEFIT_MOVEMENT_NATURE[tipo] || 'beneficio',
    inicioBeneficio: `${Number(row.anio_inicio)}-${String(Number(row.mes_inicio)).padStart(2, '0')}`,
    montoOriginal: numberValue(row.monto_total),
    cuotaMensual: numberValue(row.cuota_mensual),
    saldoInicial,
    movimientoAnual,
    saldoFinal,
    periodosConMovimiento: periodos.length,
    primerMovimiento: periodos[0] || '',
    ultimoMovimiento: periodos[periodos.length - 1] || '',
    observacion: missingPeriodCount > 0 ? 'Revisar descuentos sin periodo en metadata' : 'OK',
  };
}

function normalizeBenefitDiscount(discount = {}) {
  const period = benefitDiscountPeriod(discount);
  const amount = numberValue(discount.monto ?? discount.amount ?? discount.valor);
  if (!period || amount <= 0) return null;
  return {
    period,
    amount,
    label: formatPeriodNumber(period),
  };
}

function benefitDiscountPeriod(discount = {}) {
  const year = Number(discount.anio);
  const month = Number(discount.mes);
  if (Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12) {
    return periodNumber(year, month);
  }

  const match = String(discount.periodo || '').match(/^(\d{4})-(\d{1,2})$/);
  if (!match) return null;
  return periodNumber(Number(match[1]), Number(match[2]));
}

function normalizeBenefitType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return BENEFIT_MOVEMENT_TYPES.has(normalized) ? normalized : (normalized || 'beneficio');
}

function periodNumber(anio, mes) {
  return Number(anio) * 100 + Number(mes);
}

function formatPeriodNumber(value) {
  const year = Math.floor(Number(value) / 100);
  const month = Number(value) % 100;
  return `${year}-${String(month).padStart(2, '0')}`;
}

function roundCurrency(value) {
  return Math.round(numberValue(value) * 100) / 100;
}

function addFilter(where, params, column, value) {
  const normalized = String(value || '').trim();
  if (!normalized) return;
  params.push(normalized);
  where.push(`${column} = $${params.length}`);
}

function addPositionFilter(where, params, value) {
  const normalized = String(value || '').trim();
  if (!normalized) return;
  params.push(normalized);
  where.push(`(
    jp.id::text = $${params.length}
    OR UPPER(jp.code) = UPPER($${params.length})
    OR UPPER(jp.name) = UPPER($${params.length})
    OR UPPER(e.cargo) = UPPER($${params.length})
  )`);
}

async function buildWorkbook({ tenant, anio, mes, exportRows, reportCode, filters, context, columns }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SKNOMINA';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheetName = reportCode === 'PAYROLL_SUMMARY'
    ? 'Resumen'
    : reportCode === 'PAYROLL_BENEFIT_MOVEMENT_BALANCE'
      ? 'Ledger beneficios'
      : reportCode === 'PAYROLL_NOVELTY_MATRIX'
        ? 'Novedades rol'
      : 'Detalle';
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns || getWorkbookColumns(reportCode, exportRows);
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  exportRows.forEach((row) => {
    sheet.addRow(row);
  });

  sheet.getRow(1).font = { bold: true };
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: sheet.columns.length },
  };

  for (const column of sheet.columns) {
    if (column.style?.numFmt) continue;
    column.width = Math.max(column.width || 12, 12);
  }

  const meta = workbook.addWorksheet('Auditoria');
  meta.columns = [
    { header: 'Campo', key: 'campo', width: 28 },
    { header: 'Valor', key: 'valor', width: 90 },
  ];
  [
    ['Empresa', tenant.razon_social],
    ['RUC', tenant.ruc || ''],
    ['Periodo', `${String(mes).padStart(2, '0')}/${anio}`],
    ['Reporte', reportCode],
    ['Columnas', (columns || getWorkbookColumns(reportCode, exportRows)).map((column) => column.key).join(', ')],
    ['Filtros', JSON.stringify(sanitizeFilters(filters))],
    ['Generado en', new Date().toISOString()],
    ['Correlation ID', context.correlationId || ''],
  ].forEach(([campo, valor]) => meta.addRow({ campo, valor }));
  meta.getRow(1).font = { bold: true };

  return workbook.xlsx.writeBuffer();
}

function buildCsv({ exportRows, reportCode, columns }) {
  const selectedColumns = columns || getWorkbookColumns(reportCode, exportRows);
  const header = selectedColumns.map((column) => column.header);
  const lines = [
    header.map(csvCell).join(','),
    ...exportRows.map((exportRow) => selectedColumns.map((column) => csvCell(exportRow[column.key])).join(',')),
  ];

  return Buffer.from(`\ufeff${lines.join('\r\n')}`, 'utf8');
}

function rowsForReport(rows, reportCode, anio, mes, options = {}) {
  if (reportCode === 'PAYROLL_EMPLOYEE_DETAIL') {
    return buildEmployeeDetailRows(rows, anio, mes);
  }
  if (reportCode === 'PAYROLL_NOVELTY_MATRIX') {
    return buildPayrollNoveltyMatrixRows(rows, anio, mes);
  }
  if (reportCode === 'PAYROLL_BENEFITS_MATRIX') {
    return buildBenefitsMatrixRows(rows, anio, mes);
  }
  if (reportCode === 'PAYROLL_ACCOUNTING_REPORT') {
    const entries = buildAccountingEntries(rows, anio, mes, options.accountingMappings);
    return options.accountingMode === 'consolidated' ? consolidateAccountingEntries(entries) : entries;
  }
  if (reportCode === 'PAYROLL_ACCOUNTING_ENTRIES') {
    const entries = rows.flatMap((row) => mapAccountingEntries(row, anio, mes));
    return options.accountingMode === 'consolidated' ? consolidateAccountingEntries(entries) : entries;
  }
  return rows.map((row) => mapRowForExport(row, anio, mes));
}

function mapRowForExport(row, anio, mes) {
  const detail = normalizeDetail(row.detalle_calculo);
  const extras50Value = numberValue(detail.montoExtras50 ?? row.horas_extras_50);
  const extras100Value = numberValue(detail.montoExtras100 ?? row.horas_extras_100);
  const extrasNocturnasValue = numberValue(detail.montoExtrasNocturnas);
  return {
    periodo: `${String(mes).padStart(2, '0')}/${anio}`,
    cedula: row.cedula,
    empleado: `${row.apellidos} ${row.nombres}`.trim(),
    departamento: row.departamento,
    cargo: row.cargo,
    cargoCodigo: row.cargo_codigo || '',
    unidad: row.unidad_nombre,
    centroCosto: row.centro_costo,
    loteCalculo: row.calculation_batch_id || '',
    estado: row.estado,
    diasTrabajados: Number(row.dias_trabajados || 0),
    sueldoBruto: numberValue(row.sueldo_bruto),
    extras50Horas: numberValue(detail.extras50),
    extras50: extras50Value,
    extras50Valor: extras50Value,
    extras100Horas: numberValue(detail.extras100),
    extras100: extras100Value,
    extras100Valor: extras100Value,
    extrasNocturnasHoras: numberValue(detail.extrasNocturnas),
    extrasNocturnas: extrasNocturnasValue,
    extrasNocturnasValor: extrasNocturnasValue,
    bonosDesempeno: numberValue(detail.bonosDesempeno),
    totalIngresos: numberValue(row.total_ingresos),
    aporteIess: numberValue(row.aporte_iess_personal),
    impuestoRenta: numberValue(row.impuesto_renta),
    anticipos: numberValue(row.anticipos),
    prestamos: numberValue(row.prestamos),
    descuentoFaltas: numberValue(detail.descuentoFaltas),
    totalDeducciones: numberValue(row.total_deducciones),
    netoRecibir: numberValue(row.neto_recibir),
    aportePatronal: numberValue(detail.aportePatronal),
    decimoTercero: numberValue(detail.provisionDecimoTercero),
    decimoTerceroModalidad: detail.decimoTerceroModalidad || 'acumulado',
    decimoTerceroMensualizado: numberValue(detail.decimoTerceroMensualizado),
    decimoCuarto: numberValue(detail.provisionDecimoCuarto),
    decimoCuartoModalidad: detail.decimoCuartoModalidad || 'acumulado',
    decimoCuartoMensualizado: numberValue(detail.decimoCuartoMensualizado),
    vacaciones: numberValue(detail.provisionVacaciones),
    fondosReserva: numberValue(detail.provisionFondosReserva),
    costoEmpleador: numberValue(detail.costoEmpleador),
    fuenteLegal: detail.fuenteLegal || '',
  };
}

function noveltyMatrixKey(code) {
  return `novelty_${String(code || 'sin_codigo').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
}

function isOvertimeConcept(code) {
  const normalized = String(code || '').trim().toLowerCase();
  return normalized === 'horas_extra_50'
    || normalized === 'horas_extra_100'
    || normalized === 'horas_extra_nocturna';
}

function isRoleNoveltyLine(line = {}) {
  const source = String(line.source || '').trim().toLowerCase();
  const metadata = normalizeDetail(line.metadata);
  return source === 'novedad'
    || Boolean(metadata.tipoNovedad)
    || Boolean(metadata.calculationMode && source !== 'legal');
}

function buildPayrollNoveltyMatrixRows(rows, anio, mes) {
  const periodo = `${String(mes).padStart(2, '0')}/${anio}`;

  return rows.map((row) => {
    const exportRow = {
      periodo,
      cedula: row.cedula || '',
      empleado: `${row.apellidos || ''} ${row.nombres || ''}`.trim(),
      departamento: row.departamento || '',
      cargo: row.cargo || '',
      cargoCodigo: row.cargo_codigo || '',
      unidad: row.unidad_nombre || '',
      centroCosto: row.centro_costo || '',
      loteCalculo: row.calculation_batch_id || '',
      cantidadNovedades: 0,
      totalNovedadesIngreso: 0,
      totalNovedadesDeduccion: 0,
      netoNovedades: 0,
      totalIngresosNomina: numberValue(row.total_ingresos),
      totalDeduccionesNomina: numberValue(row.total_deducciones),
      netoRecibir: numberValue(row.neto_recibir),
      _conceptLabels: {},
      _conceptValueTypes: {},
    };

    for (const line of linesForPayrollRow(row).filter(isRoleNoveltyLine)) {
      const amount = roundCurrency(line.amount);
      if (amount <= 0) continue;
      const key = noveltyMatrixKey(line.concept_code);
      const label = line.concept_label || line.concept_code;
      if (isOvertimeConcept(line.concept_code)) {
        const hoursKey = `${key}_horas`;
        exportRow[hoursKey] = roundCurrency(numberValue(exportRow[hoursKey]) + lineHours(line));
        exportRow._conceptLabels[hoursKey] = `${label} (horas)`;
        exportRow._conceptValueTypes[hoursKey] = 'hours';
      }
      exportRow[key] = roundCurrency(numberValue(exportRow[key]) + amount);
      exportRow._conceptLabels[key] = isOvertimeConcept(line.concept_code) ? `${label} (valor)` : label;
      exportRow._conceptValueTypes[key] = 'money';
      exportRow.cantidadNovedades += 1;

      if (line.category === 'ingreso') {
        exportRow.totalNovedadesIngreso = roundCurrency(exportRow.totalNovedadesIngreso + amount);
      }
      if (line.category === 'deduccion') {
        exportRow.totalNovedadesDeduccion = roundCurrency(exportRow.totalNovedadesDeduccion + amount);
      }
    }

    exportRow.netoNovedades = roundCurrency(exportRow.totalNovedadesIngreso - exportRow.totalNovedadesDeduccion);
    return exportRow;
  });
}

function mapAccountingEntries(row, anio, mes) {
  const detail = normalizeDetail(row.detalle_calculo);
  const periodo = String(mes).padStart(2, '0') + '/' + anio;
  const empleado = `${row.apellidos} ${row.nombres}`.trim();
  const totalIngresos = numberValue(row.total_ingresos);
  const neto = numberValue(row.neto_recibir);
  const aporteIess = numberValue(row.aporte_iess_personal);
  const impuestoRenta = numberValue(row.impuesto_renta);
  const otrosDescuentos = numberValue(row.anticipos) + numberValue(row.prestamos) + numberValue(detail.descuentoFaltas);
  const costoPatronal = numberValue(detail.aportePatronal)
    + numberValue(detail.provisionDecimoTercero)
    + numberValue(detail.provisionDecimoCuarto)
    + numberValue(detail.provisionVacaciones)
    + numberValue(detail.provisionFondosReserva);

  return [
    accountingRow(periodo, 'DEVENGAMIENTO', '510101', 'Sueldos y salarios', totalIngresos, 0, empleado, row.cedula),
    accountingRow(periodo, 'DEVENGAMIENTO', '510201', 'Costo patronal y provisiones', costoPatronal, 0, empleado, row.cedula),
    accountingRow(periodo, 'DEVENGAMIENTO', '210101', 'Nómina por pagar', 0, neto, empleado, row.cedula),
    accountingRow(periodo, 'DEVENGAMIENTO', '210201', 'IESS personal por pagar', 0, aporteIess, empleado, row.cedula),
    accountingRow(periodo, 'DEVENGAMIENTO', '210202', 'Impuesto a la renta por pagar', 0, impuestoRenta, empleado, row.cedula),
    accountingRow(periodo, 'DEVENGAMIENTO', '210203', 'Descuentos y beneficios por cobrar', 0, otrosDescuentos, empleado, row.cedula),
    accountingRow(periodo, 'DEVENGAMIENTO', '210301', 'IESS patronal y provisiones por pagar', 0, costoPatronal, empleado, row.cedula),
    accountingRow(periodo, 'PAGO', '210101', 'Nómina por pagar', neto, 0, empleado, row.cedula),
    accountingRow(periodo, 'PAGO', '110201', 'Bancos', 0, neto, empleado, row.cedula),
  ].filter((entry) => entry.debe > 0 || entry.haber > 0);
}

function accountingRow(periodo, asiento, cuenta, nombreCuenta, debe, haber, empleado, cedula) {
  return {
    periodo,
    asiento,
    cuenta,
    nombreCuenta,
    debe: numberValue(debe),
    haber: numberValue(haber),
    empleado,
    cedula,
    referencia: `${asiento}-${cedula}-${periodo.replace('/', '')}`,
  };
}
function csvCell(value) {
  const normalized = value === null || value === undefined ? '' : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
}

function getWorkbookColumns(reportCode, exportRows = []) {
  if (reportCode === 'PAYROLL_ACCOUNTING_ENTRIES') {
    return [
      { header: 'Periodo', key: 'periodo', width: 12 },
      { header: 'Asiento', key: 'asiento', width: 18 },
      { header: 'Cuenta', key: 'cuenta', width: 12 },
      { header: 'Nombre cuenta', key: 'nombreCuenta', width: 32 },
      { header: 'Debe', key: 'debe', width: 14, style: { numFmt: '$#,##0.00' } },
      { header: 'Haber', key: 'haber', width: 14, style: { numFmt: '$#,##0.00' } },
      { header: 'Empleado', key: 'empleado', width: 36 },
      { header: 'Cédula', key: 'cedula', width: 14 },
      { header: 'Referencia', key: 'referencia', width: 28 },
    ];
  }

  if (reportCode === 'PAYROLL_ACCOUNTING_REPORT') {
    return [
      { header: 'Periodo', key: 'periodo', width: 12 },
      { header: 'Asiento', key: 'asiento', width: 18 },
      { header: 'Concepto codigo', key: 'conceptoCodigo', width: 18 },
      { header: 'Concepto', key: 'concepto', width: 28 },
      { header: 'Categoria', key: 'categoria', width: 16 },
      { header: 'Cuenta', key: 'cuenta', width: 14 },
      { header: 'Nombre cuenta', key: 'nombreCuenta', width: 34 },
      { header: 'Debe', key: 'debe', width: 14, style: { numFmt: '$#,##0.00' } },
      { header: 'Haber', key: 'haber', width: 14, style: { numFmt: '$#,##0.00' } },
      { header: 'Empleado', key: 'empleado', width: 36 },
      { header: 'Cédula', key: 'cedula', width: 14 },
      { header: 'Centro costo', key: 'centroCosto', width: 16 },
      { header: 'Lote cálculo', key: 'loteCalculo', width: 38 },
      { header: 'Referencia', key: 'referencia', width: 34 },
    ];
  }

  if (reportCode === 'PAYROLL_EMPLOYEE_DETAIL') {
    return [
      { header: 'Periodo', key: 'periodo', width: 12 },
      { header: 'Cédula', key: 'cedula', width: 14 },
      { header: 'Empleado', key: 'empleado', width: 36 },
      { header: 'Departamento', key: 'departamento', width: 20 },
      { header: 'Codigo cargo', key: 'cargoCodigo', width: 16 },
      { header: 'Cargo', key: 'cargo', width: 24 },
      { header: 'Unidad organizativa', key: 'unidad', width: 26 },
      { header: 'Centro costo', key: 'centroCosto', width: 16 },
      { header: 'Lote cálculo', key: 'loteCalculo', width: 38 },
      { header: 'Concepto codigo', key: 'conceptoCodigo', width: 18 },
      { header: 'Concepto', key: 'concepto', width: 28 },
      { header: 'Categoria', key: 'categoria', width: 16 },
      { header: 'Origen', key: 'origen', width: 16 },
      { header: 'Referencia origen', key: 'referenciaOrigen', width: 22 },
      { header: 'Horas/cantidad', key: 'cantidadHoras', width: 16, style: { numFmt: '0.00' } },
      { header: 'Valor', key: 'valor', width: 14, style: { numFmt: '$#,##0.00' } },
      { header: 'Total ingresos nómina', key: 'totalIngresos', width: 20, style: { numFmt: '$#,##0.00' } },
      { header: 'Total deducciones nómina', key: 'totalDeducciones', width: 24, style: { numFmt: '$#,##0.00' } },
      { header: 'Neto recibir', key: 'netoRecibir', width: 16, style: { numFmt: '$#,##0.00' } },
    ];
  }

  if (reportCode === 'PAYROLL_BENEFIT_MOVEMENT_BALANCE') {
    return [
      { header: 'Periodo', key: 'periodo', width: 12 },
      { header: 'Cedula', key: 'cedula', width: 14 },
      { header: 'Empleado', key: 'empleado', width: 36 },
      { header: 'Departamento', key: 'departamento', width: 20 },
      { header: 'Codigo cargo', key: 'cargoCodigo', width: 16 },
      { header: 'Cargo', key: 'cargo', width: 24 },
      { header: 'Unidad organizativa', key: 'unidad', width: 26 },
      { header: 'Centro costo', key: 'centroCosto', width: 16 },
      { header: 'Beneficio ID', key: 'beneficioId', width: 38 },
      { header: 'Tipo beneficio', key: 'tipoBeneficio', width: 18 },
      { header: 'Beneficio', key: 'beneficio', width: 32 },
      { header: 'Estado beneficio', key: 'estadoBeneficio', width: 18 },
      { header: 'Naturaleza', key: 'naturaleza', width: 14 },
      { header: 'Inicio beneficio', key: 'inicioBeneficio', width: 16 },
      { header: 'Monto original', key: 'montoOriginal', width: 16, style: { numFmt: '$#,##0.00' } },
      { header: 'Cuota mensual', key: 'cuotaMensual', width: 16, style: { numFmt: '$#,##0.00' } },
      { header: 'Saldo inicial', key: 'saldoInicial', width: 16, style: { numFmt: '$#,##0.00' } },
      { header: 'Movimiento anual', key: 'movimientoAnual', width: 18, style: { numFmt: '$#,##0.00' } },
      { header: 'Saldo', key: 'saldoFinal', width: 16, style: { numFmt: '$#,##0.00' } },
      { header: 'Periodos movimiento', key: 'periodosConMovimiento', width: 20 },
      { header: 'Primer movimiento', key: 'primerMovimiento', width: 18 },
      { header: 'Ultimo movimiento', key: 'ultimoMovimiento', width: 18 },
      { header: 'Observacion', key: 'observacion', width: 36 },
    ];
  }

  if (reportCode === 'PAYROLL_NOVELTY_MATRIX') {
    return [
      { header: 'Periodo', key: 'periodo', width: 12 },
      { header: 'Cedula', key: 'cedula', width: 14 },
      { header: 'Empleado', key: 'empleado', width: 36 },
      { header: 'Departamento', key: 'departamento', width: 20 },
      { header: 'Codigo cargo', key: 'cargoCodigo', width: 16 },
      { header: 'Cargo', key: 'cargo', width: 24 },
      { header: 'Unidad organizativa', key: 'unidad', width: 26 },
      { header: 'Centro costo', key: 'centroCosto', width: 16 },
      { header: 'Lote calculo', key: 'loteCalculo', width: 38 },
      ...getMatrixConceptColumns(exportRows),
      { header: 'Cantidad novedades', key: 'cantidadNovedades', width: 18 },
      { header: 'Total novedades ingreso', key: 'totalNovedadesIngreso', width: 24, style: { numFmt: '$#,##0.00' } },
      { header: 'Total novedades deduccion', key: 'totalNovedadesDeduccion', width: 26, style: { numFmt: '$#,##0.00' } },
      { header: 'Neto novedades', key: 'netoNovedades', width: 18, style: { numFmt: '$#,##0.00' } },
      { header: 'Total ingresos nomina', key: 'totalIngresosNomina', width: 22, style: { numFmt: '$#,##0.00' } },
      { header: 'Total deducciones nomina', key: 'totalDeduccionesNomina', width: 26, style: { numFmt: '$#,##0.00' } },
      { header: 'Neto recibir', key: 'netoRecibir', width: 16, style: { numFmt: '$#,##0.00' } },
    ];
  }

  if (reportCode === 'PAYROLL_BENEFITS_MATRIX') {
    return [
      { header: 'Periodo', key: 'periodo', width: 12 },
      { header: 'Cédula', key: 'cedula', width: 14 },
      { header: 'Empleado', key: 'empleado', width: 36 },
      { header: 'Departamento', key: 'departamento', width: 20 },
      { header: 'Cargo', key: 'cargo', width: 24 },
      { header: 'Centro costo', key: 'centroCosto', width: 16 },
      { header: 'Lote cálculo', key: 'loteCalculo', width: 38 },
      ...getMatrixConceptColumns(exportRows),
      { header: 'Total ingresos nómina', key: 'totalIngresosNomina', width: 20, style: { numFmt: '$#,##0.00' } },
      { header: 'Total deducciones nómina', key: 'totalDeduccionesNomina', width: 24, style: { numFmt: '$#,##0.00' } },
      { header: 'Total provisiones', key: 'totalProvisiones', width: 18, style: { numFmt: '$#,##0.00' } },
      { header: 'Costo empleador', key: 'costoEmpleador', width: 18, style: { numFmt: '$#,##0.00' } },
      { header: 'Neto recibir', key: 'netoRecibir', width: 16, style: { numFmt: '$#,##0.00' } },
      { header: 'Conciliacion', key: 'conciliacion', width: 14 },
    ];
  }

  const base = [
    { header: 'Periodo', key: 'periodo', width: 12 },
    { header: 'Cédula', key: 'cedula', width: 14 },
    { header: 'Empleado', key: 'empleado', width: 36 },
    { header: 'Departamento', key: 'departamento', width: 20 },
    { header: 'Codigo cargo', key: 'cargoCodigo', width: 16 },
    { header: 'Cargo', key: 'cargo', width: 24 },
    { header: 'Unidad organizativa', key: 'unidad', width: 26 },
    { header: 'Centro costo', key: 'centroCosto', width: 16 },
    { header: 'Lote cálculo', key: 'loteCalculo', width: 38 },
    { header: 'Estado', key: 'estado', width: 12 },
    { header: 'Dias trabajados', key: 'diasTrabajados', width: 16 },
    { header: 'Total ingresos', key: 'totalIngresos', width: 16, style: { numFmt: '$#,##0.00' } },
    { header: 'Total deducciones', key: 'totalDeducciones', width: 18, style: { numFmt: '$#,##0.00' } },
    { header: 'Neto recibir', key: 'netoRecibir', width: 16, style: { numFmt: '$#,##0.00' } },
    { header: 'Costo empleador', key: 'costoEmpleador', width: 18, style: { numFmt: '$#,##0.00' } },
  ];

  if (reportCode === 'PAYROLL_SUMMARY') {
    return base;
  }

  return [
    ...base.slice(0, 11),
    { header: 'Sueldo bruto/proporcional', key: 'sueldoBruto', width: 22, style: { numFmt: '$#,##0.00' } },
    { header: 'Horas extra 50% (h)', key: 'extras50Horas', width: 18, style: { numFmt: '0.00' } },
    { header: 'Valor horas extra 50%', key: 'extras50', width: 22, style: { numFmt: '$#,##0.00' } },
    { header: 'Horas extra 100% (h)', key: 'extras100Horas', width: 19, style: { numFmt: '0.00' } },
    { header: 'Valor horas extra 100%', key: 'extras100', width: 23, style: { numFmt: '$#,##0.00' } },
    { header: 'Horas extra nocturna (h)', key: 'extrasNocturnasHoras', width: 23, style: { numFmt: '0.00' } },
    { header: 'Valor horas extra nocturna', key: 'extrasNocturnas', width: 27, style: { numFmt: '$#,##0.00' } },
    { header: 'Bonos desempeno', key: 'bonosDesempeno', width: 17, style: { numFmt: '$#,##0.00' } },
    base[11],
    { header: 'IESS personal', key: 'aporteIess', width: 16, style: { numFmt: '$#,##0.00' } },
    { header: 'Impuesto renta', key: 'impuestoRenta', width: 16, style: { numFmt: '$#,##0.00' } },
    { header: 'Anticipos', key: 'anticipos', width: 14, style: { numFmt: '$#,##0.00' } },
    { header: 'Prestamos', key: 'prestamos', width: 14, style: { numFmt: '$#,##0.00' } },
    { header: 'Descuento faltas', key: 'descuentoFaltas', width: 17, style: { numFmt: '$#,##0.00' } },
    base[12],
    base[13],
    { header: 'IESS patronal', key: 'aportePatronal', width: 16, style: { numFmt: '$#,##0.00' } },
    { header: 'Provision decimo tercero', key: 'decimoTercero', width: 24, style: { numFmt: '$#,##0.00' } },
    { header: 'Modalidad 13ro', key: 'decimoTerceroModalidad', width: 16 },
    { header: '13ro mensualizado', key: 'decimoTerceroMensualizado', width: 20, style: { numFmt: '$#,##0.00' } },
    { header: 'Provision decimo cuarto', key: 'decimoCuarto', width: 23, style: { numFmt: '$#,##0.00' } },
    { header: 'Modalidad 14to', key: 'decimoCuartoModalidad', width: 16 },
    { header: '14to mensualizado', key: 'decimoCuartoMensualizado', width: 20, style: { numFmt: '$#,##0.00' } },
    { header: 'Provision vacaciones', key: 'vacaciones', width: 20, style: { numFmt: '$#,##0.00' } },
    { header: 'Fondos reserva', key: 'fondosReserva', width: 17, style: { numFmt: '$#,##0.00' } },
    base[14],
    { header: 'Fuente legal', key: 'fuenteLegal', width: 30 },
  ];
}

function getMatrixConceptColumns(exportRows = []) {
  const labels = new Map();
  const valueTypes = new Map();
  for (const row of exportRows) {
    for (const [key, label] of Object.entries(row._conceptLabels || {})) {
      if (!labels.has(key)) {
        labels.set(key, label);
      }
      if (!valueTypes.has(key)) {
        valueTypes.set(key, row._conceptValueTypes?.[key] || 'money');
      }
    }
  }

  return [...labels.entries()].map(([key, label]) => {
    const valueType = valueTypes.get(key) || 'money';
    return {
      header: label,
      key,
      width: Math.max(14, Math.min(30, String(label).length + 2)),
      style: { numFmt: valueType === 'hours' ? '0.00' : '$#,##0.00' },
    };
  });
}

async function buildSummaryPdf({ tenant, anio, mes, rows, filters, context }) {
  const summary = summarizeRows(rows);
  const grouped = groupByStructure(rows);
  const config = typeof tenant.configuracion === 'object' ? tenant.configuracion : {};
  const logoBase64 = config.logoBase64 || null;

  const body = [
    ['Estructura', 'Empleados', 'Ingresos', 'Deducciones', 'Neto', 'Costo empleador'],
    ...grouped.map((row) => [
      row.label,
      String(row.total),
      money(row.totalIngresos),
      money(row.totalDeducciones),
      money(row.netoRecibir),
      money(row.costoEmpleador),
    ]),
  ];

  const headerContent = [];
  if (logoBase64) {
    headerContent.push({
      columns: [
        { image: logoBase64, width: 120, margin: [0, 0, 0, 6] },
        {
          stack: [
            { text: 'Resumen de nomina', style: 'title' },
            { text: `${tenant.razon_social}${tenant.ruc ? ` - RUC ${tenant.ruc}` : ''}`, style: 'subtitle' },
            { text: `Periodo ${String(mes).padStart(2, '0')}/${anio}`, margin: [0, 0, 0, 4] },
          ],
          alignment: 'left',
          width: '*',
        },
      ],
      columnGap: 12,
      margin: [0, 0, 0, 10],
    });
  } else {
    headerContent.push(
      { text: 'Resumen de nomina', style: 'title' },
      { text: `${tenant.razon_social}${tenant.ruc ? ` - RUC ${tenant.ruc}` : ''}`, style: 'subtitle' },
      { text: `Periodo ${String(mes).padStart(2, '0')}/${anio}`, margin: [0, 0, 0, 10] },
    );
  }

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [32, 36, 32, 36],
    content: [
      ...headerContent,
      {
        columns: [
          metric('Empleados', summary.totalEmpleados),
          metric('Total ingresos', money(summary.totalIngresos)),
          metric('Total deducciones', money(summary.totalDeducciones)),
          metric('Neto a pagar', money(summary.netoRecibir)),
          metric('Fondos reserva', money(summary.fondosReserva)),
        ],
        columnGap: 8,
        margin: [0, 0, 0, 14],
      },
      { text: 'Agrupado por estructura organizativa', style: 'section' },
      { table: { headerRows: 1, widths: ['*', 54, 70, 76, 70, 76], body }, layout: 'lightHorizontalLines' },
      {
        text: `Documento generado con SKNOMINA. Fecha: ${new Date().toISOString()}.`,
        style: 'audit',
        margin: [0, 16, 0, 0],
      },
    ],
    styles: {
      title: { fontSize: 18, bold: true, margin: [0, 0, 0, 4] },
      subtitle: { fontSize: 10, color: '#475569', margin: [0, 0, 0, 4] },
      section: { fontSize: 11, bold: true, margin: [0, 8, 0, 6] },
      metricLabel: { fontSize: 9, color: '#64748b' },
      metricValue: { fontSize: 13, bold: true },
      audit: { fontSize: 9, color: '#64748b' },
    },
    defaultStyle: { fontSize: 10 },
  };

  return new Promise((resolve) => {
    pdfmake.createPdf(docDefinition).getBuffer((buffer) => resolve(buffer));
  });
}

function metric(label, value) {
  return {
    stack: [
      { text: label, style: 'metricLabel' },
      { text: String(value), style: 'metricValue' },
    ],
    margin: [0, 0, 0, 0],
  };
}

function groupByStructure(rows) {
  const groups = new Map();

  for (const row of rows) {
    const label = row.unidad_nombre || row.departamento || row.cargo || 'Sin estructura';
    if (!groups.has(label)) {
      groups.set(label, { label, total: 0, totalIngresos: 0, totalDeducciones: 0, netoRecibir: 0, costoEmpleador: 0 });
    }
    const group = groups.get(label);
    const detail = normalizeDetail(row.detalle_calculo);
    group.total += 1;
    group.totalIngresos += numberValue(row.total_ingresos);
    group.totalDeducciones += numberValue(row.total_deducciones);
    group.netoRecibir += numberValue(row.neto_recibir);
    group.costoEmpleador += numberValue(detail.costoEmpleador);
  }

  return [...groups.values()];
}

function summarizeRows(rows) {
  return rows.reduce((summary, row) => {
    const detail = normalizeDetail(row.detalle_calculo);
    summary.totalEmpleados += 1;
    summary.totalIngresos += numberValue(row.total_ingresos);
    summary.totalDeducciones += numberValue(row.total_deducciones);
    summary.netoRecibir += numberValue(row.neto_recibir);
    summary.costoEmpleador += numberValue(detail.costoEmpleador);
    summary.fondosReserva += numberValue(detail.provisionFondosReserva);
    return summary;
  }, {
    totalEmpleados: 0,
    totalIngresos: 0,
    totalDeducciones: 0,
    netoRecibir: 0,
    costoEmpleador: 0,
    fondosReserva: 0,
  });
}

function summarizeBenefitLedgerRows(rows) {
  const employeeKeys = new Set();
  const summary = rows.reduce((acc, row) => {
    acc.totalFilas += 1;
    acc.totalBeneficios += 1;
    acc.saldoInicial += numberValue(row.saldoInicial);
    acc.movimientoAnual += numberValue(row.movimientoAnual);
    acc.saldoFinal += numberValue(row.saldoFinal);
    acc.totalDeducciones += numberValue(row.movimientoAnual);
    employeeKeys.add(row.cedula || row.empleado);
    return acc;
  }, {
    totalFilas: 0,
    totalBeneficios: 0,
    totalEmpleados: 0,
    totalIngresos: 0,
    totalDeducciones: 0,
    netoRecibir: 0,
    costoEmpleador: 0,
    saldoInicial: 0,
    movimientoAnual: 0,
    saldoFinal: 0,
  });
  summary.totalEmpleados = employeeKeys.size;
  summary.saldoInicial = roundCurrency(summary.saldoInicial);
  summary.movimientoAnual = roundCurrency(summary.movimientoAnual);
  summary.saldoFinal = roundCurrency(summary.saldoFinal);
  summary.totalDeducciones = roundCurrency(summary.totalDeducciones);
  return summary;
}

function normalizeDetail(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (err) {
    return {};
  }
}

function numberValue(value) {
  const parsed = Number.parseFloat(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function lineHours(line = {}) {
  const metadata = normalizeDetail(line.metadata);
  const directHours = numberValue(line.hours ?? line.horas ?? metadata.hours ?? metadata.horas);
  if (directHours > 0) return directHours;
  const minutes = numberValue(line.minutes ?? line.minutos ?? metadata.minutes ?? metadata.minutos);
  return minutes > 0 ? minutes / 60 : 0;
}

function money(value) {
  return `$${toMoneyString(numberValue(value))}`;
}

function sanitizeFilters(filters = {}) {
  return {
    employeeId: String(filters.employeeId || '').trim(),
    department: String(filters.department || '').trim(),
    position: String(filters.position || '').trim(),
    costCenter: String(filters.costCenter || '').trim(),
    columns: Array.isArray(filters.columns)
      ? filters.columns.map((column) => String(column || '').trim()).filter(Boolean).slice(0, 80)
      : [],
    accountingMode: normalizeAccountingMode(filters.accountingMode),
  };
}

function normalizeAccountingMode(value) {
  return String(value || 'detail').trim().toLowerCase() === 'consolidated'
    ? 'consolidated'
    : 'detail';
}

function consolidateAccountingEntries(entries = []) {
  const groups = new Map();
  for (const entry of entries) {
    const key = `${entry.periodo || ''}|${entry.cuenta || ''}`;
    const current = groups.get(key) || {
      ...entry,
      asiento: 'CONSOLIDADO',
      conceptoCodigo: 'CONSOLIDADO',
      concepto: 'Consolidado por cuenta',
      categoria: 'consolidado',
      debe: 0,
      haber: 0,
      empleado: '',
      cedula: '',
      centroCosto: '',
      loteCalculo: '',
      referencia: `CONSOLIDADO-${entry.periodo || 'periodo'}-${entry.cuenta || 'cuenta'}`,
    };
    current.debe = roundCurrency(current.debe + numberValue(entry.debe));
    current.haber = roundCurrency(current.haber + numberValue(entry.haber));
    groups.set(key, current);
  }
  return [...groups.values()];
}

function selectReportColumns(reportCode, exportRows = [], requestedColumns = []) {
  const availableColumns = getWorkbookColumns(reportCode, exportRows);
  if (!Array.isArray(requestedColumns)) return availableColumns;
  if (requestedColumns.length === 0) {
    const error = new Error('Selecciona al menos una columna para generar el reporte.');
    error.code = 'REPORTE_COLUMNAS_REQUERIDAS';
    error.statusCode = 400;
    throw error;
  }

  const normalizedReportCode = String(reportCode || '').trim().toUpperCase();
  const catalogColumns = getWorkbookColumns(normalizedReportCode, []);
  const requestedSet = new Set(requestedColumns.map((column) => String(column || '').trim()));
  const selectsEveryStaticColumn = catalogColumns.every((column) => requestedSet.has(column.key));
  if ((normalizedReportCode === 'PAYROLL_NOVELTY_MATRIX' || normalizedReportCode === 'PAYROLL_BENEFITS_MATRIX')
    && selectsEveryStaticColumn) {
    return availableColumns;
  }

  const allowed = new Set(availableColumns.map((column) => column.key));
  const selectedKeys = [...new Set(requestedColumns.map((column) => String(column || '').trim()))]
    .filter((column) => allowed.has(column));
  if (selectedKeys.length === 0) {
    const error = new Error('Las columnas solicitadas no pertenecen al reporte seleccionado.');
    error.code = 'REPORTE_COLUMNAS_INVALIDAS';
    error.statusCode = 400;
    throw error;
  }

  const selectedSet = new Set(selectedKeys);
  return availableColumns.filter((column) => selectedSet.has(column.key));
}

function getReportColumnCatalog(reportCode) {
  const normalizedReportCode = String(reportCode || 'PAYROLL_DETAIL_TABULAR').trim().toUpperCase();
  if (!REPORT_TYPES[normalizedReportCode]) {
    const error = new Error(`Reporte de nómina no soportado: ${reportCode}`);
    error.code = 'REPORTE_NO_SOPORTADO';
    error.statusCode = 400;
    throw error;
  }

  return getWorkbookColumns(normalizedReportCode, []).map((column) => ({
    key: column.key,
    label: column.header,
  }));
}

function buildScopeSuffix(filters = {}) {
  const sanitized = sanitizeFilters(filters);
  const parts = Object.entries(sanitized)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}-${String(value).replace(/[^a-zA-Z0-9_-]/g, '_')}`);

  return parts.length > 0 ? `_${parts.join('_')}` : '';
}

module.exports = {
  generarReporteNomina,
  generarConsolidadoAnualNomina,
  getPayrollRows,
  summarizeRows,
  REPORT_TYPES,
  getReportColumnCatalog,
  consolidateAccountingEntries,
  rowsForReport,
  buildBenefitLedgerRows,
  buildPayrollNoveltyMatrixRows,
};
