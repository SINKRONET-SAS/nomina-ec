const {
  getFiscalStatus,
  listFiscalInvoices,
  processFacturadorWebhook,
  requestInvoiceForTransaction,
} = require('../services/fiscalInvoiceService');
const { recordAudit } = require('../services/auditService');

async function status(req, res, next) {
  try {
    const data = await getFiscalStatus({ tenantId: req.usuario.tenantId });
    return res.json({ success: true, data, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function list(req, res, next) {
  try {
    const data = await listFiscalInvoices({ tenantId: req.usuario.tenantId });
    return res.json({ success: true, data, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function emitForTransaction(req, res, next) {
  try {
    const data = await requestInvoiceForTransaction({
      tenantId: req.usuario.tenantId,
      paymentTransactionId: req.params.paymentTransactionId,
      userId: req.usuario.id,
      correlationId: req.correlationId,
    });
    await recordAudit({
      tenantId: req.usuario.tenantId,
      userId: req.usuario.id,
      correlationId: req.correlationId,
      action: 'facturacion.emitir_solicitud',
      entity: 'fiscal_invoice_requests',
      entityId: data.id,
      newData: {
        status: data.status,
        externalReference: data.externalReference,
        attempts: data.attempts,
      },
      ipAddress: req.ip,
    });
    return res.status(202).json({ success: true, data, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function webhook(req, res, next) {
  try {
    const data = await processFacturadorWebhook({
      payload: req.body || {},
      rawPayload: req.rawBody || JSON.stringify(req.body || {}),
      signature: req.get('x-facturador-signature') || req.get('x-sinkronet-signature') || '',
      correlationId: req.correlationId,
    });
    return res.json({
      success: true,
      received: true,
      data: {
        id: data.id,
        status: data.status,
        externalReference: data.externalReference,
      },
      correlationId: req.correlationId,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  emitForTransaction,
  list,
  status,
  webhook,
};
