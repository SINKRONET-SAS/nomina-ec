const crypto = require('crypto');
const db = require('../config/database');
const { recordAudit } = require('./auditService');
const { ensureNoveltyTypeAllowed, normalizeNoveltyCode } = require('./payrollNoveltyService');

const VALID_SCOPE_TYPES = new Set(['company', 'department', 'position', 'employee']);

function validatePeriod(anio, mes) {
  const year = Number(anio);
  const month = Number(mes);
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    throw new Error('Anio de periodo invalido.');
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Mes de periodo invalido.');
  }
  return { anio: year, mes: month };
}

function normalizeDate(anio, mes, value) {
  const fallback = `${anio}-${String(mes).padStart(2, '0')}-01`;
  const date = String(value || fallback).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Fecha de novedad invalida. Usa YYYY-MM-DD.');
  }
  if (Number(date.slice(0, 4)) !== anio || Number(date.slice(5, 7)) !== mes) {
    throw new Error('La fecha de novedad debe pertenecer al periodo abierto.');
  }
  return date;
}

function formatPeriodMarker(anio, mes) {
  return `${Number(anio)}-${String(Number(mes)).padStart(2, '0')}`;
}

function extractPeriodFromDate(value) {
  const date = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Fecha de novedad invalida. Usa YYYY-MM-DD.');
  }
  const anio = Number(date.slice(0, 4));
  const mes = Number(date.slice(5, 7));
  return { anio, mes, periodoNomina: formatPeriodMarker(anio, mes), fecha: date };
}

function dateInEcuador(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function todayInEcuador() {
  return dateInEcuador(new Date());
}

async function ensurePayrollPeriodForDate({ tenantId, userId, fecha }) {
  const period = extractPeriodFromDate(fecha);
  const result = await db.query(`
    WITH inserted AS (
      INSERT INTO payroll_periods (tenant_id, anio, mes, status, opened_by)
      VALUES ($1,$2,$3,'open',$4)
      ON CONFLICT (tenant_id, anio, mes) DO NOTHING
      RETURNING id, status
    )
    SELECT id, status FROM inserted
    UNION ALL
    SELECT id, status
    FROM payroll_periods
    WHERE tenant_id = $1 AND anio = $2 AND mes = $3
    LIMIT 1
  `, [tenantId, period.anio, period.mes, userId || null]);

  if (result.rows.length === 0) {
    throw new Error('No se pudo resolver el periodo de la novedad.');
  }

  return {
    id: result.rows[0].id,
    status: result.rows[0].status,
    ...period,
  };
}

function makeIdempotencyKey(payload) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');
}

async function openPayrollPeriod({ tenantId, userId, correlationId, ipAddress, anio, mes }) {
  const period = validatePeriod(anio, mes);
  const result = await db.query(`
    INSERT INTO payroll_periods (tenant_id, anio, mes, status, opened_by)
    VALUES ($1,$2,$3,'open',$4)
    ON CONFLICT (tenant_id, anio, mes) DO UPDATE SET
      status = CASE
        WHEN payroll_periods.status = 'closed' THEN payroll_periods.status
        ELSE 'open'
      END,
      updated_at = NOW()
    RETURNING *
  `, [tenantId, period.anio, period.mes, userId || null]);

  await recordAudit({
    tenantId,
    userId,
    correlationId,
    action: 'nomina.periodo.open',
    entity: 'payroll_periods',
    entityId: result.rows[0].id,
    newData: { anio: period.anio, mes: period.mes, status: result.rows[0].status },
    ipAddress,
  });

  return result.rows[0];
}

async function getPayrollPeriodState({ tenantId, anio, mes }) {
  const periodInput = validatePeriod(anio, mes);
  const periodResult = await db.query(`
    SELECT *
    FROM payroll_periods
    WHERE tenant_id = $1 AND anio = $2 AND mes = $3
  `, [tenantId, periodInput.anio, periodInput.mes]);

  const payroll = await db.query(`
    SELECT estado, COUNT(*)::int AS total
    FROM nominas
    WHERE tenant_id = $1 AND anio = $2 AND mes = $3
    GROUP BY estado
  `, [tenantId, periodInput.anio, periodInput.mes]);

  const novelties = await db.query(`
    SELECT estado, COUNT(*)::int AS total
    FROM novedades_asistencia
    WHERE tenant_id = $1
      AND EXTRACT(YEAR FROM fecha) = $2
      AND EXTRACT(MONTH FROM fecha) = $3
    GROUP BY estado
  `, [tenantId, periodInput.anio, periodInput.mes]);

  const batches = await db.query(`
    SELECT id, scope_type, scope_value, tipo_novedad, fecha, minutos, monto, status,
      total_empleados, total_creadas, created_at
    FROM novelty_batches
    WHERE tenant_id = $1
      AND period_id = COALESCE($2::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
    ORDER BY created_at DESC
    LIMIT 10
  `, [tenantId, periodResult.rows[0]?.id || null]);

  return {
    period: periodResult.rows[0] || null,
    payrollByStatus: payroll.rows,
    noveltiesByStatus: novelties.rows,
    batches: batches.rows,
  };
}

function buildEmployeeQuery(scopeType, scopeValue) {
  if (scopeType === 'company') {
    return { where: '', params: [] };
  }
  if (scopeType === 'department') {
    return { where: 'AND departamento = $2', params: [scopeValue] };
  }
  if (scopeType === 'position') {
    return {
      where: `AND (
        position_id::text = $2
        OR position_id IN (
          SELECT id
          FROM job_positions
          WHERE tenant_id = $1
            AND (
              id::text = $2
              OR UPPER(code) = UPPER($2)
              OR UPPER(name) = UPPER($2)
            )
        )
        OR UPPER(cargo) = UPPER($2)
      )`,
      params: [scopeValue],
    };
  }
  if (scopeType === 'employee') {
    return { where: 'AND id = $2', params: [scopeValue] };
  }
  throw new Error('Alcance de lote invalido.');
}

