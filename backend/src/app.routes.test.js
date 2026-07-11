const fs = require('fs');
const path = require('path');

describe('app route order', () => {
  test('declara descarga de rol PDF antes de la ruta generica anio/mes de nomina', () => {
    const source = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
    const rolPdfIndex = source.indexOf("app.get('/api/nomina/:id/rol-pdf'");
    const rolEmailIndex = source.indexOf("app.post('/api/nomina/:id/rol-email'");
    const rolTranspuestoPdfIndex = source.indexOf("app.get('/api/nomina/:anio/:mes/roles-pdf-transpuesto'");
    const periodIndex = source.indexOf("app.get('/api/nomina/:anio/:mes'");

    expect(rolPdfIndex).toBeGreaterThanOrEqual(0);
    expect(rolEmailIndex).toBeGreaterThanOrEqual(0);
    expect(rolTranspuestoPdfIndex).toBeGreaterThanOrEqual(0);
    expect(periodIndex).toBeGreaterThanOrEqual(0);
    expect(rolPdfIndex).toBeLessThan(periodIndex);
    expect(rolEmailIndex).toBeLessThan(periodIndex);
    expect(rolTranspuestoPdfIndex).toBeLessThan(periodIndex);
  });

  test('GET de retorno de pago no activa planes con confirmPayment', () => {
    const source = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
    expect(source).toContain("app.get('/api/pagos/confirm', paymentController.paymentReturn)");
    expect(source).toContain("app.post('/api/pagos/webhook', paymentController.confirmPayment)");
    expect(source).not.toContain("app.get('/api/pagos/confirm', paymentController.confirmPayment)");
  });

  test('expone consolidado anual de nomina desde reportes', () => {
    const source = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
    expect(source).toContain("app.get('/api/reportes/nomina/:anio/consolidado'");
    expect(source).toContain('reporteController.exportarConsolidadoAnual');
  });

  test('expone precheck SAE IESS antes de generar XML oficial', () => {
    const source = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
    const precheckIndex = source.indexOf("app.post('/api/reportes/sae/precheck'");
    const generateIndex = source.indexOf("app.post('/api/reportes/sae',");

    expect(precheckIndex).toBeGreaterThanOrEqual(0);
    expect(generateIndex).toBeGreaterThanOrEqual(0);
    expect(precheckIndex).toBeLessThan(generateIndex);
    expect(source).toContain('reporteController.validarSAE');
  });

  test('expone rutas MSF26 para saldos iniciales y facturacion fiscal', () => {
    const source = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

    expect(source).toContain("app.get('/api/onboarding/saldos-iniciales/plantilla.csv'");
    expect(source).toContain("app.post('/api/onboarding/saldos-iniciales/dry-run'");
    expect(source).toContain("app.post('/api/onboarding/saldos-iniciales/lotes/:batchId/commit'");
    expect(source).toContain("app.post('/api/facturacion/webhook/facturador'");
    expect(source).toContain("app.get('/api/facturacion/status', requireRole('superadmin')");
    expect(source).toContain("app.post('/api/facturacion/transacciones/:paymentTransactionId/emitir', requireRole('superadmin')");
  });

  test('restringe gestion de planes comerciales a superadmin', () => {
    const source = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

    expect(source).toContain("app.get('/api/pagos/planes/admin', requireRole('superadmin'), paymentController.listAdminPlans)");
    expect(source).toContain("app.post('/api/pagos/planes', requireRole('superadmin'), requireFreshUser, paymentController.upsertPlan)");
    expect(source).toContain("app.put('/api/pagos/planes/:planId', requireRole('superadmin'), requireFreshUser, paymentController.upsertPlan)");
    expect(source).toContain("app.delete('/api/pagos/planes/:planId', requireRole('superadmin'), requireFreshUser, paymentController.deletePlan)");
  });

  test('monetiza rutas y app movil con capacidades de plan', () => {
    const source = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

    expect(source).toContain("const requireMobileAppPlan = requirePlanCapability('mobileApp')");
    expect(source).toContain("const requireFieldRoutesPlan = requirePlanCapability('fieldRoutes')");
    expect(source).toContain("app.get('/api/rutas/sitios', requireRole('owner', 'admin_rrhh', 'supervisor'), requireFieldRoutesPlan, requireModule('asistencia')");
    expect(source).toContain("app.get('/api/mobile/me', requireRole('empleado', 'owner', 'admin_rrhh', 'supervisor'), requireMobileAppPlan");
    expect(source).toContain("app.get('/api/mobile/ruta/hoy', requireRole('empleado', 'owner', 'admin_rrhh', 'supervisor'), requireMobileAppPlan, requireFieldRoutesPlan");
    expect(source).toContain("app.post('/api/movilizacion/informe', requireRole('empleado', 'owner', 'admin_rrhh'), requireMobileAppPlan, requireModule('operacion')");
  });

  test('expone gestion movil de zonas y rutas por perfil sin saltar gates de plan', () => {
    const source = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

    expect(source).toContain("app.get('/api/mobile/admin/rutas/resumen', requireRole('owner', 'admin_rrhh', 'supervisor'), requireMobileAppPlan, requireFieldRoutesPlan");
    expect(source).toContain("app.post('/api/mobile/admin/zonas', requireRole('owner', 'admin_rrhh'), requireMobileAppPlan, requireFieldRoutesPlan");
    expect(source).toContain("app.post('/api/mobile/admin/rutas/sitios', requireRole('owner', 'admin_rrhh'), requireMobileAppPlan, requireFieldRoutesPlan");
    expect(source).toContain("app.post('/api/mobile/admin/rutas/dias', requireRole('owner', 'admin_rrhh', 'supervisor'), requireMobileAppPlan, requireFieldRoutesPlan");
  });
});

