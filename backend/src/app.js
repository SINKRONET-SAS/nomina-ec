// ============================================================
// SKNOMINA - Aplicacion principal backend
// ============================================================
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const AppError = require('./utils/AppError');
const correlationId = require('./middleware/correlationId');
const { createRateLimiter } = require('./middleware/rateLimit');
const logger = require('./utils/logger');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(correlationId);
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf?.toString('utf8') || '';
  },
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const tenantResolver = require('./middleware/tenantResolver');
const db = require('./config/database');
app.use(tenantResolver);
app.use((req, res, next) => {
  db.runWithTenantContext({
    tenantId: req.tenantId,
    userId: req.userId || req.usuarioId,
  }, next);
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'SKNOMINA Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    correlationId: req.correlationId,
  });
});

const employeeAppInviteController = require('./controllers/employeeAppInviteController');
const createAuthRoutes = require('./routes/authRoutes');
const { authenticateToken, requireFreshUser, requireRole } = require('./middleware/auth');
const { requirePlanCapability } = require('./middleware/planCapability');
const { requireModule } = require('./middleware/moduleAuth');
const authRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: 'auth' });
const requireMobileAppPlan = requirePlanCapability('mobileApp');
const requireFieldRoutesPlan = requirePlanCapability('fieldRoutes');
app.use('/api/auth', createAuthRoutes({ authRateLimit }));
app.post('/api/mobile/empleado/activar', authRateLimit, employeeAppInviteController.aceptarPublica);

const paymentController = require('./controllers/paymentController');
const fiscalBillingController = require('./controllers/fiscalBillingController');
app.get('/api/pagos/planes', paymentController.listPublicPlans);
app.get('/api/pagos/confirm', paymentController.paymentReturn);
app.get('/api/pagos/cancelado', paymentController.paymentCancelled);
app.post('/api/pagos/webhook', paymentController.confirmPayment);
app.post('/api/pagos/webhook/payphone', paymentController.payphoneWebhook);
app.post('/api/facturacion/webhook/facturador', fiscalBillingController.webhook);

const storageController = require('./controllers/storageController');
app.get('/api/storage/local/:encodedKey', storageController.descargarLocal);

const externalApiRoutes = require('./routes/externalApiRoutes');
const { authenticateExternalApi } = require('./middleware/externalApiAuth');
const externalApiRateLimit = createRateLimiter({ windowMs: 60 * 1000, max: 120, keyPrefix: 'api-v1' });
app.use('/api/v1', externalApiRateLimit, authenticateExternalApi, externalApiRoutes);

app.use('/api', authenticateToken);

