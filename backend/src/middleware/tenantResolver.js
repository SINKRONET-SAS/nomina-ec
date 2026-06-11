// ============================================================
// PLAN HAIKY - Middleware de Resolución de Tenant
// ============================================================
const db = require('../config/database');

/**
 * Extrae el tenant_id del JWT y lo establece en el contexto
 * Esto permite que RLS funcione correctamente en PostgreSQL
 */
const tenantResolver = async (req, res, next) => {
  // Saltar para rutas públicas
  if (req.path === '/health' || req.path === '/api/auth/login' || req.path === '/api/auth/refresh') {
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
    console.error('[TENANT] Error resolviendo tenant desde token', {
      code: err.code || 'TENANT_TOKEN_RESOLUTION_ERROR',
      statusCode: 403,
      correlationId: req.headers['x-correlation-id'] || 'tenant-resolver',
      userId: null,
      message: err.message,
    });
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

