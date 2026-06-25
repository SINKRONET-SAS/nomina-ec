// ============================================================
// CRN26 - Esquema contable y lineas normalizadas de nomina
// ============================================================
const db = require('../config/database');
const AppError = require('../utils/AppError');
const { roundMoney } = require('../utils/money');

const PAYROLL_CONCEPTS = [
  {
    code: 'sueldo_base',
    label: 'Sueldo proporcional',
    category: 'ingreso',
    entryType: 'DEVENGAMIENTO',
    debitAccountCode: '510101',
    debitAccountName: 'Sueldos y salarios',
    creditAccountCode: '210101',
    creditAccountName: 'Nomina por pagar',
  },
  {
    code: 'horas_extra_50',
    label: 'Horas extra 50%',
    category: 'ingreso',
    entryType: 'DEVENGAMIENTO',
    debitAccountCode: '510102',
    debitAccountName: 'Horas suplementarias',
    creditAccountCode: '210101',
    creditAccountName: 'Nomina por pagar',
  },
  {
    code: 'horas_extra_100',
    label: 'Horas extra 100%',
    category: 'ingreso',
    entryType: 'DEVENGAMIENTO',
    debitAccountCode: '510103',
    debitAccountName: 'Horas extraordinarias',
    creditAccountCode: '210101',
    creditAccountName: 'Nomina por pagar',
  },
  {
    code: 'bono_desempeno',
    label: 'Bono de desempeno',
    category: 'ingreso',
    entryType: 'DEVENGAMIENTO',
    debitAccountCode: '510104',
    debitAccountName: 'Bonos de nomina',
    creditAccountCode: '210101',
    creditAccountName: 'Nomina por pagar',
  },
  {
    code: 'comision',
    label: 'Comisiones',
    category: 'ingreso',
    entryType: 'DEVENGAMIENTO',
    debitAccountCode: '510105',
    debitAccountName: 'Comisiones de nomina',
    creditAccountCode: '210101',
    creditAccountName: 'Nomina por pagar',
  },
  {
    code: 'fondo_reserva_pagado',
    label: 'Fondo de reserva pagado',
    category: 'ingreso',
    entryType: 'DEVENGAMIENTO',
    debitAccountCode: '510106',
    debitAccountName: 'Fondos de reserva pagados',
    creditAccountCode: '210101',
    creditAccountName: 'Nomina por pagar',
  },
  {
    code: 'aporte_iess_personal',
    label: 'Aporte IESS personal',
    category: 'deduccion',
    entryType: 'DEVENGAMIENTO',
    debitAccountCode: '210101',
    debitAccountName: 'Nomina por pagar',
    creditAccountCode: '210201',
    creditAccountName: 'IESS personal por pagar',
  },
  {
    code: 'impuesto_renta',
    label: 'Impuesto a la renta',
    category: 'deduccion',
    entryType: 'DEVENGAMIENTO',
    debitAccountCode: '210101',
    debitAccountName: 'Nomina por pagar',
    creditAccountCode: '210202',
    creditAccountName: 'Impuesto a la renta por pagar',
  },
  {
    code: 'descuento_faltas',
    label: 'Descuento por faltas',
    category: 'deduccion',
    entryType: 'DEVENGAMIENTO',
    debitAccountCode: '210101',
    debitAccountName: 'Nomina por pagar',
    creditAccountCode: '510107',
    creditAccountName: 'Recupero por faltas',
  },
  {
    code: 'anticipo',
    label: 'Anticipo descontado',
    category: 'deduccion',
    entryType: 'DEVENGAMIENTO',
    debitAccountCode: '210101',
    debitAccountName: 'Nomina por pagar',
    creditAccountCode: '112101',
    creditAccountName: 'Anticipos a empleados por cobrar',
  },
  {
    code: 'prestamo',
    label: 'Prestamo descontado',
    category: 'deduccion',
    entryType: 'DEVENGAMIENTO',
    debitAccountCode: '210101',
    debitAccountName: 'Nomina por pagar',
    creditAccountCode: '112102',
    creditAccountName: 'Prestamos a empleados por cobrar',
  },
  {
    code: 'aporte_iess_patronal',
    label: 'Aporte IESS patronal',
    category: 'costo_empleador',
    entryType: 'DEVENGAMIENTO',
    debitAccountCode: '510201',
    debitAccountName: 'Aporte patronal IESS',
    creditAccountCode: '210301',
    creditAccountName: 'IESS patronal por pagar',
  },
  {
    code: 'decimo_tercero',
    label: 'Provision decimo tercero',
    category: 'provision',
    entryType: 'PROVISION',
    debitAccountCode: '510202',
    debitAccountName: 'Gasto decimo tercero',
    creditAccountCode: '210302',
    creditAccountName: 'Provision decimo tercero por pagar',
  },
  {
    code: 'decimo_cuarto',
    label: 'Provision decimo cuarto',
    category: 'provision',
    entryType: 'PROVISION',
    debitAccountCode: '510203',
    debitAccountName: 'Gasto decimo cuarto',
    creditAccountCode: '210303',
    creditAccountName: 'Provision decimo cuarto por pagar',
  },
  {
    code: 'vacaciones',
    label: 'Provision vacaciones',
    category: 'provision',
    entryType: 'PROVISION',
    debitAccountCode: '510204',
    debitAccountName: 'Gasto vacaciones',
    creditAccountCode: '210304',
    creditAccountName: 'Provision vacaciones por pagar',
  },
  {
    code: 'fondo_reserva_iess',
    label: 'Fondo de reserva depositado IESS',
    category: 'provision',
    entryType: 'PROVISION',
    debitAccountCode: '510205',
    debitAccountName: 'Gasto fondos de reserva',
    creditAccountCode: '210305',
    creditAccountName: 'Fondos de reserva por pagar',
  },
  {
    code: 'neto_banco',
    label: 'Pago neto por banco',
    category: 'pago',
    entryType: 'PAGO',
    debitAccountCode: '210101',
    debitAccountName: 'Nomina por pagar',
    creditAccountCode: '110201',
    creditAccountName: 'Bancos',
  },
];

