const crypto = require('crypto');
const db = require('../config/database');
const AppError = require('../utils/AppError');
const { recordAudit } = require('./auditService');
const { ensureNoveltyTypeAllowed, normalizeNoveltyCode } = require('./payrollNoveltyService');

const VALID_SCOPE_TYPES = new Set(['company', 'department', 'position', 'employee']);
const NOVELTY_WRITABLE_PERIOD_STATUSES = new Set(['open', 'novelties_loaded', 'reopened', 'calculation_failed']);
const PERIOD_DATE_EDIT_BLOCKED_STATUSES = new Set(['calculated', 'closed']);

function validatePeriod(anio, mes) {
  const year = Number(anio);
  const month = Number(mes);
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    throw new Error('Año de período inválido.');
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Mes de período inválido.');
  }
  return { anio: year, mes: month };
}

function periodStartDate(anio, mes) {
  return `${Number(anio)}-${String(Number(mes)).padStart(2, '0')}-01`;
}

function periodEndDate(anio, mes) {
  const date = new Date(Date.UTC(Number(anio), Number(mes), 0));
  return date.toISOString().slice(0, 10);
}

function normalizePeriodBoundaryDate(value, expectedYear, label) {
  const date = String(value || '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new AppError(`${label} debe tener formato YYYY-MM-DD.`, {
      code: 'PAYROLL_PERIOD_DATE_INVALID',
      statusCode: 422,
      details: { field: label },
    });
  }
  if (Number(date.slice(0, 4)) !== Number(expectedYear)) {
    throw new AppError('Las fechas del periodo deben pertenecer al año seleccionado.', {
      code: 'PAYROLL_PERIOD_DATE_YEAR_MISMATCH',
      statusCode: 422,
      details: { expectedYear, value: date },
    });
  }
  return date;
}

