const db = require('../config/database');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const {
  getFacturadorReadiness,
  requestFiscalInvoice,
  verifyFacturadorWebhookSignature,
} = require('./facturadorClient');

function safeJson(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_err) {
    return {};
  }
}

function centsToUsd(value) {
  return Math.round(Number(value || 0)) / 100;
}

function normalizeStatus(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (
    ['invoice_authorized', 'autorizada', 'autorizado', 'authorized', 'aprobada', 'aprobado'].includes(
      raw
    )
  ) {
    return 'invoice_authorized';
  }
  if (
    ['invoice_rejected', 'rechazada', 'rechazado', 'rejected', 'devuelta', 'devuelto'].includes(raw)
  ) {
    return 'invoice_rejected';
  }
  if (['failed', 'fallida', 'fallido', 'error', 'error_tecnico'].includes(raw)) return 'failed';
  if (['blocked', 'invoice_requested', 'received'].includes(raw)) {
    return raw === 'blocked' ? 'blocked' : 'invoice_requested';
  }
  return 'invoice_requested';
}

function extractFacturadorReference(response = {}) {
  const data = response.data || response.factura || response.comprobante || response;
  return {
    status: normalizeStatus(data.estado || data.status || data.estadoSri || data.estado_sri),
    facturadorRequestId: String(
      data.facturadorRequestId || data.requestId || data.id || data.facturaId || data.comprobanteId || ''
    ),
    invoiceNumber: String(data.numero || data.numeroFactura || data.secuencial || ''),
    accessKey: String(data.claveAcceso || data.accessKey || data.clave_acceso || ''),
    rideUrl: String(data.rideUrl || data.ride_url || data.pdfUrl || ''),
    xmlUrl: String(data.xmlUrl || data.xml_url || ''),
    lastError: String(data.error || data.message || data.mensaje || ''),
    raw: response,
  };
}

function buildExternalReference(tx) {
  return String(tx.client_transaction_id || tx.external_reference || tx.id || '').trim();
}

function buildIdempotencyKey(tx) {
  return `SKNOMINA-${buildExternalReference(tx)}`;
}

function resolveCustomerIdentity(tx) {
  const tenantConfig = safeJson(tx.tenant_configuracion);
  const customerEmail = tenantConfig.facturacionEmail
    || tenantConfig.emailFacturacion
    || tenantConfig.billingEmail
    || tenantConfig.email
    || '';

  const normalizedRuc = String(tx.ruc || tenantConfig.ruc || '').replace(/\D/g, '');
  const normalizedRazonSocial = String(tx.razon_social || tenantConfig.razonSocial || tenantConfig.razon_social || '').trim();

  return {
    identificationType: normalizedRuc.length === 13 ? '04' : normalizedRuc.length === 10 ? '05' : '06',
    identification: normalizedRuc,
    legalName: normalizedRazonSocial,
    email: customerEmail,
    address: String(
      tenantConfig.facturacionDireccion
        || tenantConfig.direccionMatriz
        || tenantConfig.direccion
        || ''
    ).trim(),
    phone: String(tenantConfig.telefono || tenantConfig.phone || '').trim(),
  };
}

function resolveVatRate(base, iva) {
  if (base <= 0 || iva <= 0) return 0;
  const calculated = Math.round((iva / base) * 100);
  return [5, 8, 12, 15].includes(calculated) ? calculated : 15;
}

