jest.mock('../config/database', () => ({ query: jest.fn() }));
jest.mock('../services/auditService', () => ({ recordAudit: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../services/planCapabilityService', () => ({
  getTenantPlanCapabilities: jest.fn().mockResolvedValue({ limits: { usersMax: 3 } }),
}));
jest.mock('./authController', () => ({
  createEmailVerificationToken: jest.fn(),
}));
jest.mock('../services/communicationService', () => ({
  sendEmailVerification: jest.fn(),
}));

const db = require('../config/database');
const { recordAudit } = require('../services/auditService');
const { createEmailVerificationToken } = require('./authController');
const { sendEmailVerification } = require('../services/communicationService');
const { listar, cambiarEstado, reenviarVerificacionEmail } = require('./userManagementController');

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

describe('userManagementController', () => {
  beforeEach(() => {
    db.query.mockReset();
    createEmailVerificationToken.mockReset();
    sendEmailVerification.mockReset();
  });

  test('lista usuarios del tenant con cuota y permisos efectivos', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 'u-1', email: 'a@demo.ec', rol: 'supervisor', nombres: 'Ana', apellidos: 'Demo', activo: true, module_permissions: null }] });
    db.query.mockResolvedValueOnce({ rows: [{ usuarios_max: 3 }] });
    const res = response();

    await listar({ usuario: { tenantId: 't-1' }, correlationId: 'corr-list' }, res, jest.fn());

    expect(res.body.users[0]).toMatchObject({ id: 'u-1', activo: true, modulePermissions: expect.objectContaining({ empleados: true, nomina: false }) });
    expect(res.body.limits.usersMax).toBe(3);
  });

  test('cambia estado sin permitir auto desactivación y audita', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 'u-2', rol: 'supervisor', activo: true }] });
    db.query.mockResolvedValueOnce({ rows: [{ id: 'u-2', activo: false }] });
    const res = response();

    await cambiarEstado({ usuario: { id: 'owner-1', tenantId: 't-1' }, params: { id: 'u-2' }, body: { activo: false }, correlationId: 'corr-state', ip: '127.0.0.1' }, res, jest.fn());

    expect(res.body.user).toEqual({ id: 'u-2', activo: false });
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'usuario.estado.actualizado', entityId: 'u-2' }));
  });

  test('reenvía un código nuevo vigente e invalida el anterior mediante el servicio de emisión', async () => {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    db.query.mockResolvedValueOnce({ rows: [{ id: 'u-3', tenant_id: 't-1', email: 'delegado@demo.ec', nombres: 'Delegado', rol: 'admin_rrhh', activo: true, email_verificado_en: null }] });
    createEmailVerificationToken.mockResolvedValueOnce({
      expiresAt,
      deliveryPayload: { to: 'delegado@demo.ec', code: 'never-returned', name: 'Delegado', userId: 'u-3', tenantId: 't-1', correlationId: 'corr-resend' },
    });
    sendEmailVerification.mockResolvedValueOnce({ status: 'sent' });
    const res = response();

    await reenviarVerificacionEmail({ usuario: { id: 'owner-1', tenantId: 't-1' }, params: { id: 'u-3' }, correlationId: 'corr-resend', ip: '127.0.0.1' }, res, jest.fn());

    expect(res.body).toMatchObject({ success: true, expiresAt, delivery: { status: 'sent' } });
    expect(createEmailVerificationToken).toHaveBeenCalledWith(db, expect.objectContaining({ id: 'u-3', tenant_id: 't-1' }), 'corr-resend');
    expect(sendEmailVerification).toHaveBeenCalledWith(expect.objectContaining({ code: 'never-returned' }));
    expect(res.body.code).toBeUndefined();
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'usuario.email.verificacion.reenviada', newData: expect.objectContaining({ expiresAt }) }));
  });

  test('no envía un código si la emisión devuelve una fecha caducada', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 'u-4', tenant_id: 't-1', email: 'caducado@demo.ec', nombres: 'Caducado', rol: 'supervisor', activo: true, email_verificado_en: null }] });
    createEmailVerificationToken.mockResolvedValueOnce({ expiresAt: new Date(Date.now() - 1000).toISOString(), deliveryPayload: { code: 'expired' } });
    const next = jest.fn();

    await reenviarVerificacionEmail({ usuario: { id: 'owner-1', tenantId: 't-1' }, params: { id: 'u-4' }, correlationId: 'corr-expired-resend', ip: '127.0.0.1' }, response(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'EMAIL_VERIFICACION_CADUCADA' }));
    expect(sendEmailVerification).not.toHaveBeenCalled();
  });
});