const configurationController = require('./controllers/configurationController');
const communicationController = require('./controllers/communicationController');
const ecuadorCatalogController = require('./controllers/ecuadorCatalogController');
const privacyController = require('./controllers/privacyController');
app.get('/api/configuracion/resumen', requireRole('superadmin', 'owner', 'admin_rrhh'), requireModule('parametrizacion'), configurationController.summary);
app.get('/api/configuracion/onboarding', requireRole('superadmin', 'owner', 'admin_rrhh'), requireModule('parametrizacion'), configurationController.onboarding);
app.get('/api/catalogos/ecuador/provincias', requireRole('superadmin', 'owner', 'admin_rrhh'), ecuadorCatalogController.provincias);
app.get('/api/catalogos/ecuador/ciudades', requireRole('superadmin', 'owner', 'admin_rrhh'), ecuadorCatalogController.ciudades);
app.get('/api/privacidad/consentimientos', privacyController.consentStatus);
app.patch('/api/privacidad/consentimientos', requireRole('superadmin'), privacyController.updateConsents);
app.post('/api/privacidad/consentimientos/retirar-todo', requireRole('superadmin'), privacyController.withdrawAll);
app.get('/api/privacidad/consentimientos/historial', privacyController.history);
app.get('/api/privacidad/exportar', privacyController.exportData);
app.get('/api/privacidad/exportar/:userId', privacyController.exportData);
app.post('/api/privacidad/anonimizar/:userId', requireRole('superadmin'), requireFreshUser, privacyController.anonymize);
app.post('/api/configuracion/onboarding/:stepCode', requireRole('owner', 'admin_rrhh'), requireModule('parametrizacion'), configurationController.completeOnboardingStep);
app.post('/api/configuracion/parametros-legales/obligatorios', requireRole('superadmin', 'owner'), requireFreshUser, requireModule('parametrizacion'), configurationController.loadMandatoryLegalParameters);
app.post('/api/configuracion/parametros-legales/sincronizar-globales', requireRole('superadmin', 'owner'), requireFreshUser, requireModule('parametrizacion'), configurationController.syncLegalParametersFromGlobal);
app.get('/api/configuracion/:resource', requireRole('superadmin', 'owner', 'admin_rrhh'), requireModule('parametrizacion'), configurationController.list);
app.post('/api/configuracion/:resource', requireRole('superadmin', 'owner', 'admin_rrhh'), requireModule('parametrizacion'), configurationController.create);
app.put('/api/configuracion/:resource/:id', requireRole('superadmin', 'owner', 'admin_rrhh'), requireModule('parametrizacion'), configurationController.update);
app.delete('/api/configuracion/:resource/:id', requireRole('superadmin', 'owner', 'admin_rrhh'), requireModule('parametrizacion'), configurationController.remove);
app.get('/api/comunicaciones/status', requireRole('superadmin', 'owner', 'admin_rrhh'), requireModule('comunicaciones'), communicationController.status);
app.get('/api/comunicaciones/eventos', requireRole('superadmin', 'owner', 'admin_rrhh'), requireModule('comunicaciones'), communicationController.events);
app.post('/api/comunicaciones/prueba-email', requireRole('superadmin', 'owner', 'admin_rrhh'), requireModule('comunicaciones'), communicationController.testEmail);

const integrationController = require('./controllers/integrationController');
app.get('/api/integraciones/clientes', requireRole('superadmin', 'owner'), integrationController.listApiClients);
app.post('/api/integraciones/clientes', requireRole('superadmin', 'owner'), integrationController.createApiClient);

const superadminController = require('./controllers/superadminController');
app.get('/api/superadmin/overview', requireRole('superadmin'), superadminController.overview);
app.post('/api/superadmin/owners/:tenantId/plan', requireRole('superadmin'), requireFreshUser, superadminController.assignPlanToOwner);
app.post('/api/superadmin/incidencias', requireRole('superadmin'), requireFreshUser, superadminController.createSupportIncident);
app.put('/api/superadmin/incidencias/:id', requireRole('superadmin'), requireFreshUser, superadminController.updateSupportIncident);

app.get('/api/pagos/status', paymentController.subscriptionStatus);
app.get('/api/pagos/payment-methods', paymentController.listPaymentMethods);
app.get('/api/pagos/payment-methods/capabilities', paymentController.paymentCapabilities);
app.get('/api/pagos/capabilities', paymentController.tenantCapabilities);
app.post('/api/pagos/payment-methods/checkout-intent', requireRole('owner', 'superadmin'), requireFreshUser, paymentController.createCheckoutIntent);
app.post('/api/pagos/payment-methods/:paymentMethodId/revoke', requireRole('owner', 'superadmin'), requireFreshUser, paymentController.revokePaymentMethod);
app.get('/api/pagos/planes/admin', requireRole('superadmin'), paymentController.listAdminPlans);
app.post('/api/pagos/planes', requireRole('superadmin'), requireFreshUser, paymentController.upsertPlan);
app.put('/api/pagos/planes/:planId', requireRole('superadmin'), requireFreshUser, paymentController.upsertPlan);
app.delete('/api/pagos/planes/:planId', requireRole('superadmin'), requireFreshUser, paymentController.deletePlan);
app.get('/api/pagos/transferencias/admin', requireRole('superadmin'), paymentController.listManualBankTransfers);
app.post('/api/pagos/transferencias', requireRole('superadmin'), requireFreshUser, paymentController.createManualBankTransfer);
app.post('/api/pagos/transferencias/:id/aplicar', requireRole('superadmin'), requireFreshUser, paymentController.applyManualBankTransfer);
app.post('/api/pagos/transferencias/:id/reversar', requireRole('superadmin'), requireFreshUser, paymentController.reverseManualBankTransfer);
app.post('/api/pagos/transferencias/:id/:action(confirmar|rechazar)', requireRole('superadmin'), requireFreshUser, paymentController.updateManualBankTransferStatus);
app.get('/api/facturacion/status', requireRole('superadmin'), fiscalBillingController.status);
app.get('/api/facturacion/documentos', requireRole('superadmin'), fiscalBillingController.list);
app.post('/api/facturacion/transacciones/:paymentTransactionId/emitir', requireRole('superadmin'), requireFreshUser, fiscalBillingController.emitForTransaction);