function buildInvoicePayload(tx) {
  const customer = resolveCustomerIdentity(tx);
  const tenantConfig = safeJson(tx.tenant_configuracion);
  const planName = tx.plan_nombre || tx.plan_id || 'Suscripcion SKNOMINA';
  const productCode = `SKNOMINA-${String(tx.plan_id || 'PLAN').slice(0, 30)}`;
  const productDescription = `Servicio SaaS SKNOMINA - ${planName}`;
  const amount = centsToUsd(tx.monto_centavos);
  const baseGravada = centsToUsd(tx.base_gravada_centavos);
  const baseNoGravada = centsToUsd(tx.base_no_gravada_centavos);
  const iva = centsToUsd(tx.iva_centavos);

  const items = [];
  if (baseGravada > 0) {
    items.push({
      code: productCode,
      description: productDescription,
      quantity: 1,
      unitPrice: baseGravada,
      discount: 0,
      vatRate: resolveVatRate(baseGravada, iva),
    });
  }
  if (baseNoGravada > 0) {
    items.push({
      code: `${productCode}-0`,
      description: `${productDescription} - tarifa 0%`,
      quantity: 1,
      unitPrice: baseNoGravada,
      discount: 0,
      vatRate: 0,
    });
  }
  if (items.length === 0) {
    items.push({
      code: productCode,
      description: productDescription,
      quantity: 1,
      unitPrice: amount,
      discount: 0,
      vatRate: 0,
    });
  }

  const invoice = {
    externalReference: buildExternalReference(tx),
    customer,
    invoice: {
      issueDate: new Date().toISOString().slice(0, 10),
      currency: tx.moneda || 'USD',
      items,
      payments: [{ method: '20', amount, term: 0, timeUnit: 'dias' }],
      metadata: {
        tenantId: tx.tenant_id,
        paymentTransactionId: tx.id,
        planCode: tx.plan_id,
        billingPeriod: String(tx.periodo_facturacion || tx.created_at || '').slice(0, 7),
        provider: tx.proveedor,
        product: productDescription,
        productCode,
        contractVersion: 'SNF26R1',
        emissionPointId:
          Number.parseInt(
            process.env.SINKRONET_FACTURADOR_EMISSION_POINT_ID
              || tenantConfig.facturadorEmissionPointId
              || tenantConfig.emissionPointId
              || tenantConfig.puntoEmisionId
              || '',
            10
          ) || undefined,
      },
    },
  };

  return { customer, invoice };
}

function validateInvoicePrerequisites(tx, readiness) {
  const errors = [...readiness.blockers];
  if (!tx) errors.push('No encontramos la transaccion de pago aprobada.');
  if (tx && tx.estado !== 'APPROVED') errors.push('La transaccion aun no esta aprobada.');
  if (tx && Number(tx.monto_centavos || 0) <= 0) errors.push('La transaccion no tiene valor facturable.');
  const tenantConfig = safeJson(tx?.tenant_configuracion);
  const tenantRuc = String(tx?.ruc || tenantConfig.ruc || '').replace(/\D/g, '');
  const tenantRazonSocial = String(tx?.razon_social || tenantConfig.razonSocial || tenantConfig.razon_social || '').trim();
  const tenantDireccion = String(
    tenantConfig.facturacionDireccion
      || tenantConfig.direccionMatriz
      || tenantConfig.direccion
      || ''
  ).trim();
  if (tx && !tenantRuc) errors.push('Falta el RUC de la empresa para facturar.');
  if (tx && !tenantRazonSocial) errors.push('Falta la razon social de la empresa para facturar.');
  if (tx && !tenantDireccion) errors.push('Falta la direccion fiscal de la empresa para facturar.');
  return errors;
}

async function fetchTransactionForInvoice({ tenantId, paymentTransactionId }) {
  const result = await db.query(
    `SELECT tr.*, p.nombre AS plan_nombre, t.ruc, t.razon_social, t.configuracion AS tenant_configuracion
     FROM transacciones_pago tr
     JOIN tenants t ON t.id = tr.tenant_id
     LEFT JOIN planes_comerciales p ON p.id = tr.plan_id
     WHERE tr.tenant_id = $1 AND tr.id = $2
     LIMIT 1`,
    [tenantId, paymentTransactionId]
  );
  return result.rows[0] || null;
}

