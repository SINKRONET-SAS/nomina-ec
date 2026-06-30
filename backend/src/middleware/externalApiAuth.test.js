jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../services/planCapabilityService', () => ({
  assertCapability: jest.fn(),
}));

const db = require('../config/database');
const { assertCapability } = require('../services/planCapabilityService');
const {
  authenticateExternalApi,
  hashApiKey,
  requireApiScope,
} = require('./externalApiAuth');

function mockResponse() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('externalApiAuth', () => {
  beforeEach(() => {
    db.query.mockReset();
    assertCapability.mockReset();
    assertCapability.mockResolvedValue({ allowed: { apiAccess: true } });
  });

  test('genera hash estable para API key', () => {
    expect(hashApiKey('demo-key')).toHaveLength(64);
    expect(hashApiKey('demo-key')).toBe(hashApiKey('demo-key'));
  });

  test('rechaza solicitud sin API key', async () => {
    const req = { headers: {}, correlationId: 'corr-1' };
    const res = mockResponse();
    const next = jest.fn();

    await authenticateExternalApi(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('autentica cliente externo activo', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'client-1',
          tenant_id: 'tenant-1',
          name: 'ERP DEMO',
          scopes: ['employees.read'],
          rate_limit_per_minute: 60,
        },
      ],
    });
    const req = { headers: { authorization: 'Bearer demo-key' }, correlationId: 'corr-1' };
    const res = mockResponse();
    const next = jest.fn();

    await authenticateExternalApi(req, res, next);

    expect(req.tenantId).toBe('tenant-1');
    expect(req.apiClient.scopes).toEqual(['employees.read']);
    expect(assertCapability).toHaveBeenCalledWith('tenant-1', 'apiAccess', { userId: null });
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('bloquea API key activa si el plan no incluye API externa', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'client-1',
          tenant_id: 'tenant-1',
          name: 'ERP DEMO',
          scopes: ['employees.read'],
          rate_limit_per_minute: 60,
        },
      ],
    });
    const error = new Error('El plan actual no incluye esta funcionalidad.');
    error.code = 'PLAN_CAPABILITY_BLOCKED';
    error.statusCode = 402;
    error.details = { capability: 'apiAccess', planId: 'TRIAL' };
    assertCapability.mockRejectedValueOnce(error);
    const req = { headers: { authorization: 'Bearer demo-key' }, correlationId: 'corr-1' };
    const res = mockResponse();
    const next = jest.fn();

    await authenticateExternalApi(req, res, next);

    expect(res.status).toHaveBeenCalledWith(402);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'PLAN_CAPABILITY_BLOCKED' }));
    expect(next).not.toHaveBeenCalled();
  });

  test('valida scope requerido', () => {
    const req = { apiClient: { scopes: ['employees.read'] }, correlationId: 'corr-1' };
    const res = mockResponse();
    const next = jest.fn();

    requireApiScope('employees.read')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test('rechaza scope faltante', () => {
    const req = { apiClient: { scopes: ['employees.read'] }, correlationId: 'corr-1' };
    const res = mockResponse();
    const next = jest.fn();

    requireApiScope('payroll.read')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
