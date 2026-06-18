const db = require('../config/database');
const { verifyJwt } = require('../config/jwt');

const publicPaths = new Set([
  '/health',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/public-register',
  '/api/auth/password/forgot',
  '/api/auth/password/reset',
  '/api/auth/email-verification/request',
  '/api/auth/email-verification/resend',
  '/api/auth/email-verification/confirm',
  '/api/pagos/planes',
  '/api/pagos/confirm',
  '/api/pagos/webhook',
]);

const tenantResolver = async (req, res, next) => {
  if (publicPaths.has(req.path)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = verifyJwt(token);

    if (decoded.tenantId) {
      req.tenantId = decoded.tenantId;
      req.userId = decoded.userId;

      const result = await db.query(
        'SELECT id, activo FROM tenants WHERE id = $1 AND activo = true',
        [decoded.tenantId]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({
          error: 'TENANT_INACTIVO',
          message: 'La empresa no está activa en Nómina-Ec.',
          correlationId: req.correlationId,
        });
      }
    }

    return next();
  } catch (err) {
    console.error('[TENANT] Error resolviendo tenant desde token', {
      code: err.code || 'TENANT_TOKEN_RESOLUTION_ERROR',
      statusCode: 403,
      correlationId: req.correlationId || 'tenant-resolver',
      userId: null,
      message: err.message,
    });
    return next();
  }
};

const setTenantContext = async (client, tenantId, userId) => {
  await client.query('SELECT set_config($1, $2, true)', ['app.current_tenant_id', tenantId]);
  if (userId) {
    await client.query('SELECT set_config($1, $2, true)', ['app.current_user_id', userId]);
  }
};

module.exports = tenantResolver;
module.exports.setTenantContext = setTenantContext;
