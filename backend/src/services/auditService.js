// ============================================================
// PLAN HAIKY - Servicio de auditoria
// ============================================================
const db = require('../config/database');

async function recordAudit({
  tenantId = null,
  userId = null,
  correlationId,
  action,
  entity,
  entityId = null,
  previousData = {},
  newData = {},
  ipAddress = null,
  metadata = {},
}) {
  if (!correlationId) {
    throw new Error('correlationId requerido para auditoria');
  }

  await db.query(`
    INSERT INTO audit_logs (
      tenant_id, user_id, correlation_id, accion, entidad, entidad_id,
      datos_anteriores, datos_nuevos, ip_address, metadata
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
  `, [
    tenantId,
    userId,
    correlationId,
    action,
    entity,
    entityId,
    JSON.stringify(previousData || {}),
    JSON.stringify(newData || {}),
    ipAddress,
    JSON.stringify(metadata || {}),
  ]);
}

module.exports = { recordAudit };