const modulePermissionController = require('./controllers/modulePermissionController');
app.get('/api/usuarios/:id/permisos-modulo', requireRole('superadmin', 'owner'), modulePermissionController.obtener);
app.put('/api/usuarios/:id/permisos-modulo', requireRole('superadmin', 'owner'), requireFreshUser, modulePermissionController.actualizar);

const empleadoController = require('./controllers/empleadoController');
app.get('/api/empleados', requireRole('owner', 'admin_rrhh', 'supervisor'), requireModule('empleados'), empleadoController.listar);
app.get('/api/empleados/app-invitaciones', requireRole('owner', 'admin_rrhh'), requireModule('empleados'), employeeAppInviteController.listar);
app.post('/api/empleados/app-invitaciones/:id/reenviar', requireRole('owner', 'admin_rrhh'), requireModule('empleados'), employeeAppInviteController.reenviar);
app.post('/api/empleados/app-invitaciones/:id/revocar', requireRole('owner', 'admin_rrhh'), requireModule('empleados'), employeeAppInviteController.revocar);
app.get('/api/empleados/terminacion/causas', requireRole('owner', 'admin_rrhh'), requireModule('empleados'), empleadoController.listarCausalesTerminacion);
app.get('/api/empleados/importar/lotes', requireRole('owner', 'admin_rrhh'), requireModule('empleados'), empleadoController.listarLotesImportacion);
app.post('/api/empleados/importar/preview', requireRole('owner', 'admin_rrhh'), requireModule('empleados'), empleadoController.previewImportacion);
app.post('/api/empleados/importar/confirmar', requireRole('owner', 'admin_rrhh'), requireModule('empleados'), empleadoController.confirmarImportacion);
app.delete('/api/empleados/importar/lotes/:batchId', requireRole('owner', 'admin_rrhh'), requireModule('empleados'), empleadoController.revertirImportacion);
app.get('/api/empleados/:id', requireRole('owner', 'admin_rrhh', 'supervisor'), requireModule('empleados'), empleadoController.obtener);
app.get('/api/empleados/:id/historial', requireRole('owner', 'admin_rrhh', 'supervisor'), requireModule('empleados'), empleadoController.historial);
app.post('/api/empleados', requireRole('owner', 'admin_rrhh'), requireModule('empleados'), empleadoController.crear);
app.put('/api/empleados/:id', requireRole('owner', 'admin_rrhh'), requireModule('empleados'), empleadoController.actualizar);
app.post('/api/empleados/:id/app-invitacion', requireRole('owner', 'admin_rrhh'), requireModule('empleados'), employeeAppInviteController.crear);
app.post('/api/empleados/:id/terminar', requireRole('owner', 'admin_rrhh'), requireModule('empleados'), empleadoController.terminar);

