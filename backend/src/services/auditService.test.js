jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

const { sanitizeAuditPayload } = require('./auditService');

describe('auditService LOPDP sanitization', () => {
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
});