function normalizeDate(anio, mes, value) {
  const fallback = `${anio}-${String(mes).padStart(2, '0')}-01`;
  const date = String(value || fallback).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Fecha de novedad inválida. Usa YYYY-MM-DD.');
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
    throw new Error('Fecha de novedad inválida. Usa YYYY-MM-DD.');
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

function currentPeriodInEcuador(value = new Date()) {
  return extractPeriodFromDate(dateInEcuador(value));
}

async function ensurePayrollPeriodForDate({ tenantId, userId, fecha }) {
  const period = extractPeriodFromDate(fecha);
  const result = await db.query(`
    WITH inserted AS (
      INSERT INTO payroll_periods (tenant_id, anio, mes, fecha_desde, fecha_hasta, status, opened_by)
      VALUES ($1,$2,$3,$4,$5,'open',$6)
      ON CONFLICT (tenant_id, anio, mes) DO NOTHING
      RETURNING id, status, fecha_desde, fecha_hasta
    )
    SELECT id, status, fecha_desde, fecha_hasta FROM inserted
    UNION ALL
    SELECT id, status, fecha_desde, fecha_hasta
    FROM payroll_periods
    WHERE tenant_id = $1 AND anio = $2 AND mes = $3
    LIMIT 1
  `, [tenantId, period.anio, period.mes, periodStartDate(period.anio, period.mes), periodEndDate(period.anio, period.mes), userId || null]);

  if (result.rows.length === 0) {
    throw new Error('No se pudo resolver el periodo de la novedad.');
  }

  return {
    id: result.rows[0].id,
    status: result.rows[0].status,
    fechaDesde: result.rows[0].fecha_desde,
    fechaHasta: result.rows[0].fecha_hasta,
    ...period,
  };
}

async function ensureWritablePayrollPeriodForDate({ tenantId, fecha }) {
  const period = extractPeriodFromDate(fecha);
  const result = await db.query(`
    SELECT id, status
    FROM payroll_periods
    WHERE tenant_id = $1 AND anio = $2 AND mes = $3
    LIMIT 1
  `, [tenantId, period.anio, period.mes]);

  if (result.rows.length === 0) {
    throw new AppError('Abre el mes de nomina antes de registrar novedades manuales.', {
      code: 'PAYROLL_PERIOD_NOT_OPEN_FOR_NOVELTY',
      statusCode: 409,
      details: {
        periodoNomina: period.periodoNomina,
        fecha: period.fecha,
      },
    });
  }

  const status = result.rows[0].status;
  if (!NOVELTY_WRITABLE_PERIOD_STATUSES.has(status)) {
    throw new AppError('El mes de nomina no esta abierto para editar novedades manuales.', {
      code: 'PAYROLL_PERIOD_NOT_WRITABLE_FOR_NOVELTY',
      statusCode: 409,
      details: {
        periodoNomina: period.periodoNomina,
        fecha: period.fecha,
        status,
        allowedStatuses: Array.from(NOVELTY_WRITABLE_PERIOD_STATUSES),
      },
    });
  }

  return {
    id: result.rows[0].id,
    status,
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
    INSERT INTO payroll_periods (tenant_id, anio, mes, fecha_desde, fecha_hasta, status, opened_by)
    VALUES ($1,$2,$3,$4,$5,'open',$6)
    ON CONFLICT (tenant_id, anio, mes) DO UPDATE SET
      status = CASE
        WHEN payroll_periods.status = 'closed' THEN payroll_periods.status
        WHEN payroll_periods.status = 'calculated' THEN payroll_periods.status
        ELSE 'open'
      END,
      fecha_desde = EXCLUDED.fecha_desde,
      fecha_hasta = EXCLUDED.fecha_hasta,
      opened_by = COALESCE(payroll_periods.opened_by, EXCLUDED.opened_by),
      opened_at = CASE WHEN payroll_periods.status IN ('planned', 'open') THEN payroll_periods.opened_at ELSE NOW() END,
      updated_at = NOW()
    RETURNING *
  `, [tenantId, period.anio, period.mes, periodStartDate(period.anio, period.mes), periodEndDate(period.anio, period.mes), userId || null]);

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

async function generateAnnualPayrollPeriods({ tenantId, userId, correlationId, ipAddress, anio }) {
  const year = Number(anio);
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    throw new AppError('El anio de periodos no es valido.', {
      code: 'PAYROLL_PERIOD_YEAR_INVALID',
      statusCode: 400,
    });
  }

  const rows = [];
  for (let month = 1; month <= 12; month += 1) {
    const result = await db.query(`
      INSERT INTO payroll_periods (tenant_id, anio, mes, fecha_desde, fecha_hasta, status, opened_by)
      VALUES ($1,$2,$3,$4,$5,'planned',$6)
      ON CONFLICT (tenant_id, anio, mes) DO UPDATE SET
        fecha_desde = CASE WHEN payroll_periods.status IN ('calculated', 'closed') THEN payroll_periods.fecha_desde ELSE EXCLUDED.fecha_desde END,
        fecha_hasta = CASE WHEN payroll_periods.status IN ('calculated', 'closed') THEN payroll_periods.fecha_hasta ELSE EXCLUDED.fecha_hasta END,
        updated_at = NOW()
      RETURNING *
    `, [tenantId, year, month, periodStartDate(year, month), periodEndDate(year, month), userId || null]);
    rows.push(result.rows[0]);
  }

  await recordAudit({
    tenantId,
    userId,
    correlationId,
    action: 'nomina.periodos.generate_year',
    entity: 'payroll_periods',
    entityId: null,
    newData: { anio: year, total: rows.length },
    ipAddress,
  });

  return { anio: year, total: rows.length, periods: rows };
}

async function listAnnualPayrollPeriods({ tenantId, anio }) {
  const year = Number(anio);
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    throw new AppError('El anio de periodos no es valido.', {
      code: 'PAYROLL_PERIOD_YEAR_INVALID',
      statusCode: 400,
    });
  }

  const result = await db.query(`
    SELECT pp.*,
      TO_CHAR(pp.fecha_desde, 'YYYY-MM-DD') AS fecha_desde,
      TO_CHAR(pp.fecha_hasta, 'YYYY-MM-DD') AS fecha_hasta,
      COALESCE(payroll.total, 0)::int AS payroll_total,
      COALESCE(payroll.borrador, 0)::int AS payroll_borrador,
      COALESCE(payroll.cerrada, 0)::int AS payroll_cerrada,
      COALESCE(novelties.pendiente, 0)::int AS novedades_pendientes,
      COALESCE(novelties.aprobado, 0)::int AS novedades_aprobadas
    FROM payroll_periods pp
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS total,
        COUNT(*) FILTER (WHERE estado = 'borrador') AS borrador,
        COUNT(*) FILTER (WHERE estado = 'cerrada') AS cerrada
      FROM nominas n
      WHERE n.tenant_id = pp.tenant_id AND n.anio = pp.anio AND n.mes = pp.mes
    ) payroll ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) FILTER (WHERE estado = 'pendiente') AS pendiente,
        COUNT(*) FILTER (WHERE estado = 'aprobado') AS aprobado
      FROM novedades_asistencia na
      WHERE na.tenant_id = pp.tenant_id
        AND na.fecha >= pp.fecha_desde
        AND na.fecha <= pp.fecha_hasta
    ) novelties ON true
    WHERE pp.tenant_id = $1 AND pp.anio = $2
    ORDER BY pp.mes ASC
  `, [tenantId, year]);

  return { anio: year, periods: result.rows };
}

async function updatePayrollPeriodDates({ tenantId, userId, correlationId, ipAddress, anio, mes, fechaDesde, fechaHasta }) {
  const period = validatePeriod(anio, mes);
  const from = normalizePeriodBoundaryDate(fechaDesde, period.anio, 'Fecha desde');
  const to = normalizePeriodBoundaryDate(fechaHasta, period.anio, 'Fecha hasta');

  if (from > to) {
    throw new AppError('La fecha desde no puede ser posterior a la fecha hasta.', {
      code: 'PAYROLL_PERIOD_DATE_RANGE_INVALID',
      statusCode: 422,
      details: { fechaDesde: from, fechaHasta: to },
    });
  }

  const current = await db.query(`
    SELECT pp.id, pp.status,
      TO_CHAR(pp.fecha_desde, 'YYYY-MM-DD') AS fecha_desde,
      TO_CHAR(pp.fecha_hasta, 'YYYY-MM-DD') AS fecha_hasta,
      COALESCE(payroll.total, 0)::int AS payroll_total
    FROM payroll_periods pp
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS total
      FROM nominas n
      WHERE n.tenant_id = pp.tenant_id AND n.anio = pp.anio AND n.mes = pp.mes
    ) payroll ON true
    WHERE pp.tenant_id = $1 AND pp.anio = $2 AND pp.mes = $3
    LIMIT 1
  `, [tenantId, period.anio, period.mes]);

  if (current.rows.length === 0) {
    throw new AppError('Genera el periodo antes de editar sus fechas.', {
      code: 'PAYROLL_PERIOD_NOT_FOUND',
      statusCode: 404,
      details: { anio: period.anio, mes: period.mes },
    });
  }

  const previous = current.rows[0];
  if (PERIOD_DATE_EDIT_BLOCKED_STATUSES.has(previous.status) || Number(previous.payroll_total || 0) > 0) {
    throw new AppError('No se pueden editar fechas de un periodo con nómina calculada, cerrada o roles existentes.', {
      code: 'PAYROLL_PERIOD_DATE_EDIT_BLOCKED',
      statusCode: 409,
      details: {
        status: previous.status,
        payrollTotal: Number(previous.payroll_total || 0),
      },
    });
  }

  const result = await db.query(`
    UPDATE payroll_periods
    SET fecha_desde = $4::date,
        fecha_hasta = $5::date,
        summary = COALESCE(summary, '{}'::jsonb) || jsonb_build_object(
          'dateEdit', jsonb_build_object(
            'previousDesde', $6::text,
            'previousHasta', $7::text,
            'correlationId', $8::text,
            'at', NOW()
          )
        ),
        updated_at = NOW()
    WHERE tenant_id = $1 AND anio = $2 AND mes = $3
    RETURNING *,
      TO_CHAR(fecha_desde, 'YYYY-MM-DD') AS fecha_desde,
      TO_CHAR(fecha_hasta, 'YYYY-MM-DD') AS fecha_hasta
  `, [
    tenantId,
    period.anio,
    period.mes,
    from,
    to,
    previous.fecha_desde,
    previous.fecha_hasta,
    correlationId || null,
  ]);

  await recordAudit({
    tenantId,
    userId,
    correlationId,
    action: 'nomina.periodo.update_dates',
    entity: 'payroll_periods',
    entityId: result.rows[0].id,
    previousData: { fechaDesde: previous.fecha_desde, fechaHasta: previous.fecha_hasta },
    newData: { anio: period.anio, mes: period.mes, fechaDesde: from, fechaHasta: to },
    ipAddress,
  });

  return result.rows[0];
}

async function closeOperationalPayrollPeriod({ tenantId, userId, correlationId, ipAddress, anio, mes, motivo }) {
  const period = validatePeriod(anio, mes);
  const reason = String(motivo || '').trim();
  if (reason.length < 10) {
    throw new AppError('Indica un motivo claro para cerrar el periodo operativo.', {
      code: 'PAYROLL_PERIOD_CLOSE_REASON_REQUIRED',
      statusCode: 422,
    });
  }

  const current = await db.query(`
    SELECT id, status
    FROM payroll_periods
    WHERE tenant_id = $1 AND anio = $2 AND mes = $3
    LIMIT 1
  `, [tenantId, period.anio, period.mes]);

  if (current.rows.length === 0) {
    throw new AppError('Genera o abre el periodo antes de cerrarlo.', {
      code: 'PAYROLL_PERIOD_NOT_FOUND',
      statusCode: 404,
    });
  }

  if (current.rows[0].status === 'calculated') {
    throw new AppError('El periodo ya tiene nomina calculada. Usa el cierre de nomina para preservar los roles.', {
      code: 'PAYROLL_PERIOD_CLOSE_REQUIRES_PAYROLL_CLOSE',
      statusCode: 409,
    });
  }

  const blockers = await db.query(`
    SELECT
      COUNT(DISTINCT n.id) FILTER (WHERE n.estado = 'borrador')::int AS payroll_borrador,
      COUNT(DISTINCT na.id) FILTER (WHERE na.estado = 'pendiente')::int AS novedades_pendientes
    FROM payroll_periods pp
    LEFT JOIN nominas n
      ON n.tenant_id = pp.tenant_id AND n.anio = pp.anio AND n.mes = pp.mes
    LEFT JOIN novedades_asistencia na
      ON na.tenant_id = pp.tenant_id
     AND na.fecha >= pp.fecha_desde
     AND na.fecha <= pp.fecha_hasta
    WHERE pp.id = $1
  `, [current.rows[0].id]);

  const payrollDrafts = Number(blockers.rows[0]?.payroll_borrador || 0);
  const pendingNovelties = Number(blockers.rows[0]?.novedades_pendientes || 0);
  if (payrollDrafts > 0 || pendingNovelties > 0) {
    throw new AppError('No se puede cerrar el periodo con nominas borrador o novedades pendientes.', {
      code: 'PAYROLL_PERIOD_CLOSE_BLOCKED',
      statusCode: 409,
      details: { payrollDrafts, pendingNovelties },
    });
  }

  const result = await db.query(`
    UPDATE payroll_periods
    SET status = 'closed',
        closed_at = NOW(),
        summary = COALESCE(summary, '{}'::jsonb) || jsonb_build_object(
          'operationalClose', jsonb_build_object(
            'motivo', $4::text,
            'correlationId', $5::text,
            'at', NOW()
          )
        ),
        updated_at = NOW()
    WHERE tenant_id = $1 AND anio = $2 AND mes = $3
    RETURNING *
  `, [tenantId, period.anio, period.mes, reason, correlationId || null]);

  await recordAudit({
    tenantId,
    userId,
    correlationId,
    action: 'nomina.periodo.close_operational',
    entity: 'payroll_periods',
    entityId: result.rows[0].id,
    newData: { anio: period.anio, mes: period.mes, status: 'closed', motivo: reason },
    ipAddress,
  });

  return result.rows[0];
}

async function closeEmptyPastPayrollPeriods({ tenantId, userId, correlationId, ipAddress, anio, hastaMes, motivo }) {
  const year = Number(anio);
  const untilMonth = Number(hastaMes);
  if (!Number.isInteger(year) || year < 2020 || year > 2100 || !Number.isInteger(untilMonth) || untilMonth < 1 || untilMonth > 12) {
    throw new AppError('Indica año y mes límite válidos para cerrar períodos anteriores.', {
      code: 'PAYROLL_EMPTY_PAST_PERIOD_RANGE_INVALID',
      statusCode: 400,
      details: { anio, hastaMes },
    });
  }

  const reason = String(motivo || `Cierre de períodos anteriores vacíos ${year}`).trim();
  if (reason.length < 10) {
    throw new AppError('Indica un motivo claro para cerrar períodos anteriores vacíos.', {
      code: 'PAYROLL_EMPTY_PAST_PERIOD_REASON_REQUIRED',
      statusCode: 422,
    });
  }

  const result = await db.query(`
    SELECT pp.id, pp.anio, pp.mes, pp.status,
      COALESCE(payroll.total, 0)::int AS payroll_total,
      COALESCE(novelties.total, 0)::int AS novedades_total
    FROM payroll_periods pp
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS total
      FROM nominas n
      WHERE n.tenant_id = pp.tenant_id AND n.anio = pp.anio AND n.mes = pp.mes
    ) payroll ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS total
      FROM novedades_asistencia na
      WHERE na.tenant_id = pp.tenant_id
        AND na.fecha >= pp.fecha_desde
        AND na.fecha <= pp.fecha_hasta
    ) novelties ON true
    WHERE pp.tenant_id = $1
      AND pp.anio = $2
      AND pp.mes BETWEEN 1 AND $3
    ORDER BY pp.mes ASC
  `, [tenantId, year, untilMonth]);

  const eligible = [];
  const skipped = [];
  for (const period of result.rows) {
    const payrollTotal = Number(period.payroll_total || 0);
    const noveltiesTotal = Number(period.novedades_total || 0);
    if (PERIOD_DATE_EDIT_BLOCKED_STATUSES.has(period.status) || payrollTotal > 0 || noveltiesTotal > 0) {
      skipped.push({
        id: period.id,
        anio: Number(period.anio),
        mes: Number(period.mes),
        status: period.status,
        payrollTotal,
        noveltiesTotal,
      });
    } else {
      eligible.push(period);
    }
  }

  let closed = [];
  if (eligible.length > 0) {
    const updateResult = await db.query(`
      UPDATE payroll_periods
      SET status = 'closed',
          closed_at = NOW(),
          summary = COALESCE(summary, '{}'::jsonb) || jsonb_build_object(
            'emptyPastClose', jsonb_build_object(
              'motivo', $3::text,
              'correlationId', $4::text,
              'at', NOW()
            )
          ),
          updated_at = NOW()
      WHERE tenant_id = $1 AND id = ANY($2::uuid[])
      RETURNING *
    `, [tenantId, eligible.map((period) => period.id), reason, correlationId || null]);
    closed = updateResult.rows;
  }

  await recordAudit({
    tenantId,
    userId,
    correlationId,
    action: 'nomina.periodos.close_empty_past',
    entity: 'payroll_periods',
    entityId: null,
    newData: {
      anio: year,
      hastaMes: untilMonth,
      totalClosed: closed.length,
      skipped,
      motivo: reason,
    },
    ipAddress,
  });

  return {
    anio: year,
    hastaMes: untilMonth,
    totalClosed: closed.length,
    closed,
    skipped,
  };
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
    SELECT nb.id, nb.scope_type, nb.scope_value, nb.tipo_novedad, nb.fecha, nb.minutos,
      nb.monto, nb.status, nb.total_empleados, nb.total_creadas, nb.created_at,
      CASE
        WHEN nb.scope_type = 'company' THEN 'Toda la empresa'
        WHEN nb.scope_type = 'employee' AND e.id IS NOT NULL THEN
          CONCAT_WS(' - ', NULLIF(TRIM(CONCAT_WS(' ', e.apellidos, e.nombres)), ''), NULLIF(e.cedula, ''))
        WHEN nb.scope_type = 'employee' THEN 'Empleado no disponible'
        WHEN nb.scope_type = 'department' THEN CONCAT('Departamento: ', nb.scope_value)
        WHEN nb.scope_type = 'position' THEN CONCAT('Cargo: ', nb.scope_value)
        ELSE nb.scope_value
      END AS scope_label
    FROM novelty_batches nb
    LEFT JOIN empleados e
      ON nb.scope_type = 'employee'
      AND e.tenant_id = nb.tenant_id
      AND e.id::text = nb.scope_value
    WHERE nb.tenant_id = $1
      AND nb.period_id = COALESCE($2::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
    ORDER BY nb.created_at DESC
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
  throw new Error('Alcance de lote inválido.');
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
  const minutos = normalizeNoveltyMinutes(payload);
  const monto = roundAmount(payload.monto);
  const justificacion = String(payload.justificacion || 'Lote mensual').trim();
  const fecha = normalizeDate(anio, mes, payload.fecha);
  const periodoNomina = formatPeriodMarker(anio, mes);
  const idempotencyKey = payload.idempotencyKey || makeIdempotencyKey({ tenantId, anio, mes, scopeType, scopeValue, tipoNovedad, minutos, monto, fecha, justificacion });

  if (!VALID_SCOPE_TYPES.has(scopeType)) {
    throw new Error('Alcance de lote inválido.');
  }
  if (scopeType !== 'company' && !scopeValue) {
    throw new Error('El alcance seleccionado requiere un valor.');
  }
  const noveltyConfig = await ensureNoveltyTypeAllowed({ tenantId, tipoNovedad, anio, mes, userId });
  if (noveltyConfig.calculationMode === 'amount' && monto <= 0 && noveltyConfig.payrollImpact !== 'informativo') {
    throw new Error('La novedad requiere un monto mayor a cero según su forma de cálculo.');
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
      INSERT INTO payroll_periods (tenant_id, anio, mes, fecha_desde, fecha_hasta, status, opened_by)
      VALUES ($1,$2,$3,$4,$5,'open',$6)
      ON CONFLICT (tenant_id, anio, mes) DO UPDATE SET updated_at = NOW()
      RETURNING id, status
    `, [tenantId, anio, mes, periodStartDate(anio, mes), periodEndDate(anio, mes), userId || null]);

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