const initialBalanceController = require('./controllers/initialBalanceController');
app.get('/api/onboarding/saldos-iniciales/plantilla.csv', requireRole('owner', 'admin_rrhh'), requireModule('empleados'), initialBalanceController.downloadTemplateCsv);
app.get('/api/onboarding/saldos-iniciales/plantilla.xlsx', requireRole('owner', 'admin_rrhh'), requireModule('empleados'), initialBalanceController.downloadTemplateXlsx);
app.get('/api/onboarding/saldos-iniciales/lotes', requireRole('owner', 'admin_rrhh'), requireModule('empleados'), initialBalanceController.list);
app.post('/api/onboarding/saldos-iniciales/dry-run', requireRole('owner', 'admin_rrhh'), requireModule('empleados'), initialBalanceController.dryRun);
app.get('/api/onboarding/saldos-iniciales/lotes/:batchId', requireRole('owner', 'admin_rrhh'), requireModule('empleados'), initialBalanceController.detail);
app.post('/api/onboarding/saldos-iniciales/lotes/:batchId/commit', requireRole('owner', 'admin_rrhh'), requireFreshUser, requireModule('empleados'), initialBalanceController.commit);
app.post('/api/onboarding/saldos-iniciales/lotes/:batchId/revertir', requireRole('owner', 'admin_rrhh'), requireFreshUser, requireModule('empleados'), initialBalanceController.revert);

const marcacionController = require('./controllers/marcacionController');
app.post('/api/marcaciones', requireRole('empleado', 'owner', 'admin_rrhh', 'supervisor'), requireModule('asistencia'), marcacionController.registrar);
app.get('/api/marcaciones/empleado/:empleadoId', requireModule('asistencia'), marcacionController.listarPorEmpleado);
app.get('/api/marcaciones/hoy', requireRole('empleado', 'owner', 'admin_rrhh', 'supervisor'), requireModule('asistencia'), marcacionController.listarHoy);

const routeController = require('./controllers/routeController');
app.get('/api/rutas/sitios', requireRole('owner', 'admin_rrhh', 'supervisor'), requireFieldRoutesPlan, requireModule('asistencia'), routeController.listSites);
app.post('/api/rutas/sitios', requireRole('owner', 'admin_rrhh'), requireFieldRoutesPlan, requireModule('asistencia'), routeController.createSite);
app.put('/api/rutas/sitios/:id', requireRole('owner', 'admin_rrhh'), requireFieldRoutesPlan, requireModule('asistencia'), routeController.updateSite);
app.delete('/api/rutas/sitios/:id', requireRole('owner', 'admin_rrhh'), requireFieldRoutesPlan, requireModule('asistencia'), routeController.deleteSite);
app.get('/api/rutas/dias', requireRole('owner', 'admin_rrhh', 'supervisor'), requireFieldRoutesPlan, requireModule('asistencia'), routeController.listDays);
app.post('/api/rutas/dias', requireRole('owner', 'admin_rrhh', 'supervisor'), requireFieldRoutesPlan, requireModule('asistencia'), routeController.createDay);
app.get('/api/rutas/excepciones', requireRole('owner', 'admin_rrhh', 'supervisor'), requireFieldRoutesPlan, requireModule('asistencia'), routeController.listExceptions);
app.put('/api/rutas/excepciones/:id', requireRole('owner', 'admin_rrhh', 'supervisor'), requireFieldRoutesPlan, requireModule('asistencia'), routeController.reviewException);
app.get('/api/rutas/reporte', requireRole('owner', 'admin_rrhh', 'supervisor'), requireFieldRoutesPlan, requireModule('asistencia'), routeController.report);
app.get('/api/rutas/reporte.csv', requireRole('owner', 'admin_rrhh', 'supervisor'), requireFieldRoutesPlan, requireModule('asistencia'), routeController.exportCsv);
app.get('/api/rutas/reporte.xlsx', requireRole('owner', 'admin_rrhh', 'supervisor'), requireFieldRoutesPlan, requireModule('asistencia'), routeController.exportXlsx);
app.get('/api/rutas/reporte.pdf', requireRole('owner', 'admin_rrhh', 'supervisor'), requireFieldRoutesPlan, requireModule('asistencia'), routeController.exportPdf);

