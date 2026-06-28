const crypto = require('crypto');
const AppError = require('../utils/AppError');

function trimSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function normalizePath(value, fallback) {
  const path = String(value || fallback || '').trim();
  return path.startsWith('/') ? path : `/${path}`;
}

function getFacturadorConfig() {
  const baseUrl = trimSlash(process.env.SINKRONET_FACTURADOR_BASE_URL);
  return {
    baseUrl,
    apiKeyConfigured: Boolean(process.env.SINKRONET_FACTURADOR_API_KEY),
    invoicePath: normalizePath(process.env.SINKRONET_FACTURADOR_INVOICE_PATH, '/api/facturas'),
    healthPath: normalizePath(process.env.SINKRONET_FACTURADOR_HEALTH_PATH, '/api/health'),
    timeoutMs: Number.parseInt(process.env.SINKRONET_FACTURADOR_TIMEOUT_MS || '15000', 10),
    webhookSecretConfigured: Boolean(process.env.SINKRONET_FACTURADOR_WEBHOOK_SECRET),
  };
}

function getFacturadorReadiness() {
  const config = getFacturadorConfig();
  const blockers = [];

  if (!config.baseUrl) blockers.push('Falta configurar la URL API de SINKRONET FACTURADOR.');
  if (!config.apiKeyConfigured) blockers.push('Falta configurar la credencial server-to-server del facturador.');

  return {
    ready: blockers.length === 0,
    status: blockers.length === 0 ? 'ready' : 'blocked_configuration',
    blockers,
    provider: 'SINKRONET_FACTURADOR',
    invoicePath: config.invoicePath,
    healthPath: config.healthPath,
    webhookSecretConfigured: config.webhookSecretConfigured,
  };
}

async function requestFiscalInvoice(payload, options = {}) {
  const config = getFacturadorConfig();
  const readiness = getFacturadorReadiness();
  if (!readiness.ready) {
    throw new AppError('La facturacion fiscal no esta lista para emitir comprobantes.', {
      code: 'FACTURADOR_NO_CONFIGURADO',
      statusCode: 503,
      details: { blockers: readiness.blockers },
      correlationId: options.correlationId,
      userId: options.userId,
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(`${config.baseUrl}${config.invoicePath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': process.env.SINKRONET_FACTURADOR_API_KEY,
        'Idempotency-Key': options.idempotencyKey,
        'X-Correlation-Id': options.correlationId || 'msf26-facturacion',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await response.text();
    const body = text ? JSON.parse(text) : {};

    if (!response.ok) {
      throw new AppError(body.message || 'SINKRONET FACTURADOR no acepto la solicitud fiscal.', {
        code: 'FACTURADOR_API_ERROR',
        statusCode: response.status >= 500 ? 502 : response.status,
        details: {
          providerStatus: response.status,
          providerCode: body.error || body.code || null,
        },
        correlationId: options.correlationId,
        userId: options.userId,
      });
    }

    return body;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new AppError('SINKRONET FACTURADOR no respondio dentro del tiempo esperado.', {
        code: 'FACTURADOR_TIMEOUT',
        statusCode: 504,
        correlationId: options.correlationId,
        userId: options.userId,
      });
    }
    if (err instanceof AppError) throw err;
    throw new AppError('No pudimos conectar con SINKRONET FACTURADOR.', {
      code: 'FACTURADOR_CONEXION_ERROR',
      statusCode: 502,
      details: { message: err.message },
      correlationId: options.correlationId,
      userId: options.userId,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function verifyFacturadorWebhookSignature(payload, signature) {
  const secret = process.env.SINKRONET_FACTURADOR_WEBHOOK_SECRET;
  if (!secret) {
    throw new AppError('El webhook fiscal no tiene secreto configurado.', {
      code: 'FACTURADOR_WEBHOOK_SIN_SECRETO',
      statusCode: 503,
    });
  }
  if (!signature) {
    throw new AppError('La firma del webhook fiscal es requerida.', {
      code: 'FACTURADOR_WEBHOOK_FIRMA_REQUERIDA',
      statusCode: 401,
    });
  }

  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const cleanSignature = String(signature).replace(/^sha256=/i, '').trim();
  const expectedBuffer = Buffer.from(expected, 'hex');
  const signatureBuffer = Buffer.from(cleanSignature, 'hex');

  if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
    throw new AppError('La firma del webhook fiscal no es valida.', {
      code: 'FACTURADOR_WEBHOOK_FIRMA_INVALIDA',
      statusCode: 401,
    });
  }

  return true;
}

module.exports = {
  getFacturadorReadiness,
  requestFiscalInvoice,
  verifyFacturadorWebhookSignature,
};
