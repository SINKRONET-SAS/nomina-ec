const advancePayrollService = require('../services/advancePayrollService');

function context(req) {
  return { correlationId: req.correlationId, ipAddress: req.ip };
}

async function listar(req, res, next) {
  try {
    const roles = await advancePayrollService.listRuns(req.tenantId, req.query);
    return res.json({ success: true, roles, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function crear(req, res, next) {
  try {
    const role = await advancePayrollService.createRun(req.tenantId, req.body, req.usuario, context(req));
    return res.status(201).json({ success: true, role, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function aprobar(req, res, next) {
  try {
    const role = await advancePayrollService.approveRun(req.tenantId, req.params.id, req.usuario, context(req));
    return res.json({ success: true, role, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function decidirLinea(req, res, next) {
  try {
    const role = await advancePayrollService.decideLine(req.tenantId, req.params.id, req.params.lineId, req.body?.decision, req.usuario, context(req));
    return res.json({ success: true, role, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function cerrar(req, res, next) {
  try {
    const role = await advancePayrollService.closeRun(req.tenantId, req.params.id, req.usuario, context(req));
    return res.json({ success: true, role, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function descargarCsv(req, res, next) {
  try {
    const role = await advancePayrollService.getRun(req.tenantId, req.params.id);
    const headers = ['empleado', 'cedula', 'monto', 'tipoNovedad', 'nombreBonificacion', 'estado', 'beneficioId', 'bonificacionNovedadId'];
    const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = role.lineas.map((line) => [line.empleadoNombre, line.cedula, line.monto, line.tipoNovedad, line.nombreBonificacion, line.estado, line.beneficioId, line.bonificacionNovedadId].map(csvCell).join(','));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="rol_anticipos_${role.anio}_${String(role.mes).padStart(2, '0')}.csv"`);
    return res.send(`\ufeff${[headers.join(','), ...rows].join('\r\n')}`);
  } catch (err) {
    return next(err);
  }
}

module.exports = { listar, crear, aprobar, decidirLinea, cerrar, descargarCsv };