const movilizacionController = require('./controllers/movilizacionController');
app.post('/api/movilizacion/informe', requireRole('empleado', 'owner', 'admin_rrhh'), requireMobileAppPlan, requireModule('operacion'), movilizacionController.recibirInforme);
app.get('/api/movilizacion/mis-informes', requireRole('empleado', 'owner', 'admin_rrhh'), requireMobileAppPlan, requireModule('operacion'), movilizacionController.misInformes);
app.get('/api/movilizacion/informes', requireRole('owner', 'admin_rrhh'), requireMobileAppPlan, requireModule('operacion'), movilizacionController.listarInformes);
app.patch('/api/movilizacion/informes/:id', requireRole('owner', 'admin_rrhh'), requireMobileAppPlan, requireFreshUser, requireModule('operacion'), movilizacionController.resolverInforme);

const mobileController = require('./controllers/mobileController');
app.get('/api/mobile/me', requireRole('empleado', 'owner', 'admin_rrhh', 'supervisor'), requireMobileAppPlan, mobileController.perfil);
app.get('/api/mobile/admin/rutas/resumen', requireRole('owner', 'admin_rrhh', 'supervisor'), requireMobileAppPlan, requireFieldRoutesPlan, mobileController.adminRutasResumen);
app.post('/api/mobile/admin/zonas', requireRole('owner', 'admin_rrhh'), requireMobileAppPlan, requireFieldRoutesPlan, mobileController.crearZonaMarcacionMovil);
app.post('/api/mobile/admin/rutas/sitios', requireRole('owner', 'admin_rrhh'), requireMobileAppPlan, requireFieldRoutesPlan, mobileController.crearSitioRutaMovil);
app.post('/api/mobile/admin/rutas/dias', requireRole('owner', 'admin_rrhh', 'supervisor'), requireMobileAppPlan, requireFieldRoutesPlan, mobileController.asignarRutaMovil);
app.get('/api/mobile/asistencia/resumen', requireRole('empleado', 'owner', 'admin_rrhh', 'supervisor'), requireMobileAppPlan, mobileController.resumenAsistencia);
app.post('/api/mobile/marcaciones', requireRole('empleado', 'owner', 'admin_rrhh', 'supervisor'), requireMobileAppPlan, mobileController.registrarMarcacionMovil);
app.get('/api/mobile/ruta/hoy', requireRole('empleado', 'owner', 'admin_rrhh', 'supervisor'), requireMobileAppPlan, requireFieldRoutesPlan, mobileController.rutaHoy);
app.get('/api/mobile/historial', requireRole('empleado', 'owner', 'admin_rrhh', 'supervisor'), requireMobileAppPlan, mobileController.historial);
app.post('/api/mobile/permisos', requireRole('empleado', 'owner', 'admin_rrhh', 'supervisor'), requireMobileAppPlan, mobileController.solicitarPermiso);
app.post('/api/mobile/ruta/paradas/:stopId/llegada', requireRole('empleado', 'owner', 'admin_rrhh', 'supervisor'), requireMobileAppPlan, requireFieldRoutesPlan, mobileController.registrarLlegadaRuta);
app.post('/api/mobile/ruta/paradas/:stopId/salida', requireRole('empleado', 'owner', 'admin_rrhh', 'supervisor'), requireMobileAppPlan, requireFieldRoutesPlan, mobileController.registrarSalidaRuta);
app.post('/api/mobile/ruta/paradas/:stopId/omitir', requireRole('empleado', 'owner', 'admin_rrhh', 'supervisor'), requireMobileAppPlan, requireFieldRoutesPlan, mobileController.omitirParadaRuta);
app.post('/api/mobile/ruta/visitas/no-programada', requireRole('empleado', 'owner', 'admin_rrhh', 'supervisor'), requireMobileAppPlan, requireFieldRoutesPlan, mobileController.registrarVisitaNoProgramada);
app.get('/api/mobile/nomina/:anio/:mes', requireRole('empleado', 'owner', 'admin_rrhh', 'supervisor'), requireMobileAppPlan, mobileController.rolPago);