async function upsertFiscalRequest({
  tenantId,
  tx,
  status,
  customer,
  invoice,
  userId,
  lastError = '',
  metadata = {},
}) {
  const result = await db.query(
    `INSERT INTO fiscal_invoice_requests (
      tenant_id, payment_transaction_id, external_reference, idempotency_key,
      status, customer_payload, invoice_payload, last_error, requested_by,
      requested_at, attempts, metadata
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),1,$10)
    ON CONFLICT (tenant_id, external_reference) DO UPDATE SET
      status = EXCLUDED.status,
      customer_payload = EXCLUDED.customer_payload,
      invoice_payload = EXCLUDED.invoice_payload,
      last_error = EXCLUDED.last_error,
      requested_by = COALESCE(EXCLUDED.requested_by, fiscal_invoice_requests.requested_by),
      requested_at = NOW(),
      attempts = fiscal_invoice_requests.attempts + 1,
      metadata = fiscal_invoice_requests.metadata || EXCLUDED.metadata,
      updated_at = NOW()
    RETURNING *`,
    [
      tenantId,
      tx?.id || null,
      buildExternalReference(tx || {}),
      buildIdempotencyKey(tx || {}),
      status,
      JSON.stringify(customer || {}),
      JSON.stringify(invoice || {}),
      lastError,
      userId || null,
      JSON.stringify(metadata),
    ]
  );
  return normalizeFiscalInvoiceRow(result.rows[0]);
}

async function updateFiscalRequestFromFacturador({ tenantId, externalReference, facturador, lastError = '' }) {
  const authorizedAt = facturador.status === 'invoice_authorized' ? 'NOW()' : 'NULL';
  const rejectedAt = facturador.status === 'invoice_rejected' ? 'NOW()' : 'NULL';
  const result = await db.query(
    `UPDATE fiscal_invoice_requests
     SET status = $3,
         facturador_request_id = NULLIF($4, ''),
         invoice_number = NULLIF($5, ''),
         access_key = NULLIF($6, ''),
         ride_url = NULLIF($7, ''),
         xml_url = NULLIF($8, ''),
         last_error = $9,
         authorized_at = COALESCE(${authorizedAt}, authorized_at),
         rejected_at = COALESCE(${rejectedAt}, rejected_at),
         metadata = metadata || $10::jsonb,
         updated_at = NOW()
     WHERE tenant_id = $1 AND external_reference = $2
     RETURNING *`,
    [
      tenantId,
      externalReference,
      facturador.status,
      facturador.facturadorRequestId,
      facturador.invoiceNumber,
      facturador.accessKey,
      facturador.rideUrl,
      facturador.xmlUrl,
      lastError || facturador.lastError || '',
      JSON.stringify({ facturadorResponse: facturador.raw || {} }),
    ]
  );
  return normalizeFiscalInvoiceRow(result.rows[0]);
}

async function getFiscalStatus({ tenantId }) {
  const readiness = getFacturadorReadiness();
  const countsResult = await db.query(
    `SELECT status, COUNT(*)::int AS total
     FROM fiscal_invoice_requests
     WHERE tenant_id = $1
     GROUP BY status`,
    [tenantId]
  );
  const totals = countsResult.rows.reduce((acc, row) => ({ ...acc, [row.status]: Number(row.total || 0) }), {});
  return {
    readiness,
    totals,
    ready: readiness.ready,
  };
}

