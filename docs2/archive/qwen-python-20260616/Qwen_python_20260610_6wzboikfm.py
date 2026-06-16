# Crear app.js principal
app_js = """// ============================================================
// PLAN HAIKY - Aplicación Principal Backend
// SaaS RRHH Ecuador
// ============================================================
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// MIDDLEWARES GLOBALES
// ============================================================
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// MIDDLEWARE DE RESOLUCIÓN DE TENANT (debe ir antes de las rutas)
// ============================================================
const tenantResolver = require('./middleware/tenantResolver');
app.use(tenantResolver);

// ============================================================
// RUTAS
// ============================================================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Plan Haiky Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString() 
  });
});

// Auth
const authController = require('./controllers/authController');
app.post('/api/auth/login', authController.login);
app.post('/api/auth/register', authController.register);
app.post('/api/auth/refresh', authController.refreshToken);

// Empleados
const empleadoController = require('./controllers/empleadoController');
app.get('/api/empleados', empleadoController.listar);
app.get('/api/empleados/:id', empleadoController.obtener);
app.post('/api/empleados', empleadoController.crear);
app.put('/api/empleados/:id', empleadoController.actualizar);
app.post('/api/empleados/:id/terminar', empleadoController.terminar);

// Marcaciones
const marcacionController = require('./controllers/marcacionController');
app.post('/api/marcaciones', marcacionController.registrar);
app.get('/api/marcaciones/empleado/:empleadoId', marcacionController.listarPorEmpleado);
app.get('/api/marcaciones/hoy', marcacionController.listarHoy);

// Novedades
const novedadController = require('./controllers/novedadController');
app.get('/api/novedades', novedadController.listar);
app.get('/api/novedades/pendientes', novedadController.listarPendientes);
app.post('/api/novedades', novedadController.crear);
app.put('/api/novedades/:id/aprobar', novedadController.aprobar);
app.put('/api/novedades/:id/rechazar', novedadController.rechazar);

// Nómina
const nominaController = require('./controllers/nominaController');
app.post('/api/nomina/calcular', nominaController.calcularMes);
app.get('/api/nomina/:anio/:mes', nominaController.listarPorPeriodo);
app.get('/api/nomina/empleado/:empleadoId/:anio/:mes', nominaController.obtenerPorEmpleado);
app.get('/api/nomina/:id/rol-pdf', nominaController.descargarRolPDF);
app.post('/api/nomina/cerrar', nominaController.cerrarMes);

// Documentos Legales
const documentoLegalController = require('./controllers/documentoLegalController');
app.post('/api/documentos/contrato', documentoLegalController.generarContrato);
app.post('/api/documentos/finiquito', documentoLegalController.generarFiniquito);
app.get('/api/documentos', documentoLegalController.listar);
app.get('/api/documentos/:id/download', documentoLegalController.descargar);

// Reportes
const reporteController = require('./controllers/reporteController');
app.post('/api/reportes/ats', reporteController.generarATS);
app.post('/api/reportes/sae', reporteController.generarSAE);
app.post('/api/reportes/banco', reporteController.generarArchivoBanco);
app.get('/api/reportes/asistencia/:anio/:mes', reporteController.reporteAsistencia);

// ============================================================
// MANEJO DE ERRORES
// ============================================================
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  
  // Error de regla irrenunciable
  if (err.message && err.message.includes('Regla irrenunciable')) {
    return res.status(403).json({
      error: 'VIOLACION_REGLA_IRRENUNCIABLE',
      message: err.message,
    });
  }
  
  // Error de validación
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'VALIDACION_ERROR',
      message: err.message,
    });
  }
  
  // Error de autenticación
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'NO_AUTORIZADO',
      message: 'Token inválido o expirado',
    });
  }
  
  // Error genérico
  res.status(err.status || 500).json({
    error: err.name || 'ERROR_INTERNO',
    message: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: 'Ruta no encontrada',
  });
});

// ============================================================
// INICIAR SERVIDOR
// ============================================================
app.listen(PORT, () => {
  console.log('============================================================');
  console.log('  PLAN HAIKY - Backend SaaS RRHH Ecuador');
  console.log('  Puerto: ' + PORT);
  console.log('  Entorno: ' + (process.env.NODE_ENV || 'development'));
  console.log('  URL: http://localhost:' + PORT);
  console.log('============================================================');
});

module.exports = app;
"""

with open('backend/src/app.js', 'w') as f:
    f.write(app_js)

print("✓ app.js principal creado")
 # Result 
✓ app.js principal creado
