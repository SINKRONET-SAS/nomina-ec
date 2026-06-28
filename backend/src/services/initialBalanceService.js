const crypto = require('crypto');
const ExcelJS = require('exceljs');
const db = require('../config/database');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const TEMPLATE_VERSION = 'MSF26-v1';

const BALANCE_TYPES = Object.freeze({
  vacaciones_dias: {
    label: 'Vacaciones pendientes en dias',
    valueField: 'days',
  },
  decimo_tercero: {
    label: 'Decimo tercero acumulado',
    valueField: 'amount',
  },
  decimo_cuarto: {
    label: 'Decimo cuarto acumulado',
    valueField: 'amount',
  },
  fondo_reserva: {
    label: 'Fondo de reserva acumulado',
    valueField: 'amount',
  },
  anticipo: {
    label: 'Anticipo pendiente',
    valueField: 'amount',
  },
  prestamo: {
    label: 'Prestamo pendiente',
    valueField: 'amount',
  },
  beneficio_recurrente: {
    label: 'Beneficio recurrente inicial',
    valueField: 'amount',
  },
  descuento_recurrente: {
    label: 'Descuento recurrente inicial',
    valueField: 'amount',
  },
  horas_extra_banco: {
    label: 'Horas extra acumuladas',
    valueField: 'hours',
  },
});

const TEMPLATE_COLUMNS = [
  'cedula',
  'tipoSaldo',
  'periodo',
  'valor',
  'horas',
  'dias',
  'descripcion',
];

function normalizeDate(value) {
  const raw = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new AppError('Indica una fecha de corte valida para cargar saldos iniciales.', {
      code: 'SALDOS_FECHA_CORTE_INVALIDA',
      statusCode: 400,
    });
  }
  return raw;
}

function normalizePeriod(value, periodCut) {
  const raw = String(value || '').trim();
  if (/^\d{4}-\d{2}$/.test(raw)) return raw;
  return String(periodCut || '').slice(0, 7);
}

function normalizeCode(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
}

function normalizeNumber(value) {
  const normalized = String(value ?? '')
    .replace(/\s/g, '')
    .replace(',', '.');
  const number = Number(normalized || 0);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : NaN;
}

function normalizeRows(rows = [], periodCut) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new AppError('La carga requiere al menos una fila de saldos iniciales.', {
      code: 'SALDOS_SIN_FILAS',
      statusCode: 400,
    });
  }

  return rows.map((row, index) => {
    const cedula = String(row.cedula || row.identificacion || '').trim();
    const balanceType = normalizeCode(row.tipoSaldo || row.tipo_saldo || row.balanceType || row.balance_type);
    return {
      rowNumber: Number(row.rowNumber || index + 2),
      cedula,
      balanceType,
      periodKey: normalizePeriod(row.periodo || row.periodKey || row.period_key, periodCut),
      amount: normalizeNumber(row.valor ?? row.monto ?? row.amount),
      hours: normalizeNumber(row.horas ?? row.hours),
      days: normalizeNumber(row.dias ?? row.days),
      description: String(row.descripcion || row.description || '').trim(),
      raw: row,
    };
  });
}

async function resolveEmployees(tenantId, rows) {
  const cedulas = [...new Set(rows.map((row) => row.cedula).filter(Boolean))];
  if (cedulas.length === 0) return new Map();

  const result = await db.query(
    `SELECT id, cedula, nombres, apellidos
     FROM empleados
     WHERE tenant_id = $1 AND cedula = ANY($2) AND activo = true`,
    [tenantId, cedulas]
  );

  return new Map(result.rows.map((row) => [row.cedula, row]));
}

async function resolveClosedPeriods(tenantId, rows) {
  const periods = [...new Set(rows.map((row) => row.periodKey).filter(Boolean))];
  if (periods.length === 0) return new Set();

  const result = await db.query(
    `SELECT periodo_nomina, status
     FROM payroll_periods
     WHERE tenant_id = $1
       AND periodo_nomina = ANY($2)
       AND LOWER(status) IN ('closed','cerrado','cerrada','pagada','paid')`,
    [tenantId, periods]
  );

  return new Set(result.rows.map((row) => row.periodo_nomina));
}