async function listFiscalInvoices({ tenantId }) {
  const result = await db.query(
    `SELECT *
     FROM fiscal_invoice_requests
     WHERE tenant_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [tenantId]
  );
  return result.rows.map(normalizeFiscalInvoiceRow);
}

async function requestInvoiceForTransaction({ tenantId, paymentTransactionId, userId = null, correlationId }) {
  const tx = await fetchTransactionForInvoice({ tenantId, paymentTransactionId });
  const readiness = getFacturadorReadiness();
  const blockers = validateInvoicePrerequisites(tx, readiness);

  if (!tx) {
    throw new AppError('No encontramos la transaccion para emitir factura.', {
      code: 'FACTURA_TRANSACCION_NO_ENCONTRADA',
      statusCode: 404,
      correlationId,
      userId,
    });
  }

  const { customer, invoice } = buildInvoicePayload(tx);
  const externalReference = buildExternalReference(tx);

  if (blockers.length > 0) {
    return upsertFiscalRequest({
      tenantId,
      tx,
      status: 'blocked',
      customer,
      invoice,
      userId,
      lastError: blockers.join(' '),
      metadata: { blockers, readiness },
    });
  }

  await upsertFiscalRequest({
    tenantId,
    tx,
    status: 'invoice_requested',
    customer,
    invoice,
    userId,
    metadata: { readiness },
  });

  try {
    const facturadorResponse = await requestFiscalInvoice(invoice, {
      idempotencyKey: buildIdempotencyKey(tx),
      correlationId,
      userId,
    });
    return updateFiscalRequestFromFacturador({
      tenantId,
      externalReference,
      facturador: extractFacturadorReference(facturadorResponse),
    });
  } catch (err) {
    logger.error({
      code: err.code || 'FACTURADOR_REQUEST_FAILED',
      statusCode: err.statusCode || 502,
      correlationId,
      userId,
      tenantId,
      paymentTransactionId,
    }, err.message);
    return updateFiscalRequestFromFacturador({
      tenantId,
      externalReference,
      facturador: {
        status: err.code === 'FACTURADOR_NO_CONFIGURADO'
          ? 'blocked'
          : Number(err.statusCode || 500) >= 500
            ? 'failed'
            : 'invoice_rejected',
        facturadorRequestId: '',
        invoiceNumber: '',
        accessKey: '',
        rideUrl: '',
        xmlUrl: '',
        lastError: err.message,
        raw: { code: err.code, details: err.details || null },
      },
      lastError: err.message,
    });
  }
}

async function queueInvoiceForApprovedTransaction(approvedTx, context = {}) {
  if (!approvedTx?.id || !approvedTx?.tenant_id) return null;
  try {
    return await requestInvoiceForTransaction({
      tenantId: approvedTx.tenant_id,
      paymentTransactionId: approvedTx.id,
      userId: context.userId || approvedTx.usuario_id || null,
      correlationId: context.correlationId || 'payment-fiscal-invoice',
    });
  } catch (err) {
    logger.error({
      code: err.code || 'FACTURA_AUTOMATICA_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: context.correlationId || 'payment-fiscal-invoice',
      userId: context.userId || approvedTx.usuario_id || null,
      tenantId: approvedTx.tenant_id,
      paymentTransactionId: approvedTx.id,
    }, err.message || 'No se pudo registrar la factura automatica');
    return null;
  }
}

async function processFacturadorWebhook({ payload, rawPayload, signature, correlationId }) {
  verifyFacturadorWebhookSignature(rawPayload || JSON.stringify(payload || {}), signature);

  const eventPayload = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
  const idempotencyKey = String(eventPayload.idempotencyKey || eventPayload.idempotency_key || '').trim();
  const tenantId = String(eventPayload.tenantId || eventPayload.tenant_id || '').trim();
  const externalReference = String(
    eventPayload.referenciaExterna || eventPayload.externalReference || eventPayload.external_reference || ''
  ).trim();

  if (!idempotencyKey && (!tenantId || !externalReference)) {
    throw new AppError('El webhook fiscal no trae referencia suficiente para conciliar.', {
      code: 'FACTURADOR_WEBHOOK_REFERENCIA_INVALIDA',
      statusCode: 400,
      correlationId,
    });
  }

  const facturador = extractFacturadorReference(eventPayload);
  const result = await db.query(
    `UPDATE fiscal_invoice_requests
     SET status = $3,
         facturador_request_id = COALESCE(NULLIF($4, ''), facturador_request_id),
         invoice_number = COALESCE(NULLIF($5, ''), invoice_number),
         access_key = COALESCE(NULLIF($6, ''), access_key),
         ride_url = COALESCE(NULLIF($7, ''), ride_url),
         xml_url = COALESCE(NULLIF($8, ''), xml_url),
         last_error = $9,
         authorized_at = CASE WHEN $3 = 'invoice_authorized' THEN NOW() ELSE authorized_at END,
         rejected_at = CASE WHEN $3 = 'invoice_rejected' THEN NOW() ELSE rejected_at END,
         metadata = metadata || $10::jsonb,
         updated_at = NOW()
     WHERE (idempotency_key = $1)
        OR (tenant_id = NULLIF($2, '')::uuid AND external_reference = $11)
     RETURNING *`,
    [
      idempotencyKey,
      tenantId,
      facturador.status,
      facturador.facturadorRequestId,
      facturador.invoiceNumber,
      facturador.accessKey,
      facturador.rideUrl,
      facturador.xmlUrl,
      facturador.lastError,
      JSON.stringify({ facturadorWebhook: payload, facturadorEventId: payload?.id || null }),
      externalReference,
    ]
  );

  if (result.rows.length === 0) {
    throw new AppError('No encontramos una solicitud fiscal para conciliar este webhook.', {
      code: 'FACTURADOR_WEBHOOK_NO_CONCILIADO',
      statusCode: 404,
      correlationId,
    });
  }

  return normalizeFiscalInvoiceRow(result.rows[0]);
}

function normalizeFiscalInvoiceRow(row = {}) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    paymentTransactionId: row.payment_transaction_id,
    externalReference: row.external_reference,
    idempotencyKey: row.idempotency_key,
    status: row.status,
    customer: row.customer_payload || {},
    invoice: row.invoice_payload || {},
    facturadorRequestId: row.facturador_request_id,
    invoiceNumber: row.invoice_number,
    accessKey: row.access_key,
    rideUrl: row.ride_url,
    xmlUrl: row.xml_url,
    lastError: row.last_error || '',
    attempts: Number(row.attempts || 0),
    requestedAt: row.requested_at,
    authorizedAt: row.authorized_at,
    rejectedAt: row.rejected_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const RETRY_MAX_ATTEMPTS = 5;
const RETRY_BACKOFF_HOURS = 1;

async function retryPendingInvoices(correlationId = 'cron-fiscal-invoice-retry') {
  const readiness = getFacturadorReadiness();
  if (!readiness.ready) {
    logger.info({
      code: 'CRON_FISCAL_INVOICE_RETRY_SKIPPED',
      correlationId,
    }, 'Reintentos de facturacion omitidos: facturador no configurado');
    return { retried: 0, skippedReason: 'facturador_not_ready' };
  }

  const result = await db.query(
    `SELECT fir.*, tr.tenant_id AS tx_tenant_id
     FROM fiscal_invoice_requests fir
     LEFT JOIN transacciones_pago tr ON tr.id = fir.payment_transaction_id
     WHERE fir.status IN ('blocked', 'failed')
       AND fir.attempts < $1
       AND fir.payment_transaction_id IS NOT NULL
       AND fir.updated_at < NOW() - INTERVAL '${RETRY_BACKOFF_HOURS} hours'
     ORDER BY fir.attempts ASC, fir.updated_at ASC
     LIMIT 20`,
    [RETRY_MAX_ATTEMPTS]
  );

  const retried = [];
  for (const row of result.rows) {
    const tenantId = row.tenant_id || row.tx_tenant_id;
    if (!tenantId || !row.payment_transaction_id) continue;

    try {
      const invoice = await requestInvoiceForTransaction({
        tenantId,
        paymentTransactionId: row.payment_transaction_id,
        userId: null,
        correlationId,
      });

      logger.info({
        code: 'CRON_FISCAL_INVOICE_RETRY',
        correlationId,
        tenantId,
        externalReference: row.external_reference,
        attempt: row.attempts + 1,
        resultStatus: invoice?.status || 'unknown',
      }, `Reintento de factura fiscal #${row.attempts + 1}`);

      retried.push({
        tenantId,
        externalReference: row.external_reference,
        attempt: row.attempts + 1,
        resultStatus: invoice?.status || 'unknown',
      });
    } catch (err) {
      logger.error({
        code: err.code || 'CRON_FISCAL_INVOICE_RETRY_ERROR',
        statusCode: err.statusCode || 500,
        correlationId,
        tenantId,
        userId: null,
        externalReference: row.external_reference,
      }, err.message || 'Error reintentando factura fiscal');
    }
  }

  return { retried: retried.length, details: retried };
}

module.exports = {
  buildInvoicePayload,
  getFiscalStatus,
  listFiscalInvoices,
  processFacturadorWebhook,
  queueInvoiceForApprovedTransaction,
  requestInvoiceForTransaction,
  retryPendingInvoices,
};
