// ============================================================
// PLAN HAIKY - Servicio de auditoria
// ============================================================
const db = require('../config/database');

const AUDIT_ACTIONS = Object.freeze({
  NOMINA_CALCULADA: 'nomina.calculada',
  NOMINA_CERRADA: 'nomina.cerrada',
  NOMINA_REABIERTA: 'nomina.reabierta',
  EMPLEADO_CREADO: 'empleado.creado',
  EMPLEADO_ACTUALIZADO: 'empleado.actualizado',
  EMPLEADO_TERMINADO: 'empleado.terminado',
  MARCACION_REGISTRADA: 'marcacion.registrada',
  PARAMETRO_ACTUALIZADO: 'parametro.actualizado',
  BENEFICIO_APLICADO: 'beneficio.aplicado',
  DOCUMENTO_GENERADO: 'documento.generado',
});

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /cuenta/i,
  /bank/i,
  /foto/i,
  /base64/i,
  /authorization/i,
];

function sanitizeAuditValue(value, depth = 0) {
  if (value === null || value === undefined) return value;
  if (depth > 6) return '[TRUNCADO]';
  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) => sanitizeAuditValue(item, depth + 1));
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => {
        const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
        return [key, isSensitive ? '[REDACTADO]' : sanitizeAuditValue(entry, depth + 1)];
      })
    );
  }
  if (typeof value === 'string' && value.length > 2000) {
    return `${value.slice(0, 2000)}...[TRUNCADO]`;
  }
  return value;
}

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
  if (!action || !entity) {
    throw new Error('accion y entidad requeridas para auditoria');
  }

  try {
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
      JSON.stringify(sanitizeAuditValue(previousData || {})),
      JSON.stringify(sanitizeAuditValue(newData || {})),
      ipAddress,
      JSON.stringify(sanitizeAuditValue({
        ...metadata,
        auditSchema: 'AIV55',
      })),
    ]);
  } catch (err) {
    console.error('[AUDITORIA] Error registrando auditoria', {
      code: err.code || 'AUDIT_RECORD_ERROR',
      statusCode: 500,
      correlationId,
      userId,
      tenantId,
      action,
      entity,
      message: err.message,
    });
    throw err;
  }
}

module.exports = { AUDIT_ACTIONS, recordAudit, sanitizeAuditValue };
