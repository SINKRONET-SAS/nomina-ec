const crypto = require('crypto');
const db = require('../config/database');

function hashRequest(req) {
  return crypto.createHash('sha256')
    .update(JSON.stringify({
      method: req.method,
      path: req.originalUrl,
      body: req.body || {},
    }), 'utf8')
    .digest('hex');
}

async function requireExternalIdempotency(req, res, next) {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey) {
    return res.status(400).json({
      error: 'IDEMPOTENCY_KEY_REQUERIDA',
      message: 'Incluye Idempotency-Key para escrituras de API v1.',
      correlationId: req.correlationId,
    });
  }

  try {
    const result = await db.query(`
      SELECT status_code, response_body, request_hash
      FROM api_idempotency_keys
      WHERE client_id = $1
        AND idempotency_key = $2
        AND expires_at > now()
      LIMIT 1
    `, [req.apiClient.id, idempotencyKey]);

    const requestHash = hashRequest(req);
    if (result.rows.length > 0) {
      const previous = result.rows[0];
      if (previous.request_hash !== requestHash) {
        return res.status(409).json({
          error: 'IDEMPOTENCY_KEY_REUSADA',
          message: 'La clave de idempotencia ya fue usada con otro payload.',
          correlationId: req.correlationId,
        });
      }
      return res.status(previous.status_code).json({
        ...previous.response_body,
        idempotentReplay: true,
        correlationId: req.correlationId,
      });
    }

    req.idempotency = { key: idempotencyKey, requestHash };
    return next();
  } catch (err) {
    console.error('[API_V1] Error verificando idempotencia', {
      code: err.code || 'API_IDEMPOTENCY_ERROR',
      statusCode: 500,
      correlationId: req.correlationId,
      userId: null,
      message: err.message,
    });
    return res.status(500).json({
      error: 'API_IDEMPOTENCY_ERROR',
      message: 'No pudimos verificar la idempotencia de la solicitud.',
      correlationId: req.correlationId,
    });
  }
}

async function persistExternalIdempotency(req, statusCode, responseBody) {
  if (!req.idempotency) return;

  await db.query(`
    INSERT INTO api_idempotency_keys (
      client_id, tenant_id, idempotency_key, method, path, request_hash, status_code, response_body
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT (client_id, idempotency_key) DO NOTHING
  `, [
    req.apiClient.id,
    req.tenantId,
    req.idempotency.key,
    req.method,
    req.originalUrl,
    req.idempotency.requestHash,
    statusCode,
    JSON.stringify(responseBody),
  ]);
}

module.exports = {
  hashRequest,
  persistExternalIdempotency,
  requireExternalIdempotency,
};