function validateRow(row, employeeMap, closedPeriods) {
  const errors = [];
  const balanceConfig = BALANCE_TYPES[row.balanceType];
  const employee = employeeMap.get(row.cedula);

  if (!row.cedula) errors.push('La cedula es obligatoria.');
  if (!employee) errors.push('No encontramos un empleado activo con esa cedula.');
  if (!balanceConfig) errors.push('El tipo de saldo no esta habilitado para migracion.');
  if (!/^\d{4}-\d{2}$/.test(row.periodKey)) errors.push('El periodo debe tener formato AAAA-MM.');
  if (closedPeriods.has(row.periodKey)) errors.push('El periodo ya existe como cerrado en SKNOMINA.');
  if (!Number.isFinite(row.amount) || row.amount < 0) errors.push('El valor debe ser un numero positivo o cero.');
  if (!Number.isFinite(row.hours) || row.hours < 0) errors.push('Las horas deben ser un numero positivo o cero.');
  if (!Number.isFinite(row.days) || row.days < 0) errors.push('Los dias deben ser un numero positivo o cero.');

  if (balanceConfig) {
    const requiredValue = row[balanceConfig.valueField];
    if (!Number.isFinite(requiredValue) || requiredValue <= 0) {
      errors.push(`El saldo ${balanceConfig.label} requiere ${balanceConfig.valueField === 'amount' ? 'valor' : balanceConfig.valueField}.`);
    }
  }

  return {
    ...row,
    empleadoId: employee?.id || null,
    employeeName: employee ? `${employee.apellidos || ''} ${employee.nombres || ''}`.trim() : '',
    status: errors.length > 0 ? 'error' : 'valid',
    errors,
  };
}

function buildSourceHash({ tenantId, periodCut, rows }) {
  const stableRows = rows.map((row) => ({
    cedula: row.cedula,
    balanceType: row.balanceType,
    periodKey: row.periodKey,
    amount: row.amount,
    hours: row.hours,
    days: row.days,
    description: row.description,
  }));
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({ tenantId, periodCut, rows: stableRows }))
    .digest('hex');
}

