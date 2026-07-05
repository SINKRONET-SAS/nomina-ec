// ============================================================
// SKNOMINA - Controlador de Novedades
// ============================================================
const db = require('../config/database');
const { recordAudit } = require('../services/auditService');
const { ensurePayrollPeriodForDate, formatPeriodMarker, validatePeriod } = require('../services/monthlyPeriodService');
const { ensureNoveltyTypeAllowed, normalizeNoveltyCode } = require('../services/payrollNoveltyService');
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
    res.json({ success: true, novedades: result.rows });
  } catch (err) {
    console.error('[NOVEDADES] Error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

async function listarPendientes(req, res) {
  try {
    const { tenantId } = req;
    
    const result = await db.query(`
      SELECT na.*, e.nombres, e.apellidos, e.cedula
      FROM novedades_asistencia na
      JOIN empleados e ON na.empleado_id = e.id
      WHERE na.tenant_id = $1 AND na.estado = 'pendiente'
      ORDER BY na.fecha DESC
    `, [tenantId]);
    
    res.json({ success: true, novedades: result.rows });
  } catch (err) {
    console.error('[NOVEDADES] Error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

async function crear(req, res) {
  try {
    const { tenantId, usuarioId } = req;
    const { empleadoId, fecha, tipoNovedad, minutos, monto, justificacion } = req.body;
    
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
    const period = await ensurePayrollPeriodForDate({ tenantId, userId: usuarioId, fecha });
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
    `, [empleadoId, tenantId, period.id, period.periodoNomina, fecha, normalizedTipo, minutos || 0, montoNovedad, justificacion || '']);

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
        minutos: Number(minutos || 0),
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

async function descargarPlantillaCargaMasiva(_req, res) {
  const example = [
    '',
    '0102030405',
    '2026-06-30',
    'hora_extra_50',
    '120',
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
        const period = await ensurePayrollPeriodForDate({ tenantId, userId: usuarioId, fecha: normalized.fecha });
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

async function aprobar(req, res) {
  try {
    const { id } = req.params;
    const { tenantId, usuarioId } = req;

    const result = await db.query(`
      UPDATE novedades_asistencia
      SET estado = 'aprobado', aprobado_por = $1, updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
      RETURNING id, estado, aprobado_por, empleado_id, tipo_novedad, fecha
    `, [usuarioId, id, tenantId]);

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
    console.error('[NOVEDADES] Error:', err);
    res.status(500).json({ error: 'Error interno' });
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

    const result = await db.query(`
      UPDATE novedades_asistencia
      SET estado = ${estadoSql},
          aprobado_por = $1,
          justificacion = COALESCE($4::text, justificacion),
          updated_at = NOW()
      WHERE tenant_id = $2
        AND estado = 'pendiente'
        AND (
          periodo_nomina = $3
          OR (EXTRACT(YEAR FROM fecha) = $5 AND EXTRACT(MONTH FROM fecha) = $6)
        )
      RETURNING id, empleado_id, tipo_novedad, fecha, estado
    `, [usuarioId || null, tenantId, periodoNomina, justificacion, anio, mes]);

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
  crear,
  cargaMasiva,
  descargarPlantillaCargaMasiva,
  aprobar,
  rechazar,
  resolverPeriodo,
};

