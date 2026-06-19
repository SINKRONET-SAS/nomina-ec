const AppError = require('../utils/AppError');
const {
  acceptEmployeeInvitation,
  createEmployeeInvitation,
  listEmployeeAppInvitations,
  resendEmployeeInvitation,
  revokeEmployeeInvitation,
} = require('../services/employeeAppInviteService');

function sendError(res, req, err, fallbackCode) {
  const statusCode = err.statusCode || err.status || 500;
  const error = err.code || fallbackCode;

  console.error('[EAA26] Error en invitacion app empleado', {
    code: error,
    statusCode,
    correlationId: req.correlationId,
    userId: req.usuarioId || null,
    message: err.message,
  });

  return res.status(statusCode).json({
    success: false,
    error,
    message: err.message || 'No pudimos completar la operacion.',
    correlationId: req.correlationId,
    ...(err.details && { details: err.details }),
  });
}

async function listar(req, res) {
  try {
    const employees = await listEmployeeAppInvitations({ tenantId: req.tenantId });
    return res.json({ success: true, employees, correlationId: req.correlationId });
  } catch (err) {
    return sendError(res, req, err, 'EMPLOYEE_APP_INVITES_LIST_ERROR');
  }
}

async function crear(req, res) {
  try {
    const invite = await createEmployeeInvitation({
      tenantId: req.tenantId,
      empleadoId: req.params.id,
      userId: req.usuarioId,
      correlationId: req.correlationId,
      ipAddress: req.ip,
    });
    return res.status(201).json({ success: true, invite, correlationId: req.correlationId });
  } catch (err) {
    return sendError(res, req, err, 'EMPLOYEE_APP_INVITE_CREATE_ERROR');
  }
}

async function reenviar(req, res) {
  try {
    const invite = await resendEmployeeInvitation({
      tenantId: req.tenantId,
      inviteId: req.params.id,
      userId: req.usuarioId,
      correlationId: req.correlationId,
      ipAddress: req.ip,
    });
    return res.json({ success: true, invite, correlationId: req.correlationId });
  } catch (err) {
    return sendError(res, req, err, 'EMPLOYEE_APP_INVITE_RESEND_ERROR');
  }
}

async function revocar(req, res) {
  try {
    const invite = await revokeEmployeeInvitation({
      tenantId: req.tenantId,
      inviteId: req.params.id,
      userId: req.usuarioId,
      correlationId: req.correlationId,
      ipAddress: req.ip,
    });
    return res.json({ success: true, invite, correlationId: req.correlationId });
  } catch (err) {
    return sendError(res, req, err, 'EMPLOYEE_APP_INVITE_REVOKE_ERROR');
  }
}

async function aceptarPublica(req, res) {
  try {
    const result = await acceptEmployeeInvitation(req.body || {}, {
      correlationId: req.correlationId,
      ipAddress: req.ip,
    });
    return res.status(201).json({ ...result, correlationId: req.correlationId });
  } catch (err) {
    if (!(err instanceof AppError)) {
      return sendError(res, req, err, 'EMPLOYEE_APP_INVITE_ACCEPT_ERROR');
    }
    return sendError(res, req, err, err.code);
  }
}

module.exports = {
  aceptarPublica,
  crear,
  listar,
  reenviar,
  revocar,
};
