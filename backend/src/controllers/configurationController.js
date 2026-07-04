const configurationService = require('../services/configurationService');
const { yearInEcuador } = require('../utils/dateEcuador');

function requestContext(req) {
  return {
    correlationId: req.correlationId,
    ipAddress: req.ip,
  };
}

async function summary(req, res, next) {
  try {
    const data = await configurationService.getConfigurationSummary(req.usuario);
    return res.json({ data, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function list(req, res, next) {
  try {
    const data = await configurationService.listResource(req.params.resource, req.usuario);
    return res.json({ data, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = await configurationService.createResource(
      req.params.resource,
      req.body,
      req.usuario,
      requestContext(req)
    );
    return res.status(201).json({ data, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const data = await configurationService.updateResource(
      req.params.resource,
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

async function remove(req, res, next) {
  try {
    const data = await configurationService.deleteResource(
      req.params.resource,
      req.params.id,
      req.usuario,
      requestContext(req)
    );
    return res.json({ data, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function onboarding(req, res, next) {
  try {
    const data = await configurationService.getOnboardingStatus(req.usuario);
    return res.json({ data, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function completeOnboardingStep(req, res, next) {
  try {
    const data = await configurationService.completeOnboardingStep(
      req.params.stepCode,
      req.body,
      req.usuario,
      requestContext(req)
    );
    return res.json({ data, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function loadMandatoryLegalParameters(req, res, next) {
  try {
    const data = await configurationService.loadMandatoryLegalParameters(
      req.body?.year || yearInEcuador(),
      req.usuario,
      requestContext(req)
    );
    return res.status(201).json({ data, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function syncLegalParametersFromGlobal(req, res, next) {
  try {
    const data = await configurationService.syncLegalParametersFromGlobal(
      req.body?.year || yearInEcuador(),
      req.usuario,
      requestContext(req),
      {
        allTenants: Boolean(req.body?.allTenants),
        tenantId: req.body?.tenantId || null,
      }
    );
    return res.status(201).json({ data, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  summary,
  list,
  create,
  update,
  remove,
  onboarding,
  completeOnboardingStep,
  loadMandatoryLegalParameters,
  syncLegalParametersFromGlobal,
};
