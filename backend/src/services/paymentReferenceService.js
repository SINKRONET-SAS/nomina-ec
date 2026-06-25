const crypto = require('crypto');

function normalizePlanId(planId) {
  return String(planId || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '')
    .slice(0, 30);
}

function shortId(value) {
  return String(value || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 8)
    .toUpperCase() || 'NA';
}

function buildSubscriptionPaymentReference({ tenantId, userId, planId, nonce = Date.now() }) {
  const normalizedPlanId = normalizePlanId(planId);
  const normalizedNonce = `${String(nonce).replace(/\D/g, '').slice(0, 16)}${crypto.randomBytes(3).toString('hex')}`;
  if (!normalizedPlanId) {
    const err = new Error('Plan requerido para referencia de pago.');
    err.code = 'PAYMENT_REFERENCE_PLAN_REQUIRED';
    err.statusCode = 400;
    throw err;
  }

  return `nominaec-${shortId(tenantId)}-${shortId(userId)}-${normalizedPlanId}-${normalizedNonce}`;
}

function parseSubscriptionPaymentReference(reference) {
  const raw = String(reference || '').trim();
  const match = /^nominaec-([A-Z0-9]+)-([A-Z0-9]+)-([A-Z0-9_]+)-([0-9a-f]+)$/i.exec(raw);
  if (!match) return null;
  return {
    kind: 'SUBSCRIPTION',
    tenantHint: match[1],
    userHint: match[2],
    planId: normalizePlanId(match[3]),
    nonce: match[4],
    raw,
  };
}

module.exports = {
  buildSubscriptionPaymentReference,
  normalizePlanId,
  parseSubscriptionPaymentReference,
};
