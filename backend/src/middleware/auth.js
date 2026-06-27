const db = require('../config/database');
const { signJwt, verifyJwt } = require('../config/jwt');

function userFromClaims(decoded = {}) {
  if (!decoded.userId || !decoded.email || !decoded.rol) return null;

  return {
    id: decoded.userId,
    tenantId: decoded.tenantId || null,
    email: decoded.email,
    rol: decoded.rol,
    emailVerificadoEn: decoded.emailVerificadoEn || null,
  };
}

function attachAuthenticatedUser(req, usuario) {
  req.usuario = usuario;
  req.tenantId = usuario.tenantId;
  req.usuarioId = usuario.id;
}

async function loadActiveUser(userId) {
  const result = await db.query(
    'SELECT id, tenant_id, email, rol, activo, email_verificado_en FROM usuarios WHERE id = $1 AND activo = true',
    [userId]
  );

  if (result.rows.length === 0) return null;

  const usuario = result.rows[0];
  return {
    id: usuario.id,
    tenantId: usuario.tenant_id,
    email: usuario.email,
    rol: usuario.rol,
    emailVerificadoEn: usuario.email_verificado_en || null,
  };
}

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'NO_AUTORIZADO',
      message: 'Token de autenticación requerido.',
      correlationId: req.correlationId,
    });
  }

  try {
    const decoded = verifyJwt(token);
    const usuario = userFromClaims(decoded) || await loadActiveUser(decoded.userId);

    if (!usuario) {
      return res.status(401).json({
        error: 'NO_AUTORIZADO',
        message: 'Usuario no encontrado o inactivo.',
        correlationId: req.correlationId,
      });
    }

    attachAuthenticatedUser(req, usuario);

    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'TOKEN_EXPIRADO',
        message: 'El token ha expirado, inicie sesión nuevamente.',
        correlationId: req.correlationId,
      });
    }

    return res.status(401).json({
      error: 'TOKEN_INVALIDO',
      message: 'Token inválido.',
      correlationId: req.correlationId,
    });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        error: 'NO_AUTORIZADO',
        message: 'Autenticación requerida.',
        correlationId: req.correlationId,
      });
    }

    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({
        error: 'PERMISO_DENEGADO',
        message: `No tiene permisos para realizar esta acción. Roles requeridos: ${roles.join(', ')}`,
        correlationId: req.correlationId,
      });
    }

    return next();
  };
};

const requireFreshUser = async (req, res, next) => {
  try {
    const userId = req.usuario?.id || req.usuarioId;
    const usuario = await loadActiveUser(userId);

    if (!usuario) {
      return res.status(401).json({
        error: 'NO_AUTORIZADO',
        message: 'Usuario no encontrado o inactivo.',
        correlationId: req.correlationId,
      });
    }

    attachAuthenticatedUser(req, usuario);
    return next();
  } catch (err) {
    return res.status(401).json({
      error: 'NO_AUTORIZADO',
      message: 'No pudimos validar el usuario activo.',
      correlationId: req.correlationId,
    });
  }
};

const generateToken = (usuario) => {
  return signJwt(
    {
      userId: usuario.id,
      tenantId: usuario.tenant_id,
      email: usuario.email,
      rol: usuario.rol,
      emailVerificadoEn: usuario.email_verificado_en || null,
    },
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

module.exports = {
  authenticateToken,
  requireFreshUser,
  requireRole,
  generateToken,
};
