const db = require('../config/database');
const { recordAudit } = require('./auditService');
const { getConsentStatus } = require('./privacyConsentService');
const AppError = require('../utils/AppError');

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id || null,
    email: row.email,
    rol: row.rol,
    nombres: row.nombres,
    apellidos: row.apellidos,
    activo: Boolean(row.activo),
    emailVerificadoEn: row.email_verificado_en || null,
    ultimoAcceso: row.ultimo_acceso || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeRows(rows = []) {
  return rows.map((row) => Object.fromEntries(Object.entries(row)));
}

function assertCanExport({ actor, targetUserId }) {
  if (actor?.rol === 'superadmin') return;
  if (actor?.id === targetUserId) return;
  throw new AppError('Solo puedes exportar tus propios datos personales.', {
    code: 'LOPDP_EXPORT_FORBIDDEN',
    statusCode: 403,
  });
}

async function findUserForExport({ actor, targetUserId }) {
  const params = [targetUserId];
  const tenantClause = actor?.rol === 'superadmin' ? '' : 'AND tenant_id = $2';
  if (tenantClause) params.push(actor.tenantId);

  const result = await db.query(
    `SELECT id, tenant_id, email, rol, nombres, apellidos, activo,
            email_verificado_en, ultimo_acceso, created_at, updated_at
     FROM usuarios
     WHERE id = $1 ${tenantClause}
     LIMIT 1`,
    params
  );

  if (result.rows.length === 0) {
    throw new AppError('Usuario no encontrado para exportacion LOPDP.', {
      code: 'LOPDP_USER_NOT_FOUND',
      statusCode: 404,
    });
  }

  return result.rows[0];
}

async function exportUserData({
  actor,
  targetUserId,
  correlationId,
  ipAddress,
}) {
  assertCanExport({ actor, targetUserId });
  const user = await findUserForExport({ actor, targetUserId });
  const tenantId = user.tenant_id || null;

  const [
    tenantResult,
    employeesResult,
    employeeLinksResult,
    subscriptionsResult,
    paymentTransactionsResult,
    auditSummaryResult,
  ] = await Promise.all([
    tenantId ? db.query(
      `SELECT id, ruc, razon_social, nombre_comercial, activo, created_at, updated_at
       FROM tenants
       WHERE id = $1`,
      [tenantId]
    ) : Promise.resolve({ rows: [] }),
    tenantId ? db.query(
      `SELECT id, cedula, nombres, apellidos, cargo, departamento, sueldo_bruto_mensual,
              fecha_ingreso, fecha_salida, tipo_contrato, iess_afiliado,
              iess_tipo_relacion, telefono, email_personal, whatsapp_consent_at,
              activo, created_at, updated_at
       FROM empleados
       WHERE tenant_id = $1 AND lower(email_personal) = lower($2)
       ORDER BY created_at DESC
       LIMIT 10`,
      [tenantId, user.email]
    ) : Promise.resolve({ rows: [] }),
    tenantId ? db.query(
      `SELECT id, empleado_id, user_id, status, activated_at, disabled_at,
              privacy_notice_version, consent_snapshot, created_at, updated_at
       FROM employee_app_links
       WHERE tenant_id = $1 AND user_id = $2
       ORDER BY created_at DESC
       LIMIT 20`,
      [tenantId, targetUserId]
    ) : Promise.resolve({ rows: [] }),
    tenantId ? db.query(
      `SELECT s.id, s.tenant_id, s.plan_id, s.estado, s.inicio_en, s.vence_en,
              s.renovacion_automatica, s.created_at, s.updated_at,
              p.nombre AS plan_nombre
       FROM suscripciones s
       LEFT JOIN planes_comerciales p ON p.id = s.plan_id
       WHERE s.tenant_id = $1`,
      [tenantId]
    ) : Promise.resolve({ rows: [] }),
    tenantId ? db.query(
      `SELECT id, tenant_id, plan_id, proveedor, estado, monto_centavos,
              moneda, client_transaction_id, provider_transaction_id,
              created_at, updated_at
       FROM transacciones_pago
       WHERE tenant_id = $1 AND usuario_id = $2
       ORDER BY created_at DESC
       LIMIT 50`,
      [tenantId, targetUserId]
    ) : Promise.resolve({ rows: [] }),
    db.query(
      `SELECT accion, entidad, COUNT(*)::int AS total, MAX(created_at) AS ultimo_evento
       FROM audit_logs
       WHERE user_id = $1
       GROUP BY accion, entidad
       ORDER BY ultimo_evento DESC
       LIMIT 100`,
      [targetUserId]
    ),
  ]);

  const consentStatus = await getConsentStatus({ tenantId, userId: targetUserId });

  await recordAudit({
    tenantId,
    userId: actor.id,
    correlationId,
    action: 'lopdp.data.export',
    entity: 'usuarios',
    entityId: targetUserId,
    previousData: {},
    newData: { targetUserId },
    ipAddress,
    metadata: {
      requesterRole: actor.rol,
      exportedSections: [
        'usuario',
        'tenant',
        'empleado',
        'consentimientos',
        'suscripcion',
        'pagos',
        'auditoria_resumen',
      ],
    },
  });

  return {
    generatedAt: new Date().toISOString(),
    version: 'LOPDP-EXPORT-2026-06',
    retentionNotice: 'Nomina-Ec entrega los datos personales disponibles para el titular. Documentos laborales, tributarios y de seguridad social pueden conservarse durante los plazos exigidos por normativa aplicable.',
    usuario: publicUser(user),
    empresa: normalizeRows(tenantResult.rows),
    empleado: normalizeRows(employeesResult.rows),
    appEmpleado: normalizeRows(employeeLinksResult.rows),
    consentimientos: consentStatus.preferences,
    suscripciones: normalizeRows(subscriptionsResult.rows),
    pagos: normalizeRows(paymentTransactionsResult.rows),
    auditoriaResumen: normalizeRows(auditSummaryResult.rows),
  };
}

module.exports = {
  exportUserData,
};