const DEFAULT_ACCOUNTING_MAPPINGS = PAYROLL_CONCEPTS.map((concept) => ({
  concept_code: concept.code,
  concept_label: concept.label,
  category: concept.category,
  entry_type: concept.entryType,
  debit_account_code: concept.debitAccountCode,
  debit_account_name: concept.debitAccountName,
  credit_account_code: concept.creditAccountCode,
  credit_account_name: concept.creditAccountName,
  cost_center_mode: 'employee',
  fixed_cost_center_code: '',
  requires_employee_breakdown: true,
  status: 'activo',
  valid_from: '2026-01-01',
  valid_to: null,
  metadata: {
    source: 'CRN26-default-seed',
    editableByTenant: true,
  },
}));

const DEFAULT_MAPPING_BY_CODE = new Map(DEFAULT_ACCOUNTING_MAPPINGS.map((mapping) => [mapping.concept_code, mapping]));

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

function moneyValue(value) {
  return roundMoney(numberValue(value));
}

function employeeFullName(row = {}) {
  return `${row.apellidos || ''} ${row.nombres || ''}`.trim();
}

function sourceId(value) {
  if (value === null || typeof value === 'undefined') return '';
  return String(value);
}

function addLine(lines, {
  code,
  label,
  category,
  amount,
  source = 'calculo_nomina',
  sourceId: rawSourceId = '',
  legalParameterKey = '',
  metadata = {},
}) {
  const normalizedAmount = moneyValue(amount);
  if (normalizedAmount <= 0) return;

  lines.push({
    concept_code: code,
    concept_label: label,
    category,
    amount: normalizedAmount,
    source,
    source_id: sourceId(rawSourceId),
    source_version: 'CRN26',
    legal_parameter_key: legalParameterKey || '',
    metadata,
  });
}