async function createDryRunBatch({ tenantId, userId, periodCut: rawPeriodCut, rows, sourceFilename = '', correlationId }) {
  const periodCut = normalizeDate(rawPeriodCut);
  const normalizedRows = normalizeRows(rows, periodCut);
  const [employeeMap, closedPeriods] = await Promise.all([
    resolveEmployees(tenantId, normalizedRows),
    resolveClosedPeriods(tenantId, normalizedRows),
  ]);
  const items = normalizedRows.map((row) => validateRow(row, employeeMap, closedPeriods));
  const sourceHash = buildSourceHash({ tenantId, periodCut, rows: normalizedRows });
  const validRows = items.filter((item) => item.status === 'valid').length;
  const errorRows = items.length - validRows;
  const summary = summarizeItems(items);

  const client = await db.getClient(tenantId, userId);
  try {
    const batchResult = await client.query(
      `INSERT INTO initial_balance_batches (
        tenant_id, period_cut, status, template_version, source_filename, source_hash,
        total_rows, valid_rows, error_rows, summary, created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (tenant_id, source_hash) DO UPDATE SET
        status = EXCLUDED.status,
        total_rows = EXCLUDED.total_rows,
        valid_rows = EXCLUDED.valid_rows,
        error_rows = EXCLUDED.error_rows,
        summary = EXCLUDED.summary,
        updated_at = NOW()
      RETURNING *`,
      [
        tenantId,
        periodCut,
        errorRows > 0 ? 'blocked' : 'validated',
        TEMPLATE_VERSION,
        sourceFilename,
        sourceHash,
        items.length,
        validRows,
        errorRows,
        JSON.stringify(summary),
        userId,
      ]
    );
    const batch = batchResult.rows[0];
    await client.query('DELETE FROM initial_balance_items WHERE batch_id = $1', [batch.id]);
    for (const item of items) {
      await client.query(
        `INSERT INTO initial_balance_items (
          batch_id, tenant_id, empleado_id, row_number, cedula, employee_name, balance_type,
          period_key, amount, hours, days, description, status, errors, metadata
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          batch.id,
          tenantId,
          item.empleadoId,
          item.rowNumber,
          item.cedula,
          item.employeeName,
          item.balanceType,
          item.periodKey,
          item.amount || 0,
          item.hours || 0,
          item.days || 0,
          item.description,
          item.status,
          JSON.stringify(item.errors),
          JSON.stringify({
            source: 'MSF26',
            raw: item.raw,
          }),
        ]
      );
    }
    await db.commit(client);
    logger.info({
      code: 'MSF26_INITIAL_BALANCE_DRY_RUN',
      correlationId,
      userId,
      tenantId,
      batchId: batch.id,
      totalRows: items.length,
      errorRows,
    }, 'Lote de saldos iniciales prevalidado');
    return getBatch({ tenantId, batchId: batch.id });
  } catch (err) {
    await db.rollback(client);
    throw err;
  }
}

function summarizeItems(items) {
  return items.reduce((summary, item) => {
    const current = summary[item.balanceType] || { rows: 0, amount: 0, hours: 0, days: 0, errors: 0 };
    current.rows += 1;
    current.amount += Number(item.amount || 0);
    current.hours += Number(item.hours || 0);
    current.days += Number(item.days || 0);
    if (item.errors.length > 0) current.errors += 1;
    return { ...summary, [item.balanceType]: current };
  }, {});
}

async function listBatches({ tenantId }) {
  const result = await db.query(
    `SELECT *
     FROM initial_balance_batches
     WHERE tenant_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [tenantId]
  );
  return result.rows.map(normalizeBatch);
}

async function getBatch({ tenantId, batchId }) {
  const [batchResult, itemsResult] = await Promise.all([
    db.query('SELECT * FROM initial_balance_batches WHERE tenant_id = $1 AND id = $2', [tenantId, batchId]),
    db.query('SELECT * FROM initial_balance_items WHERE tenant_id = $1 AND batch_id = $2 ORDER BY row_number ASC', [tenantId, batchId]),
  ]);

  if (batchResult.rows.length === 0) {
    throw new AppError('No encontramos el lote de saldos iniciales.', {
      code: 'SALDOS_LOTE_NO_ENCONTRADO',
      statusCode: 404,
    });
  }

  return {
    ...normalizeBatch(batchResult.rows[0]),
    items: itemsResult.rows.map(normalizeItem),
  };
}

async function commitBatch({ tenantId, userId, batchId, correlationId }) {
  const client = await db.getClient(tenantId, userId);
  try {
    const batchResult = await client.query(
      `SELECT *
       FROM initial_balance_batches
       WHERE tenant_id = $1 AND id = $2
       FOR UPDATE`,
      [tenantId, batchId]
    );
    if (batchResult.rows.length === 0) {
      throw new AppError('No encontramos el lote de saldos iniciales.', {
        code: 'SALDOS_LOTE_NO_ENCONTRADO',
        statusCode: 404,
      });
    }
    const batch = batchResult.rows[0];
    if (batch.status !== 'validated') {
      throw new AppError('Solo puedes aplicar lotes validados y sin errores.', {
        code: 'SALDOS_LOTE_NO_APLICABLE',
        statusCode: 409,
        details: { status: batch.status },
      });
    }
    if (Number(batch.error_rows || 0) > 0) {
      throw new AppError('Corrige las filas con error antes de aplicar el lote.', {
        code: 'SALDOS_LOTE_CON_ERRORES',
        statusCode: 409,
      });
    }

    await client.query(
      `UPDATE initial_balance_items
       SET status = 'committed', applied_at = NOW(), applied_by = $3
       WHERE tenant_id = $1 AND batch_id = $2 AND status = 'valid'`,
      [tenantId, batchId, userId]
    );
    await client.query(
      `UPDATE initial_balance_batches
       SET status = 'committed', approved_by = $3, approved_at = NOW(),
           committed_at = NOW(), updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, batchId, userId]
    );
    await db.commit(client);
    logger.info({
      code: 'MSF26_INITIAL_BALANCE_COMMIT',
      correlationId,
      userId,
      tenantId,
      batchId,
    }, 'Lote de saldos iniciales aplicado');
    return getBatch({ tenantId, batchId });
  } catch (err) {
    await db.rollback(client);
    throw err;
  }
}

async function revertBatch({ tenantId, userId, batchId, correlationId }) {
  const client = await db.getClient(tenantId, userId);
  try {
    const batchResult = await client.query(
      `SELECT *
       FROM initial_balance_batches
       WHERE tenant_id = $1 AND id = $2
       FOR UPDATE`,
      [tenantId, batchId]
    );
    if (batchResult.rows.length === 0) {
      throw new AppError('No encontramos el lote de saldos iniciales.', {
        code: 'SALDOS_LOTE_NO_ENCONTRADO',
        statusCode: 404,
      });
    }
    if (batchResult.rows[0].status !== 'committed') {
      throw new AppError('Solo puedes revertir lotes aplicados.', {
        code: 'SALDOS_LOTE_NO_REVERSIBLE',
        statusCode: 409,
      });
    }

    await client.query(
      `UPDATE initial_balance_items
       SET status = 'reverted', reverted_at = NOW()
       WHERE tenant_id = $1 AND batch_id = $2 AND status = 'committed'`,
      [tenantId, batchId]
    );
    await client.query(
      `UPDATE initial_balance_batches
       SET status = 'reverted', reverted_at = NOW(), updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, batchId]
    );
    await db.commit(client);
    logger.warn({
      code: 'MSF26_INITIAL_BALANCE_REVERT',
      correlationId,
      userId,
      tenantId,
      batchId,
    }, 'Lote de saldos iniciales revertido');
    return getBatch({ tenantId, batchId });
  } catch (err) {
    await db.rollback(client);
    throw err;
  }
}

function normalizeBatch(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    periodCut: row.period_cut,
    status: row.status,
    templateVersion: row.template_version,
    sourceFilename: row.source_filename,
    sourceHash: row.source_hash,
    totalRows: Number(row.total_rows || 0),
    validRows: Number(row.valid_rows || 0),
    errorRows: Number(row.error_rows || 0),
    summary: row.summary || {},
    createdAt: row.created_at,
    committedAt: row.committed_at,
    revertedAt: row.reverted_at,
  };
}

