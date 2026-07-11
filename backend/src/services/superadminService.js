const db = require('../config/database');
const { recordAudit } = require('./auditService');
const { normalizePlanMetadata } = require('./planTrialService');

const SEVERITIES = new Set(['baja', 'media', 'alta', 'critica']);
const STATUSES = new Set(['abierta', 'en_revision', 'bloqueada', 'cerrada']);
const DIRECT_PLAN_BILLING_PERIODS = new Set(['monthly', 'annual', 'custom']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function serviceError(message, code, statusCode = 400) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  return err;
}

function normalizeBillingPeriod(value) {
  const normalized = String(value || 'monthly').trim().toLowerCase();
  return DIRECT_PLAN_BILLING_PERIODS.has(normalized) ? normalized : 'monthly';
}

function addBillingPeriod(baseDate, billingPeriod) {
  const next = new Date(baseDate);
  if (billingPeriod === 'annual') {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

function parseCustomExpiry(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T23:59:59.999Z`)
    : new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    throw serviceError('Fecha de vencimiento invalida.', 'SUPERADMIN_PLAN_EXPIRY_INVALID');
  }
  if (parsed.getTime() <= Date.now()) {
    throw serviceError('La vigencia del plan debe quedar en una fecha futura.', 'SUPERADMIN_PLAN_EXPIRY_PAST');
  }

  return parsed;
}

function snapshotSubscription(row = null) {
  if (!row) return null;
  return {
    planId: row.plan_id,
    estado: row.estado,
    inicioEn: row.inicio_en,
    venceEn: row.vence_en,
    renovacionAutomatica: Boolean(row.renovacion_automatica),
    metadata: normalizePlanMetadata(row.metadata),
  };
}

function normalizeAssignedPlan(row = {}) {
  const metadata = normalizePlanMetadata(row.metadata);
  return {
    id: row.id,
    tenantId: row.tenant_id,
    tenantName: row.razon_social || null,
    tenantRuc: row.ruc || null,
    ownerEmail: row.owner_email || null,
    planId: row.plan_id,
    planNombre: row.plan_nombre || row.plan_id,
    estado: row.estado,
    inicioEn: row.inicio_en,
    venceEn: row.vence_en,
    renovacionAutomatica: Boolean(row.renovacion_automatica),
    billingPeriod: metadata.billingPeriod || 'monthly',
    source: metadata.source || null,
    notes: metadata.notes || '',
  };
}

function normalizeDirectPlanPayload(tenantId, body = {}) {
  const targetTenantId = String(tenantId || body.tenantId || '').trim();
  const planId = String(body.planId || body.planCode || '').trim().toUpperCase();
  const billingPeriod = normalizeBillingPeriod(body.billingPeriod);
  const customExpiresAt = parseCustomExpiry(body.expiresAt || body.venceEn || body.expiryDate);

  if (!UUID_PATTERN.test(targetTenantId)) {
    throw serviceError('Tenant owner invalido para asignar plan.', 'SUPERADMIN_OWNER_TENANT_INVALID');
  }
  if (!planId || !/^[A-Z0-9_]{3,40}$/.test(planId)) {
    throw serviceError('Selecciona un plan comercial valido.', 'SUPERADMIN_OWNER_PLAN_INVALID');
  }
  if (billingPeriod === 'custom' && !customExpiresAt) {
    throw serviceError('Selecciona una fecha pactada para la vigencia personalizada.', 'SUPERADMIN_OWNER_PLAN_CUSTOM_EXPIRY_REQUIRED');
  }

  return {
    tenantId: targetTenantId,
    planId,
    billingPeriod,
    customExpiresAt,
    notes: String(body.notes || body.observation || body.reason || '').trim().slice(0, 1000),
  };
}

function resolveDirectPlanExpiry({ billingPeriod, customExpiresAt, previousSubscription, planId }) {
  if (customExpiresAt) return customExpiresAt;

  const now = new Date();
  const previousExpiry = previousSubscription?.vence_en ? new Date(previousSubscription.vence_en) : null;
  const extendsCurrentPlan = previousSubscription
    && previousSubscription.plan_id === planId
    && previousSubscription.estado === 'active'
    && previousExpiry
    && !Number.isNaN(previousExpiry.getTime())
    && previousExpiry.getTime() > now.getTime();

  return addBillingPeriod(extendsCurrentPlan ? previousExpiry : now, billingPeriod);
}

async function recordTenantScopedAudit(payload) {
  if (payload.tenantId && typeof db.runWithTenantContext === 'function') {
    return db.runWithTenantContext(
      { tenantId: payload.tenantId, userId: payload.userId || null },
      () => recordAudit(payload)
    );
  }
  return recordAudit(payload);
}

function normalizeIncident(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    tenantName: row.tenant_name || null,
    title: row.title,
    description: row.description,
    severity: row.severity,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    closedAt: row.closed_at,
  };
}

async function getSuperadminOverview() {
  const [plans, owners, incidents] = await Promise.all([
    db.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE activo = true)::int AS activos,
        COUNT(*) FILTER (WHERE publico = true AND activo = true)::int AS publicos
      FROM planes_comerciales
    `),
    db.query(`
      SELECT t.id, t.ruc, t.razon_social, t.activo, t.created_at,
        s.plan_id, s.estado AS subscription_status, s.vence_en,
        p.nombre AS plan_nombre,
        MIN(CASE WHEN u.rol = 'owner' THEN u.email ELSE NULL END) AS owner_email,
        COUNT(DISTINCT e.id)::int AS empleados,
        COUNT(DISTINCT u.id)::int AS usuarios
      FROM tenants t
      LEFT JOIN suscripciones s ON s.tenant_id = t.id
      LEFT JOIN planes_comerciales p ON p.id = s.plan_id
      LEFT JOIN empleados e ON e.tenant_id = t.id AND e.activo = true
      LEFT JOIN usuarios u ON u.tenant_id = t.id AND u.activo = true
      GROUP BY t.id, s.plan_id, s.estado, s.vence_en, p.nombre
      ORDER BY t.created_at DESC
      LIMIT 50
    `),
    db.query(`
      SELECT si.*, t.razon_social AS tenant_name
      FROM support_incidents si
      LEFT JOIN tenants t ON t.id = si.tenant_id
      ORDER BY
        CASE si.status WHEN 'abierta' THEN 1 WHEN 'en_revision' THEN 2 WHEN 'bloqueada' THEN 3 ELSE 4 END,
        si.created_at DESC
      LIMIT 50
    `),
  ]);

  return {
    plans: plans.rows[0] || { total: 0, activos: 0, publicos: 0 },
    owners: owners.rows.map((row) => ({
      id: row.id,
      ruc: row.ruc,
      razonSocial: row.razon_social,
      activo: row.activo,
      createdAt: row.created_at,
      planId: row.plan_id,
      planNombre: row.plan_nombre,
      subscriptionStatus: row.subscription_status,
      venceEn: row.vence_en,
      ownerEmail: row.owner_email,
      empleados: row.empleados,
      usuarios: row.usuarios,
    })),
    incidents: incidents.rows.map(normalizeIncident),
  };
}

