// ============================================================
// Nómina-Ec - Aplicacion principal backend
// ============================================================
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const AppError = require('./utils/AppError');
const correlationId = require('./middleware/correlationId');
const { createRateLimiter } = require('./middleware/rateLimit');
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const tenantResolver = require('./middleware/tenantResolver');
app.use(tenantResolver);

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Nómina-Ec Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    correlationId: req.correlationId,
  });
});

const authController = require('./controllers/authController');
const { authenticateToken, requireRole } = require('./middleware/auth');
const authRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20, keyPrefix: 'auth' });
app.post('/api/auth/login', authRateLimit, authController.login);
app.post('/api/auth/refresh', authController.refreshToken);
app.post('/api/auth/public-register', authRateLimit, authController.publicRegister);
app.post('/api/auth/password/forgot', authRateLimit, authController.forgotPassword);
app.post('/api/auth/password/reset', authRateLimit, authController.resetPassword);
app.post('/api/auth/email-verification/request', authRateLimit, authController.requestEmailVerification);
app.post('/api/auth/email-verification/resend', authRateLimit, authController.requestEmailVerification);
app.post('/api/auth/email-verification/confirm', authRateLimit, authController.confirmEmailVerification);
app.post('/api/auth/register', authRateLimit, authenticateToken, requireRole('superadmin', 'owner'), authController.register);

const paymentController = require('./controllers/paymentController');
app.get('/api/pagos/planes', paymentController.listPublicPlans);
app.get('/api/pagos/confirm', paymentController.confirmPayment);
app.post('/api/pagos/webhook', paymentController.confirmPayment);

const externalApiRoutes = require('./routes/externalApiRoutes');
const { authenticateExternalApi } = require('./middleware/externalApiAuth');
const externalApiRateLimit = createRateLimiter({ windowMs: 60 * 1000, max: 120, keyPrefix: 'api-v1' });
app.use('/api/v1', externalApiRateLimit, authenticateExternalApi, externalApiRoutes);

app.use('/api', authenticateToken);

const configurationController = require('./controllers/configurationController');
app.get('/api/configuracion/resumen', requireRole('superadmin', 'owner', 'admin_rrhh'), configurationController.summary);
app.get('/api/configuracion/onboarding', requireRole('superadmin', 'owner', 'admin_rrhh'), configurationController.onboarding);
app.post('/api/configuracion/onboarding/:stepCode', requireRole('owner', 'admin_rrhh'), configurationController.completeOnboardingStep);
app.post('/api/configuracion/parametros-legales/obligatorios', requireRole('superadmin', 'owner', 'admin_rrhh'), configurationController.loadMandatoryLegalParameters);
app.get('/api/configuracion/:resource', requireRole('superadmin', 'owner', 'admin_rrhh'), configurationController.list);
app.post('/api/configuracion/:resource', requireRole('superadmin', 'owner', 'admin_rrhh'), configurationController.create);
app.put('/api/configuracion/:resource/:id', requireRole('superadmin', 'owner', 'admin_rrhh'), configurationController.update);

const integrationController = require('./controllers/integrationController');
app.get('/api/integraciones/clientes', requireRole('superadmin', 'owner'), integrationController.listApiClients);
app.post('/api/integraciones/clientes', requireRole('superadmin', 'owner'), integrationController.createApiClient);

const superadminController = require('./controllers/superadminController');
app.get('/api/superadmin/overview', requireRole('superadmin'), superadminController.overview);
app.post('/api/superadmin/incidencias', requireRole('superadmin'), superadminController.createSupportIncident);
app.put('/api/superadmin/incidencias/:id', requireRole('superadmin'), superadminController.updateSupportIncident);

app.get('/api/auth/email-verification/status', authController.emailVerificationStatus);
app.get('/api/pagos/status', paymentController.subscriptionStatus);
app.get('/api/pagos/payment-methods', paymentController.listPaymentMethods);
app.get('/api/pagos/payment-methods/capabilities', paymentController.paymentCapabilities);
app.get('/api/pagos/capabilities', paymentController.tenantCapabilities);
app.post('/api/pagos/payment-methods/checkout-intent', requireRole('owner', 'superadmin'), paymentController.createCheckoutIntent);
app.post('/api/pagos/payment-methods/:paymentMethodId/revoke', requireRole('owner', 'superadmin'), paymentController.revokePaymentMethod);
app.get('/api/pagos/planes/admin', requireRole('superadmin', 'owner'), paymentController.listAdminPlans);
app.post('/api/pagos/planes', requireRole('superadmin'), paymentController.upsertPlan);
app.put('/api/pagos/planes/:planId', requireRole('superadmin'), paymentController.upsertPlan);
app.delete('/api/pagos/planes/:planId', requireRole('superadmin'), paymentController.deletePlan);

const empleadoController = require('./controllers/empleadoController');
app.get('/api/empleados', empleadoController.listar);
app.post('/api/empleados/importar/preview', requireRole('owner', 'admin_rrhh'), empleadoController.previewImportacion);
app.post('/api/empleados/importar/confirmar', requireRole('owner', 'admin_rrhh'), empleadoController.confirmarImportacion);
app.get('/api/empleados/:id', empleadoController.obtener);
app.post('/api/empleados', requireRole('owner', 'admin_rrhh'), empleadoController.crear);
app.put('/api/empleados/:id', requireRole('owner', 'admin_rrhh'), empleadoController.actualizar);
app.post('/api/empleados/:id/terminar', requireRole('owner', 'admin_rrhh'), empleadoController.terminar);

