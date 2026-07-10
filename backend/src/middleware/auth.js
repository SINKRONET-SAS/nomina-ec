const db = require('../config/database');
const { signUserToken, verifyJwt } = require('../config/jwt');

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

const TENANT_OPERATION_ROLES = new Set(['owner', 'admin_rrhh', 'supervisor']);

function canUseTenantOperationRole(usuario, requiredRoles) {
  const role = normalizeRole(usuario?.rol);
  const hasTenant = Boolean(usuario?.tenantId);
  if (role !== 'superadmin' || !hasTenant) return false;
  return requiredRoles.some((requiredRole) => TENANT_OPERATION_ROLES.has(requiredRole));
}

function userFromClaims(decoded = {}) {
  if (!decoded.userId || !decoded.email || !decoded.rol) return null;

  return {
    id: decoded.userId,
    tenantId: decoded.tenantId || null,
    email: decoded.email,
    rol: normalizeRole(decoded.rol),
    emailVerificadoEn: decoded.emailVerificadoEn || null,
  };
}

function requiresEmailVerification(usuario) {
  return normalizeRole(usuario?.rol) !== 'superadmin' && !usuario?.emailVerificadoEn;
}

function canBypassEmailVerification(req) {
  return String(req.originalUrl || req.path || '').includes('/auth/email-verification/status');
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
    rol: normalizeRole(usuario.rol),
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
    let usuario = userFromClaims(decoded);
    if (!usuario || requiresEmailVerification(usuario)) {
      usuario = await loadActiveUser(decoded.userId);
    }

    if (!usuario) {
      return res.status(401).json({
        error: 'NO_AUTORIZADO',
        message: 'Usuario no encontrado o inactivo.',
        correlationId: req.correlationId,
      });
    }

    attachAuthenticatedUser(req, usuario);

    if (requiresEmailVerification(usuario) && !canBypassEmailVerification(req)) {
      return res.status(403).json({
        error: 'AUTH_EMAIL_NO_VERIFICADO',
        message: 'Correo no verificado. Revisa tu bandeja o solicita un nuevo codigo.',
        correlationId: req.correlationId,
      });
    }

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

    const normalizedRoles = roles.map(normalizeRole);
    const role = normalizeRole(req.usuario.rol);

    if (!normalizedRoles.includes(role) && !canUseTenantOperationRole(req.usuario, normalizedRoles)) {
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
  return signUserToken(usuario);
};

module.exports = {
  authenticateToken,
  requireFreshUser,
  requireRole,
  canUseTenantOperationRole,
  generateToken,
};
