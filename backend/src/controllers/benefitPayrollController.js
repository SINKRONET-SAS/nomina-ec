const benefitPayrollService = require('../services/benefitPayrollService');

function context(req) {
  return { correlationId: req.correlationId, ipAddress: req.ip };
}

async function listar(req, res, next) {
  try {
    const roles = await benefitPayrollService.listRuns(req.tenantId, req.query);
    return res.json({ success: true, roles, tipos: benefitPayrollService.BENEFIT_TYPES, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function crear(req, res, next) {
  try {
    const role = await benefitPayrollService.createRun(req.tenantId, req.body, req.usuario, context(req));
    return res.status(201).json({ success: true, role, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function aprobar(req, res, next) {
  try {
    const role = await benefitPayrollService.approveRun(req.tenantId, req.params.id, req.usuario, context(req));
    return res.json({ success: true, role, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function cerrar(req, res, next) {
  try {
    const role = await benefitPayrollService.closeRun(req.tenantId, req.params.id, req.usuario, context(req));
    return res.json({ success: true, role, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function descargarXlsx(req, res, next) {
  try {
    const report = await benefitPayrollService.buildWorkbook(req.tenantId, req.params.id);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);
    return res.send(report.buffer);
  } catch (err) {
    return next(err);
  }
}

async function descargarPdf(req, res, next) {
  try {
    const report = await benefitPayrollService.buildPdf(req.tenantId, req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);
    return res.send(report.buffer);
  } catch (err) {
    return next(err);
  }
}

async function descargarCsv(req, res, next) {
  try {
    const role = await benefitPayrollService.getRun(req.tenantId, req.params.id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="rol_beneficios_${role.tipoBeneficio}_${role.anio}.csv"`);
    return res.send(benefitPayrollService.buildCsv(role));
  } catch (err) {
    return next(err);
  }
}

module.exports = { listar, crear, aprobar, cerrar, descargarXlsx, descargarPdf, descargarCsv };