const marcacionController = require('./controllers/marcacionController');
app.post('/api/marcaciones', marcacionController.registrar);
app.get('/api/marcaciones/empleado/:empleadoId', marcacionController.listarPorEmpleado);
app.get('/api/marcaciones/hoy', marcacionController.listarHoy);

const mobileController = require('./controllers/mobileController');
app.get('/api/mobile/me', requireRole('empleado', 'owner', 'admin_rrhh'), mobileController.perfil);
app.get('/api/mobile/asistencia/resumen', requireRole('empleado', 'owner', 'admin_rrhh'), mobileController.resumenAsistencia);
app.post('/api/mobile/marcaciones', requireRole('empleado', 'owner', 'admin_rrhh'), mobileController.registrarMarcacionMovil);
app.get('/api/mobile/nomina/:anio/:mes', requireRole('empleado', 'owner', 'admin_rrhh'), mobileController.rolPago);

const novedadController = require('./controllers/novedadController');
app.get('/api/novedades', novedadController.listar);
app.get('/api/novedades/pendientes', novedadController.listarPendientes);
app.post('/api/novedades', requireRole('owner', 'admin_rrhh', 'supervisor'), novedadController.crear);
app.put('/api/novedades/:id/aprobar', requireRole('owner', 'admin_rrhh'), novedadController.aprobar);
app.put('/api/novedades/:id/rechazar', requireRole('owner', 'admin_rrhh'), novedadController.rechazar);

const beneficioEmpleadoController = require('./controllers/beneficioEmpleadoController');
app.get('/api/beneficios', requireRole('owner', 'admin_rrhh'), beneficioEmpleadoController.listar);
app.post('/api/beneficios', requireRole('owner', 'admin_rrhh'), beneficioEmpleadoController.crear);
app.put('/api/beneficios/:id', requireRole('owner', 'admin_rrhh'), beneficioEmpleadoController.actualizar);

const nominaController = require('./controllers/nominaController');
app.post('/api/nomina/calcular', requireRole('owner', 'admin_rrhh'), nominaController.calcularMes);
app.get('/api/nomina/periodo/:anio/:mes', requireRole('owner', 'admin_rrhh'), nominaController.obtenerEstadoPeriodo);
app.post('/api/nomina/periodo/abrir', requireRole('owner', 'admin_rrhh'), nominaController.abrirPeriodo);
app.post('/api/nomina/novedades/lote', requireRole('owner', 'admin_rrhh'), nominaController.crearLoteNovedades);
app.get('/api/nomina/:anio/:mes', nominaController.listarPorPeriodo);
app.get('/api/nomina/empleado/:empleadoId/:anio/:mes', nominaController.obtenerPorEmpleado);
app.get('/api/nomina/:id/rol-pdf', nominaController.descargarRolPDF);
app.post('/api/nomina/cerrar', requireRole('owner', 'admin_rrhh'), nominaController.cerrarMes);
app.post('/api/nomina/reabrir', requireRole('owner', 'admin_rrhh'), nominaController.reabrirMes);

const documentoLegalController = require('./controllers/documentoLegalController');
app.post('/api/documentos/contrato', requireRole('owner', 'admin_rrhh'), documentoLegalController.generarContrato);
app.post('/api/documentos/finiquito', requireRole('owner', 'admin_rrhh'), documentoLegalController.generarFiniquito);
app.get('/api/documentos', documentoLegalController.listar);
app.get('/api/documentos/:id/download', documentoLegalController.descargar);

const reporteController = require('./controllers/reporteController');
app.post('/api/reportes/rdep/precheck', requireRole('owner', 'admin_rrhh'), reporteController.validarRDEP);
app.post('/api/reportes/rdep', requireRole('owner', 'admin_rrhh'), reporteController.generarRDEP);
app.post('/api/reportes/sae', requireRole('owner', 'admin_rrhh'), reporteController.generarSAE);
app.post('/api/reportes/banco', requireRole('owner', 'admin_rrhh'), reporteController.generarArchivoBanco);
app.get('/api/reportes/asistencia/:anio/:mes', reporteController.reporteAsistencia);

const auditController = require('./controllers/auditController');
app.get('/api/auditoria', requireRole('superadmin', 'owner'), auditController.listar);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const code = err.code || err.name || 'ERROR_INTERNO';
  const correlation = err.correlationId || req.correlationId;

  console.error('[ERROR]', {
    code,
    statusCode,
    correlationId: correlation,
    userId: req.usuario?.id || null,
    message: err.message,
  });

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
  console.log('============================================================');
  console.log('  Nómina-Ec - Backend SaaS de nomina Ecuador');
  console.log(`  Puerto: ${PORT}`);
  console.log(`  Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  URL: http://localhost:${PORT}`);
  console.log('============================================================');
});

module.exports = app;
