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
const logger = require('../utils/logger');
const {
  buildInvoicePayload,
  processFacturadorWebhook,
  requestInvoiceForTransaction,
  retryPendingInvoices,
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
  tenant_configuracion: {
    facturacionEmail: 'contabilidad@example.com',
    facturacionDireccion: 'Av. Principal 123, Quito',
    facturadorEmissionPointId: 27,
  },
};

describe('fiscalInvoiceService MSF26', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('construye payload fiscal desde la transaccion aprobada sin copiar logica del facturador', () => {
    const payload = buildInvoicePayload(tx);

    expect(payload.customer).toEqual(expect.objectContaining({
      identification: '1790012345001',
      legalName: 'Empresa Demo S.A.',
      email: 'contabilidad@example.com',
      address: 'Av. Principal 123, Quito',
    }));
    expect(payload.invoice).toEqual(expect.objectContaining({
      externalReference: 'SKN-PAY-1',
      customer: payload.customer,
    }));
    expect(payload.invoice.invoice.items[0]).toEqual(expect.objectContaining({
      description: 'Servicio SaaS SKNOMINA - Pyme',
      unitPrice: 50,
      vatRate: 12,
      code: 'SKNOMINA-PYME',
    }));
    expect(payload.invoice.invoice.payments).toEqual([
      expect.objectContaining({ method: '20', amount: 56 }),
    ]);
    expect(payload.invoice.invoice.metadata.emissionPointId).toBe(27);
    expect(payload.invoice.invoice.metadata.contractVersion).toBe('SNF26R1');
  });

  test('usa la identidad fiscal de la empresa desde la configuracion del tenant cuando no vienen en la transaccion', () => {
    const payload = buildInvoicePayload({
      ...tx,
      ruc: '',
      razon_social: '',
      tenant_configuracion: {
        razonSocial: 'Empresa Demo S.A.',
        ruc: '1790012345001',
        facturacionDireccion: 'Av. Principal 123, Quito',
      },
    });

    expect(payload.customer).toEqual(expect.objectContaining({
      identification: '1790012345001',
      legalName: 'Empresa Demo S.A.',
    }));
    expect(payload.invoice.customer).toEqual(payload.customer);
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
      success: true,
      data: {
        estado: 'invoice_authorized',
        facturadorRequestId: 'fac-req-1',
        numero: '001-001-000000123',
        claveAcceso: '2806202601179001234500120010010000001231234567811',
        rideUrl: 'https://facturador.example/ride/123.pdf',
        xmlUrl: 'https://facturador.example/xml/123.xml',
      },
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
      expect.objectContaining({
        externalReference: 'SKN-PAY-1',
        customer: expect.objectContaining({ identification: '1790012345001' }),
        invoice: expect.objectContaining({
          items: expect.any(Array),
          payments: expect.any(Array),
        }),
      }),
      expect.objectContaining({ idempotencyKey: 'SKNOMINA-SKN-PAY-1' })
    );
    expect(result.status).toBe('invoice_authorized');
    expect(result.invoiceNumber).toBe('001-001-000000123');
  });

  test('concilia el sobre firmado del webhook del Facturador', async () => {
    const eventPayload = {
      id: 'event-1',
      evento: 'factura.autorizada',
      data: {
        tenantId: 'tenant-1',
        externalReference: 'SKN-PAY-1',
        idempotencyKey: 'SKNOMINA-SKN-PAY-1',
        facturadorRequestId: 'fac-req-1',
        estado: 'invoice_authorized',
        numero: '001-002-000000123',
      },
    };
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 'invoice-1',
        tenant_id: 'tenant-1',
        external_reference: 'SKN-PAY-1',
        idempotency_key: 'SKNOMINA-SKN-PAY-1',
        status: 'invoice_authorized',
        facturador_request_id: 'fac-req-1',
        invoice_number: '001-002-000000123',
      }],
    });

    const result = await processFacturadorWebhook({
      payload: eventPayload,
      rawPayload: JSON.stringify(eventPayload),
      signature: 'sha256=test',
      correlationId: 'corr-webhook-1',
    });

    expect(require('./facturadorClient').verifyFacturadorWebhookSignature).toHaveBeenCalledWith(
      JSON.stringify(eventPayload),
      'sha256=test'
    );
    expect(db.query.mock.calls[0][1]).toEqual(expect.arrayContaining([
      'SKNOMINA-SKN-PAY-1',
      'tenant-1',
      'invoice_authorized',
      'fac-req-1',
      'SKN-PAY-1',
    ]));
    expect(result.status).toBe('invoice_authorized');
  });
});