function buildCalculationLinesFromDetail(detailValue = {}, payrollRow = {}) {
  const detail = normalizeDetail(detailValue);
  const lines = [];

  addLine(lines, {
    code: 'sueldo_base',
    label: 'Sueldo proporcional',
    category: 'ingreso',
    amount: detail.sueldoProporcional ?? payrollRow.sueldo_bruto,
    sourceId: 'sueldo_proporcional',
  });
  addLine(lines, {
    code: 'horas_extra_50',
    label: 'Horas extra 50%',
    category: 'ingreso',
    amount: detail.montoExtras50 ?? payrollRow.horas_extras_50,
    source: 'novedad',
    sourceId: 'hora_extra_50',
    metadata: { horas: numberValue(detail.extras50) },
  });
  addLine(lines, {
    code: 'horas_extra_100',
    label: 'Horas extra 100%',
    category: 'ingreso',
    amount: detail.montoExtras100 ?? payrollRow.horas_extras_100,
    source: 'novedad',
    sourceId: 'hora_extra_100',
    metadata: { horas: numberValue(detail.extras100) },
  });
  addLine(lines, {
    code: 'bono_desempeno',
    label: 'Bono de desempeno',
    category: 'ingreso',
    amount: detail.bonosDesempeno,
    source: 'novedad',
    sourceId: 'bono_desempeno',
  });
  addLine(lines, {
    code: 'comision',
    label: 'Comisiones',
    category: 'ingreso',
    amount: detail.comisiones,
    source: 'novedad',
    sourceId: 'comision',
  });
  addLine(lines, {
    code: 'fondo_reserva_pagado',
    label: 'Fondo de reserva pagado',
    category: 'ingreso',
    amount: detail.fondoReservaPagadoEmpleado,
    sourceId: 'fondo_reserva_pagado',
    metadata: { modalidad: detail.fondoReservaModalidad || '' },
  });

  addLine(lines, {
    code: 'aporte_iess_personal',
    label: 'Aporte IESS personal',
    category: 'deduccion',
    amount: detail.aporteIess ?? payrollRow.aporte_iess_personal,
    source: 'legal',
    sourceId: 'aporte_iess_personal',
    legalParameterKey: 'aporte_personal_iess',
  });
  addLine(lines, {
    code: 'impuesto_renta',
    label: 'Impuesto a la renta',
    category: 'deduccion',
    amount: detail.impuestoRenta ?? payrollRow.impuesto_renta,
    source: 'legal',
    sourceId: 'impuesto_renta',
    legalParameterKey: 'income_tax_table',
  });
  addLine(lines, {
    code: 'descuento_faltas',
    label: 'Descuento por faltas',
    category: 'deduccion',
    amount: detail.descuentoFaltas,
    source: 'novedad',
    sourceId: 'falta',
  });

  if (Array.isArray(detail.beneficiosDescontados) && detail.beneficiosDescontados.length > 0) {
    for (const item of detail.beneficiosDescontados) {
      const tipo = String(item.tipo || '').trim().toLowerCase() === 'prestamo' ? 'prestamo' : 'anticipo';
      addLine(lines, {
        code: tipo,
        label: tipo === 'prestamo' ? 'Prestamo descontado' : 'Anticipo descontado',
        category: 'deduccion',
        amount: item.amount,
        source: 'beneficio',
        sourceId: item.id || item.descripcion || tipo,
        metadata: {
          descripcion: item.descripcion || '',
          beneficioId: item.id || '',
        },
      });
    }
  } else {
    addLine(lines, {
      code: 'anticipo',
      label: 'Anticipo descontado',
      category: 'deduccion',
      amount: detail.anticipos ?? payrollRow.anticipos,
      source: 'beneficio',
      sourceId: 'anticipo_total',
    });
    addLine(lines, {
      code: 'prestamo',
      label: 'Prestamo descontado',
      category: 'deduccion',
      amount: detail.prestamos ?? payrollRow.prestamos,
      source: 'beneficio',
      sourceId: 'prestamo_total',
    });
  }

  addLine(lines, {
    code: 'aporte_iess_patronal',
    label: 'Aporte IESS patronal',
    category: 'costo_empleador',
    amount: detail.aportePatronal,
    source: 'legal',
    sourceId: 'aporte_iess_patronal',
    legalParameterKey: 'aporte_patronal_iess',
  });
  addLine(lines, {
    code: 'decimo_tercero',
    label: 'Provision decimo tercero',
    category: 'provision',
    amount: detail.provisionDecimoTercero,
    source: 'legal',
    sourceId: 'decimo_tercero',
    legalParameterKey: 'decimo_tercero',
  });
  addLine(lines, {
    code: 'decimo_cuarto',
    label: 'Provision decimo cuarto',
    category: 'provision',
    amount: detail.provisionDecimoCuarto,
    source: 'legal',
    sourceId: 'decimo_cuarto',
    legalParameterKey: detail.decimoCuartoParameterKey || 'decimo_cuarto',
    metadata: { region: detail.decimoCuartoRegion || '' },
  });
  addLine(lines, {
    code: 'vacaciones',
    label: 'Provision vacaciones',
    category: 'provision',
    amount: detail.provisionVacaciones,
    source: 'legal',
    sourceId: 'vacaciones',
    legalParameterKey: 'vacaciones',
  });
  addLine(lines, {
    code: 'fondo_reserva_iess',
    label: 'Fondo de reserva depositado IESS',
    category: 'provision',
    amount: detail.fondoReservaDepositadoIess ?? detail.provisionFondosReserva,
    source: 'legal',
    sourceId: 'fondo_reserva_iess',
    legalParameterKey: 'fondo_reserva',
    metadata: { modalidad: detail.fondoReservaModalidad || '' },
  });
  addLine(lines, {
    code: 'neto_banco',
    label: 'Pago neto por banco',
    category: 'pago',
    amount: detail.netoRecibir ?? payrollRow.neto_recibir,
    source: 'pago',
    sourceId: 'neto_banco',
  });

  return lines;
}

