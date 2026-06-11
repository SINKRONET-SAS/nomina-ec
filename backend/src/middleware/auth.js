// ============================================================
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