async function findEmployeesForScope(client, tenantId, scopeType, scopeValue) {
  const query = buildEmployeeQuery(scopeType, scopeValue);
  const result = await client.query(`
    SELECT id, cedula, nombres, apellidos
    FROM empleados
    WHERE tenant_id = $1 AND activo = true
    ${query.where}
    ORDER BY apellidos, nombres
  `, [tenantId, ...query.params]);
  return result.rows;
}

async function createNoveltyBatch({
  tenantId,
  userId,
  correlationId,
  ipAddress,
  payload,
}) {
  const { anio, mes } = validatePeriod(payload.anio, payload.mes);
  const scopeType = String(payload.scopeType || 'company');
  const scopeValue = String(payload.scopeValue || '').trim();
  const tipoNovedad = normalizeNoveltyCode(payload.tipoNovedad);
  const minutos = Math.max(0, Math.round(Number(payload.minutos || 0)));
  const monto = roundAmount(payload.monto);
  const justificacion = String(payload.justificacion || 'Lote mensual').trim();
  const fecha = normalizeDate(anio, mes, payload.fecha);
  const periodoNomina = formatPeriodMarker(anio, mes);
  const idempotencyKey = payload.idempotencyKey || makeIdempotencyKey({ tenantId, anio, mes, scopeType, scopeValue, tipoNovedad, minutos, monto, fecha, justificacion });

  if (!VALID_SCOPE_TYPES.has(scopeType)) {
    throw new Error('Alcance de lote invalido.');
  }
  if (scopeType !== 'company' && !scopeValue) {
    throw new Error('El alcance seleccionado requiere un valor.');
  }
  const noveltyConfig = await ensureNoveltyTypeAllowed({ tenantId, tipoNovedad, anio, mes, userId });
  if (noveltyConfig.calculationMode === 'amount' && monto <= 0 && noveltyConfig.payrollImpact !== 'informativo') {
    throw new Error('La novedad requiere un monto mayor a cero segun su forma de calculo.');
  }

  const existing = await db.query(`
    SELECT id, status, total_empleados, total_creadas
    FROM novelty_batches
    WHERE tenant_id = $1 AND idempotency_key = $2
  `, [tenantId, idempotencyKey]);
  if (existing.rows.length > 0) {
    return { replay: true, batch: existing.rows[0] };
  }

  const client = await db.getClient(tenantId, userId);
  let batchId;

  try {
    const period = await client.query(`
      INSERT INTO payroll_periods (tenant_id, anio, mes, status, opened_by)
      VALUES ($1,$2,$3,'open',$4)
      ON CONFLICT (tenant_id, anio, mes) DO UPDATE SET updated_at = NOW()
      RETURNING id, status
    `, [tenantId, anio, mes, userId || null]);

    if (period.rows[0].status === 'closed') {
      throw new Error('No se puede cargar novedades en un periodo cerrado.');
    }

    const employees = await findEmployeesForScope(client, tenantId, scopeType, scopeValue);
    const batch = await client.query(`
      INSERT INTO novelty_batches (
        tenant_id, period_id, scope_type, scope_value, tipo_novedad, fecha,
        minutos, monto, justificacion, idempotency_key, total_empleados, created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id
    `, [
      tenantId,
      period.rows[0].id,
      scopeType,
      scopeValue,
      tipoNovedad,
      fecha,
      minutos,
      monto,
      justificacion,
      idempotencyKey,
      employees.length,
      userId || null,
    ]);
    batchId = batch.rows[0].id;

    let created = 0;
    for (const employee of employees) {
      const inserted = await client.query(`
        INSERT INTO novedades_asistencia (
          empleado_id, tenant_id, period_id, periodo_nomina, fecha, tipo_novedad, minutos, monto, justificacion, novelty_batch_id
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (empleado_id, fecha, tipo_novedad) DO NOTHING
        RETURNING id
      `, [employee.id, tenantId, period.rows[0].id, periodoNomina, fecha, tipoNovedad, minutos, monto, justificacion, batchId]);
      created += inserted.rows.length;
    }

    const updated = await client.query(`
      UPDATE novelty_batches
      SET status = 'completado',
          total_creadas = $2,
          completed_at = NOW()
      WHERE id = $1
      RETURNING id, status, total_empleados, total_creadas
    `, [batchId, created]);

    await client.query(`
      UPDATE payroll_periods
      SET status = CASE WHEN status = 'open' THEN 'novelties_loaded' ELSE status END,
          updated_at = NOW()
      WHERE id = $1
    `, [period.rows[0].id]);

    await db.commit(client);

    await recordAudit({
      tenantId,
      userId,
      correlationId,
      action: 'nomina.novedades.batch.create',
      entity: 'novelty_batches',
      entityId: batchId,
      newData: { anio, mes, scopeType, scopeValue, tipoNovedad, minutos, monto, totalEmployees: employees.length, created },
      ipAddress,
    });

    return { replay: false, batch: updated.rows[0] };
  } catch (err) {
    await db.rollback(client);
    throw err;
  }
}

function roundAmount(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('El monto de la novedad debe ser un numero positivo.');
  }
  return Math.round(amount * 100) / 100;
}

module.exports = {
  buildEmployeeQuery,
  createNoveltyBatch,
  dateInEcuador,
  ensurePayrollPeriodForDate,
  extractPeriodFromDate,
  formatPeriodMarker,
  getPayrollPeriodState,
  openPayrollPeriod,
  todayInEcuador,
  validatePeriod,
};
