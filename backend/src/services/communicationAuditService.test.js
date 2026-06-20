describe('communicationAuditService', () => {
  let queryMock;

  function loadService(env = {}) {
    jest.resetModules();
    queryMock = jest.fn().mockResolvedValue({ rows: [{ id: 'event-1' }] });
    jest.doMock('../config/database', () => ({
      query: queryMock,
      runWithTenantContext: (_context, callback) => callback(),
    }));

    [
      'COMMUNICATION_RETENTION_DAYS',
      'COMMUNICATION_EVENT_HASH_SECRET',
      'JWT_SECRET',
      'EMPLOYEE_INVITE_SECRET',
    ].forEach((key) => {
      delete process.env[key];
    });
    Object.assign(process.env, env);

    return require('./communicationAuditService');
  }

  afterEach(() => {
    jest.dontMock('../config/database');
  });

  test('registra evento sin guardar destinatario ni contenido en claro', async () => {
    const service = loadService({
      COMMUNICATION_EVENT_HASH_SECRET: 'audit-secret',
      COMMUNICATION_RETENTION_DAYS: '180',
    });

    await service.recordCommunicationEvent({
      tenantId: '11111111-1111-1111-1111-111111111111',
      userId: '22222222-2222-2222-2222-222222222222',
      correlationId: 'corr-1',
      channel: 'email',
      provider: 'smtp',
      template: 'email_verification',
      status: 'sent',
      recipient: 'Owner@Example.com',
      messageId: 'smtp-message-1',
      metadata: {
        purpose: 'verificacion_correo',
        flow: 'registro_usuario',
        code: '123456',
        subject: 'no debe persistirse',
      },
    });

    const params = queryMock.mock.calls[0][1];
    expect(params).not.toContain('Owner@Example.com');
    expect(params).not.toContain('123456');
    expect(params[8]).toBe('example.com');
    expect(params[10]).toBe(180);
    expect(JSON.parse(params[11])).toEqual({
      purpose: 'verificacion_correo',
      flow: 'registro_usuario',
    });
  });

  test('lista eventos con limite acotado', async () => {
    queryMock = jest.fn().mockResolvedValue({
      rows: [{
        id: 'event-1',
        tenant_id: null,
        user_id: null,
        correlation_id: 'corr-2',
        channel: 'email',
        provider: 'smtp',
        template: 'smtp_test',
        status: 'sent',
        recipient_hint: 'example.com',
        retention_until: new Date('2026-12-31T00:00:00Z'),
        metadata: {},
        created_at: new Date('2026-06-20T00:00:00Z'),
      }],
    });
    jest.resetModules();
    jest.doMock('../config/database', () => ({
      query: queryMock,
      runWithTenantContext: (_context, callback) => callback(),
    }));
    const service = require('./communicationAuditService');

    const rows = await service.listCommunicationEvents({ limit: 500 });

    expect(queryMock.mock.calls[0][1][1]).toBe(100);
    expect(rows[0]).toMatchObject({
      id: 'event-1',
      template: 'smtp_test',
      recipientHint: 'example.com',
    });
  });
});
