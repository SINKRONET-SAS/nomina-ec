jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

const db = require('../config/database');
const { recordAudit, sanitizeAuditPayload } = require('./auditService');

describe('auditService LOPDP sanitization', () => {
  beforeEach(() => {
    db.query.mockReset();
  });

  test('redacta campos sensibles laborales y trunca buffers', () => {
    const payload = sanitizeAuditPayload({
      cedula: '1717171717',
      sueldo_bruto_mensual: 900,
      nested: {
        token: 'secret-token',
        attachment: Buffer.from('archivo'),
      },
      items: Array.from({ length: 120 }, (_, idx) => ({ idx })),
    });

    expect(payload.cedula).toBe('[REDACTADO]');
    expect(payload.sueldo_bruto_mensual).toBe('[REDACTADO]');
    expect(payload.nested.token).toBe('[REDACTADO]');
    expect(payload.nested.attachment).toBe('[BUFFER:7]');
    expect(payload.items).toHaveLength(100);
  });

  test('permite registrar la auditoria en la misma transaccion de negocio', async () => {
    const client = { query: jest.fn().mockResolvedValue({ rows: [] }) };

    await recordAudit({
      tenantId: 'tenant-1',
      userId: 'user-1',
      correlationId: 'corr-1',
      action: 'asistencia.manual.registrar',
      entity: 'marcaciones',
      dbClient: client,
    });

    expect(client.query).toHaveBeenCalledTimes(1);
    expect(db.query).not.toHaveBeenCalled();
  });
});