const novedadController = require('./controllers/novedadController');
app.get('/api/novedades', requireRole('owner', 'admin_rrhh', 'supervisor'), requireModule('asistencia'), novedadController.listar);
app.get('/api/novedades/pendientes', requireRole('owner', 'admin_rrhh', 'supervisor'), requireModule('asistencia'), novedadController.listarPendientes);
app.get('/api/novedades/tipos', requireRole('owner', 'admin_rrhh', 'supervisor'), requireModule('asistencia'), novedadController.listarTipos);
app.get('/api/novedades/plantilla-carga-masiva', requireRole('owner', 'admin_rrhh', 'supervisor'), requireModule('asistencia'), novedadController.descargarPlantillaCargaMasiva);
app.post('/api/novedades', requireRole('owner', 'admin_rrhh', 'supervisor'), requireModule('asistencia'), novedadController.crear);
app.post('/api/novedades/carga-masiva', requireRole('owner', 'admin_rrhh'), requireModule('asistencia'), novedadController.cargaMasiva);
app.put('/api/novedades/periodo/resolver', requireRole('owner', 'admin_rrhh'), requireModule('asistencia'), novedadController.resolverPeriodo);
app.put('/api/novedades/:id', requireRole('owner', 'admin_rrhh'), requireModule('asistencia'), novedadController.actualizar);
app.delete('/api/novedades/:id', requireRole('owner', 'admin_rrhh'), requireModule('asistencia'), novedadController.eliminar);
app.put('/api/novedades/:id/aprobar', requireRole('owner', 'admin_rrhh'), requireModule('asistencia'), novedadController.aprobar);
app.put('/api/novedades/:id/rechazar', requireRole('owner', 'admin_rrhh'), requireModule('asistencia'), novedadController.rechazar);

const beneficioEmpleadoController = require('./controllers/beneficioEmpleadoController');
app.get('/api/beneficios', requireRole('owner', 'admin_rrhh'), requireModule('nomina'), beneficioEmpleadoController.listar);
app.post('/api/beneficios', requireRole('owner', 'admin_rrhh'), requireModule('nomina'), beneficioEmpleadoController.crear);
app.put('/api/beneficios/:id', requireRole('owner', 'admin_rrhh'), requireModule('nomina'), beneficioEmpleadoController.actualizar);

const payrollAccountingController = require('./controllers/payrollAccountingController');
app.get('/api/nomina/contabilidad/conceptos', requireRole('owner', 'admin_rrhh'), requireModule('nomina'), payrollAccountingController.listConcepts);
app.get('/api/nomina/contabilidad/mapeos', requireRole('owner', 'admin_rrhh'), requireModule('nomina'), payrollAccountingController.listMappings);
app.post('/api/nomina/contabilidad/mapeos', requireRole('owner', 'admin_rrhh'), requireModule('nomina'), payrollAccountingController.createMapping);
app.put('/api/nomina/contabilidad/mapeos/:id', requireRole('owner', 'admin_rrhh'), requireModule('nomina'), payrollAccountingController.updateMapping);