describe('AISK26-01: cierre brechas RBAC', () => {
  const source = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

  test('POST /api/marcaciones requiere rol y modulo asistencia', () => {
    expect(source).toContain(
      "app.post('/api/marcaciones', requireRole('empleado', 'owner', 'admin_rrhh', 'supervisor'), requireModule('asistencia'), marcacionController.registrar)"
    );
  });

  test('GET /api/marcaciones/hoy requiere rol y modulo asistencia', () => {
    expect(source).toContain(
      "app.get('/api/marcaciones/hoy', requireRole('empleado', 'owner', 'admin_rrhh', 'supervisor'), requireModule('asistencia'), marcacionController.listarHoy)"
    );
  });

  test('GET /api/novedades requiere rol y modulo asistencia', () => {
    expect(source).toContain(
      "app.get('/api/novedades', requireRole('owner', 'admin_rrhh', 'supervisor'), requireModule('asistencia'), novedadController.listar)"
    );
  });

  test('GET /api/novedades/pendientes requiere rol y modulo asistencia', () => {
    expect(source).toContain(
      "app.get('/api/novedades/pendientes', requireRole('owner', 'admin_rrhh', 'supervisor'), requireModule('asistencia'), novedadController.listarPendientes)"
    );
  });

  test('GET /api/novedades/tipos requiere rol y modulo asistencia', () => {
    expect(source).toContain(
      "app.get('/api/novedades/tipos', requireRole('owner', 'admin_rrhh', 'supervisor'), requireModule('asistencia'), novedadController.listarTipos)"
    );
  });

  test('PUT/DELETE /api/novedades/:id requiere rol y modulo asistencia', () => {
    expect(source).toContain(
      "app.put('/api/novedades/:id', requireRole('owner', 'admin_rrhh'), requireModule('asistencia'), novedadController.actualizar)"
    );
    expect(source).toContain(
      "app.delete('/api/novedades/:id', requireRole('owner', 'admin_rrhh'), requireModule('asistencia'), novedadController.eliminar)"
    );
  });

  test('GET /api/nomina/:id/rol-pdf requiere rol y modulo nomina', () => {
    expect(source).toContain(
      "app.get('/api/nomina/:id/rol-pdf', requireRole('owner', 'admin_rrhh'), requireModule('nomina'), nominaController.descargarRolPDF)"
    );
  });

  test('DELETE /api/nomina/novedades/lote/:batchId requiere rol y modulo nomina', () => {
    expect(source).toContain(
      "app.delete('/api/nomina/novedades/lote/:batchId', requireRole('owner', 'admin_rrhh'), requireModule('nomina'), nominaController.eliminarLoteNovedades)"
    );
  });

  test('GET /api/nomina/:anio/:mes requiere rol y modulo nomina', () => {
    expect(source).toContain(
      "app.get('/api/nomina/:anio/:mes', requireRole('owner', 'admin_rrhh'), requireModule('nomina'), nominaController.listarPorPeriodo)"
    );
  });

  test('POST /api/nomina/:id/rol-email requiere rol, usuario fresco y modulo nomina', () => {
    expect(source).toContain(
      "app.post('/api/nomina/:id/rol-email', requireRole('owner', 'admin_rrhh'), requireFreshUser, requireModule('nomina'), nominaController.enviarRolPagoEmail)"
    );
  });

  test('expone administracion anual de periodos antes de rutas genericas', () => {
    expect(source).toContain("app.get('/api/nomina/periodos/:anio', requireRole('owner', 'admin_rrhh'), requireModule('nomina'), nominaController.listarPeriodosAnuales)");
    expect(source).toContain("app.post('/api/nomina/periodos/generar-anual', requireRole('owner', 'admin_rrhh'), requireFreshUser, requireModule('nomina'), nominaController.generarPeriodosAnuales)");
    expect(source).toContain("app.post('/api/nomina/periodos/cerrar-anteriores-vacios', requireRole('owner', 'admin_rrhh'), requireFreshUser, requireModule('nomina'), nominaController.cerrarPeriodosAnterioresVacios)");
    expect(source).toContain("app.put('/api/nomina/periodo/:anio/:mes/fechas', requireRole('owner', 'admin_rrhh'), requireFreshUser, requireModule('nomina'), nominaController.actualizarFechasPeriodo)");
    expect(source).toContain("app.post('/api/nomina/periodo/cerrar-operativo', requireRole('owner', 'admin_rrhh'), requireFreshUser, requireModule('nomina'), nominaController.cerrarPeriodoOperativo)");
    expect(source.indexOf("app.get('/api/nomina/periodos/:anio'")).toBeLessThan(
      source.indexOf("app.get('/api/nomina/:anio/:mes'"),
    );
  });

  test('parametros legales obligatorios quedan restringidos a owner o superadmin con modulo parametrizacion', () => {
    expect(source).toContain("app.post('/api/configuracion/parametros-legales/obligatorios', requireRole('superadmin', 'owner'), requireFreshUser, requireModule('parametrizacion'), configurationController.loadMandatoryLegalParameters)");
  });

  test('expone catalogo de tipos de contrato Ecuador antes de generar contratos', () => {
    expect(source).toContain("app.get('/api/documentos/contrato/tipos-ecuador', requireRole('owner', 'admin_rrhh'), requireModule('documentos'), documentoLegalController.listarTiposContratoEcuador)");
    expect(source.indexOf("app.get('/api/documentos/contrato/tipos-ecuador'")).toBeLessThan(
      source.indexOf("app.post('/api/documentos/contrato'"),
    );
  });

  test('GET /api/documentos requiere rol y modulo documentos', () => {
    expect(source).toContain(
      "app.get('/api/documentos', requireRole('owner', 'admin_rrhh'), requireModule('documentos'), documentoLegalController.listar)"
    );
  });

  test('GET /api/documentos/:id/download requiere rol y modulo documentos', () => {
    expect(source).toContain(
      "app.get('/api/documentos/:id/download', requireRole('owner', 'admin_rrhh'), requireModule('documentos'), documentoLegalController.descargar)"
    );
  });

  test('GET /api/empleados/terminacion/causas requiere rol y modulo empleados', () => {
    expect(source).toContain(
      "app.get('/api/empleados/terminacion/causas', requireRole('owner', 'admin_rrhh'), requireModule('empleados'), empleadoController.listarCausalesTerminacion)"
    );
  });

  test('GET /api/reportes/asistencia/:anio/:mes requiere rol y modulo reportes', () => {
    expect(source).toContain(
      "app.get('/api/reportes/asistencia/:anio/:mes', requireRole('owner', 'admin_rrhh', 'supervisor'), requireModule('reportes'), reporteController.reporteAsistencia)"
    );
  });

  test('ninguno de los endpoints RBAC queda sin requireRole', () => {
    // Verify that the previously unprotected endpoints no longer appear without requireRole
    expect(source).not.toContain("app.post('/api/marcaciones', marcacionController.registrar)");
    expect(source).not.toContain("app.get('/api/marcaciones/hoy', marcacionController.listarHoy)");
    expect(source).not.toContain("app.get('/api/novedades', novedadController.listar)");
    expect(source).not.toContain("app.get('/api/novedades/pendientes', novedadController.listarPendientes)");
    expect(source).not.toContain("app.get('/api/nomina/:id/rol-pdf', nominaController.descargarRolPDF)");
    expect(source).not.toContain("app.post('/api/nomina/:id/rol-email', nominaController.enviarRolPagoEmail)");
    expect(source).not.toContain("app.get('/api/nomina/:anio/:mes', nominaController.listarPorPeriodo)");
    expect(source).not.toContain("app.get('/api/documentos', documentoLegalController.listar)");
    expect(source).not.toContain("app.get('/api/documentos/:id/download', documentoLegalController.descargar)");
    expect(source).not.toContain("app.get('/api/empleados/terminacion/causas', empleadoController.listarCausalesTerminacion)");
    expect(source).not.toContain("app.get('/api/reportes/asistencia/:anio/:mes', reporteController.reporteAsistencia)");
  });
});
