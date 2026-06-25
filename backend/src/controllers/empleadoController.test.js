jest.mock('../config/database', () => ({
  query: jest.fn(),
}));
jest.mock('../services/auditService', () => ({
  recordAudit: jest.fn(),
}));

const db = require('../config/database');
const { recordAudit } = require('../services/auditService');
const empleadoController = require('./empleadoController');

function mockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe('empleadoController.listar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.query.mockResolvedValue({ rows: [] });
    recordAudit.mockResolvedValue(undefined);
  });

  test('consulta empleados activos por defecto', async () => {
    const req = { tenantId: 'tenant-1', query: {}, usuario: { rol: 'owner' }, usuarioId: 'user-1', correlationId: 'corr-1' };
    const res = mockResponse();

    await empleadoController.listar(req, res);

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('FROM empleados'), ['tenant-1', true]);
    expect(res.json).toHaveBeenCalledWith({ success: true, empleados: [] });
  });

  test('permite consultar empleados inactivos con activo=false', async () => {
    const req = { tenantId: 'tenant-1', query: { activo: 'false' }, usuario: { rol: 'owner' }, usuarioId: 'user-1', correlationId: 'corr-1' };
    const res = mockResponse();

    await empleadoController.listar(req, res);

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('FROM empleados'), ['tenant-1', false]);
  });

  test('mantiene activo=true cuando el query param llega como string', async () => {
    const req = { tenantId: 'tenant-1', query: { activo: 'true' }, usuario: { rol: 'owner' }, usuarioId: 'user-1', correlationId: 'corr-1' };
    const res = mockResponse();

    await empleadoController.listar(req, res);

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('FROM empleados'), ['tenant-1', true]);
  });

  test('redacta sueldo y gastos personales para supervisor', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 'emp-1',
        nombres: 'Ana',
        sueldo_bruto_mensual: '900.00',
        gastos_personales_anuales: '1200.00',
        cargo_salary_min: '500.00',
        cargo_salary_max: '1200.00',
      }],
    });
    const req = { tenantId: 'tenant-1', query: {}, usuario: { rol: 'supervisor' }, usuarioId: 'user-2', correlationId: 'corr-2' };
    const res = mockResponse();

    await empleadoController.listar(req, res);

    expect(recordAudit).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      empleados: [expect.objectContaining({
        id: 'emp-1',
        sueldo_bruto_mensual: null,
        gastos_personales_anuales: null,
        cargo_salary_min: null,
        cargo_salary_max: null,
        datos_sensibles_redactados: true,
      })],
    });
  });

  test('audita lectura sensible para owner', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: 'emp-1', sueldo_bruto_mensual: '900.00', gastos_personales_anuales: '0.00' }],
    });
    const req = { tenantId: 'tenant-1', query: {}, usuario: { rol: 'owner' }, usuarioId: 'user-1', correlationId: 'corr-3', ip: '127.0.0.1' };
    const res = mockResponse();

    await empleadoController.listar(req, res);

    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'empleado.datos_sensibles.leidos',
      entity: 'empleados',
      tenantId: 'tenant-1',
      userId: 'user-1',
    }));
  });

  test('bloquea lectura de empleados para rol empleado', async () => {
    const req = { tenantId: 'tenant-1', query: {}, usuario: { rol: 'empleado' }, correlationId: 'corr-4' };
    const res = mockResponse();

    await empleadoController.listar(req, res);

    expect(db.query).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
