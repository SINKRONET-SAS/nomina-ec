const MAX_PLAN_TRIAL_DAYS = Math.max(
  0,
  Math.round(Number(process.env.MAX_PLAN_TRIAL_DAYS || 90)) || 90
);

const DEFAULT_TRIAL_DAYS = process.env.DEFAULT_TRIAL_DAYS !== undefined
  ? normalizeTrialDays(process.env.DEFAULT_TRIAL_DAYS, 14)
  : 14;

function normalizeTrialDays(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return normalizeFallback(fallback);
  return Math.min(MAX_PLAN_TRIAL_DAYS, Math.max(0, Math.trunc(parsed)));
}

function normalizeFallback(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(MAX_PLAN_TRIAL_DAYS, Math.max(0, Math.trunc(parsed)));
}

function normalizePlanMetadata(metadata) {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? { ...metadata }
    : {};
}

function getPlanTrialDays(plan = {}, options = {}) {
  const metadata = normalizePlanMetadata(plan.metadata);
  const planId = String(plan.id || plan.plan_id || '').trim().toUpperCase();
  const fallback = options.fallback !== undefined
    ? options.fallback
    : (planId === 'TRIAL' ? DEFAULT_TRIAL_DAYS : 0);
  return normalizeTrialDays(
    plan.trialDays ?? plan.trial_days ?? metadata.trialDays ?? metadata.trial_days,
    fallback
  );
}

function withPlanTrialMetadata(metadata, trialDays) {
  return {
    ...normalizePlanMetadata(metadata),
    trialDays: normalizeTrialDays(trialDays, 0),
  };
}

function resolveSubscriptionRuntimeState(row = {}, now = new Date()) {
  const estado = String(row.estado || '').trim().toLowerCase();
  const expiresAt = row.vence_en || row.venceEn || null;
  const expiryDate = expiresAt ? new Date(expiresAt) : null;
  const hasValidExpiry = expiryDate && !Number.isNaN(expiryDate.getTime());
  const isExpired = hasValidExpiry && expiryDate.getTime() <= now.getTime();

  if (estado === 'trial') {
    return hasValidExpiry && !isExpired ? 'trial' : 'expired';
  }
  if (estado === 'active') {
    return hasValidExpiry && !isExpired ? 'active' : 'expired';
  }
  return estado || 'sin_plan';
}

module.exports = {
  DEFAULT_TRIAL_DAYS,
  MAX_PLAN_TRIAL_DAYS,
  getPlanTrialDays,
  normalizePlanMetadata,
  normalizeTrialDays,
  resolveSubscriptionRuntimeState,
  withPlanTrialMetadata,
};
