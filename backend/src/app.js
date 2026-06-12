// ============================================================
// PLAN HAIKY - Aplicacion Principal Backend
// SaaS RRHH Ecuador
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
    service: 'Plan Haiky Backend',
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
app.post('/api/auth/register', authRateLimit, authenticateToken, requireRole('superadmin', 'owner'), authController.register);

app.use('/api', authenticateToken);

const empleadoController = require('./controllers/empleadoController');
app.get('/api/empleados', empleadoController.listar);
app.get('/api/empleados/:id', empleadoController.obtener);
app.post('/api/empleados', requireRole('owner', 'admin_rrhh'), empleadoController.crear);
app.put('/api/empleados/:id', requireRole('owner', 'admin_rrhh'), empleadoController.actualizar);
app.post('/api/empleados/:id/terminar', requireRole('owner', 'admin_rrhh'), empleadoController.terminar);

const marcacionController = require('./controllers/marcacionController');
app.post('/api/marcaciones', marcacionController.registrar);
app.get('/api/marcaciones/empleado/:empleadoId', marcacionController.listarPorEmpleado);
app.get('/api/marcaciones/hoy', marcacionController.listarHoy);

const novedadController = require('./controllers/novedadController');
app.get('/api/novedades', novedadController.listar);
app.get('/api/novedades/pendientes', novedadController.listarPendientes);
app.post('/api/novedades', requireRole('owner', 'admin_rrhh', 'supervisor'), novedadController.crear);
app.put('/api/novedades/:id/aprobar', requireRole('owner', 'admin_rrhh'), novedadController.aprobar);
app.put('/api/novedades/:id/rechazar', requireRole('owner', 'admin_rrhh'), novedadController.rechazar);

const nominaController = require('./controllers/nominaController');
app.post('/api/nomina/calcular', requireRole('owner', 'admin_rrhh'), nominaController.calcularMes);
app.get('/api/nomina/:anio/:mes', nominaController.listarPorPeriodo);
app.get('/api/nomina/empleado/:empleadoId/:anio/:mes', nominaController.obtenerPorEmpleado);
app.get('/api/nomina/:id/rol-pdf', nominaController.descargarRolPDF);
app.post('/api/nomina/cerrar', requireRole('owner', 'admin_rrhh'), nominaController.cerrarMes);

const documentoLegalController = require('./controllers/documentoLegalController');
app.post('/api/documentos/contrato', requireRole('owner', 'admin_rrhh'), documentoLegalController.generarContrato);
app.post('/api/documentos/finiquito', requireRole('owner', 'admin_rrhh'), documentoLegalController.generarFiniquito);
app.get('/api/documentos', documentoLegalController.listar);
app.get('/api/documentos/:id/download', documentoLegalController.descargar);

const reporteController = require('./controllers/reporteController');
app.post('/api/reportes/ats', requireRole('owner', 'admin_rrhh'), reporteController.generarATS);
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
    message: 'Ruta no encontrada',
    correlationId: req.correlationId,
  });
});

app.listen(PORT, () => {
  console.log('============================================================');
  console.log('  PLAN HAIKY - Backend SaaS RRHH Ecuador');
  console.log(`  Puerto: ${PORT}`);
  console.log(`  Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  URL: http://localhost:${PORT}`);
  console.log('============================================================');
});

module.exports = app;