function normalizeIncidentPayload(body = {}) {
  const title = String(body.title || '').trim();
  const severity = String(body.severity || 'media').trim();
  const status = String(body.status || 'abierta').trim();

  if (!title) {
    throw new Error('El titulo de la incidencia es requerido.');
  }
  if (!SEVERITIES.has(severity)) {
    throw new Error('Severidad invalida.');
  }
  if (!STATUSES.has(status)) {
    throw new Error('Estado de incidencia invalido.');
  }

  return {
    tenantId: body.tenantId || null,
    title,
    description: String(body.description || '').trim(),
    severity,
    status,
  };
}

async function createIncident({ payload, userId, correlationId, ipAddress }) {
  const values = normalizeIncidentPayload(payload);
  const result = await db.query(`
    INSERT INTO support_incidents (
      tenant_id, title, description, severity, status, created_by
    )
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING *
  `, [
    values.tenantId,
    values.title,
    values.description,
    values.severity,
    values.status,
    userId || null,
  ]);

  await recordAudit({
    tenantId: values.tenantId,
    userId,
    correlationId,
    action: 'superadmin.incident.create',
    entity: 'support_incidents',
    entityId: result.rows[0].id,
    newData: values,
    ipAddress,
  });

  return normalizeIncident(result.rows[0]);
}

async function updateIncidentStatus({ id, status, userId, correlationId, ipAddress }) {
  if (!STATUSES.has(status)) {
    throw new Error('Estado de incidencia invalido.');
  }

  const result = await db.query(`
    UPDATE support_incidents
    SET status = $2,
        closed_at = CASE WHEN $2 = 'cerrada' THEN NOW() ELSE NULL END,
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `, [id, status]);

  if (result.rows.length === 0) {
    throw new Error('Incidencia no encontrada.');
  }

  await recordAudit({
    tenantId: result.rows[0].tenant_id,
    userId,
    correlationId,
    action: 'superadmin.incident.status',
    entity: 'support_incidents',
    entityId: id,
    newData: { status },
    ipAddress,
  });

  return normalizeIncident(result.rows[0]);
}

