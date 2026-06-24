const routeVisitService = require('../services/routeVisitService');

function context(req) {
  return {
    correlationId: req.correlationId,
    ipAddress: req.ip,
  };
}

function user(req) {
  return req.usuario || { id: req.usuarioId, tenantId: req.tenantId, rol: undefined };
}

async function listSites(req, res, next) {
  try {
    const sites = await routeVisitService.listRouteSites({
      tenantId: req.tenantId,
      status: req.query.status,
    });
    return res.json({ success: true, sites, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function createSite(req, res, next) {
  try {
    const site = await routeVisitService.createRouteSite({
      tenantId: req.tenantId,
      payload: req.body,
      user: user(req),
      context: context(req),
    });
    return res.status(201).json({ success: true, site, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function updateSite(req, res, next) {
  try {
    const site = await routeVisitService.updateRouteSite({
      tenantId: req.tenantId,
      siteId: req.params.id,
      payload: req.body,
      user: user(req),
      context: context(req),
    });
    return res.json({ success: true, site, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function deleteSite(req, res, next) {
  try {
    const result = await routeVisitService.deleteRouteSite({
      tenantId: req.tenantId,
      siteId: req.params.id,
      user: user(req),
      context: context(req),
    });
    return res.json({ success: true, result, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function listDays(req, res, next) {
  try {
    const days = await routeVisitService.listRouteDays({
      tenantId: req.tenantId,
      fecha: req.query.fecha,
      empleadoId: req.query.empleadoId,
      status: req.query.status,
    });
    return res.json({ success: true, days, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function createDay(req, res, next) {
  try {
    const route = await routeVisitService.createRouteDay({
      tenantId: req.tenantId,
      payload: req.body,
      user: user(req),
      context: context(req),
    });
    return res.status(201).json({ success: true, route, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function listExceptions(req, res, next) {
  try {
    const exceptions = await routeVisitService.listRouteExceptions({
      tenantId: req.tenantId,
      status: req.query.status,
      fecha: req.query.fecha,
    });
    return res.json({ success: true, exceptions, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function reviewException(req, res, next) {
  try {
    const exception = await routeVisitService.reviewRouteException({
      tenantId: req.tenantId,
      exceptionId: req.params.id,
      payload: req.body,
      user: user(req),
      context: context(req),
    });
    return res.json({ success: true, exception, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function exportCsv(req, res, next) {
  try {
    const csv = await routeVisitService.exportRouteReportCsv({
      tenantId: req.tenantId,
      fechaInicio: req.query.fechaInicio || req.query.desde,
      fechaFin: req.query.fechaFin || req.query.hasta,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="rutas-mercaderistas.csv"');
    return res.send(csv);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createDay,
  createSite,
  deleteSite,
  exportCsv,
  listDays,
  listExceptions,
  listSites,
  reviewException,
  updateSite,
};