function normalizeItem(row) {
  return {
    id: row.id,
    rowNumber: Number(row.row_number || 0),
    empleadoId: row.empleado_id,
    cedula: row.cedula,
    employeeName: row.employee_name,
    balanceType: row.balance_type,
    balanceLabel: BALANCE_TYPES[row.balance_type]?.label || row.balance_type,
    periodKey: row.period_key,
    amount: Number(row.amount || 0),
    hours: Number(row.hours || 0),
    days: Number(row.days || 0),
    description: row.description,
    status: row.status,
    errors: row.errors || [],
    createdAt: row.created_at,
  };
}

async function getCommittedInitialBalanceEffects({ tenantId, empleadoId, anio, mes, dbClient = null }) {
  const executor = dbClient || db;
  const periodKey = `${Number(anio)}-${String(Number(mes)).padStart(2, '0')}`;
  const result = await executor.query(
    `SELECT id, balance_type, amount, hours, days, description, period_key
     FROM initial_balance_items
     WHERE tenant_id = $1
       AND empleado_id = $2
       AND status = 'committed'
       AND period_key <= $3
     ORDER BY period_key ASC, created_at ASC`,
    [tenantId, empleadoId, periodKey]
  );

  const items = result.rows.map((row) => ({
    id: row.id,
    balanceType: row.balance_type,
    amount: Number(row.amount || 0),
    hours: Number(row.hours || 0),
    days: Number(row.days || 0),
    description: row.description || '',
    periodKey: row.period_key || '',
  }));

  return {
    anticipos: roundItems(items, 'anticipo', 'amount'),
    prestamos: roundItems(items, 'prestamo', 'amount'),
    beneficioRecurrente: roundItems(items, 'beneficio_recurrente', 'amount'),
    descuentoRecurrente: roundItems(items, 'descuento_recurrente', 'amount'),
    horasExtraBanco: roundItems(items, 'horas_extra_banco', 'hours'),
    vacacionesDias: roundItems(items, 'vacaciones_dias', 'days'),
    decimoTercero: roundItems(items, 'decimo_tercero', 'amount'),
    decimoCuarto: roundItems(items, 'decimo_cuarto', 'amount'),
    fondoReserva: roundItems(items, 'fondo_reserva', 'amount'),
    items,
  };
}

function roundItems(items, balanceType, field) {
  const total = items
    .filter((item) => item.balanceType === balanceType)
    .reduce((sum, item) => sum + Number(item[field] || 0), 0);
  return Math.round(total * 100) / 100;
}

function buildTemplateCsv() {
  const example = [
    '0102030405',
    'vacaciones_dias',
    '2026-06',
    '0',
    '0',
    '5.50',
    'Saldo inicial validado para migracion',
  ];
  const catalog = Object.entries(BALANCE_TYPES)
    .map(([code, config]) => `# ${code}: ${config.label}`)
    .join('\r\n');
  return [
    `# Plantilla ${TEMPLATE_VERSION} - Saldos iniciales SKNOMINA`,
    catalog,
    TEMPLATE_COLUMNS.join(','),
    example.map(csvCell).join(','),
  ].join('\r\n');
}

async function buildTemplateXlsx() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SKNOMINA';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Saldos iniciales');
  sheet.addRow(TEMPLATE_COLUMNS);
  sheet.addRow([
    '0102030405',
    'vacaciones_dias',
    '2026-06',
    0,
    0,
    5.5,
    'Saldo inicial validado para migracion',
  ]);
  sheet.columns.forEach((column) => {
    column.width = 24;
  });
  const catalog = workbook.addWorksheet('Catalogo');
  catalog.addRow(['tipoSaldo', 'descripcion', 'campo principal']);
  Object.entries(BALANCE_TYPES).forEach(([code, config]) => {
    catalog.addRow([code, config.label, config.valueField]);
  });
  catalog.columns.forEach((column) => {
    column.width = 32;
  });
  return workbook.xlsx.writeBuffer();
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

module.exports = {
  BALANCE_TYPES,
  TEMPLATE_VERSION,
  buildTemplateCsv,
  buildTemplateXlsx,
  createDryRunBatch,
  commitBatch,
  revertBatch,
  getBatch,
  getCommittedInitialBalanceEffects,
  listBatches,
  normalizeRows,
};