async function fetchOwnerTenant(tenantId) {
  const result = await db.query(
    `SELECT t.id, t.ruc, t.razon_social, t.activo,
       owner.id AS owner_user_id,
       owner.email AS owner_email
     FROM tenants t
     LEFT JOIN LATERAL (
       SELECT u.id, u.email
       FROM usuarios u
       WHERE u.tenant_id = t.id AND u.rol = 'owner' AND u.activo = true
       ORDER BY u.created_at ASC
       LIMIT 1
     ) owner ON true
     WHERE t.id = $1
     LIMIT 1`,
    [tenantId]
  );

  if (result.rows.length === 0) {
    throw serviceError('No encontramos la empresa owner indicada.', 'SUPERADMIN_OWNER_NOT_FOUND', 404);
  }
  if (!result.rows[0].activo) {
    throw serviceError('La empresa owner esta inactiva y no puede recibir upgrades.', 'SUPERADMIN_OWNER_INACTIVE', 409);
  }
  return result.rows[0];
}

async function fetchActivePlan(planId) {
  const result = await db.query(
    'SELECT * FROM planes_comerciales WHERE id = $1 AND activo = true LIMIT 1',
    [planId]
  );

  if (result.rows.length === 0) {
    throw serviceError('El plan seleccionado no existe o no esta activo.', 'SUPERADMIN_OWNER_PLAN_NOT_FOUND', 404);
  }
  return result.rows[0];
}

async function fetchSubscription(tenantId) {
  const result = await db.query(
    'SELECT * FROM suscripciones WHERE tenant_id = $1 LIMIT 1',
    [tenantId]
  );
  return result.rows[0] || null;
}

async function assignOwnerPlan({ tenantId, payload, userId, correlationId, ipAddress }) {
  const values = normalizeDirectPlanPayload(tenantId, payload);
  const [target, plan, previousSubscription] = await Promise.all([
    fetchOwnerTenant(values.tenantId),
    fetchActivePlan(values.planId),
    fetchSubscription(values.tenantId),
  ]);
  const previousSnapshot = snapshotSubscription(previousSubscription);
  const assignedAt = new Date();
  const nextExpiry = resolveDirectPlanExpiry({
    billingPeriod: values.billingPeriod,
    customExpiresAt: values.customExpiresAt,
    previousSubscription,
    planId: plan.id,
  });
  const metadata = {
    source: 'superadmin_direct_plan_assignment',
    directUpgrade: true,
    agreedScope: true,
    assignedBy: userId || null,
    assignedAt: assignedAt.toISOString(),
    billingPeriod: values.customExpiresAt ? 'custom' : values.billingPeriod,
    expiresAt: nextExpiry.toISOString(),
    notes: values.notes,
    previousSubscription: previousSnapshot,
    upgradeFromPlan: previousSubscription?.plan_id || null,
  };

  const result = await db.query(
    `WITH upserted AS (
       INSERT INTO suscripciones (
         tenant_id, plan_id, estado, inicio_en, vence_en, renovacion_automatica, metadata
       )
       VALUES ($1, $2, 'active', NOW(), $3, false, $4)
       ON CONFLICT (tenant_id) DO UPDATE SET
         plan_id = EXCLUDED.plan_id,
         estado = 'active',
         inicio_en = NOW(),
         vence_en = EXCLUDED.vence_en,
         renovacion_automatica = false,
         metadata = EXCLUDED.metadata,
         updated_at = NOW()
       RETURNING *
     )
     SELECT s.*, t.razon_social, t.ruc, owner.email AS owner_email, p.nombre AS plan_nombre
     FROM upserted s
     JOIN tenants t ON t.id = s.tenant_id
     JOIN planes_comerciales p ON p.id = s.plan_id
     LEFT JOIN LATERAL (
       SELECT u.email
       FROM usuarios u
       WHERE u.tenant_id = t.id AND u.rol = 'owner' AND u.activo = true
       ORDER BY u.created_at ASC
       LIMIT 1
     ) owner ON true`,
    [
      target.id,
      plan.id,
      nextExpiry,
      JSON.stringify(metadata),
    ]
  );

  const assigned = normalizeAssignedPlan(result.rows[0]);
  await recordTenantScopedAudit({
    tenantId: target.id,
    userId,
    correlationId,
    action: 'superadmin.owner.plan.assign',
    entity: 'suscripciones',
    entityId: result.rows[0].id,
    previousData: previousSnapshot || {},
    newData: assigned,
    ipAddress,
    metadata: {
      ownerEmail: target.owner_email || null,
      planId: plan.id,
      directUpgrade: true,
    },
  });

  return assigned;
}

module.exports = {
  assignOwnerPlan,
  createIncident,
  getSuperadminOverview,
  normalizeDirectPlanPayload,
  normalizeIncidentPayload,
  updateIncidentStatus,
};
