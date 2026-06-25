const http = require('http');
const https = require('https');

const DEFAULT_PAYPHONE_API_BASE = 'https://pay.payphonetodoesposible.com';
const PRIVATE_IPV4_RE = /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.)/;

function isPayPhoneMockMode() {
  if (process.env.NODE_ENV === 'production') return false;
  return String(process.env.PAYPHONE_MOCK_MODE || 'false').toLowerCase() === 'true';
}

function hasPlaceholder(value) {
  return !value || /CAMBIAR|PLACEHOLDER|YOUR_|REPLACE/i.test(String(value));
}

function parseUrl(value, { defaultProtocol = 'https:' } = {}) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  try {
    const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `${defaultProtocol}//${raw}`;
    return new URL(withProtocol);
  } catch {
    return null;
  }
}

function normalizeOrigin(value, options = {}) {
  const parsed = parseUrl(value, options);
  return parsed ? parsed.origin : '';
}

function isPublicHttpsOrigin(value) {
  const parsed = parseUrl(value, { defaultProtocol: 'https:' });
  if (!parsed || parsed.protocol !== 'https:') return false;
  const hostname = String(parsed.hostname || '').trim().toLowerCase();
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.local')) return false;
  if (PRIVATE_IPV4_RE.test(hostname) || hostname === '0.0.0.0') return false;
  return true;
}

function resolvePayPhoneApiBase() {
  return normalizeOrigin(process.env.PAYPHONE_API_BASE || process.env.PAYPHONE_BASE_URL || DEFAULT_PAYPHONE_API_BASE, {
    defaultProtocol: 'https:',
  }) || DEFAULT_PAYPHONE_API_BASE;
}

function resolveBackendPublicUrl() {
  const candidates = [
    process.env.BACKEND_PUBLIC_URL,
    process.env.API_PUBLIC_URL,
    process.env.RENDER_EXTERNAL_HOSTNAME,
  ];
  for (const candidate of candidates) {
    if (isPublicHttpsOrigin(candidate)) {
      return normalizeOrigin(candidate, { defaultProtocol: 'https:' });
    }
  }
  return '';
}

function buildConfirmationUrl(baseUrl) {
  return `${baseUrl}/api/pagos/confirm`;
}

function buildCancellationUrl(baseUrl) {
  return `${baseUrl}/api/pagos/cancelado`;
}

function normalizeStoreId(value) {
  const raw = String(value || '').trim();
  if (/^\d+$/.test(raw)) {
    const numeric = Number(raw);
    if (Number.isSafeInteger(numeric)) return numeric;
  }
  return raw;
}

function buildGatewayError(message, { code = 'PAYPHONE_PROVIDER_ERROR', statusCode = 502, publicMessage = '' } = {}) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  err.publicMessage = publicMessage || message;
  return err;
}

function assertPayPhoneConfig({ requirePublicUrl = true } = {}) {
  const token = String(process.env.PAYPHONE_TOKEN || '').trim();
  const storeId = String(process.env.PAYPHONE_STORE_ID || '').trim();
  const publicUrl = resolveBackendPublicUrl();

  if (hasPlaceholder(token) || hasPlaceholder(storeId)) {
    throw buildGatewayError('Configuracion PayPhone incompleta o en placeholder.', {
      code: 'PAYPHONE_CONFIG_INCOMPLETE',
      statusCode: 503,
      publicMessage: 'PayPhone no esta configurado para cobro real.',
    });
  }
  if (requirePublicUrl && !publicUrl) {
    throw buildGatewayError('PayPhone requiere BACKEND_PUBLIC_URL o APP_PUBLIC_URL publico HTTPS.', {
      code: 'PAYPHONE_PUBLIC_URL_REQUIRED',
      statusCode: 503,
      publicMessage: 'La activacion comercial requiere una URL publica HTTPS para PayPhone.',
    });
  }
  return { token, storeId, publicUrl };
}

function isAllowedCheckoutHostname(hostname) {
  const normalized = String(hostname || '').trim().toLowerCase();
  const configuredHost = parseUrl(resolvePayPhoneApiBase())?.hostname;
  return Boolean(normalized) && (
    normalized === String(configuredHost || '').toLowerCase()
    || normalized === 'payphonetodoesposible.com'
    || normalized.endsWith('.payphonetodoesposible.com')
    || normalized === 'payphone.app'
    || normalized.endsWith('.payphone.app')
  );
}

function normalizeCheckoutUrl(value) {
  const parsed = parseUrl(value, { defaultProtocol: 'https:' });
  if (!parsed || parsed.protocol !== 'https:' || !isAllowedCheckoutHostname(parsed.hostname)) return '';
  return parsed.toString();
}

