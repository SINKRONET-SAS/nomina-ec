const crypto = require('crypto');
const db = require('../config/database');
const { recordAudit } = require('./auditService');
const AppError = require('../utils/AppError');

function anonymizedEmailFor(userId) {
  const hash = crypto.createHash('sha256').update(String(userId)).digest('hex').slice(0, 12);
  return `eliminado+${hash}@nomina-ec.local`;
}

async function findUser({ targetUserId }) {
  const result = await db.query(
    `SELECT id, tenant_id, email, rol, nombres, apellidos, activo
     FROM usuarios
     WHERE id = $1
     LIMIT 1`,
    [targetUserId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Usuario no encontrado para anonimizar.', {
      code: 'LOPDP_USER_NOT_FOUND',
      statusCode: 404,
    });
  }

  return result.rows[0];
}

async function assertUserCanBeAnonymized(user) {
  if (user.rol === 'superadmin') {
    throw new AppError('No se anonimiza un superadmin desde este flujo.', {
      code: 'LOPDP_SUPERADMIN_PROTECTED',
      statusCode: 409,
    });
  }

  if (user.rol === 'owner' && user.tenant_id) {
    const owners = await db.query(
      "SELECT COUNT(*)::int AS total FROM usuarios WHERE tenant_id = $1 AND rol = 'owner' AND activo = true",
      [user.tenant_id]
    );
    if (Number(owners.rows[0]?.total || 0) <= 1) {
      throw new AppError('No se puede anonimizar el unico owner activo de la empresa.', {
        code: 'LOPDP_OWNER_UNICO_PROTEGIDO',
        statusCode: 409,
      });
    }
  }
}

async function anonymizeUserData({
  actor,
  targetUserId,
  correlationId,
  ipAddress,
  reason = 'solicitud_lopdp',
}) {
  if (actor?.rol !== 'superadmin') {
    throw new AppError('Solo superadmin puede ejecutar anonimizacion de usuarios.', {
      code: 'LOPDP_PURGE_FORBIDDEN',
      statusCode: 403,
    });
  }

  const user = await findUser({ targetUserId });
  await assertUserCanBeAnonymized(user);

  const anonymizedEmail = anonymizedEmailFor(targetUserId);
  const result = await db.query(
    `UPDATE usuarios
     SET email = $2,
         nombres = 'ELIMINADO',
         apellidos = 'LOPDP',
         activo = false,
         email_verificado_en = NULL,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, tenant_id, email, rol, nombres, apellidos, activo, updated_at`,
    [targetUserId, anonymizedEmail]
  );

  await recordAudit({
    tenantId: user.tenant_id || null,
    userId: actor.id,
    correlationId,
    action: 'lopdp.data.anonymize',
    entity: 'usuarios',
    entityId: targetUserId,
    previousData: {
      email: user.email,
      nombres: user.nombres,
      apellidos: user.apellidos,
      activo: user.activo,
    },
    newData: {
      email: anonymizedEmail,
      nombres: 'ELIMINADO',
      apellidos: 'LOPDP',
      activo: false,
    },
    ipAddress,
    metadata: {
      reason,
      targetUserRole: user.rol,
      retainedDataNotice: 'Se conservan documentos laborales, nomina, facturacion y auditoria cuando exista obligacion legal o contractual.',
    },
  });

  return {
    user: result.rows[0],
    retainedDataNotice: 'Se conservan documentos laborales, nomina, facturacion y auditoria cuando exista obligacion legal o contractual.',
  };
}

module.exports = {
  anonymizeUserData,
  anonymizedEmailFor,
};
