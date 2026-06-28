jest.mock('../config/database', () => ({
  query: jest.fn(),
}));
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock('./facturadorClient', () => ({
  getFacturadorReadiness: jest.fn(),
  requestFiscalInvoice: jest.fn(),
  verifyFacturadorWebhookSignature: jest.fn(),
}));

const db = require('../config/database');
const {
  getFacturadorReadiness,
  requestFiscalInvoice,
} = require('./facturadorClient');
const {
  buildInvoicePayload,
  requestInvoiceForTransaction,
} = require('./fiscalInvoiceService');

const tx = {
  id: 'pay-1',
  tenant_id: 'tenant-1',
  usuario_id: 'user-1',
  plan_id: 'PYME',
  plan_nombre: 'Pyme',
  proveedor: 'PAYPHONE',
  estado: 'APPROVED',
  monto_centavos: 5600,
  base_gravada_centavos: 5000,
  base_no_gravada_centavos: 0,
  iva_centavos: 600,
  moneda: 'USD',
  client_transaction_id: 'SKN-PAY-1',
  ruc: '1790012345001',
  razon_social: 'Empresa Demo S.A.',
  tenant_configuracion: { facturacionEmail: 'contabilidad@example.com' },
};

describe('fiscalInvoiceService MSF26', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('construye payload fiscal desde la transaccion aprobada sin copiar logica del facturador', () => {
    const payload = buildInvoicePayload(tx);

    expect(payload.customer).toEqual(expect.objectContaining({
      identificacion: '1790012345001',
      razonSocial: 'Empresa Demo S.A.',
      email: 'contabilidad@example.com',
    }));
    expect(payload.invoice).toEqual(expect.objectContaining({
      origen: 'SKNOMINA',
      tipoComprobante: 'FACTURA',
      referenciaExterna: 'SKN-PAY-1',
    }));
    expect(payload.invoice.items[0]).toEqual(expect.objectContaining({
      descripcion: 'Servicio SKNOMINA - Pyme',
      total: 56,
    }));
  });

  test('registra solicitud bloqueada cuando el facturador no esta configurado', async () => {
    getFacturadorReadiness.mockReturnValue({
      ready: false,
      status: 'blocked_configuration',
      blockers: ['Falta configurar la URL API de SINKRONET FACTURADOR.'],
    });
    db.query
      .mockResolvedValueOnce({ rows: [tx] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'invoice-1',
          tenant_id: 'tenant-1',
          payment_transaction_id: 'pay-1',
          external_reference: 'SKN-PAY-1',
          idempotency_key: 'SKNOMINA-SKN-PAY-1',
          status: 'blocked',
          customer_payload: {},
          invoice_payload: {},
          last_error: 'Falta configurar la URL API de SINKRONET FACTURADOR.',
          attempts: 1,
        }],
      });

    const result = await requestInvoiceForTransaction({
      tenantId: 'tenant-1',
      paymentTransactionId: 'pay-1',
      userId: 'user-1',
      correlationId: 'corr-fiscal',
    });

    expect(requestFiscalInvoice).not.toHaveBeenCalled();
    expect(result.status).toBe('blocked');
    expect(result.lastError).toContain('Falta configurar');
  });

  test('actualiza referencias cuando el facturador autoriza la factura', async () => {
    getFacturadorReadiness.mockReturnValue({
      ready: true,
      status: 'ready',
      blockers: [],
    });
    requestFiscalInvoice.mockResolvedValue({
      estado: 'AUTORIZADA',
      id: 'fac-req-1',
      numero: '001-001-000000123',
      claveAcceso: '2806202601179001234500120010010000001231234567811',
      rideUrl: 'https://facturador.example/ride/123.pdf',
      xmlUrl: 'https://facturador.example/xml/123.xml',
    });
    db.query
      .mockResolvedValueOnce({ rows: [tx] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'invoice-1',
          tenant_id: 'tenant-1',
          payment_transaction_id: 'pay-1',
          external_reference: 'SKN-PAY-1',
          idempotency_key: 'SKNOMINA-SKN-PAY-1',
          status: 'invoice_requested',
          customer_payload: {},
          invoice_payload: {},
          last_error: '',
          attempts: 1,
        }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'invoice-1',
          tenant_id: 'tenant-1',
          payment_transaction_id: 'pay-1',
          external_reference: 'SKN-PAY-1',
          idempotency_key: 'SKNOMINA-SKN-PAY-1',
          status: 'invoice_authorized',
          customer_payload: {},
          invoice_payload: {},
          facturador_request_id: 'fac-req-1',
          invoice_number: '001-001-000000123',
          access_key: '2806202601179001234500120010010000001231234567811',
          ride_url: 'https://facturador.example/ride/123.pdf',
          xml_url: 'https://facturador.example/xml/123.xml',
          last_error: '',
          attempts: 1,
        }],
      });

    const result = await requestInvoiceForTransaction({
      tenantId: 'tenant-1',
      paymentTransactionId: 'pay-1',
      userId: 'user-1',
      correlationId: 'corr-fiscal',
    });

    expect(requestFiscalInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ referenciaExterna: 'SKN-PAY-1' }),
      expect.objectContaining({ idempotencyKey: 'SKNOMINA-SKN-PAY-1' })
    );
    expect(result.status).toBe('invoice_authorized');
    expect(result.invoiceNumber).toBe('001-001-000000123');
  });
});
