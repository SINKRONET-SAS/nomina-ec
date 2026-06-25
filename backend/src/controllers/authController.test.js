jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../services/communicationService', () => ({
  sendEmailVerification: jest.fn().mockResolvedValue({ ok: true, provider: 'test' }),
  sendPasswordReset: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hash-test'),
  compare: jest.fn(),
}));

const db = require('../config/database');
const { sendEmailVerification } = require('../services/communicationService');
const { register } = require('./authController');

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe('authController register', () => {
  beforeEach(() => {
    db.query.mockReset();
    sendEmailVerification.mockClear();
  });

  test('ignora tenantId del body cuando registra un owner del tenant', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'user-1',
          tenant_id: 'tenant-real',
          email: 'nuevo@example.com',
          rol: 'empleado',
          nombres: 'Nuevo',
          apellidos: 'Usuario',
        }],
      })
      .mockResolvedValueOnce({ rows: [] });
    const req = {
      usuario: { rol: 'owner', tenantId: 'tenant-real' },
      correlationId: 'corr-1',
      body: {
        tenantId: 'tenant-ajeno',
        email: 'nuevo@example.com',
        password: 'secret',
        rol: 'empleado',
        nombres: 'Nuevo',
        apellidos: 'Usuario',
      },
    };
    const res = createResponse();
    const next = jest.fn();

    await register(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(201);
    expect(db.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('tenant_id = $1'),
      ['tenant-real', 'nuevo@example.com']
    );
    expect(db.query.mock.calls[1][1][0]).toBe('tenant-real');
    expect(sendEmailVerification).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-real',
    }));
  });

  test('permite a superadmin especificar tenant destino', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'user-2',
          tenant_id: 'tenant-destino',
          email: 'admin@example.com',
          rol: 'admin_rrhh',
          nombres: 'Admin',
          apellidos: 'RRHH',
        }],
      })
      .mockResolvedValueOnce({ rows: [] });
    const req = {
      usuario: { rol: 'superadmin', tenantId: 'tenant-plataforma' },
      correlationId: 'corr-2',
      body: {
        tenantId: 'tenant-destino',
        email: 'admin@example.com',
        password: 'secret',
        rol: 'admin_rrhh',
        nombres: 'Admin',
        apellidos: 'RRHH',
      },
    };
    const res = createResponse();
    const next = jest.fn();

    await register(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(201);
    expect(db.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('tenant_id = $1'),
      ['tenant-destino', 'admin@example.com']
    );
    expect(db.query.mock.calls[1][1][0]).toBe('tenant-destino');
  });
});
