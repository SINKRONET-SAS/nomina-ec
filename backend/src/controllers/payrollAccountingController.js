const configurationService = require('../services/configurationService');
const AppError = require('../utils/AppError');
const {
  PAYROLL_CONCEPTS,
  getAccountingMappings,
} = require('../services/payrollAccountingService');

function requestContext(req) {
  return {
    correlationId: req.correlationId,
    ipAddress: req.ip,
  };
}

function ensureTenant(req) {
  if (!req.usuario?.tenantId) {
    throw new AppError('El usuario no tiene empresa asociada para contabilidad de nomina.', {
      code: 'TENANT_REQUIRED_FOR_PAYROLL_ACCOUNTING',
      statusCode: 403,
      correlationId: req.correlationId,
      userId: req.usuario?.id || null,
    });
  }
}

async function listConcepts(req, res, next) {
  try {
    return res.json({ data: PAYROLL_CONCEPTS, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function listMappings(req, res, next) {
  try {
    ensureTenant(req);
    const data = await getAccountingMappings(req.usuario.tenantId, {
      anio: Number(req.query.anio || new Date().getFullYear()),
      mes: Number(req.query.mes || 1),
      userId: req.usuario.id,
    });
    return res.json({ data, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function createMapping(req, res, next) {
  try {
    const data = await configurationService.createResource(
      'payrollAccountingMappings',
      req.body,
      req.usuario,
      requestContext(req)
    );
    return res.status(201).json({ data, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function updateMapping(req, res, next) {
  try {
    const data = await configurationService.updateResource(
      'payrollAccountingMappings',
      req.params.id,
      req.body,
      req.usuario,
      requestContext(req)
    );
    return res.json({ data, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listConcepts,
  listMappings,
  createMapping,
  updateMapping,
};
