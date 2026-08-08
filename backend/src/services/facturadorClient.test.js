describe('facturadorClient SNF26R1', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    global.fetch = jest.fn();
    process.env.SINKRONET_FACTURADOR_BASE_URL = 'https://facturador.example';
    process.env.SINKRONET_FACTURADOR_API_KEY = 'sk_live_secret';
    delete process.env.SINKRONET_FACTURADOR_INVOICE_PATH;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    delete global.fetch;
  });

  test('usa la ruta de integracion y Authorization Bearer', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 202,
      text: jest.fn().mockResolvedValue(JSON.stringify({
        success: true,
        data: { facturadorRequestId: 'req-1', estado: 'invoice_requested' },
      })),
    });
    const { requestFiscalInvoice } = require('./facturadorClient');

    await requestFiscalInvoice(
      { externalReference: 'SKN-1', customer: {}, invoice: {} },
      { idempotencyKey: 'SKNOMINA-SKN-1', correlationId: 'corr-1' }
    );

    expect(global.fetch).toHaveBeenCalledWith(
      'https://facturador.example/api/integrations/sknomina/invoices',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk_live_secret',
          'Idempotency-Key': 'SKNOMINA-SKN-1',
          'X-Correlation-Id': 'corr-1',
        }),
      })
    );
  });

  test('rechaza una respuesta no JSON sin ocultar el error de contrato', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 502,
      text: jest.fn().mockResolvedValue('<html>bad gateway</html>'),
    });
    const { requestFiscalInvoice } = require('./facturadorClient');

    await expect(
      requestFiscalInvoice({}, { idempotencyKey: 'idem-1', correlationId: 'corr-2' })
    ).rejects.toEqual(
      expect.objectContaining({
        code: 'FACTURADOR_RESPUESTA_INVALIDA',
        statusCode: 502,
      })
    );
  });
});
