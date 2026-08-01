const beneficioService = require('../services/beneficioEmpleadoService');

function context(req) {
  return {
    correlationId: req.correlationId,
    ipAddress: req.ip,
  };
}

async function listar(req, res, next) {
  try {
    const result = await beneficioService.listBenefits(req.tenantId, {
      estado: req.query.estado,
      tipo: req.query.tipo,
      empleadoId: req.query.empleadoId,
      buscar: req.query.buscar || req.query.search,
      page: req.query.page,
      pageSize: req.query.pageSize,
    });
    return res.json({
      success: true,
      beneficios: result.items,
      pagination: result.pagination,
      totales: result.totals,
      correlationId: req.correlationId,
    });
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

async function eliminar(req, res, next) {
  try {
    await beneficioService.deleteBenefit(req.tenantId, req.params.id, req.usuario, context(req));
    return res.json({ success: true, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function aprobar(req, res, next) {
  try {
    const beneficio = await beneficioService.approveBenefit(req.tenantId, req.params.id, req.usuario, context(req));
    return res.json({ success: true, beneficio, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function anular(req, res, next) {
  try {
    const beneficio = await beneficioService.annulBenefit(req.tenantId, req.params.id, req.usuario, context(req));
    return res.json({ success: true, beneficio, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listar,
  crear,
  actualizar,
  eliminar,
  aprobar,
  anular,
};
