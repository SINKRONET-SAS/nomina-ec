// ============================================================
// SKNOMINA - Controlador de Novedades
// ============================================================
const db = require('../config/database');
const AppError = require('../utils/AppError');
const { resolveStorageUrl } = require('../config/s3');
const { recordAudit } = require('../services/auditService');
const { ensureWritablePayrollPeriodForDate, formatPeriodMarker, validatePeriod } = require('../services/monthlyPeriodService');
const {
  ensureNoveltyTypeAllowed,
  getActiveNoveltyTypeConfigs,
  isOvertimeConcept,
  normalizeNoveltyCode,
  weekKeyFromDate,
} = require('../services/payrollNoveltyService');
const { getLegalParametersForTenant } = require('../services/legalParameterService');
const { monthInEcuador, yearInEcuador } = require('../utils/dateEcuador');
const { sendNotificacionPermisoResuelto } = require('../services/communicationService');

const NOVELTY_BULK_TEMPLATE_COLUMNS = [
  'empleadoId',
  'cedula',
  'fecha',
  'tipoNovedad',
  'horas',
  'monto',
  'justificacion',
  'idempotencyKey',
];
const NOVELTY_WRITABLE_PERIOD_STATUSES = new Set(['open', 'novelties_loaded', 'reopened', 'calculation_failed']);
const NOVELTY_OPERATIVE_PERIOD_STATUSES = new Set([...NOVELTY_WRITABLE_PERIOD_STATUSES, 'calculated']);
const DEFAULT_OVERTIME_NOVELTY_CODES = new Set(['hora_extra_50', 'hora_extra_100']);
const OVERTIME_LIMIT_APPROVAL_REASON_MIN_LENGTH = 10;

function resolveNoveltyMetadata(row = {}) {
  const metadata = row.metadata && typeof row.metadata === 'object' ? { ...row.metadata } : row.metadata;
  if (!metadata || typeof metadata !== 'object') return row;
  const support = metadata.soporteMedico;
  if (!support || typeof support !== 'object') return row;

  return {
    ...row,
    metadata: {
      ...metadata,
      soporteMedico: {
        ...support,
        url: resolveStorageUrl(support.url, support.storageKey),
      },
    },
  };
}

