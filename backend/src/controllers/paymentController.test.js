jest.mock('../config/database', () => ({
  query: jest.fn(),
}));
jest.mock('../services/fiscalInvoiceService', () => ({
  queueInvoiceForApprovedTransaction: jest.fn().mockResolvedValue(null),
}));

const db = require('../config/database');
const { queueInvoiceForApprovedTransaction } = require('../services/fiscalInvoiceService');
const paymentController = require('./paymentController');

function mockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe('paymentController PayPhone gates', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('bloquea checkout cuando PayPhone esta en mock', async () => {
    process.env.DIRECT_PAYMENTS_ENABLED = 'true';
    process.env.PAYMENT_PROVIDER = 'payphone';
    process.env.PAYPHONE_MOCK_MODE = 'true';
    process.env.PAYPHONE_TOKEN = 'token-real';
    process.env.PAYPHONE_STORE_ID = 'store-1';
    process.env.BACKEND_PUBLIC_URL = 'https://api.nomina.example';
    const req = {
      body: { planId: 'PRO' },
      usuario: { tenantId: 'tenant-1', id: 'user-1' },
      correlationId: 'corr-pay',
    };
    const res = mockResponse();
    const next = jest.fn();

    await paymentController.createCheckoutIntent(req, res, next);

    expect(db.query).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'PAYPHONE_NO_CONFIGURADO',
      capabilities: expect.objectContaining({ checkoutAvailable: false, mockMode: true }),
    }));
  });

  test('reporta capacidades publicas de pago junto con planes', async () => {
    process.env.DIRECT_PAYMENTS_ENABLED = 'true';
    process.env.PAYMENT_PROVIDER = 'payphone';
    process.env.PAYPHONE_MOCK_MODE = 'false';
    process.env.PAYPHONE_TOKEN = 'token-real';
    process.env.PAYPHONE_STORE_ID = 'store-1';
    process.env.BACKEND_PUBLIC_URL = 'https://api.nomina.example';
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = mockResponse();

    await paymentController.listPublicPlans({}, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [],
      paymentCapabilities: expect.objectContaining({
        checkoutAvailable: true,
        status: 'ready',
      }),
    });
  });

  test('habilita PayPhone por defecto cuando es el proveedor principal configurado', async () => {
    delete process.env.DIRECT_PAYMENTS_ENABLED;
    delete process.env.PAYPHONE_CHECKOUT_ENABLED;
    process.env.PAYMENT_PROVIDER = 'payphone';
    process.env.PAYPHONE_MOCK_MODE = 'false';
    process.env.PAYPHONE_TOKEN = 'token-real';
    process.env.PAYPHONE_STORE_ID = 'store-1';
    process.env.BACKEND_PUBLIC_URL = 'https://api.nomina.example';
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = mockResponse();

    await paymentController.listPublicPlans({}, res, jest.fn());

    expect(db.query.mock.calls[0][0]).toContain('ROW_NUMBER() OVER');
    expect(db.query.mock.calls[0][0]).toContain('catalog_rank = 1');
    expect(db.query.mock.calls[0][0]).toContain("supersededByPlanId");
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [],
      paymentCapabilities: expect.objectContaining({
        provider: 'PAYPHONE',
        checkoutAvailable: true,
        directPaymentsEnabled: true,
        status: 'ready',
      }),
    });
  });

  test('deriva mensualidad publica desde contado anual y tasa nominal', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 'PRO',
        nombre: 'Pro',
        descripcion: 'Plan anual como fuente',
        precio_mensual_centavos: 1,
        moneda: 'USD',
        empleados_max: 50,
        empresas_max: 1,
        usuarios_max: 3,
        iess_establecimientos_max: 1,
        archivos_bancarios: true,
        reportes_avanzados: true,
        api_access: false,
        app_movil: true,
        rutas_campo: true,
        soporte: 'prioritario',
        publico: true,
        activo: true,
        orden: 1,
        metadata: {
          pricingInputMode: 'ANNUAL_PRICE',
          precioAnualCentavos: 120000,
          cuotasMensuales: 12,
          tasaNominalAnual: 12,
        },
      }],
    });
    const res = mockResponse();

    await paymentController.listPublicPlans({}, res, jest.fn());

    const payload = res.json.mock.calls[0][0];
    expect(payload.data[0]).toEqual(expect.objectContaining({
      id: 'PRO',
      pricingInputMode: 'ANNUAL_PRICE',
      precioAnualCentavos: 120000,
      cuotasMensuales: 12,
      tasaNominalAnual: 12,
    }));
    expect(payload.data[0].precioMensualCentavos).toBeGreaterThan(10000);
    expect(payload.data[0].precioMensualCentavos).toBeLessThan(11000);
  });

  test('deshabilita pagos directos con flag explicito y anuncia transferencia manual', async () => {
    process.env.DIRECT_PAYMENTS_ENABLED = 'false';
    process.env.PAYMENT_PROVIDER = 'payphone';
    const req = {
      body: { planId: 'PRO' },
      usuario: { tenantId: 'tenant-1', id: 'user-1' },
      correlationId: 'corr-manual-only',
    };
    const res = mockResponse();

    await paymentController.createCheckoutIntent(req, res, jest.fn());

    expect(db.query).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'PAGOS_DIRECTOS_DESHABILITADOS',
      capabilities: expect.objectContaining({
        provider: 'BANK_TRANSFER_MANUAL',
        checkoutAvailable: false,
        supportsManualEntry: true,
      }),
    }));
  });

  test('listado admin pide solo la version vigente por raiz de plan', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 'TRIAL_V9270000000',
        nombre: 'Prueba',
        descripcion: 'Actualizado',
        precio_mensual_centavos: 0,
        moneda: 'USD',
        empleados_max: 10,
        empresas_max: 1,
        usuarios_max: 2,
        archivos_bancarios: false,
        reportes_avanzados: false,
        api_access: false,
        app_movil: true,
        rutas_campo: false,
        soporte: 'comunidad',
        publico: false,
        activo: true,
        orden: 1,
        metadata: { rootPlanId: 'TRIAL' },
      }],
    });
    const res = mockResponse();

    await paymentController.listAdminPlans({}, res, jest.fn());

    expect(db.query.mock.calls[0][0]).toContain('ROW_NUMBER() OVER');
    expect(db.query.mock.calls[0][0]).toContain('catalog_rank = 1');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: [expect.objectContaining({
        id: 'TRIAL_V9270000000',
        rootPlanId: 'TRIAL',
        catalogStatus: 'current',
      })],
    }));
  });

  test('versiona un plan existente cuando tiene suscripciones activas', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1719270000000);
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 'PRO', nombre: 'Pro anterior' }] })
      .mockResolvedValueOnce({ rows: [{ total: 2 }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'PRO_V9270000000',
          nombre: 'Pro nuevo',
          descripcion: 'Actualizado',
          precio_mensual_centavos: 2000,
          moneda: 'USD',
          empleados_max: 50,
          empresas_max: 1,
          usuarios_max: 3,
          archivos_bancarios: true,
          reportes_avanzados: true,
          api_access: true,
          app_movil: true,
          rutas_campo: true,
          soporte: 'prioritario',
          publico: true,
          activo: true,
          orden: 1,
          metadata: { rootPlanId: 'PRO' },
        }],
      })
      .mockResolvedValueOnce({ rows: [] });
    const req = {
      params: { planId: 'PRO' },
      body: {
        id: 'PRO',
        nombre: 'Pro nuevo',
        descripcion: 'Actualizado',
        precioMensualCentavos: 2000,
        empleadosMax: 50,
        empresasMax: 1,
        usuariosMax: 3,
        archivosBancarios: true,
        reportesAvanzados: true,
        apiAccess: true,
        appMovil: true,
        rutasCampo: true,
        soporte: 'prioritario',
        publico: true,
        activo: true,
        orden: 1,
      },
    };
    const res = mockResponse();

    await paymentController.upsertPlan(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({ id: 'PRO_V9270000000' }),
      meta: expect.objectContaining({ versioned: true, activeSubscriptions: 2 }),
    }));
    const supersedeCall = db.query.mock.calls[3];
    expect(supersedeCall[0]).toContain('metadata = metadata || $2::jsonb');
    expect(supersedeCall[1][0]).toBe('PRO');
    expect(JSON.parse(supersedeCall[1][1])).toMatchObject({
      catalogStatus: 'superseded',
      supersededByPlanId: 'PRO_V9270000000',
      runtimeOnly: true,
    });
    now.mockRestore();
  });

  test('webhook PayPhone aprobado activa suscripcion de forma backend', async () => {
    process.env.DIRECT_PAYMENTS_ENABLED = 'true';
    db.query
      .mockResolvedValueOnce({
        rows: [{
          client_transaction_id: 'pay-1',
          estado: 'PENDING',
          monto_centavos: 1200,
          tenant_id: 'tenant-1',
          plan_id: 'PRO',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{
          client_transaction_id: 'pay-1',
          provider_transaction_id: 'trx-1',
          tenant_id: 'tenant-1',
          plan_id: 'PRO',
          metadata: {},
        }],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'PRO', metadata: { billingPeriod: 'monthly' }, precio_mensual_centavos: 1200 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const req = {
      body: {
        clientTransactionId: 'pay-1',
        statusCode: 3,
        transactionId: 'trx-1',
        amount: 1200,
      },
      correlationId: 'corr-webhook',
    };
    const res = mockResponse();
    const next = jest.fn();

    await paymentController.payphoneWebhook(req, res, next);

    expect(db.query).toHaveBeenNthCalledWith(
      1,
      'SELECT * FROM transacciones_pago WHERE client_transaction_id = $1 LIMIT 1',
      ['pay-1']
    );
    expect(db.query.mock.calls[1][0]).toContain('UPDATE transacciones_pago');
    expect(db.query.mock.calls[4][0]).toContain('INSERT INTO suscripciones');
    expect(queueInvoiceForApprovedTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ client_transaction_id: 'pay-1' }),
      expect.objectContaining({ correlationId: 'corr-webhook' })
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      processed: true,
    }));
    expect(next).not.toHaveBeenCalled();
  });

  test('aplica transferencia manual y actualiza suscripcion con periodo anual', async () => {
    const previousSubscription = {
      plan_id: 'MICRO',
      estado: 'active',
      inicio_en: '2026-06-01T00:00:00.000Z',
      vence_en: '2026-07-01T00:00:00.000Z',
      renovacion_automatica: false,
      metadata: {},
    };
    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'tx-db-id',
          tenant_id: 'tenant-1',
          usuario_id: 'owner-1',
          plan_id: 'PRO',
          proveedor: 'BANK_TRANSFER_MANUAL',
          estado: 'CONFIRMED',
          monto_centavos: 12000,
          moneda: 'USD',
          client_transaction_id: 'sknomina-bank-1',
          provider_transaction_id: 'TRX-001',
          metadata: { manualBankStatus: 'CONFIRMED', billingPeriod: 'annual', bankReference: 'TRX-001' },
        }],
      })
      .mockResolvedValueOnce({ rows: [previousSubscription] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'tx-db-id',
          tenant_id: 'tenant-1',
          usuario_id: 'owner-1',
          plan_id: 'PRO',
          proveedor: 'BANK_TRANSFER_MANUAL',
          estado: 'APPROVED',
          monto_centavos: 12000,
          moneda: 'USD',
          client_transaction_id: 'sknomina-bank-1',
          provider_transaction_id: 'TRX-001',
          metadata: { manualBankStatus: 'APPLIED', billingPeriod: 'annual', previousSubscription },
        }],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'PRO', metadata: { billingPeriod: 'annual' }, precio_mensual_centavos: 1000 }] })
      .mockResolvedValueOnce({ rows: [previousSubscription] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'tx-db-id',
          tenant_id: 'tenant-1',
          usuario_id: 'owner-1',
          plan_id: 'PRO',
          proveedor: 'BANK_TRANSFER_MANUAL',
          estado: 'APPROVED',
          monto_centavos: 12000,
          moneda: 'USD',
          client_transaction_id: 'sknomina-bank-1',
          provider_transaction_id: 'TRX-001',
          metadata: { manualBankStatus: 'APPLIED', billingPeriod: 'annual', appliedAt: '2026-07-10T00:00:00.000Z' },
          plan_nombre: 'Pro',
        }],
      });
    const req = {
      params: { id: 'tx-db-id' },
      body: {},
      usuario: { id: 'super-1', rol: 'superadmin' },
      usuarioId: 'super-1',
      correlationId: 'corr-manual-apply',
    };
    const res = mockResponse();

    await paymentController.applyManualBankTransfer(req, res, jest.fn());

    expect(db.query.mock.calls[5][0]).toContain('INSERT INTO suscripciones');
    expect(db.query.mock.calls[5][1][2]).toBeInstanceOf(Date);
    expect(db.query.mock.calls[5][1][3]).toBe(false);
    expect(queueInvoiceForApprovedTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ client_transaction_id: 'sknomina-bank-1' }),
      expect.objectContaining({ correlationId: 'corr-manual-apply' })
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({ status: 'APPLIED', billingPeriod: 'annual' }),
    }));
  });
});
