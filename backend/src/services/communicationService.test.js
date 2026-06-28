describe('communicationService', () => {
  let createTransportMock;
  let sendMailMock;
  let recordCommunicationEventMock;

  function loadService(env = {}) {
    jest.resetModules();
    createTransportMock = jest.fn();
    sendMailMock = jest.fn();
    recordCommunicationEventMock = jest.fn().mockResolvedValue({ id: 'event-1' });
    jest.doMock('nodemailer', () => ({
      createTransport: createTransportMock,
    }));
    jest.doMock('./communicationAuditService', () => ({
      recordCommunicationEvent: recordCommunicationEventMock,
    }));

    process.env.NODE_ENV = env.NODE_ENV || 'test';
    [
      'COMMUNICATION_RETENTION_DAYS',
      'COMMUNICATION_EVENT_HASH_SECRET',
      'COMMUNICATION_PROVIDER',
      'COMMUNICATION_DEV_MODE',
      'COMMUNICATION_REQUIRE_REAL_PROVIDER',
      'SMTP_ENABLED',
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_SECURE',
      'SMTP_AUTH_REQUIRED',
      'SMTP_USER',
      'SMTP_PASSWORD',
      'SMTP_FROM_EMAIL',
      'SMTP_FROM_NAME',
      'WHATSAPP_ENABLED',
      'WHATSAPP_API_BASE_URL',
      'WHATSAPP_GRAPH_API_VERSION',
      'WHATSAPP_ACCESS_TOKEN',
      'WHATSAPP_PHONE_NUMBER_ID',
      'WHATSAPP_TEMPLATE_EMPLOYEE_INVITE',
      'WHATSAPP_TEMPLATE_LANGUAGE',
    ].forEach((key) => {
      delete process.env[key];
    });
    Object.assign(process.env, env);

    createTransportMock.mockReturnValue({ sendMail: sendMailMock });
    return require('./communicationService');
  }

  afterEach(() => {
    delete global.fetch;
    jest.dontMock('nodemailer');
    jest.dontMock('./communicationAuditService');
  });

  test('registra entrega de desarrollo cuando SMTP no esta configurado', async () => {
    const service = loadService({ NODE_ENV: 'development', COMMUNICATION_DEV_MODE: 'true' });
    const result = await service.sendEmailVerification({
      to: 'owner@example.com',
      code: '123456',
      name: 'Owner',
      correlationId: 'corr-1',
      userId: 'user-1',
    });

    expect(result.status).toBe('dev_logged');
    expect(createTransportMock).not.toHaveBeenCalled();
    expect(recordCommunicationEventMock).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'email',
      template: 'email_verification',
      status: 'dev_logged',
      recipient: 'owner@example.com',
    }));
  });

  test('bloquea invitacion requerida aunque el modo desarrollo este activo', async () => {
    const service = loadService({ NODE_ENV: 'development', COMMUNICATION_DEV_MODE: 'true' });

    await expect(service.sendEmployeeInvite({
      employee: {
        tenant_id: 'tenant-1',
        nombres: 'Marco',
        apellidos: 'Demo',
        email_personal: 'marco@example.com',
      },
      invite: {
        email: 'marco@example.com',
        code: 'OPS-1234',
        activationUrl: 'https://app.example.com/activar',
      },
      correlationId: 'corr-required',
      userId: 'user-required',
      requiredEmail: true,
    })).rejects.toMatchObject({
      code: 'COMM_SMTP_NOT_CONFIGURED',
      statusCode: 503,
    });

    expect(createTransportMock).not.toHaveBeenCalled();
    expect(recordCommunicationEventMock).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'email',
      template: 'employee_app_invite',
      status: 'not_configured',
      metadata: expect.objectContaining({
        required: true,
        reason: 'production_provider_required',
      }),
    }));
  });

  test('bloquea correo requerido en produccion si SMTP real no esta configurado', async () => {
    const service = loadService({
      NODE_ENV: 'production',
      SMTP_ENABLED: 'false',
      COMMUNICATION_DEV_MODE: 'true',
    });

    await expect(service.sendTestEmail({
      to: 'owner@example.com',
      correlationId: 'corr-prod',
      userId: 'user-prod',
    })).rejects.toMatchObject({
      code: 'COMM_SMTP_NOT_CONFIGURED',
      statusCode: 503,
    });

    expect(createTransportMock).not.toHaveBeenCalled();
    expect(recordCommunicationEventMock).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'email',
      provider: 'smtp',
      status: 'not_configured',
      metadata: expect.objectContaining({
        required: true,
        reason: 'production_provider_required',
      }),
    }));
  });

  test('envia correo SMTP con remitente configurado', async () => {
    const service = loadService({
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '587',
      SMTP_USER: 'mailer@example.com',
      SMTP_PASSWORD: 'secret',
      SMTP_FROM_EMAIL: 'notificaciones@example.com',
      SMTP_FROM_NAME: 'SKNOMINA',
    });
    sendMailMock.mockResolvedValue({ messageId: 'smtp-message-1' });

    const result = await service.sendPasswordReset({
      to: 'usuario@example.com',
      code: '654321',
      name: 'Usuario',
      correlationId: 'corr-2',
      userId: 'user-2',
    });

    expect(result).toMatchObject({ status: 'sent', messageId: 'smtp-message-1' });
    expect(createTransportMock).toHaveBeenCalledWith(expect.objectContaining({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      disableFileAccess: true,
      disableUrlAccess: true,
    }));
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'usuario@example.com',
      subject: 'Recuperacion de clave SKNOMINA',
      disableFileAccess: true,
      disableUrlAccess: true,
    }));
    expect(recordCommunicationEventMock).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'email',
      template: 'password_reset',
      status: 'sent',
      recipient: 'usuario@example.com',
      metadata: expect.objectContaining({
        purpose: 'recuperacion_clave',
        flow: 'auth_password_reset',
      }),
    }));
  });

  test('envia plantilla WhatsApp con telefono ecuatoriano normalizado', async () => {
    const service = loadService({
      WHATSAPP_ENABLED: 'true',
      WHATSAPP_API_BASE_URL: 'https://graph.facebook.com',
      WHATSAPP_GRAPH_API_VERSION: 'v23.0',
      WHATSAPP_ACCESS_TOKEN: 'token-test',
      WHATSAPP_PHONE_NUMBER_ID: 'phone-id',
      WHATSAPP_TEMPLATE_LANGUAGE: 'es',
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid-test' }] }),
    });

    const result = await service.sendWhatsAppTemplate({
      to: '0999999999',
      templateName: 'sknomina_employee_invite',
      variables: ['Maria', 'ADM-1234', 'sknomina://employee/activate?code=ADM-1234'],
      template: 'employee_app_invite',
      correlationId: 'corr-3',
      userId: 'user-3',
    });

    expect(result).toMatchObject({ status: 'sent', messageId: 'wamid-test' });
    const [, request] = global.fetch.mock.calls[0];
    const payload = JSON.parse(request.body);
    expect(payload.to).toBe('593999999999');
    expect(payload.template.name).toBe('sknomina_employee_invite');
    expect(recordCommunicationEventMock).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'whatsapp',
      status: 'sent',
      recipient: '593999999999',
    }));
  });

  test('expone estado de configuracion sin secretos', () => {
    const service = loadService({
      SMTP_HOST: 'smtp.example.com',
      SMTP_FROM_EMAIL: 'notificaciones@example.com',
      WHATSAPP_ENABLED: 'true',
    });

    const status = service.communicationStatus();
    expect(status.email.configured).toBe(true);
    expect(status.email.deliveryMode).toBe('smtp');
    expect(status.email.ready).toBe(true);
    expect(status.email.fromEmail).toBe('not***com');
    expect(status.whatsapp.configured).toBe(false);
    expect(status.whatsapp.missing).toEqual(expect.arrayContaining([
      'WHATSAPP_ACCESS_TOKEN',
      'WHATSAPP_PHONE_NUMBER_ID',
      'WHATSAPP_GRAPH_API_VERSION',
    ]));
    expect(status.compliance).toMatchObject({
      dataMinimization: true,
      storesMessageContent: false,
      storesVerificationCodes: false,
      whatsappRequiresEmployeeConsent: true,
      eventRetentionDays: 365,
    });
  });

  test('omite WhatsApp de invitacion app si el empleado no tiene consentimiento', async () => {
    const service = loadService({
      NODE_ENV: 'production',
      WHATSAPP_ENABLED: 'true',
      WHATSAPP_API_BASE_URL: 'https://graph.facebook.com',
      WHATSAPP_GRAPH_API_VERSION: 'v23.0',
      WHATSAPP_ACCESS_TOKEN: 'token-test',
      WHATSAPP_PHONE_NUMBER_ID: 'phone-id',
      WHATSAPP_TEMPLATE_EMPLOYEE_INVITE: 'sknomina_employee_invite',
    });
    global.fetch = jest.fn();

    const results = await service.sendEmployeeInvite({
      employee: {
        tenant_id: 'tenant-1',
        nombres: 'Maria',
        apellidos: 'Demo',
        email_personal: '',
        telefono: '0999999999',
        whatsapp_consent_at: null,
      },
      invite: {
        email: '',
        code: 'ADM-1234',
        activationUrl: 'https://app.example.com/activar',
      },
      correlationId: 'corr-4',
      userId: 'user-4',
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(results).toEqual(expect.arrayContaining([
      expect.objectContaining({
        channel: 'whatsapp',
        status: 'skipped',
        reason: 'consentimiento_whatsapp_requerido',
      }),
    ]));
  });
});
