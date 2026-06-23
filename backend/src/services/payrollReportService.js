// ============================================================
// Nomina-Ec - Reportes tabulares de nomina
// ============================================================
const ExcelJS = require('exceljs');
const pdfmake = require('pdfmake/build/pdfmake');
pdfmake.vfs = require('pdfmake/build/vfs_fonts');
const { s3Upload } = require('../config/s3');
const db = require('../config/database');
const { toMoneyString } = require('../utils/money');
const { recordAudit } = require('./auditService');

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const PDF_MIME = 'application/pdf';
const CSV_MIME = 'text/csv; charset=utf-8';

const REPORT_TYPES = {
  PAYROLL_SUMMARY: 'summary',
  PAYROLL_DETAIL_TABULAR: 'detail',
  PAYROLL_ACCOUNTING_ENTRIES: 'accounting',
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
    throw new Error(`Reporte de nomina no soportado: ${reportCode}`);
  }

  if (!FORMAT_MIME[normalizedFormat]) {
    throw new Error(`Formato de reporte no soportado: ${format}`);
  }

  if (['PAYROLL_DETAIL_TABULAR', 'PAYROLL_ACCOUNTING_ENTRIES'].includes(normalizedReportCode) && normalizedFormat === 'pdf') {
    throw new Error(`${normalizedReportCode} se exporta como XLSX o CSV para mantener formato tabular auditable`);
  }

  const rows = await getPayrollRows(tenantId, Number(anio), Number(mes), filters);

  if (rows.length === 0) {
    throw new Error('No hay nominas para el periodo y filtros solicitados');
  }

  const tenant = await getTenant(tenantId);
  const buffer = normalizedFormat === 'pdf'
    ? await buildSummaryPdf({ tenant, anio, mes, rows, filters, context })
    : normalizedFormat === 'csv'
      ? buildCsv({ anio, mes, rows, reportCode: normalizedReportCode })
      : await buildWorkbook({ tenant, anio, mes, rows, reportCode: normalizedReportCode, filters, context });

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
    totalFilas: rows.length,
    resumen: summarizeRows(rows),
  };
}

