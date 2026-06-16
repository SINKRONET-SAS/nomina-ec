jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

const db = require('../config/database');
const {
  hashRequest,
  persistExternalIdempotency,
  requireExternalIdempotency,
} = require('./externalApiIdempotency');

function mockResponse() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function mockRequest(headers = {}) {
  return {
    method: 'POST',
    originalUrl: '/api/v1/novelties',
    headers,
    body: { empleadoId: 'emp-1' },
    apiClient: { id: 'client-1' },
    tenantId: 'tenant-1',
    correlationId: 'corr-1',
  };
}

describe('externalApiIdempotency', () => {
  beforeEach(() => {
    db.query.mockReset();
  });

  test('hashRequest genera hash estable', () => {
    const req = mockRequest({ 'idempotency-key': 'key-1' });
    expect(hashRequest(req)).toHaveLength(64);
    expect(hashRequest(req)).toBe(hashRequest(req));
  });

  test('requiere Idempotency-Key en escrituras', async () => {
    const req = mockRequest();
    const res = mockResponse();
    const next = jest.fn();

    await requireExternalIdempotency(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  test('permite solicitud nueva con clave idempotente', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const req = mockRequest({ 'idempotency-key': 'key-1' });
    const res = mockResponse();
    const next = jest.fn();

    await requireExternalIdempotency(req, res, next);

    expect(req.idempotency.key).toBe('key-1');
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('reproduce respuesta previa con misma clave y payload', async () => {
    const req = mockRequest({ 'idempotency-key': 'key-1' });
    db.query.mockResolvedValueOnce({
      rows: [
        {
          status_code: 201,
          response_body: { success: true },
          request_hash: hashRequest(req),
        },
      ],
    });
    const res = mockResponse();
    const next = jest.fn();

    await requireExternalIdempotency(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ idempotentReplay: true }));
    expect(next).not.toHaveBeenCalled();
  });

  test('persiste respuesta idempotente', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const req = mockRequest({ 'idempotency-key': 'key-1' });
    req.idempotency = { key: 'key-1', requestHash: hashRequest(req) };

    await persistExternalIdempotency(req, 201, { success: true });

    expect(db.query).toHaveBeenCalledTimes(1);
  });
});