function decoratePayPhoneCheckoutUrls(result = {}) {
  const payWithCard = normalizeCheckoutUrl(result.payWithCard);
  const payWithPayPhone = normalizeCheckoutUrl(result.payWithPayPhone);
  const canonical = payWithCard || payWithPayPhone || normalizeCheckoutUrl(result.paymentUrl);
  return {
    ...result,
    payWithCard: payWithCard || null,
    payWithPayPhone: payWithPayPhone || null,
    paymentUrl: canonical || null,
    paymentUrlWeb: canonical || null,
    paymentUrlMobile: canonical || null,
    mobileExternalUrl: canonical || null,
  };
}

function postJson(url, payload, headers = {}, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = Buffer.from(JSON.stringify(payload), 'utf8');
    const transport = parsed.protocol === 'http:' ? http : https;
    const request = transport.request({
      method: 'POST',
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port || undefined,
      path: `${parsed.pathname}${parsed.search}`,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...headers,
      },
      timeout: timeoutMs,
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let data = raw;
        if (raw) {
          try {
            data = JSON.parse(raw);
          } catch {
            data = raw;
          }
        }
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(data || {});
          return;
        }
        reject(buildGatewayError(`PayPhone error ${response.statusCode}: ${raw}`, {
          code: response.statusCode >= 400 && response.statusCode < 500 ? 'PAYPHONE_HTTP_REJECTED' : 'PAYPHONE_HTTP_UNAVAILABLE',
          statusCode: response.statusCode >= 400 && response.statusCode < 500 ? 400 : 502,
          publicMessage: response.statusCode >= 400 && response.statusCode < 500
            ? 'PayPhone rechazo la solicitud.'
            : 'PayPhone no esta disponible temporalmente.',
        }));
      });
    });

    request.on('timeout', () => {
      request.destroy(buildGatewayError('PayPhone timeout.', {
        code: 'PAYPHONE_TIMEOUT',
        statusCode: 504,
        publicMessage: 'PayPhone no respondio a tiempo.',
      }));
    });
    request.on('error', (err) => reject(err));
    request.write(body);
    request.end();
  });
}

async function createPayPhonePayment({ amounts, reference, post = postJson } = {}) {
  const { token, storeId, publicUrl } = assertPayPhoneConfig();
  const payload = {
    amount: Number(amounts.montoCentavos || 0),
    amountWithTax: Number(amounts.baseGravadaCentavos || 0),
    amountWithoutTax: Number(amounts.baseNoGravadaCentavos || 0),
    tax: Number(amounts.ivaCentavos || 0),
    service: 0,
    tip: 0,
    currency: amounts.moneda || 'USD',
    storeId: normalizeStoreId(storeId),
    reference,
    clientTransactionId: reference,
    ResponseUrl: buildConfirmationUrl(publicUrl),
    responseUrl: buildConfirmationUrl(publicUrl),
    cancellationUrl: buildCancellationUrl(publicUrl),
  };
  const data = await post(`${resolvePayPhoneApiBase()}/api/button/Prepare`, payload, {
    Authorization: `Bearer ${token}`,
  }, Number(process.env.PAYPHONE_TIMEOUT_MS || 12000));

  return decoratePayPhoneCheckoutUrls(data);
}

async function confirmPayPhonePayment({ id, clientTxId, post = postJson } = {}) {
  const { token } = assertPayPhoneConfig({ requirePublicUrl: false });
  const numericId = Number(id);
  const normalizedClientTxId = String(clientTxId || '').trim();
  if (!Number.isSafeInteger(numericId) || numericId <= 0 || !normalizedClientTxId) {
    throw buildGatewayError('Parametros de confirmacion PayPhone invalidos.', {
      code: 'PAYPHONE_CONFIRM_PARAMS_INVALID',
      statusCode: 400,
      publicMessage: 'Parametros de confirmacion PayPhone invalidos.',
    });
  }
  return post(`${resolvePayPhoneApiBase()}/api/button/V2/Confirm`, {
    id: numericId,
    clientTxId: normalizedClientTxId,
  }, {
    Authorization: `Bearer ${token}`,
  }, Number(process.env.PAYPHONE_TIMEOUT_MS || 12000));
}

module.exports = {
  assertPayPhoneConfig,
  buildCancellationUrl,
  buildConfirmationUrl,
  createPayPhonePayment,
  confirmPayPhonePayment,
  decoratePayPhoneCheckoutUrls,
  isPayPhoneMockMode,
  normalizeCheckoutUrl,
  resolveBackendPublicUrl,
  resolvePayPhoneApiBase,
};