function normalizePersistedLine(line = {}) {
  return {
    concept_code: line.concept_code || line.conceptCode || '',
    concept_label: line.concept_label || line.conceptLabel || '',
    category: line.category || '',
    amount: moneyValue(line.amount),
    source: line.source || 'calculo_nomina',
    source_id: line.source_id || line.sourceId || '',
    source_version: line.source_version || line.sourceVersion || 'CRN26',
    legal_parameter_key: line.legal_parameter_key || line.legalParameterKey || '',
    cost_center_code: line.cost_center_code || line.costCenterCode || '',
    organization_unit_code: line.organization_unit_code || line.organizationUnitCode || '',
    position_code: line.position_code || line.positionCode || '',
    metadata: normalizeDetail(line.metadata),
  };
}

function linesForPayrollRow(row = {}) {
  const persisted = Array.isArray(row.calculation_lines)
    ? row.calculation_lines
    : normalizeDetail(row.calculation_lines);

  if (Array.isArray(persisted) && persisted.length > 0) {
    return persisted.map(normalizePersistedLine).filter((line) => line.amount > 0);
  }

  return buildCalculationLinesFromDetail(row.detalle_calculo, row);
}

async function persistPayrollCalculationLines({
  payrollId,
  tenantId,
  empleadoId,
  anio,
  mes,
  employee = {},
  detalleCalculo = {},
  userId = null,
}) {
  if (!payrollId || !tenantId || !empleadoId) return [];

  const baseLines = buildCalculationLinesFromDetail(detalleCalculo, {
    sueldo_bruto: detalleCalculo.sueldoProporcional,
    horas_extras_50: detalleCalculo.montoExtras50,
    horas_extras_100: detalleCalculo.montoExtras100,
    aporte_iess_personal: detalleCalculo.aporteIess,
    impuesto_renta: detalleCalculo.impuestoRenta,
    anticipos: detalleCalculo.anticipos,
    prestamos: detalleCalculo.prestamos,
    neto_recibir: detalleCalculo.netoRecibir,
  });
  const costCenterCode = employee.centro_costo
    || employee.cost_center_code
    || employee.departamento
    || detalleCalculo.unidadOrganizativaCodigo
    || '';
  const organizationUnitCode = employee.unidad_organizativa_codigo || detalleCalculo.unidadOrganizativaCodigo || '';
  const positionCode = employee.cargo_codigo || employee.cargo || '';
  const lines = baseLines.map((line) => ({
    ...line,
    cost_center_code: costCenterCode,
    organization_unit_code: organizationUnitCode,
    position_code: positionCode,
  }));

  const client = await db.getClient(tenantId, userId);
  try {
    await client.query('DELETE FROM payroll_calculation_lines WHERE payroll_id = $1', [payrollId]);

    if (lines.length > 0) {
      const params = [];
      const values = lines.map((line, index) => {
        const offset = index * 17;
        params.push(
          payrollId,
          tenantId,
          empleadoId,
          Number(anio),
          Number(mes),
          line.concept_code,
          line.concept_label,
          line.category,
          line.amount,
          line.source,
          line.source_id,
          line.source_version,
          line.legal_parameter_key,
          line.cost_center_code,
          line.organization_unit_code,
          line.position_code,
          JSON.stringify(line.metadata || {})
        );
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16}, $${offset + 17})`;
      });

      await client.query(`
        INSERT INTO payroll_calculation_lines (
          payroll_id, tenant_id, empleado_id, anio, mes,
          concept_code, concept_label, category, amount,
          source, source_id, source_version, legal_parameter_key,
          cost_center_code, organization_unit_code, position_code, metadata
        )
        VALUES ${values.join(', ')}
      `, params);
    }

    await db.commit(client);
    return lines;
  } catch (err) {
    await db.rollback(client);
    throw err;
  }
}

async function ensureDefaultPayrollAccountingMappings(tenantId, { userId = null } = {}) {
  if (!tenantId) return [];

  const existing = await db.query(
    'SELECT COUNT(*)::int AS count FROM payroll_accounting_mappings WHERE tenant_id = $1',
    [tenantId]
  );
  if (Number(existing.rows[0]?.count || 0) > 0) {
    return [];
  }

  const params = [];
  const values = DEFAULT_ACCOUNTING_MAPPINGS.map((mapping, index) => {
    const offset = index * 16;
    params.push(
      tenantId,
      mapping.concept_code,
      mapping.concept_label,
      mapping.category,
      mapping.entry_type,
      mapping.debit_account_code,
      mapping.debit_account_name,
      mapping.credit_account_code,
      mapping.credit_account_name,
      mapping.cost_center_mode,
      mapping.fixed_cost_center_code,
      mapping.requires_employee_breakdown,
      mapping.status,
      mapping.valid_from,
      userId,
      JSON.stringify(mapping.metadata || {})
    );
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16})`;
  });

  await db.query(`
    INSERT INTO payroll_accounting_mappings (
      tenant_id, concept_code, concept_label, category, entry_type,
      debit_account_code, debit_account_name, credit_account_code, credit_account_name,
      cost_center_mode, fixed_cost_center_code, requires_employee_breakdown,
      status, valid_from, created_by, metadata
    )
    VALUES ${values.join(', ')}
    ON CONFLICT DO NOTHING
  `, params);

  return DEFAULT_ACCOUNTING_MAPPINGS;
}