const nominaController = require('./controllers/nominaController');
app.post('/api/nomina/calcular', requireRole('owner', 'admin_rrhh'), requireFreshUser, requireModule('nomina'), nominaController.calcularMes);
app.get('/api/nomina/periodos/:anio', requireRole('owner', 'admin_rrhh'), requireModule('nomina'), nominaController.listarPeriodosAnuales);
app.post('/api/nomina/periodos/generar-anual', requireRole('owner', 'admin_rrhh'), requireFreshUser, requireModule('nomina'), nominaController.generarPeriodosAnuales);
app.post('/api/nomina/periodos/cerrar-anteriores-vacios', requireRole('owner', 'admin_rrhh'), requireFreshUser, requireModule('nomina'), nominaController.cerrarPeriodosAnterioresVacios);
app.put('/api/nomina/periodo/:anio/:mes/fechas', requireRole('owner', 'admin_rrhh'), requireFreshUser, requireModule('nomina'), nominaController.actualizarFechasPeriodo);
app.get('/api/nomina/periodo/:anio/:mes', requireRole('owner', 'admin_rrhh'), requireModule('nomina'), nominaController.obtenerEstadoPeriodo);
app.post('/api/nomina/periodo/abrir', requireRole('owner', 'admin_rrhh'), requireModule('nomina'), nominaController.abrirPeriodo);
app.post('/api/nomina/periodo/cerrar-operativo', requireRole('owner', 'admin_rrhh'), requireFreshUser, requireModule('nomina'), nominaController.cerrarPeriodoOperativo);
app.post('/api/nomina/novedades/lote', requireRole('owner', 'admin_rrhh'), requireModule('nomina'), nominaController.crearLoteNovedades);
app.delete('/api/nomina/novedades/lote/:batchId', requireRole('owner', 'admin_rrhh'), requireModule('nomina'), nominaController.eliminarLoteNovedades);
app.get('/api/nomina/:id/rol-pdf', requireRole('owner', 'admin_rrhh'), requireModule('nomina'), nominaController.descargarRolPDF);
app.post('/api/nomina/:id/rol-email', requireRole('owner', 'admin_rrhh'), requireFreshUser, requireModule('nomina'), nominaController.enviarRolPagoEmail);
app.get('/api/nomina/:anio/:mes/roles-pdf-transpuesto', requireRole('owner', 'admin_rrhh'), requireModule('nomina'), nominaController.descargarRolesTranspuestosPDF);
app.get('/api/nomina/:anio/:mes', requireRole('owner', 'admin_rrhh'), requireModule('nomina'), nominaController.listarPorPeriodo);
app.get('/api/nomina/empleado/:empleadoId/:anio/:mes', requireModule('nomina'), nominaController.obtenerPorEmpleado);
app.post('/api/nomina/cerrar', requireRole('owner', 'admin_rrhh'), requireFreshUser, requireModule('nomina'), nominaController.cerrarMes);
app.post('/api/nomina/reabrir', requireRole('owner', 'admin_rrhh'), requireFreshUser, requireModule('nomina'), nominaController.reabrirMes);

const documentoLegalController = require('./controllers/documentoLegalController');
app.get('/api/documentos/contrato/tipos-ecuador', requireRole('owner', 'admin_rrhh'), requireModule('documentos'), documentoLegalController.listarTiposContratoEcuador);
app.get('/api/documentos/contrato/plantillas', requireRole('owner', 'admin_rrhh'), requireModule('documentos'), documentoLegalController.listarPlantillasContrato);
app.post('/api/documentos/contrato', requireRole('owner', 'admin_rrhh'), requireModule('documentos'), documentoLegalController.generarContrato);
app.post('/api/documentos/finiquito', requireRole('owner', 'admin_rrhh'), requireModule('documentos'), documentoLegalController.generarFiniquito);
app.post('/api/documentos/acta-entrega-dotacion', requireRole('owner', 'admin_rrhh'), requireModule('documentos'), documentoLegalController.generarActaEntregaDotacion);
app.post('/api/documentos/adjuntar', requireRole('owner', 'admin_rrhh'), requireModule('documentos'), documentoLegalController.adjuntarDocumento);
app.get('/api/documentos', requireRole('owner', 'admin_rrhh'), requireModule('documentos'), documentoLegalController.listar);
app.get('/api/documentos/:id/download', requireRole('owner', 'admin_rrhh'), requireModule('documentos'), documentoLegalController.descargar);

