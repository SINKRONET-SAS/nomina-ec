jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

const db = require('../config/database');
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
  });

  test('consulta empleados activos por defecto', async () => {
    const req = { tenantId: 'tenant-1', query: {} };
    const res = mockResponse();

    await empleadoController.listar(req, res);

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('FROM empleados'), ['tenant-1', true]);
    expect(res.json).toHaveBeenCalledWith({ success: true, empleados: [] });
  });

  test('permite consultar empleados inactivos con activo=false', async () => {
    const req = { tenantId: 'tenant-1', query: { activo: 'false' } };
    const res = mockResponse();

    await empleadoController.listar(req, res);

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('FROM empleados'), ['tenant-1', false]);
  });

  test('mantiene activo=true cuando el query param llega como string', async () => {
    const req = { tenantId: 'tenant-1', query: { activo: 'true' } };
    const res = mockResponse();

    await empleadoController.listar(req, res);

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('FROM empleados'), ['tenant-1', true]);
  });
});
