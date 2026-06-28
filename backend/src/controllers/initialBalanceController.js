const {
  buildTemplateCsv,
  buildTemplateXlsx,
  commitBatch,
  createDryRunBatch,
  getBatch,
  listBatches,
  revertBatch,
} = require('../services/initialBalanceService');
const { recordAudit } = require('../services/auditService');

async function downloadTemplateCsv(_req, res, next) {
  try {
    const csv = buildTemplateCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla_saldos_iniciales_sknomina.csv"');
    return res.status(200).send(`\ufeff${csv}`);
  } catch (err) {
    return next(err);
  }
}

async function downloadTemplateXlsx(_req, res, next) {
  try {
    const buffer = await buildTemplateXlsx();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla_saldos_iniciales_sknomina.xlsx"');
    return res.status(200).send(Buffer.from(buffer));
  } catch (err) {
    return next(err);
  }
}

async function list(req, res, next) {
  try {
    const data = await listBatches({ tenantId: req.usuario.tenantId });
    return res.json({ success: true, data, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function detail(req, res, next) {
  try {
    const data = await getBatch({
      tenantId: req.usuario.tenantId,
      batchId: req.params.batchId,
    });
    return res.json({ success: true, data, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function dryRun(req, res, next) {
  try {
    const data = await createDryRunBatch({
      tenantId: req.usuario.tenantId,
      userId: req.usuario.id,
      periodCut: req.body.periodCut,
      rows: req.body.rows,
      sourceFilename: req.body.sourceFilename || '',
      correlationId: req.correlationId,
    });
    await recordAudit({
      tenantId: req.usuario.tenantId,
      userId: req.usuario.id,
      correlationId: req.correlationId,
      action: 'saldos_iniciales.dry_run',
      entity: 'initial_balance_batches',
      entityId: data.id,
      newData: {
        status: data.status,
        totalRows: data.totalRows,
        errorRows: data.errorRows,
      },
      ipAddress: req.ip,
    });
    return res.status(201).json({ success: true, data, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function commit(req, res, next) {
  try {
    const data = await commitBatch({
      tenantId: req.usuario.tenantId,
      userId: req.usuario.id,
      batchId: req.params.batchId,
      correlationId: req.correlationId,
    });
    await recordAudit({
      tenantId: req.usuario.tenantId,
      userId: req.usuario.id,
      correlationId: req.correlationId,
      action: 'saldos_iniciales.commit',
      entity: 'initial_balance_batches',
      entityId: data.id,
      newData: {
        status: data.status,
        totalRows: data.totalRows,
      },
      ipAddress: req.ip,
    });
    return res.json({ success: true, data, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function revert(req, res, next) {
  try {
    const data = await revertBatch({
      tenantId: req.usuario.tenantId,
      userId: req.usuario.id,
      batchId: req.params.batchId,
      correlationId: req.correlationId,
    });
    await recordAudit({
      tenantId: req.usuario.tenantId,
      userId: req.usuario.id,
      correlationId: req.correlationId,
      action: 'saldos_iniciales.revert',
      entity: 'initial_balance_batches',
      entityId: data.id,
      newData: {
        status: data.status,
      },
      ipAddress: req.ip,
    });
    return res.json({ success: true, data, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  downloadTemplateCsv,
  downloadTemplateXlsx,
  list,
  detail,
  dryRun,
  commit,
  revert,
};
