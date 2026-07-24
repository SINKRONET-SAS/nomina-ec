jest.mock('../config/database', () => ({ query: jest.fn() }));
jest.mock('../services/auditService', () => ({ recordAudit: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../services/planCapabilityService', () => ({
  getTenantPlanCapabilities: jest.fn().mockResolvedValue({ limits: { usersMax: 3 } }),
}));

const db = require('../config/database');
const { recordAudit } = require('../services/auditService');
const { listar, cambiarEstado } = require('./userManagementController');

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

describe('userManagementController', () => {
  beforeEach(() => db.query.mockReset());

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
});
