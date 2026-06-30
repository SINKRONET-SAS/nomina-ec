const crypto = require('crypto');
const db = require('../config/database');
const { recordAudit } = require('../services/auditService');
const { assertCapability } = require('../services/planCapabilityService');
const { hashApiKey } = require('../middleware/externalApiAuth');

const ALLOWED_SCOPES = new Set([
  'employees.read',
  'attendance.write',
  'novelties.write',
  'payroll.read',
]);

function generateApiKey() {
  return `nom_ec_${crypto.randomBytes(24).toString('base64url')}`;
}

function normalizeScopes(scopes) {
  const input = Array.isArray(scopes) ? scopes : String(scopes || '').split(',');
  return input.map((scope) => scope.trim()).filter((scope) => ALLOWED_SCOPES.has(scope));
}

function resolveTenantForClient(req) {
  if (req.usuario?.rol === 'superadmin' && req.body?.tenantId) {
    return req.body.tenantId;
  }
  return req.tenantId;
}

async function listApiClients(req, res) {
  try {
    const tenantId = req.usuario?.rol === 'superadmin' && req.query.tenantId ? req.query.tenantId : req.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'TENANT_REQUERIDO', message: 'Selecciona un tenant para listar clientes API.', correlationId: req.correlationId });
    }
    if (req.usuario?.rol !== 'superadmin') {
      await assertCapability(tenantId, 'apiAccess', { userId: req.usuarioId });
    }

    const result = await db.query(`
      SELECT id, name, scopes, active, rate_limit_per_minute, created_at, updated_at
      FROM api_clients
      WHERE tenant_id = $1
      ORDER BY created_at DESC
    `, [tenantId]);

    return res.json({ success: true, data: result.rows, correlationId: req.correlationId });
  } catch (err) {
    if (err.code === 'PLAN_CAPABILITY_BLOCKED') {
      return res.status(err.statusCode || 402).json({
        error: err.code,
        message: 'El plan actual no incluye acceso a la API externa.',
        correlationId: req.correlationId,
        details: err.details,
      });
    }
    console.error('[INTEGRACIONES] Error listando clientes API', {
      code: err.code || 'API_CLIENT_LIST_ERROR',
      statusCode: 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(500).json({ error: 'API_CLIENT_LIST_ERROR', message: 'No pudimos listar clientes API.', correlationId: req.correlationId });
  }
}

async function createApiClient(req, res) {
  try {
    const tenantId = resolveTenantForClient(req);
    const { name, scopes, rateLimitPerMinute } = req.body;
    const normalizedScopes = normalizeScopes(scopes);

    if (!tenantId) {
      return res.status(400).json({ error: 'TENANT_REQUERIDO', message: 'Selecciona un tenant para crear el cliente API.', correlationId: req.correlationId });
    }
    if (!name || normalizedScopes.length === 0) {
      return res.status(400).json({ error: 'API_CLIENT_INVALID', message: 'Nombre y al menos un scope valido son requeridos.', correlationId: req.correlationId });
    }
    if (req.usuario?.rol !== 'superadmin') {
      await assertCapability(tenantId, 'apiAccess', { userId: req.usuarioId });
    }

    const apiKey = generateApiKey();
    const result = await db.query(`
      INSERT INTO api_clients (tenant_id, name, api_key_hash, scopes, rate_limit_per_minute)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING id, name, scopes, active, rate_limit_per_minute, created_at
    `, [
      tenantId,
      name.trim(),
      hashApiKey(apiKey),
      normalizedScopes,
      Number(rateLimitPerMinute || 60),
    ]);

    await recordAudit({
      tenantId,
      userId: req.usuarioId,
      correlationId: req.correlationId,
      action: 'integraciones.api_client.create',
      entity: 'api_clients',
      entityId: result.rows[0].id,
      newData: { name: result.rows[0].name, scopes: result.rows[0].scopes },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      data: result.rows[0],
      apiKey,
      warning: 'Guarda esta API key ahora. No se volvera a mostrar.',
      correlationId: req.correlationId,
    });
  } catch (err) {
    if (err.code === 'PLAN_CAPABILITY_BLOCKED') {
      return res.status(err.statusCode || 402).json({
        error: err.code,
        message: 'El plan actual no incluye acceso a la API externa.',
        correlationId: req.correlationId,
        details: err.details,
      });
    }
    console.error('[INTEGRACIONES] Error creando cliente API', {
      code: err.code || 'API_CLIENT_CREATE_ERROR',
      statusCode: 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(500).json({ error: 'API_CLIENT_CREATE_ERROR', message: 'No pudimos crear el cliente API.', correlationId: req.correlationId });
  }
}

module.exports = {
  ALLOWED_SCOPES,
  createApiClient,
  listApiClients,
  normalizeScopes,
};
