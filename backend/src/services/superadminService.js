const db = require('../config/database');
const { recordAudit } = require('./auditService');

const SEVERITIES = new Set(['baja', 'media', 'alta', 'critica']);
const STATUSES = new Set(['abierta', 'en_revision', 'bloqueada', 'cerrada']);

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

module.exports = {
  createIncident,
  getSuperadminOverview,
  normalizeIncidentPayload,
  updateIncidentStatus,
};
