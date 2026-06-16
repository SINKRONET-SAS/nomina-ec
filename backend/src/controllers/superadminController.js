const {
  createIncident,
  getSuperadminOverview,
  updateIncidentStatus,
} = require('../services/superadminService');

async function overview(req, res) {
  try {
    const data = await getSuperadminOverview();
    return res.json({ success: true, data, correlationId: req.correlationId });
  } catch (err) {
    console.error('[SUPERADMIN] Error obteniendo overview', {
      code: err.code || 'SUPERADMIN_OVERVIEW_ERROR',
      statusCode: 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(500).json({ error: 'SUPERADMIN_OVERVIEW_ERROR', message: 'No pudimos cargar la consola SUPERADMIN.', correlationId: req.correlationId });
  }
}

async function createSupportIncident(req, res) {
  try {
    const incident = await createIncident({
      payload: req.body || {},
      userId: req.usuarioId,
      correlationId: req.correlationId,
      ipAddress: req.ip,
    });
    return res.status(201).json({ success: true, data: incident, correlationId: req.correlationId });
  } catch (err) {
    return res.status(400).json({ error: 'SUPERADMIN_INCIDENT_INVALID', message: err.message, correlationId: req.correlationId });
  }
}

async function updateSupportIncident(req, res) {
  try {
    const incident = await updateIncidentStatus({
      id: req.params.id,
      status: String(req.body.status || ''),
      userId: req.usuarioId,
      correlationId: req.correlationId,
      ipAddress: req.ip,
    });
    return res.json({ success: true, data: incident, correlationId: req.correlationId });
  } catch (err) {
    return res.status(400).json({ error: 'SUPERADMIN_INCIDENT_UPDATE_ERROR', message: err.message, correlationId: req.correlationId });
  }
}

module.exports = {
  createSupportIncident,
  overview,
  updateSupportIncident,
};
