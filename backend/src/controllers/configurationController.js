const configurationService = require('../services/configurationService');
const tenantLogoService = require('../services/tenantLogoService');
const { yearInEcuador } = require('../utils/dateEcuador');
const { bulkCreateJobPositions: createJobPositionsBulk, parseCsv, templateCsv } = require('../services/jobPositionBulkService');

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

async function uploadLogo(req, res, next) {
  try {
    const data = await tenantLogoService.uploadTenantLogo(
      req.usuario.tenantId,
      req.body?.logoBase64 || ''
    );
    return res.json({ data, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function removeLogo(req, res, next) {
  try {
    const data = await tenantLogoService.removeTenantLogo(req.usuario.tenantId);
    return res.json({ data, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function downloadJobPositionsTemplate(_req, res, next) {
  try {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla_carga_masiva_cargos.csv"');
    return res.send(`\ufeff${templateCsv()}`);
  } catch (err) {
    return next(err);
  }
}

async function bulkCreateJobPositions(req, res, next) {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : parseCsv(req.body?.csv);
    const result = await createJobPositionsBulk({
      user: req.usuario,
      rows,
      context: requestContext(req),
    });
    return res.status(201).json({ success: true, ...result, correlationId: req.correlationId });
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
  uploadLogo,
  removeLogo,
  downloadJobPositionsTemplate,
  bulkCreateJobPositions,
};
