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
  signUserToken: jest.fn().mockReturnValue('token-test'),
  verifyJwt: jest.fn(),
}));

const db = require('../config/database');
const { sendEmailVerification } = require('../services/communicationService');
const { verifyJwt } = require('../config/jwt');
const bcrypt = require('bcryptjs');
const { confirmEmailVerification, login, refreshToken, register } = require('./authController');

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
      .mockResolvedValueOnce({ rows: [] })
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
      .mockResolvedValueOnce({ rows: [] })
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

describe('authController login', () => {
  beforeEach(() => {
    db.query.mockReset();
    bcrypt.compare.mockReset();
  });

  test('prioriza owner si el mismo correo y clave tambien calzan con empleado', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'user-employee',
            tenant_id: 'tenant-1',
            email: 'marco@example.com',
            rol: 'empleado',
            nombres: 'Marco',
            apellidos: 'Empleado',
            password_hash: 'hash-employee',
            activo: true,
            email_verificado_en: '2026-07-09T00:00:00.000Z',
            created_at: new Date('2026-06-29T12:00:00Z'),
          },
          {
            id: 'user-owner',
            tenant_id: 'tenant-1',
            email: 'marco@example.com',
            rol: 'owner',
            nombres: 'Marco',
            apellidos: 'Owner',
            password_hash: 'hash-owner',
            activo: true,
            email_verificado_en: '2026-07-09T00:00:00.000Z',
            created_at: new Date('2026-06-01T12:00:00Z'),
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });
    bcrypt.compare.mockResolvedValue(true);
    const req = {
      body: { email: 'marco@example.com', password: 'secret', tenantRuc: '0999999999001' },
      correlationId: 'corr-login-1',
    };
    const res = createResponse();
    const next = jest.fn();

    await login(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.body.usuario).toMatchObject({
      id: 'user-owner',
      rol: 'owner',
    });
    expect(db.query).toHaveBeenNthCalledWith(
      2,
      'UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1',
      ['user-owner']
    );
  });

  test('prioriza superadmin sin pedir RUC cuando el correo tambien existe en una empresa', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'user-owner',
            tenant_id: 'tenant-1',
            tenant_ruc: '0999999999001',
            tenant_razon_social: 'Empresa Demo',
            email: 'info@sinkronet.com.ec',
            rol: 'owner',
            nombres: 'Owner',
            apellidos: 'Tenant',
            password_hash: 'hash-owner',
            activo: true,
            email_verificado_en: '2026-07-09T00:00:00.000Z',
            created_at: new Date('2026-06-29T12:00:00Z'),
          },
          {
            id: 'user-superadmin',
            tenant_id: null,
            tenant_ruc: null,
            tenant_razon_social: null,
            email: 'info@sinkronet.com.ec',
            rol: 'superadmin',
            nombres: 'Super',
            apellidos: 'Admin',
            password_hash: 'hash-superadmin',
            activo: true,
            email_verificado_en: null,
            created_at: new Date('2026-06-01T12:00:00Z'),
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });
    bcrypt.compare.mockResolvedValue(true);
    const req = {
      body: { email: 'info@sinkronet.com.ec', password: 'secret', tenantRuc: '' },
      correlationId: 'corr-login-superadmin',
    };
    const res = createResponse();
    const next = jest.fn();

    await login(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.body.usuario).toMatchObject({
      id: 'user-superadmin',
      rol: 'superadmin',
      tenantId: null,
    });
    expect(db.query).toHaveBeenNthCalledWith(
      2,
      'UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1',
      ['user-superadmin']
    );
  });

  test('bloquea login de usuario no verificado aunque la clave sea correcta', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 'user-owner',
        tenant_id: 'tenant-1',
        tenant_ruc: '0999999999001',
        tenant_razon_social: 'Empresa Demo',
        email: 'owner@example.com',
        rol: 'owner',
        nombres: 'Owner',
        apellidos: 'Tenant',
        password_hash: 'hash-owner',
        activo: true,
        email_verificado_en: null,
        created_at: new Date('2026-07-09T12:00:00Z'),
      }],
    });
    bcrypt.compare.mockResolvedValue(true);
    const req = {
      body: { email: 'owner@example.com', password: 'secret', tenantRuc: '0999999999001' },
      correlationId: 'corr-login-unverified',
    };
    const res = createResponse();
    const next = jest.fn();

    await login(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({
      error: 'AUTH_EMAIL_NO_VERIFICADO',
      nextStep: 'email-verification',
      correlationId: 'corr-login-unverified',
    });
    expect(db.query).toHaveBeenCalledTimes(1);
  });
});

describe('authController confirmEmailVerification', () => {
  beforeEach(() => {
    db.query.mockReset();
  });

  test('rechaza codigo expirado sin marcar correo como verificado', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        token_id: 'token-1',
        usuario_id: 'user-1',
        expira_en: new Date(Date.now() - 60_000).toISOString(),
      }],
    });
    const req = {
      body: { email: 'owner@example.com', code: '123456', tenantId: 'tenant-1' },
      correlationId: 'corr-email-expired',
    };
    const res = createResponse();
    const next = jest.fn();

    await confirmEmailVerification(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      error: 'AUTH_VERIFICACION_EXPIRADA',
      correlationId: 'corr-email-expired',
    });
    expect(db.query).toHaveBeenCalledTimes(1);
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