const reporteController = require('./controllers/reporteController');
app.post('/api/reportes/rdep/precheck', requireRole('owner', 'admin_rrhh'), requireModule('reportes'), reporteController.validarRDEP);
app.post('/api/reportes/rdep', requireRole('owner', 'admin_rrhh'), requireModule('reportes'), reporteController.generarRDEP);
app.post('/api/reportes/formulario-107/precheck', requireRole('owner', 'admin_rrhh'), requireModule('reportes'), reporteController.validarFormulario107);
app.post('/api/reportes/formulario-107', requireRole('owner', 'admin_rrhh'), requireModule('reportes'), reporteController.generarFormulario107);
app.post('/api/reportes/sae/precheck', requireRole('owner', 'admin_rrhh'), requireModule('reportes'), reporteController.validarSAE);
app.post('/api/reportes/sae', requireRole('owner', 'admin_rrhh'), requireModule('reportes'), reporteController.generarSAE);
// Ruta canonica para archivos bancarios: /api/reportes/banco/*
// Las rutas legacy /api/pagos/banco/* fueron eliminadas en AISK26-04
app.post('/api/reportes/banco/precheck', requireRole('owner', 'admin_rrhh'), requireModule('reportes'), reporteController.validarArchivoBanco);
app.post('/api/reportes/banco', requireRole('owner', 'admin_rrhh'), requireModule('reportes'), reporteController.generarArchivoBanco);
app.post('/api/reportes/nomina/exportar', requireRole('owner', 'admin_rrhh'), requireModule('reportes'), reporteController.exportarNomina);
app.get('/api/reportes/nomina/:anio/consolidado', requireRole('owner', 'admin_rrhh'), requireModule('reportes'), reporteController.exportarConsolidadoAnual);
app.get('/api/reportes/asistencia/:anio/:mes', requireRole('owner', 'admin_rrhh', 'supervisor'), requireModule('reportes'), reporteController.reporteAsistencia);

const auditController = require('./controllers/auditController');
app.get('/api/auditoria', requireRole('superadmin', 'owner'), requireModule('auditoria'), auditController.listar);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const code = err.code || err.name || 'ERROR_INTERNO';
  const correlation = err.correlationId || req.correlationId;

  logger.error({
    code,
    statusCode,
    correlationId: correlation,
    userId: req.usuario?.id || null,
  }, err.message || 'Error interno del servidor');

  if (err.message && err.message.includes('Regla irrenunciable')) {
    return res.status(403).json({
      error: 'VIOLACION_REGLA_IRRENUNCIABLE',
      message: err.message,
      correlationId: correlation,
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      correlationId: correlation,
      ...(err.details && { details: err.details }),
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'VALIDACION_ERROR',
      message: err.message,
      correlationId: correlation,
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'NO_AUTORIZADO',
      message: 'Token invalido o expirado',
      correlationId: correlation,
    });
  }

  if (
    err.message?.includes('JWT_SECRET')
    || err.message?.includes('EMPLOYEE_INVITE_SECRET')
  ) {
    return res.status(503).json({
      error: 'CONFIGURACION_SEGURIDAD_INCOMPLETA',
      message: 'El servicio de autenticacion no esta configurado para emitir accesos. Contacta al administrador del sistema.',
      correlationId: correlation,
    });
  }

  return res.status(statusCode).json({
    error: code,
    message: err.message || 'Error interno del servidor',
    correlationId: correlation,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: 'No encontramos ese recurso. Revisa la direccion o vuelve al inicio.',
    correlationId: req.correlationId,
  });
});

app.listen(PORT, () => {
  logger.info({
    code: 'APP_STARTED',
    statusCode: 200,
    correlationId: 'app-startup',
    userId: null,
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    url: `http://localhost:${PORT}`,
  }, 'SKNOMINA backend iniciado');

  // HAL-40: PayPhone health check async al arranque
  require('./services/payphoneGatewayService').healthCheck().catch((err) => {
    logger.error({
      code: err.code || 'PAYPHONE_HEALTHCHECK_STARTUP_ERROR',
      statusCode: err.statusCode || 503,
      correlationId: 'app-startup',
      userId: null,
    }, err.message || 'No se pudo verificar PayPhone al iniciar');
  });
});

module.exports = app;