async function getAccountingMappings(tenantId, { anio, mes, ensureDefaults = true, userId = null } = {}) {
  if (ensureDefaults) {
    await ensureDefaultPayrollAccountingMappings(tenantId, { userId });
  }

  const periodDate = `${Number(anio || new Date().getFullYear())}-${String(Number(mes || 1)).padStart(2, '0')}-01`;
  const result = await db.query(`
    SELECT *
    FROM payroll_accounting_mappings
    WHERE tenant_id = $1
      AND status = 'activo'
      AND valid_from <= $2::date
      AND (valid_to IS NULL OR valid_to >= $2::date)
    ORDER BY concept_code, entry_type, valid_from DESC, updated_at DESC
  `, [tenantId, periodDate]);

  return result.rows;
}

function mappingByConcept(mappings = DEFAULT_ACCOUNTING_MAPPINGS) {
  const map = new Map();
  for (const raw of mappings) {
    const mapping = {
      concept_code: raw.concept_code || raw.conceptCode,
      concept_label: raw.concept_label || raw.conceptLabel,
      category: raw.category,
      entry_type: raw.entry_type || raw.entryType,
      debit_account_code: raw.debit_account_code || raw.debitAccountCode,
      debit_account_name: raw.debit_account_name || raw.debitAccountName,
      credit_account_code: raw.credit_account_code || raw.creditAccountCode,
      credit_account_name: raw.credit_account_name || raw.creditAccountName,
      cost_center_mode: raw.cost_center_mode || raw.costCenterMode || 'employee',
      fixed_cost_center_code: raw.fixed_cost_center_code || raw.fixedCostCenterCode || '',
      requires_employee_breakdown: raw.requires_employee_breakdown ?? raw.requiresEmployeeBreakdown ?? true,
    };
    if (mapping.concept_code && !map.has(mapping.concept_code)) {
      map.set(mapping.concept_code, mapping);
    }
  }
  return map;
}

