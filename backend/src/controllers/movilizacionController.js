const db = require('../config/database');
const AppError = require('../utils/AppError');
const { recordAudit } = require('../services/auditService');

function normalizePeriod(value) {
  const period = String(value || '').trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
    throw new AppError('Periodo de movilizacion invalido.', {
      code: 'MOVILIZACION_PERIODO_INVALIDO',
      statusCode: 400,
    });
  }
  return period;
}

function normalizeMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new AppError('Monto de movilizacion invalido.', {
      code: 'MOVILIZACION_MONTO_INVALIDO',
      statusCode: 400,
    });
  }
  return Number(amount.toFixed(2));
}

function normalizeDetail(value) {
  const detail = Array.isArray(value) ? value : [];
  return detail.map((item) => ({
    fecha: String(item.fecha || '').slice(0, 10),
    origen: String(item.origen || '').trim().slice(0, 160),
    destino: String(item.destino || '').trim().slice(0, 160),
    concepto: String(item.concepto || 'otro').trim().slice(0, 40),
    km: item.km === null || item.km === undefined || item.km === '' ? null : Number(item.km),
    valor_usd: normalizeMoney(item.valor_usd),
  }));
}

async function resolveEmployeeId(req) {
  if (req.usuario?.rol === 'empleado') {
    const result = await db.query(
      `SELECT id
       FROM empleados
       WHERE tenant_id = $1
         AND LOWER(email_personal) = LOWER($2)
         AND activo = true
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.tenantId, req.usuario.email]
    );
    if (result.rows.length === 0) {
      throw new AppError('No encontramos una ficha laboral activa asociada a tu usuario.', {
        code: 'MOVILIZACION_EMPLEADO_NO_ASOCIADO',
        statusCode: 403,
      });
    }
    return result.rows[0].id;
  }

  const employeeId = String(req.body.empleadoId || req.query.empleadoId || '').trim();
  if (!employeeId) {
    throw new AppError('Selecciona el trabajador del informe de movilizacion.', {
      code: 'MOVILIZACION_EMPLEADO_REQUERIDO',
      statusCode: 400,
    });
  }
  return employeeId;
}

async function auditMovilizacion(req, action, entityId, newData) {
  try {
    await recordAudit({
      tenantId: req.tenantId,
      userId: req.usuarioId || req.usuario?.id || null,
      correlationId: req.correlationId || 'movilizacion',
      action,
      entity: 'informe_movilizacion',
      entityId,
      newData,
      ipAddress: req.ip,
    });
  } catch (err) {
    console.error('[MOVILIZACION] No se pudo auditar la operacion', {
      code: err.code || 'MOVILIZACION_AUDIT_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
  }
}

async function recibirInforme(req, res, next) {
  try {
    const periodo = normalizePeriod(req.body.periodo);
    const employeeId = await resolveEmployeeId(req);
    const detalle = normalizeDetail(req.body.detalle || req.body.detalle_json);
    const total = normalizeMoney(req.body.total_usd ?? detalle.reduce((sum, item) => sum + Number(item.valor_usd || 0), 0));
    const dias = Number(req.body.dias || new Set(detalle.map((item) => item.fecha).filter(Boolean)).size || detalle.length);

    const result = await db.query(
      `INSERT INTO informe_movilizacion (
        tenant_id, empleado_id, periodo, estado, total_usd, dias, detalle_json
      )
      VALUES ($1,$2,$3,'pendiente',$4,$5,$6)
      ON CONFLICT (tenant_id, empleado_id, periodo) DO UPDATE SET
        estado = 'pendiente',
        total_usd = EXCLUDED.total_usd,
        dias = EXCLUDED.dias,
        detalle_json = EXCLUDED.detalle_json,
        anticipo_generado_usd = NULL,
        aprobado_por = NULL,
        aprobado_at = NULL,
        rechazo_motivo = NULL,
        updated_at = NOW()
      RETURNING id, estado, periodo, total_usd, dias`,
      [req.tenantId, employeeId, periodo, total, dias, JSON.stringify(detalle)]
    );

    await auditMovilizacion(req, 'movilizacion.informe.recibido', result.rows[0].id, {
      periodo,
      totalUsd: total,
      dias,
    });

    return res.status(201).json({
      success: true,
      informeId: result.rows[0].id,
      informe: result.rows[0],
      correlationId: req.correlationId,
    });
  } catch (err) {
    return next(err);
  }
}

async function listarInformes(req, res, next) {
  try {
    const estado = String(req.query.estado || '').trim();
    const params = [req.tenantId];
    let statusFilter = '';
    if (estado) {
      params.push(estado);
      statusFilter = `AND im.estado = $${params.length}`;
    }
    const result = await db.query(
      `SELECT im.*, e.nombres, e.apellidos, e.cedula
       FROM informe_movilizacion im
       JOIN empleados e ON e.id = im.empleado_id AND e.tenant_id = im.tenant_id
       WHERE im.tenant_id = $1
       ${statusFilter}
       ORDER BY im.created_at DESC`,
      params
    );
    return res.json({ success: true, informes: result.rows, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function misInformes(req, res, next) {
  try {
    const employeeId = await resolveEmployeeId(req);
    const result = await db.query(
      `SELECT *
       FROM informe_movilizacion
       WHERE tenant_id = $1 AND empleado_id = $2
       ORDER BY created_at DESC`,
      [req.tenantId, employeeId]
    );
    return res.json({ success: true, informes: result.rows, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function resolverInforme(req, res, next) {
  try {
    const action = String(req.body.accion || req.body.estado || '').trim().toLowerCase();
    if (!['aprobado', 'rechazado'].includes(action)) {
      throw new AppError('Selecciona aprobar o rechazar el informe.', {
        code: 'MOVILIZACION_ACCION_INVALIDA',
        statusCode: 400,
      });
    }

    const anticipo = action === 'aprobado' ? normalizeMoney(req.body.anticipo_usd ?? req.body.anticipoGeneradoUsd ?? 0) : null;
    const motivo = String(req.body.motivo || req.body.rechazo_motivo || '').trim();
    if (action === 'rechazado' && motivo.length < 5) {
      throw new AppError('Registra el motivo del rechazo.', {
        code: 'MOVILIZACION_RECHAZO_MOTIVO_REQUERIDO',
        statusCode: 400,
      });
    }

    const result = await db.query(
      `UPDATE informe_movilizacion
       SET estado = $1,
           anticipo_generado_usd = $2,
           aprobado_por = $3,
           aprobado_at = NOW(),
           rechazo_motivo = $4,
           updated_at = NOW()
       WHERE id = $5
         AND tenant_id = $6
         AND estado = 'pendiente'
       RETURNING *`,
      [action, anticipo, req.usuarioId || req.usuario?.id || null, motivo || null, req.params.id, req.tenantId]
    );

    if (result.rows.length === 0) {
      throw new AppError('No encontramos un informe pendiente para resolver.', {
        code: 'MOVILIZACION_INFORME_NO_RESOLUBLE',
        statusCode: 404,
      });
    }

    await auditMovilizacion(req, `movilizacion.informe.${action}`, result.rows[0].id, {
      estado: action,
      anticipoUsd: anticipo,
      motivo: motivo || null,
    });

    return res.json({ success: true, informe: result.rows[0], correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listarInformes,
  misInformes,
  recibirInforme,
  resolverInforme,
};
