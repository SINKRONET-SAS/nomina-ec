const {
  communicationStatus,
  sendTestEmail,
} = require('../services/communicationService');
const { listCommunicationEvents } = require('../services/communicationAuditService');

async function status(req, res) {
  return res.json({
    success: true,
    data: communicationStatus(),
    correlationId: req.correlationId,
  });
}

async function testEmail(req, res, next) {
  try {
    const to = req.body?.to || req.usuario?.email;
    const delivery = await sendTestEmail({
      to,
      correlationId: req.correlationId,
      userId: req.usuario?.id || req.usuarioId || null,
      tenantId: req.tenantId || req.usuario?.tenantId || null,
    });

    return res.json({
      success: true,
      delivery,
      correlationId: req.correlationId,
    });
  } catch (err) {
    return next(err);
  }
}

async function events(req, res, next) {
  try {
    const limit = req.query?.limit || 40;
    const tenantId = req.usuario?.rol === 'superadmin'
      ? (req.query?.tenantId || req.tenantId || null)
      : (req.tenantId || req.usuario?.tenantId || null);
    const rows = await listCommunicationEvents({ tenantId, limit });

    return res.json({
      success: true,
      data: rows,
      correlationId: req.correlationId,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  events,
  status,
  testEmail,
};
