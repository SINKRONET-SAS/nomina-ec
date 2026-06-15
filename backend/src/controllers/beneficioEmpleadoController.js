const beneficioService = require('../services/beneficioEmpleadoService');

function context(req) {
  return {
    correlationId: req.correlationId,
    ipAddress: req.ip,
  };
}

async function listar(req, res, next) {
  try {
    const beneficios = await beneficioService.listBenefits(req.tenantId, {
      estado: req.query.estado,
      empleadoId: req.query.empleadoId,
    });
    return res.json({ success: true, beneficios, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function crear(req, res, next) {
  try {
    const beneficio = await beneficioService.createBenefit(req.tenantId, req.body, req.usuario, context(req));
    return res.status(201).json({ success: true, beneficio, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const beneficio = await beneficioService.updateBenefit(req.tenantId, req.params.id, req.body, req.usuario, context(req));
    return res.json({ success: true, beneficio, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listar,
  crear,
  actualizar,
};