function accountLine({ periodo, asiento, mapping, side, amount, row, line, centroCosto }) {
  const isDebit = side === 'debe';
  return {
    periodo,
    asiento,
    conceptoCodigo: line.concept_code,
    concepto: line.concept_label,
    categoria: line.category,
    cuenta: isDebit ? mapping.debit_account_code : mapping.credit_account_code,
    nombreCuenta: isDebit ? mapping.debit_account_name : mapping.credit_account_name,
    debe: isDebit ? amount : 0,
    haber: isDebit ? 0 : amount,
    empleado: employeeFullName(row),
    cedula: row.cedula || '',
    centroCosto,
    referencia: `${asiento}-${line.concept_code}-${row.cedula || row.empleado_id || row.empleadoId || 'empleado'}-${periodo.replace('/', '')}`,
  };
}

function resolveCostCenter(mapping, row, line) {
  if (mapping.cost_center_mode === 'fixed') {
    return mapping.fixed_cost_center_code || '';
  }
  return line.cost_center_code || row.centro_costo || row.departamento || '';
}

function buildAccountingEntries(rows, anio, mes, mappings = DEFAULT_ACCOUNTING_MAPPINGS) {
  const map = mappingByConcept(mappings);
  const periodo = `${String(mes).padStart(2, '0')}/${anio}`;
  const entries = [];

  for (const row of rows) {
    for (const line of linesForPayrollRow(row)) {
      const amount = moneyValue(line.amount);
      if (amount <= 0) continue;

      const mapping = map.get(line.concept_code) || DEFAULT_MAPPING_BY_CODE.get(line.concept_code);
      if (!mapping?.debit_account_code || !mapping?.credit_account_code) {
        throw new AppError(`No existe esquema contable activo para ${line.concept_code}.`, {
          code: 'PAYROLL_ACCOUNTING_MAPPING_MISSING',
          statusCode: 422,
          details: { conceptCode: line.concept_code },
        });
      }

      const asiento = mapping.entry_type || (line.category === 'pago' ? 'PAGO' : 'DEVENGAMIENTO');
      const centroCosto = resolveCostCenter(mapping, row, line);
      entries.push(accountLine({ periodo, asiento, mapping, side: 'debe', amount, row, line, centroCosto }));
      entries.push(accountLine({ periodo, asiento, mapping, side: 'haber', amount, row, line, centroCosto }));
    }
  }

  validateAccountingBalance(entries);
  return entries;
}

function validateAccountingBalance(entries) {
  const totals = entries.reduce((acc, entry) => {
    acc.debe += numberValue(entry.debe);
    acc.haber += numberValue(entry.haber);
    return acc;
  }, { debe: 0, haber: 0 });

  if (Math.round(totals.debe * 100) !== Math.round(totals.haber * 100)) {
    throw new AppError('El reporte contable de nomina no balancea debe/haber.', {
      code: 'PAYROLL_ACCOUNTING_NOT_BALANCED',
      statusCode: 422,
      details: totals,
    });
  }

  return {
    debe: roundMoney(totals.debe),
    haber: roundMoney(totals.haber),
  };
}

