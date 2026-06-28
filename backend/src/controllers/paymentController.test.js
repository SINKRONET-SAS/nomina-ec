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
    expect(db.query).toHaveBeenLastCalledWith(
      'UPDATE planes_comerciales SET publico = false, updated_at = NOW() WHERE id = $1',
      ['PRO']
    );
    now.mockRestore();
  });

  test('webhook PayPhone aprobado activa suscripcion de forma backend', async () => {
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
        }],
      })
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
    expect(db.query.mock.calls[2][0]).toContain('INSERT INTO suscripciones');
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
});
