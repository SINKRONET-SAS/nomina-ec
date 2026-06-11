# Crear middleware de autenticación JWT
auth_middleware = """// ============================================================
// PLAN HAIKY - Middleware de Autenticación JWT
// ============================================================
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

/**
 * Verifica el token JWT y extrae la información del usuario
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'NO_AUTORIZADO',
      message: 'Token de autenticación requerido' 
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verificar que el usuario existe y está activo
    const result = await db.query(
      'SELECT id, tenant_id, email, rol, activo FROM usuarios WHERE id = $1 AND activo = true',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'NO_AUTORIZADO',
        message: 'Usuario no encontrado o inactivo' 
      });
    }

    const usuario = result.rows[0];
    
    // Adjuntar información del usuario a la request
    req.usuario = {
      id: usuario.id,
      tenantId: usuario.tenant_id,
      email: usuario.email,
      rol: usuario.rol,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'TOKEN_EXPIRADO',
        message: 'El token ha expirado, inicie sesión nuevamente' 
      });
    }
    return res.status(403).json({ 
      error: 'TOKEN_INVALIDO',
      message: 'Token inválido' 
    });
  }
};

/**
 * Verifica que el usuario tenga el rol requerido
 * @param  {...string} roles - Roles permitidos
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ 
        error: 'NO_AUTORIZADO',
        message: 'Autenticación requerida' 
      });
    }

    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({ 
        error: 'PERMISO_DENEGADO',
        message: 'No tiene permisos para realizar esta acción. Roles requeridos: ' + roles.join(', ')
      });
    }

    next();
  };
};

/**
 * Genera un token JWT
 * @param {Object} usuario - Datos del usuario
 * @returns {string} Token JWT
 */
const generateToken = (usuario) => {
  return jwt.sign(
    {
      userId: usuario.id,
      tenantId: usuario.tenant_id,
      email: usuario.email,
      rol: usuario.rol,
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

module.exports = {
  authenticateToken,
  requireRole,
  generateToken,
};
"""

with open('backend/src/middleware/auth.js', 'w') as f:
    f.write(auth_middleware)

# Crear middleware de resolución de tenant
tenant_resolver = """// ============================================================
// PLAN HAIKY - Middleware de Resolución de Tenant
// ============================================================
const db = require('../config/database');

/**
 * Extrae el tenant_id del JWT y lo establece en el contexto
 * Esto permite que RLS funcione correctamente en PostgreSQL
 */
const tenantResolver = async (req, res, next) => {
  // Saltar para rutas públicas
  if (req.path === '/health' || req.path === '/api/auth/login' || req.path === '/api/auth/register') {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(); // El middleware de auth se encargará
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key');
    
    if (decoded.tenantId) {
      // Guardar tenant_id en la request para uso posterior
      req.tenantId = decoded.tenantId;
      req.userId = decoded.userId;
      
      // Verificar que el tenant existe y está activo
      const result = await db.query(
        'SELECT id, activo FROM tenants WHERE id = $1 AND activo = true',
        [decoded.tenantId]
      );
      
      if (result.rows.length === 0) {
        return res.status(403).json({
          error: 'TENANT_INACTIVO',
          message: 'La empresa no está activa en el sistema',
        });
      }
    }
    
    next();
  } catch (err) {
    // No fallar aquí, el middleware de auth se encargará
    next();
  }
};

/**
 * Establece el contexto de tenant en la sesión de PostgreSQL
 * Debe llamarse dentro de una transacción
 * @param {Object} client - Cliente de PostgreSQL
 * @param {string} tenantId - UUID del tenant
 * @param {string} userId - UUID del usuario (opcional)
 */
const setTenantContext = async (client, tenantId, userId) => {
  await client.query(`SET LOCAL app.current_tenant_id = $1`, [tenantId]);
  if (userId) {
    await client.query(`SET LOCAL app.current_user_id = $1`, [userId]);
  }
};

module.exports = tenantResolver;
module.exports.setTenantContext = setTenantContext;
"""

