const crypto = require('crypto');
const db = require('../config/database');
const { assertCapability } = require('../services/planCapabilityService');

function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(String(apiKey || ''), 'utf8').digest('hex');
}

function extractApiKey(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  return req.headers['x-api-key'] || '';
}

async function authenticateExternalApi(req, res, next) {
  const apiKey = extractApiKey(req);
  if (!apiKey) {
    return res.status(401).json({
      error: 'API_KEY_REQUERIDA',
      message: 'Incluye una API key en Authorization Bearer o X-API-Key.',
      correlationId: req.correlationId,
    });
  }

  try {
    const result = await db.query(`
      SELECT id, tenant_id, name, scopes, rate_limit_per_minute
      FROM api_clients
      WHERE api_key_hash = $1
        AND active = true
      LIMIT 1
    `, [hashApiKey(apiKey)]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'API_KEY_INVALIDA',
        message: 'La API key no existe o esta inactiva.',
        correlationId: req.correlationId,
      });
    }

    const client = result.rows[0];
    req.apiClient = {
      id: client.id,
      tenantId: client.tenant_id,
      name: client.name,
      scopes: client.scopes || [],
      rateLimitPerMinute: client.rate_limit_per_minute,
    };
    req.tenantId = client.tenant_id;
    req.usuarioId = null;
    await assertCapability(client.tenant_id, 'apiAccess', { userId: null });
    return next();
  } catch (err) {
    if (err.code === 'PLAN_CAPABILITY_BLOCKED') {
      return res.status(err.statusCode || 402).json({
        error: err.code,
        message: 'El plan actual no incluye acceso a la API externa.',
        correlationId: req.correlationId,
        details: err.details,
      });
    }
    console.error('[API_V1] Error autenticando cliente externo', {
      code: err.code || 'API_AUTH_ERROR',
      statusCode: 500,
      correlationId: req.correlationId,
      userId: null,
      message: err.message,
    });
    return res.status(500).json({
      error: 'API_AUTH_ERROR',
      message: 'No pudimos autenticar el cliente API.',
      correlationId: req.correlationId,
    });
  }
}

function requireApiScope(scope) {
  return (req, res, next) => {
    if (!req.apiClient) {
      return res.status(401).json({
        error: 'API_CLIENTE_REQUERIDO',
        message: 'Autenticacion externa requerida.',
        correlationId: req.correlationId,
      });
    }

    if (!req.apiClient.scopes.includes(scope)) {
      return res.status(403).json({
        error: 'API_SCOPE_DENEGADO',
        message: `El cliente API no tiene el scope requerido: ${scope}.`,
        correlationId: req.correlationId,
      });
    }

    return next();
  };
}

module.exports = {
  authenticateExternalApi,
  hashApiKey,
  requireApiScope,
};
