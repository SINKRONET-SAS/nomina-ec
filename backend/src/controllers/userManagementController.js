const db = require('../config/database');
const AppError = require('../utils/AppError');
const { recordAudit } = require('../services/auditService');
const { getTenantPlanCapabilities } = require('../services/planCapabilityService');
const { resolveEffectivePermissions } = require('../config/modules');
const { createEmailVerificationToken } = require('./authController');
const { sendEmailVerification } = require('../services/communicationService');

async function listar(req, res, next) {
  try {
    const tenantId = req.usuario.tenantId;
    const [usersResult, capabilities] = await Promise.all([
      db.query(`
        SELECT id, email, rol, nombres, apellidos, activo, email_verificado_en, created_at, module_permissions
        FROM usuarios
        WHERE tenant_id = $1
        ORDER BY activo DESC, created_at ASC
      `, [tenantId]),
      getTenantPlanCapabilities(tenantId),
    ]);

    const users = usersResult.rows.map((row) => ({
      id: row.id,
      email: row.email,
      rol: row.rol,
      nombres: row.nombres,
      apellidos: row.apellidos,
      activo: row.activo !== false,
      emailVerificadoEn: row.email_verificado_en || null,
      createdAt: row.created_at || null,
      modulePermissions: resolveEffectivePermissions(row.rol, row.module_permissions),
    }));

    return res.json({
      success: true,
      users,
      limits: capabilities.limits,
      usage: { activeUsers: users.filter((user) => user.activo).length },
      correlationId: req.correlationId,
    });
  } catch (err) {
    return next(err);
  }
}

async function cambiarEstado(req, res, next) {
  try {
    const tenantId = req.usuario.tenantId;
    const userId = String(req.params.id || '').trim();
    const active = req.body?.activo === true;
    if (!userId) throw new AppError('Usuario requerido.', { code: 'USUARIO_REQUERIDO', statusCode: 400 });
    if (userId === req.usuario.id) {
      throw new AppError('No puedes desactivar tu propio acceso.', { code: 'USUARIO_AUTOESTADO', statusCode: 400 });
    }

    const current = await db.query(
      'SELECT id, rol, activo FROM usuarios WHERE id = $1 AND tenant_id = $2 LIMIT 1',
      [userId, tenantId]
    );
    if (current.rows.length === 0) {
      throw new AppError('Usuario no encontrado en la empresa.', { code: 'USUARIO_NO_ENCONTRADO', statusCode: 404 });
    }
    if (String(current.rows[0].rol || '').toLowerCase() === 'owner') {
      throw new AppError('El administrador principal no puede desactivarse desde esta pantalla.', { code: 'OWNER_NO_MODIFICABLE', statusCode: 403 });
    }

    const updated = await db.query(
      'UPDATE usuarios SET activo = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3 RETURNING id, activo',
      [active, userId, tenantId]
    );
    await recordAudit({
      tenantId,
      userId: req.usuario.id,
      correlationId: req.correlationId,
      action: 'usuario.estado.actualizado',
      entity: 'usuarios',
      entityId: userId,
      previousData: { activo: current.rows[0].activo },
      newData: { activo: active },
      ipAddress: req.ip,
    });

    return res.json({ success: true, user: updated.rows[0], correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function reenviarVerificacionEmail(req, res, next) {
  try {
    const tenantId = req.usuario.tenantId;
    const userId = String(req.params.id || '').trim();
    if (!tenantId || !userId) {
      throw new AppError('Empresa y usuario son requeridos.', { code: 'VERIFICACION_USUARIO_REQUERIDA', statusCode: 400 });
    }

    const result = await db.query(`
      SELECT id, tenant_id, email, nombres, rol, activo, email_verificado_en
      FROM usuarios
      WHERE id = $1 AND tenant_id = $2
      LIMIT 1
    `, [userId, tenantId]);
    const target = result.rows[0];
    if (!target) {
      throw new AppError('Usuario delegado no encontrado en la empresa.', { code: 'USUARIO_NO_ENCONTRADO', statusCode: 404 });
    }
    if (String(target.rol || '').toLowerCase() === 'owner') {
      throw new AppError('El administrador principal no requiere reenvío de invitación.', { code: 'USUARIO_VERIFICACION_NO_APLICA', statusCode: 409 });
    }
    if (!target.activo) {
      throw new AppError('Activa el usuario antes de reenviar su verificación.', { code: 'USUARIO_INACTIVO', statusCode: 409 });
    }
    if (target.email_verificado_en) {
      throw new AppError('El correo de este usuario ya está verificado.', { code: 'EMAIL_YA_VERIFICADO', statusCode: 409 });
    }

    const verification = await createEmailVerificationToken(db, target, req.correlationId);
    const expiration = new Date(verification.expiresAt);
    if (!Number.isFinite(expiration.getTime()) || expiration.getTime() <= Date.now()) {
      throw new AppError('No se generó un código de verificación vigente.', { code: 'EMAIL_VERIFICACION_CADUCADA', statusCode: 503 });
    }
    const delivery = await sendEmailVerification(verification.deliveryPayload);

    await recordAudit({
      tenantId,
      userId: req.usuario.id,
      correlationId: req.correlationId,
      action: 'usuario.email.verificacion.reenviada',
      entity: 'usuarios',
      entityId: userId,
      newData: {
        targetUserId: userId,
        deliveryStatus: delivery?.status || 'unknown',
        expiresAt: verification.expiresAt,
      },
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: 'Se envió un código nuevo de verificación. Tiene vigencia completa desde este envío.',
      expiresAt: verification.expiresAt,
      delivery: { status: delivery?.status || 'sent' },
      correlationId: req.correlationId,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listar, cambiarEstado, reenviarVerificacionEmail };