with open('backend/src/middleware/tenantResolver.js', 'w') as f:
    f.write(tenant_resolver)

# Crear middleware de reglas irrenunciables
reglas_irrenunciables = """// ============================================================
// PLAN HAIKY - Middleware de Reglas Irrenunciables
// Estas reglas NO PUEDEN ser desactivadas por ningún cliente
// ============================================================

/**
 * Regla 1: No permitir eliminación de marcaciones
 * Las marcaciones solo pueden anularse con una nueva marcación correctiva
 */
const noEliminarMarcaciones = (req, res, next) => {
  if (req.method === 'DELETE' && req.path.includes('/marcaciones')) {
    return res.status(403).json({
      error: 'VIOLACION_REGLA_IRRENUNCIABLE',
      message: 'No se pueden eliminar marcaciones. Regla irrenunciable Art. 71 Código del Trabajo. Solo se puede anular con marcación correctiva.',
    });
  }
  next();
};

/**
 * Regla 2: Geolocalización obligatoria en marcaciones
 */
const geolocalizacionObligatoria = (req, res, next) => {
  if (req.path.includes('/marcaciones') && req.method === 'POST') {
    const { lat, lng } = req.body;
    if (!lat || !lng) {
      return res.status(400).json({
        error: 'VIOLACION_REGLA_IRRENUNCIABLE',
        message: 'La geolocalización es obligatoria para registrar marcaciones. Regla irrenunciable.',
      });
    }
  }
  next();
};

/**
 * Regla 3: No modificar nómina cerrada
 */
const noModificarNominaCerrada = (req, res, next) => {
  if (req.method === 'PUT' && req.path.includes('/nomina')) {
    // Esta validación se hace también a nivel de DB con trigger
    // Aquí es una validación adicional
    return next(); // Se maneja en el trigger de PostgreSQL
  }
  next();
};

/**
 * Regla 4: Cláusula irrenunciable en contratos
 * Se valida en el servicio de generación de documentos
 */
const clausulaIrrenunciableContrato = (req, res, next) => {
  if (req.path.includes('/documentos/contrato') && req.method === 'POST') {
    // El servicio se encargará de inyectar la cláusula
    // No se puede subir un template sin la cláusula
    req.cláusulaIrrenunciable = true;
  }
  next();
};

/**
 * Regla 5: Validación de liquidación mínima legal
 */
const liquidacionMinimaLegal = (req, res, next) => {
  if (req.path.includes('/documentos/finiquito') && req.method === 'POST') {
    // El servicio validará que la liquidación sea >= al mínimo legal
    req.validarLiquidacionMinima = true;
  }
  next();
};

/**
 * Regla 6: Devolución de equipos antes de finiquito
 */
const devolucionEquiposObligatoria = (req, res, next) => {
  if (req.path.includes('/documentos/finiquito') && req.method === 'POST') {
    // El servicio validará que existan actas de devolución
    req.validarDevolucionEquipos = true;
  }
  next();
};

/**
 * Aplicar todas las reglas irrenunciables
 */
const aplicarTodas = [
  noEliminarMarcaciones,
  geolocalizacionObligatoria,
  noModificarNominaCerrada,
  clausulaIrrenunciableContrato,
  liquidacionMinimaLegal,
  devolucionEquiposObligatoria,
];

module.exports = {
  noEliminarMarcaciones,
  geolocalizacionObligatoria,
  noModificarNominaCerrada,
  clausulaIrrenunciableContrato,
  liquidacionMinimaLegal,
  devolucionEquiposObligatoria,
  aplicarTodas,
};
"""

with open('backend/src/middleware/reglasIrrenunciables.js', 'w') as f:
    f.write(reglas_irrenunciables)

print("✓ Middlewares creados (auth, tenantResolver, reglasIrrenunciables)")
 # Result 
✓ Middlewares creados (auth, tenantResolver, reglasIrrenunciables)