async function listar(req, res) {
  try {
    const { tenantId } = req;
    const { estado, tipo, mes, anio } = req.query;
    
    let query = `
      SELECT na.*, e.nombres, e.apellidos, e.cedula
      FROM novedades_asistencia na
      JOIN empleados e ON na.empleado_id = e.id
      WHERE na.tenant_id = $1
    `;
    const params = [tenantId];
    
    if (estado) {
      query += ` AND na.estado = $${params.length + 1}`;
      params.push(estado);
    }
    if (tipo) {
      query += ` AND na.tipo_novedad = $${params.length + 1}`;
      params.push(tipo);
    }
    if (mes && anio) {
      query += ` AND EXTRACT(MONTH FROM na.fecha) = $${params.length + 1} AND EXTRACT(YEAR FROM na.fecha) = $${params.length + 2}`;
      params.push(mes, anio);
    }
    
    query += ` ORDER BY na.fecha DESC, e.apellidos`;
    
    const result = await db.query(query, params);
    res.json({ success: true, novedades: result.rows.map(resolveNoveltyMetadata) });
  } catch (err) {
    console.error('[NOVEDADES] Error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

async function listarPendientes(req, res) {
  try {
    const { tenantId } = req;
    const scope = String(req.query?.scope || 'pendientes').trim().toLowerCase();
    const params = [tenantId];
    let filter = "na.estado = 'pendiente'";

    if (scope === 'operativas') {
      params.push(Array.from(NOVELTY_OPERATIVE_PERIOD_STATUSES));
      filter = `
        na.estado IN ('pendiente', 'aprobado', 'rechazado')
        AND pp.status = ANY($2::text[])
      `;
    }

    const result = await db.query(`
      SELECT
        na.*,
        na.fecha::text AS fecha,
        e.nombres,
        e.apellidos,
        e.cedula,
        pp.status AS period_status,
        pp.anio AS period_anio,
        pp.mes AS period_mes,
        EXISTS (
          SELECT 1
          FROM payroll_calculation_lines pcl
          WHERE pcl.tenant_id = na.tenant_id
            AND pcl.source = 'novedad'
            AND pcl.source_id = na.id::text
        ) AS consumida_por_rol,
        EXISTS (
          SELECT 1
          FROM nominas n
          WHERE n.tenant_id = na.tenant_id
            AND n.empleado_id = na.empleado_id
            AND n.anio = EXTRACT(YEAR FROM na.fecha)::int
            AND n.mes = EXTRACT(MONTH FROM na.fecha)::int
            AND n.estado = 'borrador'
        ) AS has_employee_payroll_draft
      FROM novedades_asistencia na
      JOIN empleados e ON na.empleado_id = e.id
      LEFT JOIN payroll_periods pp
        ON pp.tenant_id = na.tenant_id
       AND pp.anio = EXTRACT(YEAR FROM na.fecha)::int
       AND pp.mes = EXTRACT(MONTH FROM na.fecha)::int
      WHERE na.tenant_id = $1 AND ${filter}
      ORDER BY na.fecha DESC, e.apellidos, e.nombres
    `, params);

    const novedades = result.rows.map((row) => ({
      ...resolveNoveltyMetadata(row),
      editable: NOVELTY_WRITABLE_PERIOD_STATUSES.has(row.period_status) && !row.consumida_por_rol,
      requiresEmployeePayrollInvalidation: Boolean(row.consumida_por_rol && row.has_employee_payroll_draft && row.period_status !== 'closed'),
      canRecalculateEmployee: Boolean(
        !row.consumida_por_rol
        && row.estado === 'aprobado'
        && ['reopened', 'calculation_failed'].includes(row.period_status)
      ),
    }));

    res.json({ success: true, novedades });
  } catch (err) {
    console.error('[NOVEDADES] Error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

async function crear(req, res) {
  try {
    const { tenantId, usuarioId } = req;
    const { empleadoId, fecha, tipoNovedad, minutos, horas, monto, justificacion } = req.body;
    
    if (!empleadoId || !fecha || !tipoNovedad) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const empleado = await db.query(
      'SELECT id FROM empleados WHERE id = $1 AND tenant_id = $2 AND activo = true',
      [empleadoId, tenantId]
    );
    if (empleado.rows.length === 0) {
      return res.status(404).json({
        error: 'EMPLEADO_NO_ENCONTRADO',
        message: 'Empleado no encontrado para el tenant actual.',
        correlationId: req.correlationId,
      });
    }
    
    const normalizedTipo = normalizeNoveltyCode(tipoNovedad);
    const minutosNovedad = normalizePayloadMinutes({ minutos, horas, hours: req.body?.hours });
    const period = await ensureWritablePayrollPeriodForDate({ tenantId, fecha });
    const noveltyConfig = await ensureNoveltyTypeAllowed({
      tenantId,
      tipoNovedad: normalizedTipo,
      anio: Number(period.periodoNomina.slice(0, 4)),
      mes: Number(period.periodoNomina.slice(5, 7)),
      userId: usuarioId,
    });
    const montoNovedad = normalizeAmount(monto);
    if (noveltyConfig.calculationMode === 'amount' && montoNovedad <= 0 && noveltyConfig.payrollImpact !== 'informativo') {
      return res.status(422).json({ error: 'La novedad requiere un monto mayor a cero según su forma de cálculo.' });
    }
    if (period.status === 'closed') {
      return res.status(422).json({ error: 'No se puede registrar novedades en un periodo cerrado' });
    }

    const result = await db.query(`
      INSERT INTO novedades_asistencia (
        empleado_id, tenant_id, period_id, periodo_nomina, fecha, tipo_novedad, minutos, monto, justificacion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, empleado_id, fecha, tipo_novedad, minutos, monto, estado
    `, [empleadoId, tenantId, period.id, period.periodoNomina, fecha, normalizedTipo, minutosNovedad, montoNovedad, justificacion || '']);

    await recordAudit({
      tenantId,
      userId: usuarioId,
      correlationId: req.correlationId,
      action: 'novedades.manual.crear',
      entity: 'novedades_asistencia',
      entityId: result.rows[0].id,
      newData: {
        empleadoId,
        fecha,
        tipoNovedad: normalizedTipo,
        minutos: minutosNovedad,
        monto: montoNovedad,
        periodoNomina: period.periodoNomina,
      },
      ipAddress: req.ip,
    });
    
    res.status(201).json({ success: true, novedad: result.rows[0], correlationId: req.correlationId });
  } catch (err) {
    console.error('[NOVEDADES] Error creando novedad manual', {
      code: err.code || 'NOVEDAD_MANUAL_CREATE_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    res.status(err.statusCode || 500).json({
      error: err.code || 'NOVEDAD_MANUAL_CREATE_ERROR',
      message: err.message || 'Error interno',
      details: err.details,
      correlationId: req.correlationId,
    });
  }
}

async function listarTipos(req, res) {
  try {
    const { tenantId } = req;
    const fecha = String(req.query?.fecha || '').slice(0, 10);
    const dateParts = /^(\d{4})-(\d{2})-\d{2}$/.exec(fecha);
    const anio = Number(req.query?.anio || dateParts?.[1] || yearInEcuador());
    const mes = Number(req.query?.mes || dateParts?.[2] || monthInEcuador());
    const configs = await getActiveNoveltyTypeConfigs(tenantId, anio, mes);

    return res.json({
      success: true,
      tipos: configs.map((config) => ({
        id: config.id,
        code: config.code,
        name: config.name,
        description: config.description,
        payrollImpact: config.payrollImpact,
        calculationMode: config.calculationMode,
        conceptCode: config.conceptCode,
        affectsIess: config.affectsIess,
        affectsIncomeTax: config.affectsIncomeTax,
        affectsDecimos: config.affectsDecimos,
        affectsVacation: config.affectsVacation,
        affectsBankFile: config.affectsBankFile,
        metadata: config.metadata,
      })),
      period: { anio, mes },
      correlationId: req.correlationId,
    });
  } catch (err) {
    console.error('[NOVEDADES] Error listando tipos de novedad', {
      code: err.code || 'NOVEDAD_TIPOS_LIST_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'NOVEDAD_TIPOS_LIST_ERROR',
      message: err.message || 'Error interno',
      correlationId: req.correlationId,
    });
  }
}

async function actualizar(req, res) {
  try {
    const { tenantId, usuarioId } = req;
    const { id } = req.params;
    const { novelty: previous } = await ensureNoveltyEditable({ tenantId, noveltyId: id });
    const empleadoId = String(req.body?.empleadoId || previous.empleado_id || '').trim();
    const fecha = String(req.body?.fecha || previous.fecha || '').slice(0, 10);
    const normalizedTipo = normalizeNoveltyCode(req.body?.tipoNovedad || req.body?.tipo_novedad || previous.tipo_novedad);
    const hasHoursPayload = req.body?.horas !== undefined || req.body?.hours !== undefined;
    const minutosNovedad = normalizePayloadMinutes({
      minutos: req.body?.minutos ?? (hasHoursPayload ? undefined : previous.minutos),
      horas: req.body?.horas,
      hours: req.body?.hours,
    });
    const montoNovedad = normalizeAmount(req.body?.monto ?? previous.monto);
    const justificacion = String(req.body?.justificacion ?? previous.justificacion ?? '').trim();

    if (!empleadoId || !fecha || !normalizedTipo) {
      throw new AppError('Empleado, fecha y tipo de novedad son requeridos.', {
        code: 'NOVEDAD_MANUAL_UPDATE_INVALID',
        statusCode: 400,
      });
    }

    const empleado = await db.query(
      'SELECT id FROM empleados WHERE id = $1 AND tenant_id = $2 AND activo = true',
      [empleadoId, tenantId]
    );
    if (empleado.rows.length === 0) {
      throw new AppError('Empleado no encontrado para el tenant actual.', {
        code: 'EMPLEADO_NO_ENCONTRADO',
        statusCode: 404,
      });
    }

    const period = await ensureWritablePayrollPeriodForDate({ tenantId, fecha });
    const noveltyConfig = await ensureNoveltyTypeAllowed({
      tenantId,
      tipoNovedad: normalizedTipo,
      anio: Number(period.periodoNomina.slice(0, 4)),
      mes: Number(period.periodoNomina.slice(5, 7)),
      userId: usuarioId,
    });
    if (noveltyConfig.calculationMode === 'amount' && montoNovedad <= 0 && noveltyConfig.payrollImpact !== 'informativo') {
      throw new AppError('La novedad requiere un monto mayor a cero segun su forma de calculo.', {
        code: 'NOVEDAD_REQUIERE_MONTO',
        statusCode: 422,
      });
    }

    const result = await db.query(`
      UPDATE novedades_asistencia
      SET empleado_id = $3,
          period_id = $4,
          periodo_nomina = $5,
          fecha = $6,
          tipo_novedad = $7,
          minutos = $8,
          monto = $9,
          justificacion = $10,
          estado = 'pendiente',
          aprobado_por = NULL,
          aprobado_en = NULL,
          updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING id, empleado_id, fecha, tipo_novedad, minutos, monto, justificacion, estado
    `, [
      id,
      tenantId,
      empleadoId,
      period.id,
      period.periodoNomina,
      fecha,
      normalizedTipo,
      minutosNovedad,
      montoNovedad,
      justificacion,
    ]);

    await recordAudit({
      tenantId,
      userId: usuarioId,
      correlationId: req.correlationId,
      action: 'novedades.manual.actualizar',
      entity: 'novedades_asistencia',
      entityId: id,
      previousData: previous,
      newData: result.rows[0],
      ipAddress: req.ip,
    });

    return res.json({ success: true, novedad: result.rows[0], correlationId: req.correlationId });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        error: 'NOVEDAD_DUPLICADA',
        message: 'Ya existe una novedad del mismo tipo para ese empleado y fecha.',
        correlationId: req.correlationId,
      });
    }
    console.error('[NOVEDADES] Error actualizando novedad manual', {
      code: err.code || 'NOVEDAD_MANUAL_UPDATE_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'NOVEDAD_MANUAL_UPDATE_ERROR',
      message: err.message || 'Error interno',
      details: err.details,
      correlationId: req.correlationId,
    });
  }
}

async function eliminar(req, res) {
  try {
    const { tenantId, usuarioId } = req;
    const { id } = req.params;
    const { novelty } = await ensureNoveltyEditable({ tenantId, noveltyId: id });
    const result = await db.query(`
      DELETE FROM novedades_asistencia
      WHERE id = $1 AND tenant_id = $2
      RETURNING id
    `, [id, tenantId]);

    await recordAudit({
      tenantId,
      userId: usuarioId,
      correlationId: req.correlationId,
      action: 'novedades.manual.eliminar',
      entity: 'novedades_asistencia',
      entityId: id,
      previousData: novelty,
      newData: { deleted: result.rows.length > 0 },
      ipAddress: req.ip,
    });

    return res.json({ success: true, deleted: result.rows.length > 0, correlationId: req.correlationId });
  } catch (err) {
    console.error('[NOVEDADES] Error eliminando novedad manual', {
      code: err.code || 'NOVEDAD_MANUAL_DELETE_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'NOVEDAD_MANUAL_DELETE_ERROR',
      message: err.message || 'Error interno',
      details: err.details,
      correlationId: req.correlationId,
    });
  }
}

async function descargarPlantillaCargaMasiva(_req, res) {
  const example = [
    '',
    '0102030405',
    '2026-06-30',
    'hora_extra_50',
    '2.00',
    '0',
    'Horas aprobadas por cierre mensual',
    'NOM-202606-0102030405-001',
  ];
  const csv = [
    NOVELTY_BULK_TEMPLATE_COLUMNS.join(','),
    example.map(csvCell).join(','),
  ].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="plantilla_carga_masiva_novedades.csv"');
  return res.status(200).send(`\ufeff${csv}`);
}

async function cargaMasiva(req, res) {
  try {
    const { tenantId, usuarioId } = req;
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (rows.length === 0) {
      return res.status(400).json({
        error: 'NOVEDADES_CARGA_MASIVA_SIN_FILAS',
        message: 'La carga masiva requiere al menos una fila.',
        correlationId: req.correlationId,
      });
    }

    const results = [];
    for (const [index, row] of rows.entries()) {
      const normalized = normalizeBulkRow(row);
      try {
        const employee = await resolveEmployeeForBulkRow(tenantId, normalized);
        const period = await ensureWritablePayrollPeriodForDate({ tenantId, fecha: normalized.fecha });
        if (period.status === 'closed') {
          throw new Error('No se puede registrar novedades en un periodo cerrado.');
        }
        const anio = Number(period.periodoNomina.slice(0, 4));
        const mes = Number(period.periodoNomina.slice(5, 7));
        const noveltyConfig = await ensureNoveltyTypeAllowed({
          tenantId,
          tipoNovedad: normalized.tipoNovedad,
          anio,
          mes,
          userId: usuarioId,
        });
        if (noveltyConfig.calculationMode === 'amount' && normalized.monto <= 0 && noveltyConfig.payrollImpact !== 'informativo') {
          throw new Error('La novedad requiere monto mayor a cero.');
        }

        const inserted = await db.query(`
          INSERT INTO novedades_asistencia (
            empleado_id, tenant_id, period_id, periodo_nomina, fecha, tipo_novedad, minutos, monto, justificacion, metadata
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          RETURNING id, empleado_id, fecha, tipo_novedad, minutos, monto, estado
        `, [
          employee.id,
          tenantId,
          period.id,
          period.periodoNomina,
          normalized.fecha,
          normalized.tipoNovedad,
          normalized.minutos,
          normalized.monto,
          normalized.justificacion,
          JSON.stringify({
            source: 'carga_masiva_novedades',
            rowNumber: index + 2,
            idempotencyKey: normalized.idempotencyKey,
          }),
        ]);
        results.push({ rowNumber: index + 2, status: 'created', novedad: inserted.rows[0] });
      } catch (rowErr) {
        results.push({
          rowNumber: index + 2,
          status: 'error',
          error: rowErr.code || 'NOVEDAD_ROW_ERROR',
          message: rowErr.message,
        });
      }
    }

    await recordAudit({
      tenantId,
      userId: usuarioId,
      correlationId: req.correlationId,
      action: 'novedades.carga_masiva',
      entity: 'novedades_asistencia',
      newData: {
        total: rows.length,
        creadas: results.filter((row) => row.status === 'created').length,
        errores: results.filter((row) => row.status === 'error').length,
      },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      total: rows.length,
      creadas: results.filter((row) => row.status === 'created').length,
      errores: results.filter((row) => row.status === 'error').length,
      results,
      correlationId: req.correlationId,
    });
  } catch (err) {
    console.error('[NOVEDADES] Error en carga masiva', {
      code: err.code || 'NOVEDADES_CARGA_MASIVA_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'NOVEDADES_CARGA_MASIVA_ERROR',
      message: err.message,
      correlationId: req.correlationId,
    });
  }
}

function normalizeBulkRow(row = {}) {
  const tipoNovedad = normalizeNoveltyCode(row.tipoNovedad || row.tipo_novedad);
  const fecha = String(row.fecha || '').slice(0, 10);
  if (!fecha || !tipoNovedad) {
    throw new Error('Cada fila requiere fecha y tipoNovedad.');
  }
  return {
    empleadoId: String(row.empleadoId || row.empleado_id || '').trim(),
    cedula: String(row.cedula || '').trim(),
    fecha,
    tipoNovedad,
    minutos: normalizeHoursToMinutes(row.horas ?? row.hours ?? (Number(row.minutos || 0) / 60)),
    monto: normalizeAmount(row.monto),
    justificacion: String(row.justificacion || '').trim(),
    idempotencyKey: String(row.idempotencyKey || row.idempotency_key || '').trim(),
  };
}

async function ensureNoveltyEditable({ tenantId, noveltyId }) {
  const result = await db.query(`
    SELECT
      id,
      empleado_id,
      tenant_id,
      period_id,
      periodo_nomina,
      fecha::text AS fecha,
      tipo_novedad,
      minutos,
      monto,
      justificacion,
      estado,
      novelty_batch_id
    FROM novedades_asistencia
    WHERE id = $1 AND tenant_id = $2
    LIMIT 1
  `, [noveltyId, tenantId]);

  if (result.rows.length === 0) {
    throw new AppError('Novedad no encontrada.', {
      code: 'NOVEDAD_NO_ENCONTRADA',
      statusCode: 404,
    });
  }

  const novelty = result.rows[0];
  const period = await ensureWritablePayrollPeriodForDate({ tenantId, fecha: novelty.fecha });
  const consumed = await db.query(`
    SELECT 1
    FROM payroll_calculation_lines
    WHERE tenant_id = $1
      AND source = 'novedad'
      AND source_id = $2
    LIMIT 1
  `, [tenantId, String(novelty.id)]);

  if (consumed.rows.length > 0) {
    throw new AppError('La novedad ya fue consumida por un rol de pago. Libera primero el calculo de este empleado antes de modificarla.', {
      code: 'NOVEDAD_CONSUMIDA_POR_ROL',
      statusCode: 409,
      details: {
        noveltyId,
        periodoNomina: period.periodoNomina,
      },
    });
  }

  return { novelty, period };
}

async function resolveEmployeeForBulkRow(tenantId, row) {
  if (!row.empleadoId && !row.cedula) {
    throw new Error('Cada fila requiere empleadoId o cedula.');
  }

  const params = [tenantId];
  const clauses = ['tenant_id = $1', 'activo = true'];
  const identifiers = [];
  if (/^[0-9a-fA-F-]{36}$/.test(row.empleadoId)) {
    params.push(row.empleadoId);
    identifiers.push(`id = $${params.length}::uuid`);
  }
  if (row.cedula) {
    params.push(row.cedula);
    identifiers.push(`cedula = $${params.length}`);
  }
  clauses.push(`(${identifiers.join(' OR ')})`);

  const result = await db.query(`
    SELECT id
    FROM empleados
    WHERE ${clauses.join(' AND ')}
    LIMIT 1
  `, params);
  if (result.rows.length === 0) {
    throw new Error('Empleado no encontrado para la fila.');
  }
  return result.rows[0];
}

function normalizeNonNegativeNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : 0;
}

function normalizeHoursToMinutes(value) {
  const hours = Number(value || 0);
  return Number.isFinite(hours) && hours >= 0 ? Math.round(hours * 60) : 0;
}

function normalizePayloadMinutes(payload = {}) {
  const hasMinutes = payload.minutos !== undefined && payload.minutos !== null && payload.minutos !== '';
  return hasMinutes
    ? normalizeNonNegativeNumber(payload.minutos)
    : normalizeHoursToMinutes(payload.horas ?? payload.hours);
}

function normalizeMetadata(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function dateFromWeekStart(weekStartDate, offsetDays) {
  const date = new Date(`${weekStartDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function periodFromDate(value) {
  const date = String(value || '').slice(0, 10);
  return {
    anio: Number(date.slice(0, 4)),
    mes: Number(date.slice(5, 7)),
  };
}

async function getOvertimeCodesForPeriod(tenantId, anio, mes) {
  const configs = await getActiveNoveltyTypeConfigs(tenantId, anio, mes);
  const codes = new Set(DEFAULT_OVERTIME_NOVELTY_CODES);
  for (const config of configs) {
    if (isOvertimeConcept(config.conceptCode)) codes.add(config.code);
  }
  return codes;
}

function approvedOvertimeExceptionMinutes(row, assumeApprovedException) {
  if (assumeApprovedException) return Number(row.minutos || 0);
  const metadata = normalizeMetadata(row.metadata);
  return metadata.overtimeLimitException?.approved === true ? Number(row.minutos || 0) : 0;
}

function buildOvertimeExceptionPayload({ usuarioId, reason, maxWeeklyOvertimeHours, approvedVia }) {
  return {
    approved: true,
    approvedBy: usuarioId || null,
    approvedAt: new Date().toISOString(),
    reason,
    limitHours: maxWeeklyOvertimeHours,
    approvedVia,
  };
}

async function validateOvertimeLimitApproval({
  tenantId,
  usuarioId,
  rowsToApprove,
  anio,
  mes,
  approveException = false,
  exceptionReason = '',
  approvedVia = 'novedad.aprobar',
}) {
  const rows = Array.isArray(rowsToApprove) ? rowsToApprove : [];
  if (rows.length === 0) {
    return { exceptionIds: [], exceptionPayload: null, violations: [] };
  }

  const overtimeCodes = await getOvertimeCodesForPeriod(tenantId, anio, mes);
  const overtimeRows = rows.filter((row) => overtimeCodes.has(normalizeNoveltyCode(row.tipo_novedad || row.tipoNovedad)));
  if (overtimeRows.length === 0) {
    return { exceptionIds: [], exceptionPayload: null, violations: [] };
  }

  const legalParameters = await getLegalParametersForTenant(tenantId, anio);
  const maxWeeklyOvertimeHours = Number(legalParameters.payroll?.maxWeeklyOvertimeHours ?? 12);
  const maxWeeklyMinutes = maxWeeklyOvertimeHours * 60;
  if (!Number.isFinite(maxWeeklyMinutes) || maxWeeklyMinutes <= 0) {
    return { exceptionIds: [], exceptionPayload: null, violations: [] };
  }

  const weekStarts = [...new Set(overtimeRows.map((row) => weekKeyFromDate(row.fecha)))].filter(Boolean);
  const minDate = weekStarts.reduce((min, value) => (value < min ? value : min), weekStarts[0]);
  const maxDate = weekStarts.reduce((max, value) => {
    const endDate = dateFromWeekStart(value, 6);
    return endDate > max ? endDate : max;
  }, dateFromWeekStart(weekStarts[0], 6));
  const employeeIds = [...new Set(overtimeRows.map((row) => row.empleado_id || row.empleadoId).filter(Boolean))];
  const targetIds = overtimeRows.map((row) => String(row.id)).filter(Boolean);

  const approvedRows = await db.query(`
    SELECT id, empleado_id, fecha::text AS fecha, tipo_novedad, minutos, metadata
    FROM novedades_asistencia
    WHERE tenant_id = $1
      AND empleado_id = ANY($2::uuid[])
      AND estado = 'aprobado'
      AND fecha >= $3::date
      AND fecha <= $4::date
      AND tipo_novedad = ANY($5::text[])
      AND NOT (id = ANY($6::uuid[]))
  `, [tenantId, employeeIds, minDate, maxDate, Array.from(overtimeCodes), targetIds]);

  const groups = new Map();
  const allRows = [
    ...approvedRows.rows.map((row) => ({ ...row, __target: false, __exceptionCandidate: false })),
    ...overtimeRows.map((row) => ({ ...row, __target: true, __exceptionCandidate: Boolean(approveException) })),
  ];

  for (const row of allRows) {
    const employeeId = row.empleado_id || row.empleadoId;
    const weekStartDate = weekKeyFromDate(row.fecha);
    const key = `${employeeId}|${weekStartDate}`;
    const current = groups.get(key) || {
      employeeId,
      weekStartDate,
      minutes: 0,
      exceptionMinutes: 0,
      targetIds: [],
    };
    const minutes = Number(row.minutos || 0);
    current.minutes += minutes;
    current.exceptionMinutes += approvedOvertimeExceptionMinutes(row, row.__exceptionCandidate);
    if (row.__target && row.id) current.targetIds.push(String(row.id));
    groups.set(key, current);
  }

  const violations = [];
  const exceptionIds = new Set();
  for (const group of groups.values()) {
    const excessMinutes = Math.max(0, group.minutes - maxWeeklyMinutes);
    if (excessMinutes <= 0) continue;
    if (group.exceptionMinutes >= excessMinutes) {
      group.targetIds.forEach((id) => exceptionIds.add(id));
      continue;
    }
    violations.push({
      empleadoId: group.employeeId,
      weekStartDate: group.weekStartDate,
      hours: Math.round((group.minutes / 60) * 100) / 100,
      maxHours: maxWeeklyOvertimeHours,
      excessHours: Math.round((excessMinutes / 60) * 100) / 100,
      approvedExceptionHours: Math.round((group.exceptionMinutes / 60) * 100) / 100,
    });
  }

  if (violations.length > 0) {
    throw new AppError('Las horas extra exceden el limite semanal y requieren aprobacion explicita.', {
      code: 'NOVEDAD_HORAS_EXTRA_LIMITE_APROBACION_REQUERIDA',
      statusCode: 422,
      details: {
        violations,
        maxWeeklyOvertimeHours,
      },
    });
  }

  if (exceptionIds.size > 0) {
    const reason = String(exceptionReason || '').trim();
    if (reason.length < OVERTIME_LIMIT_APPROVAL_REASON_MIN_LENGTH) {
      throw new AppError('La aprobacion para exceder el limite de horas extra requiere un motivo de al menos 10 caracteres.', {
        code: 'NOVEDAD_HORAS_EXTRA_EXCESO_MOTIVO_REQUERIDO',
        statusCode: 422,
        details: {
          minLength: OVERTIME_LIMIT_APPROVAL_REASON_MIN_LENGTH,
        },
      });
    }
    return {
      exceptionIds: Array.from(exceptionIds),
      exceptionPayload: buildOvertimeExceptionPayload({
        usuarioId,
        reason,
        maxWeeklyOvertimeHours,
        approvedVia,
      }),
      violations: [],
    };
  }

  return { exceptionIds: [], exceptionPayload: null, violations: [] };
}

async function aprobar(req, res) {
  try {
    const { id } = req.params;
    const { tenantId, usuarioId } = req;
    const approveException = req.body?.approveOvertimeLimitException === true || req.body?.aprobarExcesoHorasExtra === true;
    const exceptionReason = req.body?.overtimeLimitApprovalReason || req.body?.motivoExcesoHorasExtra || req.body?.motivo || '';

    const current = await db.query(`
      SELECT id, empleado_id, tenant_id, fecha::text AS fecha, tipo_novedad, minutos, metadata
      FROM novedades_asistencia
      WHERE id = $1 AND tenant_id = $2
      LIMIT 1
    `, [id, tenantId]);

    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Novedad no encontrada' });
    }

    const period = periodFromDate(current.rows[0].fecha);
    const overtimeApproval = await validateOvertimeLimitApproval({
      tenantId,
      usuarioId,
      rowsToApprove: current.rows,
      anio: period.anio,
      mes: period.mes,
      approveException,
      exceptionReason,
      approvedVia: 'novedad.individual',
    });
    const exceptionPayload = overtimeApproval.exceptionIds.includes(String(id))
      ? JSON.stringify(overtimeApproval.exceptionPayload)
      : null;

    const result = await db.query(`
      UPDATE novedades_asistencia
      SET estado = 'aprobado',
          aprobado_por = $1,
          aprobado_en = NOW(),
          metadata = CASE
            WHEN $4::jsonb IS NULL THEN COALESCE(metadata, '{}'::jsonb)
            ELSE COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('overtimeLimitException', $4::jsonb)
          END,
          updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
      RETURNING id, estado, aprobado_por, empleado_id, tipo_novedad, fecha, metadata
    `, [usuarioId, id, tenantId, exceptionPayload]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Novedad no encontrada' });
    }

    // HAL-122: Notificar al empleado si es un permiso
    const novedad = result.rows[0];
    if (String(novedad.tipo_novedad || '').startsWith('permiso')) {
      notifyPermissionResolution(tenantId, novedad, 'aprobado', req.correlationId, usuarioId);
    }

    res.json({ success: true, novedad });
  } catch (err) {
    console.error('[NOVEDADES] Error aprobando novedad', {
      code: err.code || 'NOVEDAD_APROBAR_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    res.status(err.statusCode || 500).json({
      error: err.code || 'NOVEDAD_APROBAR_ERROR',
      message: err.message || 'Error interno',
      details: err.details,
      correlationId: req.correlationId,
    });
  }
}

async function rechazar(req, res) {
  try {
    const { id } = req.params;
    const { tenantId, usuarioId } = req;
    const { motivo } = req.body;

    const result = await db.query(`
      UPDATE novedades_asistencia
      SET estado = 'rechazado', aprobado_por = $1, justificacion = $2, updated_at = NOW()
      WHERE id = $3 AND tenant_id = $4
      RETURNING id, estado, empleado_id, tipo_novedad, fecha
    `, [usuarioId, motivo || '', id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Novedad no encontrada' });
    }

    const novedad = result.rows[0];
    if (String(novedad.tipo_novedad || '').startsWith('permiso')) {
      notifyPermissionResolution(tenantId, novedad, 'rechazado', req.correlationId, usuarioId);
    }

    res.json({ success: true, novedad });
  } catch (err) {
    console.error('[NOVEDADES] Error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

async function notifyPermissionResolution(tenantId, novedad, decision, correlationId, userId) {
  try {
    const empResult = await db.query(
      'SELECT id, tenant_id, nombres, apellidos, email_personal FROM empleados WHERE id = $1 AND tenant_id = $2',
      [novedad.empleado_id, tenantId]
    );
    if (empResult.rows.length > 0) {
      await sendNotificacionPermisoResuelto({
        employee: empResult.rows[0],
        permiso: { fecha_inicio: novedad.fecha, fecha_fin: novedad.fecha },
        decision,
        correlationId,
        userId,
      });
    }
  } catch (err) {
    console.error('[NOVEDADES] No se pudo notificar resolución de permiso', {
      code: err.code || 'PERMISO_NOTIFICACION_ERROR',
      statusCode: 500,
      message: err.message,
    });
  }
}

async function resolverPeriodo(req, res) {
  try {
    const { tenantId, usuarioId } = req;
    const { anio, mes } = validatePeriod(req.body?.anio, req.body?.mes);
    const decision = String(req.body?.decision || 'aprobar').trim().toLowerCase();
    const motivo = String(req.body?.motivo || '').trim();
    const periodoNomina = formatPeriodMarker(anio, mes);

    if (!['aprobar', 'rechazar'].includes(decision)) {
      return res.status(400).json({
        error: 'DECISION_NOVEDADES_INVALIDA',
        message: 'La decision debe ser aprobar o rechazar.',
        correlationId: req.correlationId,
      });
    }

    const estado = decision === 'aprobar' ? 'aprobado' : 'rechazado';
    const estadoSql = estado === 'aprobado' ? "'aprobado'" : "'rechazado'";
    const justificacion = estado === 'rechazado' ? motivo : null;
    if (estado === 'rechazado' && motivo.length < 5) {
      return res.status(422).json({
        error: 'MOTIVO_RECHAZO_REQUERIDO',
        message: 'Indica un motivo claro para rechazar novedades del periodo.',
        correlationId: req.correlationId,
      });
    }

    let overtimeApproval = { exceptionIds: [], exceptionPayload: null };
    if (estado === 'aprobado') {
      const pending = await db.query(`
        SELECT id, empleado_id, tenant_id, fecha::text AS fecha, tipo_novedad, minutos, metadata
        FROM novedades_asistencia
        WHERE tenant_id = $1
          AND estado = 'pendiente'
          AND (
            periodo_nomina = $2
            OR (EXTRACT(YEAR FROM fecha) = $3 AND EXTRACT(MONTH FROM fecha) = $4)
          )
      `, [tenantId, periodoNomina, anio, mes]);

      overtimeApproval = await validateOvertimeLimitApproval({
        tenantId,
        usuarioId,
        rowsToApprove: pending.rows,
        anio,
        mes,
        approveException: req.body?.approveOvertimeLimitExceptions === true || req.body?.aprobarExcesosHorasExtra === true,
        exceptionReason: req.body?.overtimeLimitApprovalReason || req.body?.motivoExcesoHorasExtra || motivo,
        approvedVia: 'novedad.periodo',
      });
    }

    const result = await db.query(`
      UPDATE novedades_asistencia
      SET estado = ${estadoSql},
          aprobado_por = $1,
          aprobado_en = CASE WHEN ${estadoSql} = 'aprobado' THEN NOW() ELSE aprobado_en END,
          justificacion = COALESCE($4::text, justificacion),
          metadata = CASE
            WHEN id = ANY($7::uuid[]) THEN COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('overtimeLimitException', $8::jsonb)
            ELSE COALESCE(metadata, '{}'::jsonb)
          END,
          updated_at = NOW()
      WHERE tenant_id = $2
        AND estado = 'pendiente'
        AND (
          periodo_nomina = $3
          OR (EXTRACT(YEAR FROM fecha) = $5 AND EXTRACT(MONTH FROM fecha) = $6)
        )
      RETURNING id, empleado_id, tipo_novedad, fecha, estado
    `, [
      usuarioId || null,
      tenantId,
      periodoNomina,
      justificacion,
      anio,
      mes,
      overtimeApproval.exceptionIds,
      overtimeApproval.exceptionPayload ? JSON.stringify(overtimeApproval.exceptionPayload) : '{}',
    ]);

    await recordAudit({
      tenantId,
      userId: usuarioId,
      correlationId: req.correlationId,
      action: `novedades.periodo.${estado}`,
      entity: 'novedades_asistencia',
      newData: {
        anio,
        mes,
        periodoNomina,
        decision,
        total: result.rows.length,
        overtimeLimitExceptions: overtimeApproval.exceptionIds.length,
      },
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      periodoNomina,
      decision,
      estado,
      total: result.rows.length,
      novedades: result.rows,
      correlationId: req.correlationId,
    });
  } catch (err) {
    console.error('[NOVEDADES] Error resolviendo periodo', {
      code: err.code || 'NOVEDADES_PERIODO_RESOLVE_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'NOVEDADES_PERIODO_RESOLVE_ERROR',
      message: err.message,
      correlationId: req.correlationId,
    });
  }
}

function normalizeAmount(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) / 100 : 0;
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

module.exports = {
  listar,
  listarPendientes,
  listarTipos,
  crear,
  actualizar,
  eliminar,
  cargaMasiva,
  descargarPlantillaCargaMasiva,
  aprobar,
  rechazar,
  resolverPeriodo,
};