function buildEmployeeDetailRows(rows, anio, mes) {
  const periodo = `${String(mes).padStart(2, '0')}/${anio}`;
  return rows.flatMap((row) => linesForPayrollRow(row).map((line) => ({
    periodo,
    cedula: row.cedula || '',
    empleado: employeeFullName(row),
    departamento: row.departamento || '',
    cargo: row.cargo || '',
    cargoCodigo: row.cargo_codigo || '',
    unidad: row.unidad_nombre || '',
    centroCosto: line.cost_center_code || row.centro_costo || '',
    conceptoCodigo: line.concept_code,
    concepto: line.concept_label,
    categoria: line.category,
    origen: line.source,
    referenciaOrigen: line.source_id,
    valor: moneyValue(line.amount),
    totalIngresos: numberValue(row.total_ingresos),
    totalDeducciones: numberValue(row.total_deducciones),
    netoRecibir: numberValue(row.neto_recibir),
  })));
}

function dynamicConceptKey(code) {
  return `concept_${String(code || 'sin_codigo').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
}

function buildBenefitsMatrixRows(rows, anio, mes) {
  const periodo = `${String(mes).padStart(2, '0')}/${anio}`;

  return rows.map((row) => {
    const detail = normalizeDetail(row.detalle_calculo);
    const exportRow = {
      periodo,
      cedula: row.cedula || '',
      empleado: employeeFullName(row),
      departamento: row.departamento || '',
      cargo: row.cargo || '',
      centroCosto: row.centro_costo || '',
      totalIngresosNomina: numberValue(row.total_ingresos),
      totalDeduccionesNomina: numberValue(row.total_deducciones),
      totalProvisiones: 0,
      costoEmpleador: numberValue(detail.costoEmpleador),
      netoRecibir: numberValue(row.neto_recibir),
      conciliacion: 'OK',
      _conceptLabels: {},
    };

    const totals = { ingresos: 0, deducciones: 0, provisiones: 0, costoEmpleador: 0 };

    for (const line of linesForPayrollRow(row)) {
      if (line.category === 'pago') continue;
      const key = dynamicConceptKey(line.concept_code);
      exportRow[key] = roundMoney(numberValue(exportRow[key]) + numberValue(line.amount));
      exportRow._conceptLabels[key] = line.concept_label;

      if (line.category === 'ingreso') totals.ingresos += numberValue(line.amount);
      if (line.category === 'deduccion') totals.deducciones += numberValue(line.amount);
      if (line.category === 'provision') totals.provisiones += numberValue(line.amount);
      if (line.category === 'costo_empleador') totals.costoEmpleador += numberValue(line.amount);
    }

    exportRow.totalProvisiones = roundMoney(totals.provisiones);
    const costoCalculado = roundMoney(totals.ingresos + totals.provisiones + totals.costoEmpleador);
    const netoCalculado = roundMoney(totals.ingresos - totals.deducciones);
    const ingresosOk = Math.round(totals.ingresos * 100) === Math.round(numberValue(row.total_ingresos) * 100);
    const deduccionesOk = Math.round(totals.deducciones * 100) === Math.round(numberValue(row.total_deducciones) * 100);
    const netoOk = Math.round(netoCalculado * 100) === Math.round(numberValue(row.neto_recibir) * 100);
    const costoOk = !detail.costoEmpleador || Math.round(costoCalculado * 100) === Math.round(numberValue(detail.costoEmpleador) * 100);
    exportRow.conciliacion = ingresosOk && deduccionesOk && netoOk && costoOk ? 'OK' : 'REVISAR';

    return exportRow;
  });
}

module.exports = {
  PAYROLL_CONCEPTS,
  DEFAULT_ACCOUNTING_MAPPINGS,
  buildAccountingEntries,
  buildBenefitsMatrixRows,
  buildCalculationLinesFromDetail,
  buildEmployeeDetailRows,
  ensureDefaultPayrollAccountingMappings,
  getAccountingMappings,
  linesForPayrollRow,
  normalizeDetail,
  numberValue,
  validateAccountingBalance,
};
