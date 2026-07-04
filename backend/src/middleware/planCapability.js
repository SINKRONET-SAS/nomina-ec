const { assertCapability } = require('../services/planCapabilityService');
const AppError = require('../utils/AppError');

function requirePlanCapability(capability) {
  return async (req, _res, next) => {
    try {
      const tenantId = req.usuario?.tenantId || req.tenantId;
      const userId = req.usuario?.id || req.usuarioId || null;
      if (!tenantId) {
        throw new AppError('No se pudo resolver el tenant para validar el plan comercial.', {
          code: 'PLAN_TENANT_REQUIRED',
          statusCode: 400,
          correlationId: req.correlationId,
          userId,
        });
      }

      await assertCapability(tenantId, capability, {
        correlationId: req.correlationId,
        userId,
      });
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = {
  requirePlanCapability,
};
