const db = require('../config/database');
const { recordAudit } = require('./auditService');
const AppError = require('../utils/AppError');

const LOPDP_VERSION = 'LOPDP-2026-06';

const CONSENT_SCOPES = Object.freeze([
  {
    scope: 'privacy_notice',
    label: 'Aviso de privacidad',
    legalBasis: 'consentimiento_informado',
    required: true,
    withdrawable: false,
    defaultActive: true,
  },
  {
    scope: 'payroll_labor_processing',
    label: 'Tratamiento laboral y nómina',
    legalBasis: 'obligacion_legal_y_ejecucion_contractual',
    required: true,
    withdrawable: false,
    defaultActive: true,
  },
  {
    scope: 'iess_sri_reporting',
    label: 'Reportes IESS, SRI y entidades laborales',
    legalBasis: 'obligacion_legal',
    required: true,
    withdrawable: false,
    defaultActive: true,
  },
  {
    scope: 'payphone_billing',
    label: 'Cobro y facturacion con PayPhone',
    legalBasis: 'ejecucion_contractual',
    required: false,
    withdrawable: true,
    defaultActive: false,
  },
  {
    scope: 'whatsapp_notifications',
    label: 'Notificaciones laborales por WhatsApp',
    legalBasis: 'consentimiento',
    required: false,
    withdrawable: true,
    defaultActive: false,
  },
  {
    scope: 'product_analytics',
    label: 'Analitica no esencial del producto',
    legalBasis: 'consentimiento',
    required: false,
    withdrawable: true,
    defaultActive: false,
  },
]);

const SCOPE_BY_CODE = new Map(CONSENT_SCOPES.map((item) => [item.scope, item]));

function normalizeRequestedPreferences(input) {
  if (Array.isArray(input)) {
    return input.reduce((acc, item) => {
      if (item?.scope) acc[String(item.scope)] = Boolean(item.active);
      return acc;
    }, {});
  }

  if (input && typeof input === 'object') {
    return Object.fromEntries(
      Object.entries(input).map(([scope, active]) => [String(scope), Boolean(active)])
    );
  }

  return {};
}

function normalizeRow(row) {
  return {
    scope: row.scope,
    active: Boolean(row.active),
    givenAt: row.given_at || null,
    withdrawnAt: row.withdrawn_at || null,
    source: row.source || 'dashboard',
    version: row.version || LOPDP_VERSION,
    metadata: row.metadata || {},
    updatedAt: row.updated_at || null,
  };
}

function mergeWithDefinitions(rows = []) {
  const rowByScope = new Map(rows.map((row) => [row.scope, normalizeRow(row)]));
  return CONSENT_SCOPES.map((definition) => {
    const current = rowByScope.get(definition.scope);
    return {
      ...definition,
      active: current ? current.active : definition.defaultActive,
      givenAt: current?.givenAt || null,
      withdrawnAt: current?.withdrawnAt || null,
      source: current?.source || 'system-default',
      version: current?.version || LOPDP_VERSION,
      metadata: current?.metadata || {},
    };
  });
}

async function getConsentStatus({ tenantId, userId }) {
  const result = await db.query(
    `SELECT *
     FROM consent_preferences
     WHERE user_id = $1
     ORDER BY scope ASC`,
    [userId]
  );

  return {
    version: LOPDP_VERSION,
    tenantId: tenantId || null,
    userId,
    preferences: mergeWithDefinitions(result.rows),
  };
}

async function upsertConsentPreference({
  tenantId,
  userId,
  scope,
  active,
  source = 'dashboard',
  metadata = {},
}) {
  const definition = SCOPE_BY_CODE.get(scope);
  if (!definition) {
    throw new AppError(`Alcance LOPDP invalido: ${scope}`, {
      code: 'LOPDP_SCOPE_INVALIDO',
      statusCode: 400,
    });
  }

  const nextActive = definition.withdrawable ? Boolean(active) : true;
  const result = await db.query(
    `INSERT INTO consent_preferences (
       tenant_id, user_id, scope, active, given_at, withdrawn_at, source, version, metadata
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (user_id, scope) DO UPDATE SET
       active = EXCLUDED.active,
       given_at = EXCLUDED.given_at,
       withdrawn_at = EXCLUDED.withdrawn_at,
       source = EXCLUDED.source,
       version = EXCLUDED.version,
       metadata = consent_preferences.metadata || EXCLUDED.metadata,
       updated_at = NOW()
     RETURNING *`,
    [
      tenantId || null,
      userId,
      scope,
      nextActive,
      nextActive ? new Date() : null,
      nextActive ? null : new Date(),
      source,
      LOPDP_VERSION,
      JSON.stringify({
        ...metadata,
        required: definition.required,
        legalBasis: definition.legalBasis,
        withdrawable: definition.withdrawable,
      }),
    ]
  );

  return normalizeRow(result.rows[0]);
}

async function updateConsentPreferences({
  tenantId,
  userId,
  preferences,
  source = 'dashboard',
  actorId,
  correlationId,
  ipAddress,
}) {
  const requested = normalizeRequestedPreferences(preferences);
  const changed = [];

  for (const [scope, active] of Object.entries(requested)) {
    changed.push(await upsertConsentPreference({
      tenantId,
      userId,
      scope,
      active,
      source,
      metadata: { updatedBy: actorId || userId },
    }));
  }

  if (changed.length > 0) {
    await recordAudit({
      tenantId,
      userId: actorId || userId,
      correlationId,
      action: 'lopdp.consent.update',
      entity: 'consent_preferences',
      entityId: userId,
      previousData: {},
      newData: { scopes: changed },
      ipAddress,
      metadata: { targetUserId: userId, source },
    });
  }

  return getConsentStatus({ tenantId, userId });
}

async function withdrawAllOptionalConsents({
  tenantId,
  userId,
  actorId,
  correlationId,
  ipAddress,
}) {
  const optionalScopes = CONSENT_SCOPES
    .filter((scope) => scope.withdrawable)
    .map((scope) => scope.scope);

  const preferences = Object.fromEntries(optionalScopes.map((scope) => [scope, false]));
  const status = await updateConsentPreferences({
    tenantId,
    userId,
    actorId,
    correlationId,
    ipAddress,
    preferences,
    source: 'withdraw-all',
  });

  await recordAudit({
    tenantId,
    userId: actorId || userId,
    correlationId,
    action: 'lopdp.consent.withdraw_all',
    entity: 'consent_preferences',
    entityId: userId,
    previousData: {},
    newData: { withdrawnScopes: optionalScopes },
    ipAddress,
    metadata: { targetUserId: userId },
  });

  return status;
}

async function listConsentHistory({ tenantId, userId, actorRole }) {
  const params = [userId];
  const conditions = ['user_id = $1', "accion LIKE 'lopdp.consent.%'"];

  if (actorRole !== 'superadmin') {
    params.push(tenantId || null);
    conditions.push(`tenant_id = $${params.length}`);
  }

  const result = await db.query(
    `SELECT id, accion, entidad, entidad_id, datos_nuevos, metadata, created_at, correlation_id
     FROM audit_logs
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT 100`,
    params
  );

  return result.rows;
}

module.exports = {
  CONSENT_SCOPES,
  LOPDP_VERSION,
  getConsentStatus,
  listConsentHistory,
  updateConsentPreferences,
  withdrawAllOptionalConsents,
};
