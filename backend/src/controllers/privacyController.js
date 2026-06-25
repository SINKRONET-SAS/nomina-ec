const {
  getConsentStatus,
  listConsentHistory,
  updateConsentPreferences,
  withdrawAllOptionalConsents,
} = require('../services/privacyConsentService');
const { exportUserData } = require('../services/userDataExportService');
const { anonymizeUserData } = require('../services/userDataPurgeService');

function targetUserIdFrom(req) {
  return req.params.userId || req.usuario.id;
}

async function consentStatus(req, res, next) {
  try {
    const data = await getConsentStatus({
      tenantId: req.usuario.tenantId,
      userId: req.usuario.id,
    });
    res.json({ success: true, data, correlationId: req.correlationId });
  } catch (err) {
    next(err);
  }
}

async function updateConsents(req, res, next) {
  try {
    const data = await updateConsentPreferences({
      tenantId: req.usuario.tenantId,
      userId: req.usuario.id,
      actorId: req.usuario.id,
      correlationId: req.correlationId,
      ipAddress: req.ip,
      preferences: req.body.preferences || req.body,
      source: req.body.source || 'dashboard',
    });
    res.json({ success: true, data, correlationId: req.correlationId });
  } catch (err) {
    next(err);
  }
}

async function withdrawAll(req, res, next) {
  try {
    const data = await withdrawAllOptionalConsents({
      tenantId: req.usuario.tenantId,
      userId: req.usuario.id,
      actorId: req.usuario.id,
      correlationId: req.correlationId,
      ipAddress: req.ip,
    });
    res.json({ success: true, data, correlationId: req.correlationId });
  } catch (err) {
    next(err);
  }
}

async function history(req, res, next) {
  try {
    const data = await listConsentHistory({
      tenantId: req.usuario.tenantId,
      userId: req.usuario.id,
      actorRole: req.usuario.rol,
    });
    res.json({ success: true, data, correlationId: req.correlationId });
  } catch (err) {
    next(err);
  }
}

async function exportData(req, res, next) {
  try {
    const data = await exportUserData({
      actor: req.usuario,
      targetUserId: targetUserIdFrom(req),
      correlationId: req.correlationId,
      ipAddress: req.ip,
    });
    res.json({ success: true, data, correlationId: req.correlationId });
  } catch (err) {
    next(err);
  }
}

async function anonymize(req, res, next) {
  try {
    const data = await anonymizeUserData({
      actor: req.usuario,
      targetUserId: targetUserIdFrom(req),
      correlationId: req.correlationId,
      ipAddress: req.ip,
      reason: req.body.reason,
    });
    res.json({ success: true, data, correlationId: req.correlationId });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  anonymize,
  consentStatus,
  exportData,
  history,
  updateConsents,
  withdrawAll,
};
