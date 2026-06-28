const {
  buildConfirmationUrl,
  createPayPhonePayment,
  isPayPhoneMockMode,
} = require('./payphoneGatewayService');

describe('payphoneGatewayService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      PAYPHONE_MOCK_MODE: 'false',
      PAYPHONE_TOKEN: 'token-real',
      PAYPHONE_STORE_ID: '12345',
      PAYPHONE_API_BASE: 'https://pay.payphonetodoesposible.com',
      BACKEND_PUBLIC_URL: 'https://api.nomina.example',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('modo mock nunca queda activo en produccion', () => {
    process.env.NODE_ENV = 'production';
    process.env.PAYPHONE_MOCK_MODE = 'true';

    expect(isPayPhoneMockMode()).toBe(false);
  });

  test('prepara pago PayPhone con callback publico y referencia de cliente', async () => {
    const post = jest.fn(async () => ({
      payWithCard: 'https://pay.payphonetodoesposible.com/checkout/card',
      payWithPayPhone: 'https://pay.payphonetodoesposible.com/checkout/wallet',
    }));

    const result = await createPayPhonePayment({
      amounts: {
        montoCentavos: 1150,
        baseGravadaCentavos: 1000,
        baseNoGravadaCentavos: 0,
        ivaCentavos: 150,
        moneda: 'USD',
      },
      reference: 'sknomina-TENANT-USER-PRO-1234567890',
      post,
    });

    expect(post).toHaveBeenCalledWith(
      'https://pay.payphonetodoesposible.com/api/button/Prepare',
      expect.objectContaining({
        amount: 1150,
        amountWithTax: 1000,
        tax: 150,
        storeId: 12345,
        clientTransactionId: 'sknomina-TENANT-USER-PRO-1234567890',
        responseUrl: buildConfirmationUrl('https://api.nomina.example'),
      }),
      expect.objectContaining({ Authorization: 'Bearer token-real' }),
      12000
    );
    expect(result.paymentUrl).toBe('https://pay.payphonetodoesposible.com/checkout/card');
  });
});
