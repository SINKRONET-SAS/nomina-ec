jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../config/jwt', () => ({
  signJwt: jest.fn(),
  verifyJwt: jest.fn(),
}));

const { verifyJwt } = require('../config/jwt');
const { authenticateToken, requireRole } = require('./auth');

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
});