async function deleteNoveltyBatch({ tenantId, userId, batchId, correlationId, ipAddress }) {
  const batch = await db.query(
    `SELECT nb.id, nb.period_id, nb.status, nb.total_creadas, pp.status AS period_status
     FROM novelty_batches nb
     JOIN payroll_periods pp ON pp.id = nb.period_id
     WHERE nb.id = $1 AND nb.tenant_id = $2`,
    [batchId, tenantId],
  );
  if (batch.rows.length === 0) {
    throw new Error('Lote no encontrado.');
  }
  if (batch.rows[0].period_status === 'closed') {
    throw new Error('No se puede eliminar un lote de un periodo cerrado.');
  }

  const consumed = await db.query(
    `SELECT 1
     FROM payroll_calculation_lines pcl
     JOIN novedades_asistencia na
       ON na.tenant_id = pcl.tenant_id
      AND na.id::text = pcl.source_id
     WHERE na.tenant_id = $1
       AND na.novelty_batch_id = $2
       AND pcl.source = 'novedad'
     LIMIT 1`,
    [tenantId, batchId],
  );
  if (consumed.rows.length > 0) {
    throw new AppError('No se puede eliminar un lote con novedades ya consumidas por un rol.', {
      code: 'NOVEDAD_BATCH_CONSUMIDO_POR_ROL',
      statusCode: 409,
    });
  }

  const hasClosedPayroll = await db.query(
    `SELECT 1 FROM nominas
     WHERE tenant_id = $1 AND anio = (SELECT EXTRACT(YEAR FROM fecha) FROM novelty_batches WHERE id = $2)
       AND mes = (SELECT EXTRACT(MONTH FROM fecha) FROM novelty_batches WHERE id = $2)
       AND estado = 'cerrada'
     LIMIT 1`,
    [tenantId, batchId],
  );
  if (hasClosedPayroll.rows.length > 0) {
    throw new Error('No se puede eliminar un lote cuando ya existen roles cerrados.');
  }

  const client = await db.getClient(tenantId, userId);
  try {
    const deleted = await client.query(
      `DELETE FROM novedades_asistencia WHERE novelty_batch_id = $1 AND tenant_id = $2`,
      [batchId, tenantId],
    );
    await client.query(
      `DELETE FROM novelty_batches WHERE id = $1 AND tenant_id = $2`,
      [batchId, tenantId],
    );
    await db.commit(client);

    await recordAudit({
      tenantId,
      userId,
      correlationId,
      action: 'nomina.novedades.batch.delete',
      entity: 'novelty_batches',
      entityId: batchId,
      newData: { deletedNovelties: deleted.rowCount },
      ipAddress,
    });

    return { deleted: deleted.rowCount };
  } catch (err) {
    await db.rollback(client);
    throw err;
  }
}