describe('retryPendingInvoices AIV75-26', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const eligibleRow = {
    id: 'fir-1',
    tenant_id: 'tenant-1',
    tx_tenant_id: 'tenant-1',
    payment_transaction_id: 'pay-1',
    external_reference: 'SKN-PAY-1',
    idempotency_key: 'SKNOMINA-SKN-PAY-1',
    status: 'blocked',
    attempts: 2,
    last_error: 'Falta configurar la URL API de SINKRONET FACTURADOR.',
  };

  const eligibleRow2 = {
    id: 'fir-2',
    tenant_id: 'tenant-2',
    tx_tenant_id: 'tenant-2',
    payment_transaction_id: 'pay-2',
    external_reference: 'SKN-PAY-2',
    idempotency_key: 'SKNOMINA-SKN-PAY-2',
    status: 'invoice_rejected',
    attempts: 1,
    last_error: 'SRI rechazo la factura.',
  };

  const txForRetry = {
    ...tx,
    id: 'pay-1',
    tenant_id: 'tenant-1',
  };

  const txForRetry2 = {
    ...tx,
    id: 'pay-2',
    tenant_id: 'tenant-2',
    client_transaction_id: 'SKN-PAY-2',
  };

  function mockReadyFacturador() {
    getFacturadorReadiness.mockReturnValue({
      ready: true,
      status: 'ready',
      blockers: [],
    });
  }

  function mockAuthorizedResponse() {
    requestFiscalInvoice.mockResolvedValue({
      estado: 'AUTORIZADA',
      id: 'fac-req-1',
      numero: '001-001-000000999',
      claveAcceso: '0208202601179001234500120010010000009991234567811',
      rideUrl: 'https://facturador.example/ride/999.pdf',
      xmlUrl: 'https://facturador.example/xml/999.xml',
    });
  }

  function mockUpsertAndUpdateReturning(overrides = {}) {
    return {
      rows: [{
        id: overrides.id || 'fir-1',
        tenant_id: overrides.tenant_id || 'tenant-1',
        payment_transaction_id: overrides.payment_transaction_id || 'pay-1',
        external_reference: overrides.external_reference || 'SKN-PAY-1',
        idempotency_key: overrides.idempotency_key || 'SKNOMINA-SKN-PAY-1',
        status: overrides.status || 'invoice_authorized',
        customer_payload: {},
        invoice_payload: {},
        facturador_request_id: overrides.facturador_request_id || 'fac-req-1',
        invoice_number: overrides.invoice_number || '001-001-000000999',
        access_key: overrides.access_key || '0208202601179001234500120010010000009991234567811',
        ride_url: overrides.ride_url || 'https://facturador.example/ride/999.pdf',
        xml_url: overrides.xml_url || 'https://facturador.example/xml/999.xml',
        last_error: overrides.last_error || '',
        attempts: overrides.attempts || 3,
      }],
    };
  }

  test('omite reintentos cuando el facturador no esta listo', async () => {
    getFacturadorReadiness.mockReturnValue({
      ready: false,
      status: 'blocked_configuration',
      blockers: ['Falta configurar la URL API de SINKRONET FACTURADOR.'],
    });

    const result = await retryPendingInvoices('corr-retry-1');

    expect(result).toEqual({ retried: 0, skippedReason: 'facturador_not_ready' });
    expect(db.query).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'CRON_FISCAL_INVOICE_RETRY_SKIPPED',
        correlationId: 'corr-retry-1',
      }),
      expect.any(String)
    );
  });

  test('selecciona solo facturas elegibles (blocked/failed, attempts < max, backoff)', async () => {
    mockReadyFacturador();
    mockAuthorizedResponse();

    db.query
      // SELECT eligible invoices
      .mockResolvedValueOnce({ rows: [eligibleRow] })
      // fetchTransactionForInvoice inside requestInvoiceForTransaction
      .mockResolvedValueOnce({ rows: [txForRetry] })
      // upsertFiscalRequest
      .mockResolvedValueOnce(mockUpsertAndUpdateReturning())
      // updateFiscalRequestFromFacturador
      .mockResolvedValueOnce(mockUpsertAndUpdateReturning());

    await retryPendingInvoices('corr-retry-2');

    // Verify the SELECT query uses the correct parameters
    const selectCall = db.query.mock.calls[0];
    expect(selectCall[0]).toContain("status IN ('blocked', 'failed')");
    expect(selectCall[0]).toContain('attempts < $1');
    expect(selectCall[0]).toContain('LIMIT 20');
    expect(selectCall[1]).toEqual([5]); // RETRY_MAX_ATTEMPTS
  });

  test('continua procesando facturas restantes cuando una falla', async () => {
    mockReadyFacturador();
    mockAuthorizedResponse();

    db.query
      // SELECT eligible: 2 rows
      .mockResolvedValueOnce({ rows: [eligibleRow, eligibleRow2] })
      // 1st row: fetchTransactionForInvoice throws (no transaction found)
      .mockResolvedValueOnce({ rows: [] })
      // 2nd row: fetchTransactionForInvoice
      .mockResolvedValueOnce({ rows: [txForRetry2] })
      // 2nd row: upsertFiscalRequest
      .mockResolvedValueOnce(mockUpsertAndUpdateReturning({
        id: 'fir-2',
        tenant_id: 'tenant-2',
        payment_transaction_id: 'pay-2',
        external_reference: 'SKN-PAY-2',
        idempotency_key: 'SKNOMINA-SKN-PAY-2',
      }))
      // 2nd row: updateFiscalRequestFromFacturador
      .mockResolvedValueOnce(mockUpsertAndUpdateReturning({
        id: 'fir-2',
        tenant_id: 'tenant-2',
        payment_transaction_id: 'pay-2',
        external_reference: 'SKN-PAY-2',
        idempotency_key: 'SKNOMINA-SKN-PAY-2',
      }));

    const result = await retryPendingInvoices('corr-retry-3');

    // First invoice threw an error (AppError from requestInvoiceForTransaction),
    // but the second was processed successfully
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: 'corr-retry-3',
        tenantId: 'tenant-1',
      }),
      expect.any(String)
    );

    // Second invoice succeeded
    expect(result.retried).toBe(1);
    expect(result.details).toHaveLength(1);
    expect(result.details[0]).toEqual(expect.objectContaining({
      tenantId: 'tenant-2',
      externalReference: 'SKN-PAY-2',
    }));
  });

  test('retorna conteo y detalles de facturas reintentadas', async () => {
    mockReadyFacturador();
    mockAuthorizedResponse();

    db.query
      // SELECT eligible: 1 row
      .mockResolvedValueOnce({ rows: [eligibleRow] })
      // fetchTransactionForInvoice
      .mockResolvedValueOnce({ rows: [txForRetry] })
      // upsertFiscalRequest
      .mockResolvedValueOnce(mockUpsertAndUpdateReturning())
      // updateFiscalRequestFromFacturador
      .mockResolvedValueOnce(mockUpsertAndUpdateReturning());

    const result = await retryPendingInvoices('corr-retry-4');

    expect(result).toEqual({
      retried: 1,
      details: [
        expect.objectContaining({
          tenantId: 'tenant-1',
          externalReference: 'SKN-PAY-1',
          attempt: 3, // eligibleRow.attempts (2) + 1
          resultStatus: 'invoice_authorized',
        }),
      ],
    });
  });

  test('errores incluyen logging estructurado con code, statusCode y correlationId', async () => {
    mockReadyFacturador();

    const appError = new Error('No encontramos la transaccion para emitir factura.');
    appError.code = 'FACTURA_TRANSACCION_NO_ENCONTRADA';
    appError.statusCode = 404;

    db.query
      // SELECT eligible: 1 row
      .mockResolvedValueOnce({ rows: [eligibleRow] })
      // fetchTransactionForInvoice returns empty → requestInvoiceForTransaction throws AppError
      .mockResolvedValueOnce({ rows: [] });

    await retryPendingInvoices('corr-retry-5');

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'FACTURA_TRANSACCION_NO_ENCONTRADA',
        statusCode: 404,
        correlationId: 'corr-retry-5',
        tenantId: 'tenant-1',
        userId: null,
        externalReference: 'SKN-PAY-1',
      }),
      expect.any(String)
    );
  });
});
