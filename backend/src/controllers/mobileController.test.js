jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../services/marcacionValidator', () => ({
  validarMarcacion: jest.fn(),
}));

const db = require('../config/database');
const { validarMarcacion } = require('../services/marcacionValidator');
const { registrarMarcacionMovil, resolveEmployee } = require('./mobileController');

function mockResponse() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

const reqBase = {
  tenantId: 'tenant-1',
  usuario: { email: 'empleado.demo@nomina-ec.local', rol: 'empleado' },
  usuarioId: 'user-1',
  correlationId: 'corr-1',
  ip: '127.0.0.1',
};

describe('mobileController', () => {
  beforeEach(() => {
    db.query.mockReset();
    validarMarcacion.mockReset();
  });

  test('resolveEmployee vincula usuario por email personal', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 'emp-1', email_personal: 'empleado.demo@nomina-ec.local' }] });

    const employee = await resolveEmployee(reqBase);

    expect(employee.id).toBe('emp-1');
    expect(db.query.mock.calls[0][1]).toEqual(['tenant-1', 'empleado.demo@nomina-ec.local']);
  });

  test('registrarMarcacionMovil usa empleado resuelto, no userId', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 'emp-1', email_personal: 'empleado.demo@nomina-ec.local' }] });
    validarMarcacion.mockResolvedValueOnce({ id: 'mark-1', empleado_id: 'emp-1' });
    const req = {
      ...reqBase,
      body: { tipo: 'inicio_jornada', lat: -0.18, lng: -78.48 },
    };
    const res = mockResponse();

    await registrarMarcacionMovil(req, res);

    expect(validarMarcacion).toHaveBeenCalledWith(expect.objectContaining({ empleadoId: 'emp-1', userId: 'user-1' }));
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
