jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../config/jwt', () => ({
  signUserToken: jest.fn(),
  signJwt: jest.fn(),
  verifyJwt: jest.fn(),
}));

const { verifyJwt } = require('../config/jwt');
const db = require('../config/database');
const { authenticateToken, requireFreshUser, requireRole } = require('./auth');

function mockResponse() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('auth middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('autentica con claims JWT sin consultar usuario en cada request', async () => {
    verifyJwt.mockReturnValueOnce({
      userId: 'user-1',
      tenantId: 'tenant-1',
      email: 'owner@example.com',
      rol: 'owner',
      emailVerificadoEn: '2026-06-27T00:00:00.000Z',
    });

    const req = {
      headers: { authorization: 'Bearer token-con-claims' },
      correlationId: 'corr-auth-claims',
    };
    const res = mockResponse();
    const next = jest.fn();

    await authenticateToken(req, res, next);

    expect(db.query).not.toHaveBeenCalled();
    expect(req.usuario).toMatchObject({
      id: 'user-1',
      tenantId: 'tenant-1',
      email: 'owner@example.com',
      rol: 'owner',
    });
    expect(req.tenantId).toBe('tenant-1');
    expect(req.usuarioId).toBe('user-1');
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('mantiene compatibilidad con tokens legados sin claims completos', async () => {
    verifyJwt.mockReturnValueOnce({ userId: 'legacy-user' });
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 'legacy-user',
        tenant_id: 'tenant-legacy',
        email: 'legacy@example.com',
        rol: 'admin_rrhh',
        email_verificado_en: null,
      }],
    });

    const req = {
      headers: { authorization: 'Bearer token-legado' },
      correlationId: 'corr-auth-legacy',
    };
    const res = mockResponse();
    const next = jest.fn();

    await authenticateToken(req, res, next);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM usuarios WHERE id = $1'),
      ['legacy-user']
    );
    expect(req.usuario).toMatchObject({
      id: 'legacy-user',
      tenantId: 'tenant-legacy',
      rol: 'admin_rrhh',
    });
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('responde 401 cuando el token no se puede verificar', async () => {
    verifyJwt.mockImplementation(() => {
      throw new Error('jwt malformed');
    });

    const req = {
      headers: { authorization: 'Bearer token-invalido' },
      correlationId: 'corr-auth-1',
    };
    const res = mockResponse();
    const next = jest.fn();

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'TOKEN_INVALIDO',
      message: 'Token inválido.',
      correlationId: 'corr-auth-1',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('mantiene 403 cuando el usuario autenticado no tiene el rol requerido', () => {
    const req = {
      usuario: { rol: 'empleado' },
      correlationId: 'corr-auth-2',
    };
    const res = mockResponse();
    const next = jest.fn();

    requireRole('owner')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0]).toMatchObject({
      error: 'PERMISO_DENEGADO',
      correlationId: 'corr-auth-2',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('requireFreshUser fuerza lectura de usuario activo para operaciones sensibles', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 'user-2',
        tenant_id: 'tenant-2',
        email: 'fresh@example.com',
        rol: 'owner',
        email_verificado_en: null,
      }],
    });

    const req = {
      usuario: { id: 'user-2', rol: 'owner' },
      correlationId: 'corr-auth-fresh',
    };
    const res = mockResponse();
    const next = jest.fn();

    await requireFreshUser(req, res, next);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM usuarios WHERE id = $1'),
      ['user-2']
    );
    expect(req.tenantId).toBe('tenant-2');
    expect(next).toHaveBeenCalledTimes(1);
  });
});