async function getTenant(tenantId) {
  const result = await db.query('SELECT id, ruc, razon_social, nombre_comercial FROM tenants WHERE id = $1', [tenantId]);
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
      COALESCE(ou.cost_center_code, '') AS centro_costo
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

async function buildWorkbook({ tenant, anio, mes, rows, reportCode, filters, context }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Nomina-Ec';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet(reportCode === 'PAYROLL_SUMMARY' ? 'Resumen' : 'Detalle');
  sheet.columns = getWorkbookColumns(reportCode);
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  rowsForReport(rows, reportCode, anio, mes).forEach((row) => {
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
    ['Filtros', JSON.stringify(sanitizeFilters(filters))],
    ['Generado en', new Date().toISOString()],
    ['Correlation ID', context.correlationId || ''],
  ].forEach(([campo, valor]) => meta.addRow({ campo, valor }));
  meta.getRow(1).font = { bold: true };

  return workbook.xlsx.writeBuffer();
}

function buildCsv({ anio, mes, rows, reportCode }) {
  const columns = getWorkbookColumns(reportCode);
  const header = columns.map((column) => column.header);
  const lines = [
    header.map(csvCell).join(','),
    ...rows.map((row) => {
      return rowsForReport([row], reportCode, anio, mes)
        .map((exportRow) => columns.map((column) => csvCell(exportRow[column.key])).join(','))
        .join('\r\n');
    }),
  ];

  return Buffer.from(`\ufeff${lines.join('\r\n')}`, 'utf8');
}

function rowsForReport(rows, reportCode, anio, mes) {
  if (reportCode === 'PAYROLL_ACCOUNTING_ENTRIES') {
    return rows.flatMap((row) => mapAccountingEntries(row, anio, mes));
  }
  return rows.map((row) => mapRowForExport(row, anio, mes));
}

function mapRowForExport(row, anio, mes) {
  const detail = normalizeDetail(row.detalle_calculo);
  return {
    periodo: `${String(mes).padStart(2, '0')}/${anio}`,
    cedula: row.cedula,
    empleado: `${row.apellidos} ${row.nombres}`.trim(),
    departamento: row.departamento,
    cargo: row.cargo,
    cargoCodigo: row.cargo_codigo || '',
    unidad: row.unidad_nombre,
    centroCosto: row.centro_costo,
    estado: row.estado,
    diasTrabajados: Number(row.dias_trabajados || 0),
    sueldoBruto: numberValue(row.sueldo_bruto),
    extras50: numberValue(row.horas_extras_50),
    extras100: numberValue(row.horas_extras_100),
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
    decimoCuarto: numberValue(detail.provisionDecimoCuarto),
    vacaciones: numberValue(detail.provisionVacaciones),
    fondosReserva: numberValue(detail.provisionFondosReserva),
    costoEmpleador: numberValue(detail.costoEmpleador),
    fuenteLegal: detail.fuenteLegal || '',
  };
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
    accountingRow(periodo, 'DEVENGAMIENTO', '210101', 'Nomina por pagar', 0, neto, empleado, row.cedula),
    accountingRow(periodo, 'DEVENGAMIENTO', '210201', 'IESS personal por pagar', 0, aporteIess, empleado, row.cedula),
    accountingRow(periodo, 'DEVENGAMIENTO', '210202', 'Impuesto a la renta por pagar', 0, impuestoRenta, empleado, row.cedula),
    accountingRow(periodo, 'DEVENGAMIENTO', '210203', 'Descuentos y beneficios por cobrar', 0, otrosDescuentos, empleado, row.cedula),
    accountingRow(periodo, 'DEVENGAMIENTO', '210301', 'IESS patronal y provisiones por pagar', 0, costoPatronal, empleado, row.cedula),
    accountingRow(periodo, 'PAGO', '210101', 'Nomina por pagar', neto, 0, empleado, row.cedula),
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

function getWorkbookColumns(reportCode) {
  if (reportCode === 'PAYROLL_ACCOUNTING_ENTRIES') {
    return [
      { header: 'Periodo', key: 'periodo', width: 12 },
      { header: 'Asiento', key: 'asiento', width: 18 },
      { header: 'Cuenta', key: 'cuenta', width: 12 },
      { header: 'Nombre cuenta', key: 'nombreCuenta', width: 32 },
      { header: 'Debe', key: 'debe', width: 14, style: { numFmt: '$#,##0.00' } },
      { header: 'Haber', key: 'haber', width: 14, style: { numFmt: '$#,##0.00' } },
      { header: 'Empleado', key: 'empleado', width: 36 },
      { header: 'Cedula', key: 'cedula', width: 14 },
      { header: 'Referencia', key: 'referencia', width: 28 },
    ];
  }

  const base = [
    { header: 'Periodo', key: 'periodo', width: 12 },
    { header: 'Cedula', key: 'cedula', width: 14 },
    { header: 'Empleado', key: 'empleado', width: 36 },
    { header: 'Departamento', key: 'departamento', width: 20 },
    { header: 'Codigo cargo', key: 'cargoCodigo', width: 16 },
    { header: 'Cargo', key: 'cargo', width: 24 },
    { header: 'Unidad organizativa', key: 'unidad', width: 26 },
    { header: 'Centro costo', key: 'centroCosto', width: 16 },
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
    ...base.slice(0, 10),
    { header: 'Sueldo bruto/proporcional', key: 'sueldoBruto', width: 22, style: { numFmt: '$#,##0.00' } },
    { header: 'Horas extra 50%', key: 'extras50', width: 16, style: { numFmt: '$#,##0.00' } },
    { header: 'Horas extra 100%', key: 'extras100', width: 17, style: { numFmt: '$#,##0.00' } },
    { header: 'Bonos desempeno', key: 'bonosDesempeno', width: 17, style: { numFmt: '$#,##0.00' } },
    base[10],
    { header: 'IESS personal', key: 'aporteIess', width: 16, style: { numFmt: '$#,##0.00' } },
    { header: 'Impuesto renta', key: 'impuestoRenta', width: 16, style: { numFmt: '$#,##0.00' } },
    { header: 'Anticipos', key: 'anticipos', width: 14, style: { numFmt: '$#,##0.00' } },
    { header: 'Prestamos', key: 'prestamos', width: 14, style: { numFmt: '$#,##0.00' } },
    { header: 'Descuento faltas', key: 'descuentoFaltas', width: 17, style: { numFmt: '$#,##0.00' } },
    base[11],
    base[12],
    { header: 'IESS patronal', key: 'aportePatronal', width: 16, style: { numFmt: '$#,##0.00' } },
    { header: 'Provision decimo tercero', key: 'decimoTercero', width: 24, style: { numFmt: '$#,##0.00' } },
    { header: 'Provision decimo cuarto', key: 'decimoCuarto', width: 23, style: { numFmt: '$#,##0.00' } },
    { header: 'Provision vacaciones', key: 'vacaciones', width: 20, style: { numFmt: '$#,##0.00' } },
    { header: 'Fondos reserva', key: 'fondosReserva', width: 17, style: { numFmt: '$#,##0.00' } },
    base[13],
    { header: 'Fuente legal', key: 'fuenteLegal', width: 30 },
  ];
}

async function buildSummaryPdf({ tenant, anio, mes, rows, filters, context }) {
  const summary = summarizeRows(rows);
  const grouped = groupByStructure(rows);

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

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [32, 36, 32, 36],
    content: [
      { text: 'Resumen de nomina', style: 'title' },
      { text: `${tenant.razon_social}${tenant.ruc ? ` - RUC ${tenant.ruc}` : ''}`, style: 'subtitle' },
      { text: `Periodo ${String(mes).padStart(2, '0')}/${anio}`, margin: [0, 0, 0, 10] },
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
        text: `Filtros: ${JSON.stringify(sanitizeFilters(filters))}\nGenerado: ${new Date().toISOString()}\nCorrelation ID: ${context.correlationId || ''}`,
        style: 'audit',
        margin: [0, 16, 0, 0],
      },
    ],
    styles: {
      title: { fontSize: 18, bold: true, margin: [0, 0, 0, 4] },
      subtitle: { fontSize: 10, color: '#475569', margin: [0, 0, 0, 4] },
      section: { fontSize: 11, bold: true, margin: [0, 8, 0, 6] },
      metricLabel: { fontSize: 8, color: '#64748b' },
      metricValue: { fontSize: 12, bold: true },
      audit: { fontSize: 8, color: '#64748b' },
    },
    defaultStyle: { fontSize: 9 },
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

function money(value) {
  return `$${toMoneyString(numberValue(value))}`;
}

function sanitizeFilters(filters = {}) {
  return {
    employeeId: String(filters.employeeId || '').trim(),
    department: String(filters.department || '').trim(),
    position: String(filters.position || '').trim(),
    costCenter: String(filters.costCenter || '').trim(),
  };
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
  getPayrollRows,
  summarizeRows,
  REPORT_TYPES,
  rowsForReport,
};