function roundAmount(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('El monto de la novedad debe ser un número positivo.');
  }
  return Math.round(amount * 100) / 100;
}

function normalizeNoveltyMinutes(payload = {}) {
  const hasMinutes = payload.minutos !== undefined && payload.minutos !== null && payload.minutos !== '';
  const rawValue = hasMinutes ? payload.minutos : Number(payload.horas ?? payload.hours ?? 0) * 60;
  const minutes = Number(rawValue || 0);
  if (!Number.isFinite(minutes) || minutes < 0) {
    throw new Error('Las horas de la novedad deben ser un número positivo.');
  }
  return Math.round(minutes);
}

module.exports = {
  buildEmployeeQuery,
  closeEmptyPastPayrollPeriods,
  closeOperationalPayrollPeriod,
  createNoveltyBatch,
  deleteNoveltyBatch,
  currentPeriodInEcuador,
  dateInEcuador,
  ensurePayrollPeriodForDate,
  ensureWritablePayrollPeriodForDate,
  extractPeriodFromDate,
  formatPeriodMarker,
  generateAnnualPayrollPeriods,
  getPayrollPeriodState,
  listAnnualPayrollPeriods,
  openPayrollPeriod,
  periodEndDate,
  periodStartDate,
  todayInEcuador,
  updatePayrollPeriodDates,
  validatePeriod,
};
