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

async function descargarPlantilla(_req, res) {
  const headers = advancePayrollService.ADVANCE_BULK_TEMPLATE_COLUMNS;
  const csv = [
    headers.join(','),
    advancePayrollService.templateCsv().split(/\r?\n/)[1],
  ].join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="plantilla_rol_anticipos.csv"');
  return res.send(`\ufeff${csv}`);
}

async function cargarMasiva(req, res, next) {
  try {
    const role = await advancePayrollService.createBulkRun(req.tenantId, req.body, req.usuario, context(req));
    return res.status(201).json({ success: true, role, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const role = await advancePayrollService.updateDraftRun(req.tenantId, req.params.id, req.body, req.usuario, context(req));
    return res.json({ success: true, role, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    const result = await advancePayrollService.deleteDraftRun(req.tenantId, req.params.id, req.usuario, context(req));
    return res.json({ success: true, result, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function anular(req, res, next) {
  try {
    const role = await advancePayrollService.annulRun(req.tenantId, req.params.id, req.usuario, context(req));
    return res.json({ success: true, role, correlationId: req.correlationId });
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

async function aplicarSeleccion(req, res, next) {
  try {
    const role = await advancePayrollService.applyRequestedDecisions(req.tenantId, req.params.id, req.usuario, context(req));
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
    const headers = ['empleado', 'cedula', 'monto', 'tipoNovedad', 'nombreBonificacion', 'resolucionSolicitada', 'estado', 'beneficioId', 'bonificacionNovedadId'];
    const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = role.lineas.map((line) => [line.empleadoNombre, line.cedula, line.monto, line.tipoNovedad, line.nombreBonificacion, line.resolucionSolicitada, line.estado, line.beneficioId, line.bonificacionNovedadId].map(csvCell).join(','));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="rol_anticipos_${role.anio}_${String(role.mes).padStart(2, '0')}.csv"`);
    return res.send(`\ufeff${[headers.join(','), ...rows].join('\r\n')}`);
  } catch (err) {
    return next(err);
  }
}

async function descargarReporte(req, res, next) {
  try {
    const roles = await advancePayrollService.listRuns(req.tenantId, req.query);
    const headers = ['rolId', 'anio', 'mes', 'fechaCorte', 'estadoRol', 'descripcion', 'empleado', 'cedula', 'monto', 'tipoNovedad', 'nombreBonificacion', 'resolucionSolicitada', 'estadoLinea', 'beneficioId', 'bonificacionNovedadId'];
    const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = roles.flatMap((role) => role.lineas.map((line) => [
      role.id, role.anio, role.mes, role.fechaCorte, role.estado, role.descripcion,
      line.empleadoNombre, line.cedula, line.monto, line.tipoNovedad,
      line.nombreBonificacion, line.resolucionSolicitada, line.estado, line.beneficioId, line.bonificacionNovedadId,
    ].map(csvCell).join(',')));
    const period = req.query?.anio && req.query?.mes
      ? `${req.query.anio}_${String(req.query.mes).padStart(2, '0')}`
      : 'filtrado';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="reporte_roles_anticipos_${period}.csv"`);
    return res.send(`\ufeff${[headers.join(','), ...rows].join('\r\n')}`);
  } catch (err) {
    return next(err);
  }
}

module.exports = { listar, crear, descargarPlantilla, cargarMasiva, actualizar, eliminar, anular, aprobar, decidirLinea, aplicarSeleccion, cerrar, descargarCsv, descargarReporte };
