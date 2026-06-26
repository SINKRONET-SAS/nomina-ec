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

jest.mock('../config/jwt', () => ({
  signJwt: jest.fn().mockReturnValue('token-test'),
  verifyJwt: jest.fn(),
}));

const db = require('../config/database');
const { sendEmailVerification } = require('../services/communicationService');
const { verifyJwt } = require('../config/jwt');
const { refreshToken, register } = require('./authController');

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
    verifyJwt.mockReset();
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

describe('authController refreshToken', () => {
  beforeEach(() => {
    db.query.mockReset();
    verifyJwt.mockReset();
  });

  test('responde 401 cuando el token es invalido', async () => {
    const error = new Error('jwt malformed');
    error.name = 'JsonWebTokenError';
    verifyJwt.mockImplementation(() => {
      throw error;
    });
    const req = {
      body: { token: 'token-invalido' },
      correlationId: 'corr-refresh-1',
    };
    const res = createResponse();
    const next = jest.fn();

    await refreshToken(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({
      error: 'TOKEN_INVALIDO',
      correlationId: 'corr-refresh-1',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('responde 503 cuando la base no esta disponible temporalmente', async () => {
    verifyJwt.mockReturnValue({ userId: 'user-1' });
    db.query.mockRejectedValueOnce(new Error('Connection terminated due to connection timeout'));
    const req = {
      body: { token: 'token-valido' },
      correlationId: 'corr-refresh-2',
    };
    const res = createResponse();
    const next = jest.fn();

    await refreshToken(req, res, next);

    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({
      error: 'AUTH_REFRESH_DB_UNAVAILABLE',
      correlationId: 'corr-refresh-2',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
