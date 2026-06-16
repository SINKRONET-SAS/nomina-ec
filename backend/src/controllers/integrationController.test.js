jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../services/auditService', () => ({
  recordAudit: jest.fn(),
}));

const db = require('../config/database');
const { recordAudit } = require('../services/auditService');
const {
  createApiClient,
  listApiClients,
  normalizeScopes,
} = require('./integrationController');

function mockResponse() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('integrationController', () => {
  beforeEach(() => {
    db.query.mockReset();
    recordAudit.mockReset();
  });

  test('normalizeScopes filtra scopes no permitidos y acepta csv', () => {
    expect(normalizeScopes('employees.read,unknown,payroll.read')).toEqual(['employees.read', 'payroll.read']);
  });

  test('lista clientes API por tenant owner', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 'api-1', name: 'ERP DEMO', scopes: ['employees.read'] }] });
    const req = { tenantId: 'tenant-1', usuario: { rol: 'owner' }, correlationId: 'corr-1' };
    const res = mockResponse();

    await listApiClients(req, res);

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('FROM api_clients'), ['tenant-1']);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('crea cliente API y devuelve key una sola vez', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'api-1',
          name: 'ERP DEMO',
          scopes: ['employees.read'],
          active: true,
          rate_limit_per_minute: 60,
          created_at: '2026-06-15T00:00:00.000Z',
        },
      ],
    });
    const req = {
      body: { name: 'ERP DEMO', scopes: ['employees.read'] },
      tenantId: 'tenant-1',
      usuario: { rol: 'owner' },
      usuarioId: 'user-1',
      correlationId: 'corr-1',
      ip: '127.0.0.1',
    };
    const res = mockResponse();

    await createApiClient(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      apiKey: expect.stringMatching(/^nom_ec_/),
    }));
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'integraciones.api_client.create',
      tenantId: 'tenant-1',
    }));
  });

  test('rechaza crear cliente sin scopes validos', async () => {
    const req = {
      body: { name: 'ERP DEMO', scopes: ['unknown'] },
      tenantId: 'tenant-1',
      usuario: { rol: 'owner' },
      correlationId: 'corr-1',
    };
    const res = mockResponse();

    await createApiClient(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.query).not.toHaveBeenCalled();
  });
});
