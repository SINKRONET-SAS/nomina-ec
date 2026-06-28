const db = require('../config/database');
const { buildPayphoneAmounts, formatUsdFromCents } = require('../services/paymentPricingService');
const { getTenantPlanCapabilities } = require('../services/planCapabilityService');
const { buildSubscriptionPaymentReference } = require('../services/paymentReferenceService');
const {
  assertPayPhoneConfig,
  confirmPayPhonePayment,
  createPayPhonePayment,
  isPayPhoneMockMode,
  resolveBackendPublicUrl,
} = require('../services/payphoneGatewayService');

function normalizePlan(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    precioMensualCentavos: row.precio_mensual_centavos,
    precioMensual: Number(row.precio_mensual_centavos || 0) / 100,
    moneda: row.moneda,
    empleadosMax: row.empleados_max,
    empresasMax: row.empresas_max,
    usuariosMax: row.usuarios_max,
    archivosBancarios: row.archivos_bancarios,
    reportesAvanzados: row.reportes_avanzados,
    soporte: row.soporte,
    publico: row.publico,
    activo: row.activo,
    orden: row.orden,
    metadata: row.metadata || {},
  };
}

async function listPublicPlans(_req, res, next) {
  try {
    const result = await db.query(
      `SELECT *
       FROM planes_comerciales
       WHERE publico = true AND activo = true
       ORDER BY orden ASC, precio_mensual_centavos ASC`
    );

    res.json({
      success: true,
      data: result.rows.map(normalizePlan),
      paymentCapabilities: buildPaymentCapabilities(),
    });
  } catch (err) {
    next(err);
  }
}

async function listAdminPlans(_req, res, next) {
  try {
    const result = await db.query(
      'SELECT * FROM planes_comerciales ORDER BY orden ASC, id ASC'
    );

    res.json({
      success: true,
      data: result.rows.map(normalizePlan),
    });
  } catch (err) {
    next(err);
  }
}

function validatePlanPayload(body) {
  const id = String(body.id || '').trim().toUpperCase();
  const nombre = String(body.nombre || '').trim();
  const precioMensualCentavos = Math.max(0, Math.round(Number(body.precioMensualCentavos || 0)));

  if (!id || !/^[A-Z0-9_]{3,40}$/.test(id)) {
    const err = new Error('Identificador de plan inválido.');
    err.code = 'PLAN_ID_INVALIDO';
    err.statusCode = 400;
    throw err;
  }

  if (!nombre) {
    const err = new Error('El nombre del plan es requerido.');
    err.code = 'PLAN_NOMBRE_REQUERIDO';
    err.statusCode = 400;
    throw err;
  }

  return {
    id,
    nombre,
    descripcion: String(body.descripcion || ''),
    precioMensualCentavos,
    empleadosMax: body.empleadosMax === null || body.empleadosMax === undefined
      ? null
      : Math.max(0, Math.round(Number(body.empleadosMax))),
    empresasMax: Math.max(1, Math.round(Number(body.empresasMax || 1))),
    usuariosMax: Math.max(1, Math.round(Number(body.usuariosMax || 3))),
    archivosBancarios: Boolean(body.archivosBancarios),
    reportesAvanzados: Boolean(body.reportesAvanzados),
    soporte: String(body.soporte || 'comunidad'),
    publico: body.publico !== false,
    activo: body.activo !== false,
    orden: Math.round(Number(body.orden || 0)),
    metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
  };
}

async function upsertPlan(req, res, next) {
  try {
    const payload = validatePlanPayload({ ...req.body, id: req.params.planId || req.body.id });
    const existing = await db.query('SELECT * FROM planes_comerciales WHERE id = $1', [payload.id]);
    if (existing.rows.length > 0 && req.params.planId) {
      const activeSubscriptions = await db.query(
        "SELECT COUNT(*)::int AS total FROM suscripciones WHERE plan_id = $1 AND estado IN ('active','trial')",
        [payload.id]
      );
      const hasActiveSubscribers = Number(activeSubscriptions.rows[0]?.total || 0) > 0;
      if (hasActiveSubscribers && req.body.forceInPlace !== true) {
        const versionedPayload = {
          ...payload,
          id: buildVersionedCommercialPlanId(payload.id),
          metadata: {
            ...payload.metadata,
            rootPlanId: payload.id,
            previousPlanId: payload.id,
            versionedFromActiveSubscriptions: true,
            versionedAt: new Date().toISOString(),
          },
        };
        const versioned = await insertCommercialPlan(versionedPayload);
        await db.query(
          'UPDATE planes_comerciales SET publico = false, updated_at = NOW() WHERE id = $1',
          [payload.id]
        );
        return res.status(201).json({
          success: true,
          data: normalizePlan(versioned.rows[0]),
          meta: {
            versioned: true,
            previousPlanId: payload.id,
            activeSubscriptions: Number(activeSubscriptions.rows[0]?.total || 0),
          },
        });
      }
    }

    const result = await db.query(
      `INSERT INTO planes_comerciales (
        id, nombre, descripcion, precio_mensual_centavos, empleados_max, empresas_max,
        usuarios_max, archivos_bancarios, reportes_avanzados, soporte, publico, activo, orden, metadata
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (id) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        descripcion = EXCLUDED.descripcion,
        precio_mensual_centavos = EXCLUDED.precio_mensual_centavos,
        empleados_max = EXCLUDED.empleados_max,
        empresas_max = EXCLUDED.empresas_max,
        usuarios_max = EXCLUDED.usuarios_max,
        archivos_bancarios = EXCLUDED.archivos_bancarios,
        reportes_avanzados = EXCLUDED.reportes_avanzados,
        soporte = EXCLUDED.soporte,
        publico = EXCLUDED.publico,
        activo = EXCLUDED.activo,
        orden = EXCLUDED.orden,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING *`,
      [
        payload.id,
        payload.nombre,
        payload.descripcion,
        payload.precioMensualCentavos,
        payload.empleadosMax,
        payload.empresasMax,
        payload.usuariosMax,
        payload.archivosBancarios,
        payload.reportesAvanzados,
        payload.soporte,
        payload.publico,
        payload.activo,
        payload.orden,
        JSON.stringify(payload.metadata),
      ]
    );

    res.status(req.params.planId ? 200 : 201).json({
      success: true,
      data: normalizePlan(result.rows[0]),
    });
  } catch (err) {
    next(err);
  }
}

function buildVersionedCommercialPlanId(rootPlanId) {
  const root = String(rootPlanId || '').trim().toUpperCase().slice(0, 26);
  const suffix = String(Date.now()).slice(-10);
  return `${root}_V${suffix}`;
}

function insertCommercialPlan(payload) {
  return db.query(
    `INSERT INTO planes_comerciales (
      id, nombre, descripcion, precio_mensual_centavos, empleados_max, empresas_max,
      usuarios_max, archivos_bancarios, reportes_avanzados, soporte, publico, activo, orden, metadata
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    RETURNING *`,
    [
      payload.id,
      payload.nombre,
      payload.descripcion,
      payload.precioMensualCentavos,
      payload.empleadosMax,
      payload.empresasMax,
      payload.usuariosMax,
      payload.archivosBancarios,
      payload.reportesAvanzados,
      payload.soporte,
      payload.publico,
      payload.activo,
      payload.orden,
      JSON.stringify(payload.metadata),
    ]
  );
}

async function deletePlan(req, res, next) {
  try {
    const planId = String(req.params.planId || '').trim().toUpperCase();
    await db.query(
      'UPDATE planes_comerciales SET activo = false, publico = false, updated_at = NOW() WHERE id = $1',
      [planId]
    );
    res.json({ success: true, message: 'Plan desactivado correctamente.' });
  } catch (err) {
    next(err);
  }
}

async function paymentCapabilities(_req, res) {
  res.json({
    success: true,
    data: buildPaymentCapabilities(),
  });
}

async function tenantCapabilities(req, res, next) {
  try {
    const capabilities = await getTenantPlanCapabilities(req.usuario.tenantId);
    res.json({ success: true, data: capabilities, correlationId: req.correlationId });
  } catch (err) {
    next(err);
  }
}

async function listPaymentMethods(req, res, next) {
  try {
    const result = await db.query(
      `SELECT * FROM metodos_pago
       WHERE tenant_id = $1
       ORDER BY es_principal DESC, created_at DESC`,
      [req.usuario.tenantId]
    );

    res.json({
      success: true,
      data: {
        items: result.rows.map((row) => ({
          id: row.id,
          provider: row.proveedor,
          status: row.estado,
          isDefault: row.es_principal,
          details: row.metadata || {},
        })),
        capabilities: {
          supportedProviders: ['PAYPHONE'],
          supportsRevoke: true,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

async function subscriptionStatus(req, res, next) {
  try {
    const result = await db.query(
      `SELECT s.*, p.nombre AS plan_nombre, p.precio_mensual_centavos
       FROM suscripciones s
       JOIN planes_comerciales p ON p.id = s.plan_id
       WHERE s.tenant_id = $1`,
      [req.usuario.tenantId]
    );

    res.json({
      success: true,
      data: result.rows[0] ? {
        planId: result.rows[0].plan_id,
        planNombre: result.rows[0].plan_nombre,
        estado: result.rows[0].estado,
        venceEn: result.rows[0].vence_en,
        precioMensualCentavos: result.rows[0].precio_mensual_centavos,
      } : null,
    });
  } catch (err) {
    next(err);
  }
}

function buildPaymentCapabilities() {
  const paymentProvider = String(process.env.PAYMENT_PROVIDER || 'payphone').trim().toLowerCase();
  if (paymentProvider === 'stripe') {
    const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
    return {
      supportsMultiple: false,
      provider: 'STRIPE',
      supportedProviders: ['STRIPE', 'PAYPHONE'],
      supportsManualEntry: false,
      supportsDefaultSwitch: false,
      supportsRevoke: true,
      mockMode: false,
      checkoutAvailable: false,
      providerConfigured: stripeConfigured,
      publicCallbackConfigured: Boolean(resolveBackendPublicUrl()),
      status: 'blocked_configuration',
      blockedReason: stripeConfigured
        ? 'Stripe esta declarado, pero el checkout Stripe aun no esta habilitado en este backend.'
        : 'Stripe requiere STRIPE_SECRET_KEY y STRIPE_WEBHOOK_SECRET antes de habilitar cobro real.',
    };
  }

  const mockMode = isPayPhoneMockMode();
  let configOk = true;
  let configError = '';
  try {
    assertPayPhoneConfig();
  } catch (err) {
    configOk = false;
    configError = err.publicMessage || err.message;
  }
  const checkoutAvailable = !mockMode && configOk;

  return {
    supportsMultiple: false,
    provider: 'PAYPHONE',
    supportedProviders: ['PAYPHONE'],
    supportsManualEntry: false,
    supportsDefaultSwitch: false,
    supportsRevoke: true,
    mockMode,
    checkoutAvailable,
    providerConfigured: checkoutAvailable,
    publicCallbackConfigured: Boolean(resolveBackendPublicUrl()),
    status: checkoutAvailable ? 'ready' : 'blocked_configuration',
    blockedReason: checkoutAvailable ? '' : (mockMode ? 'PayPhone esta en modo mock.' : configError || 'PayPhone no esta configurado para cobro real.'),
  };
}

async function createCheckoutIntent(req, res, next) {
  try {
    const capabilities = buildPaymentCapabilities();
    if (!capabilities.checkoutAvailable) {
      return res.status(503).json({
        error: 'PAYPHONE_NO_CONFIGURADO',
        message: capabilities.blockedReason || 'PayPhone no esta configurado para cobro real.',
        correlationId: req.correlationId,
        capabilities,
      });
    }

    const planId = String(req.body.planId || '').trim().toUpperCase();
    const planResult = await db.query(
      'SELECT * FROM planes_comerciales WHERE id = $1 AND activo = true',
      [planId]
    );

    if (planResult.rows.length === 0) {
      return res.status(404).json({
        error: 'PLAN_NO_ENCONTRADO',
        message: 'El plan seleccionado no existe o no está activo.',
        correlationId: req.correlationId,
      });
    }

    const plan = planResult.rows[0];
    const amounts = buildPayphoneAmounts(plan.precio_mensual_centavos);
    const clientTransactionId = buildSubscriptionPaymentReference({
      tenantId: req.usuario.tenantId,
      userId: req.usuario.id,
      planId: plan.id,
    });
    const gatewayResult = await createPayPhonePayment({
      amounts,
      reference: clientTransactionId,
    });
    const checkoutUrl = gatewayResult.paymentUrl || gatewayResult.paymentUrlWeb || gatewayResult.payWithCard;
    if (!checkoutUrl) {
      return res.status(502).json({
        error: 'PAYPHONE_CHECKOUT_URL_INVALIDA',
        message: 'PayPhone no devolvio una URL de checkout valida.',
        correlationId: req.correlationId,
      });
    }

    const insertResult = await db.query(
      `INSERT INTO transacciones_pago (
        tenant_id, usuario_id, plan_id, proveedor, estado, monto_centavos,
        base_gravada_centavos, base_no_gravada_centavos, iva_centavos,
        moneda, client_transaction_id, checkout_url, metadata
      )
      VALUES ($1,$2,$3,'PAYPHONE','PENDING',$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *`,
      [
        req.usuario.tenantId,
        req.usuario.id,
        plan.id,
        amounts.montoCentavos,
        amounts.baseGravadaCentavos,
        amounts.baseNoGravadaCentavos,
        amounts.ivaCentavos,
        amounts.moneda,
        clientTransactionId,
        checkoutUrl,
        JSON.stringify({
          planNombre: plan.nombre,
          ivaPercent: amounts.ivaPercent,
          gateway: {
            provider: 'PAYPHONE',
            payWithCard: gatewayResult.payWithCard || null,
            payWithPayPhone: gatewayResult.payWithPayPhone || null,
          },
        }),
      ]
    );

    res.status(201).json({
      success: true,
      data: {
        id: insertResult.rows[0].id,
        provider: 'PAYPHONE',
        checkoutUrl,
        clientTransactionId,
        planId: plan.id,
        planNombre: plan.nombre,
        montoCentavos: amounts.montoCentavos,
        totalDisplay: formatUsdFromCents(amounts.montoCentavos),
        payphonePayload: {
          amount: amounts.montoCentavos,
          amountWithTax: amounts.baseGravadaCentavos,
          amountWithoutTax: amounts.baseNoGravadaCentavos,
          tax: amounts.ivaCentavos,
          clientTransactionId,
          storeId: process.env.PAYPHONE_STORE_ID || null,
        },
        gateway: {
          payWithCard: gatewayResult.payWithCard || null,
          payWithPayPhone: gatewayResult.payWithPayPhone || null,
          paymentUrlMobile: gatewayResult.paymentUrlMobile || checkoutUrl,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

function extractProviderPaymentTotalCents(paymentPayload = {}) {
  const value = paymentPayload.amount
    ?? paymentPayload.totalAmount
    ?? paymentPayload.total
    ?? paymentPayload.value
    ?? paymentPayload.amountWithTax;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
}

async function resolveProviderConfirmation({ req, tx, clientTransactionId }) {
  const providerId = req.body.id || req.query.id || req.body.transactionId || req.query.transactionId || req.body.providerTransactionId;
  const mockRequested = String(req.body.mock || req.query.mock || '').toLowerCase() === 'true';
  if (mockRequested && isPayPhoneMockMode()) {
    return {
      providerTransactionId: `mock-${clientTransactionId}`,
      payload: { amount: Number(tx.monto_centavos || 0), mock: true },
      source: 'PAYPHONE_MOCK',
    };
  }

  const payload = await confirmPayPhonePayment({ id: providerId, clientTxId: clientTransactionId });
  return {
    providerTransactionId: String(payload?.transactionId || payload?.id || providerId || ''),
    payload,
    source: 'PAYPHONE_CONFIRM',
  };
}

async function activateSubscriptionForTransaction(approvedTx, confirmation = {}) {
  await db.query(
    `INSERT INTO suscripciones (tenant_id, plan_id, estado, inicio_en, renovacion_automatica, metadata)
     VALUES ($1, $2, 'active', NOW(), true, $3)
     ON CONFLICT (tenant_id) DO UPDATE SET
       plan_id = EXCLUDED.plan_id,
       estado = 'active',
       renovacion_automatica = true,
       metadata = EXCLUDED.metadata,
       updated_at = NOW()`,
    [
      approvedTx.tenant_id,
      approvedTx.plan_id,
      JSON.stringify({
        activatedByPayment: approvedTx.client_transaction_id,
        providerTransactionId: approvedTx.provider_transaction_id || confirmation.providerTransactionId || null,
        confirmationSource: confirmation.source || 'PAYPHONE_CONFIRM',
      }),
    ]
  );
}

async function markTransactionApproved({ clientTransactionId, providerTransactionId = null, payload = {}, source = 'PAYPHONE_CONFIRM' }) {
  const result = await db.query(
    `UPDATE transacciones_pago
     SET estado = 'APPROVED',
         provider_transaction_id = COALESCE($2, provider_transaction_id),
         metadata = metadata || $3::jsonb,
         updated_at = NOW()
     WHERE client_transaction_id = $1
     RETURNING *`,
    [
      clientTransactionId,
      providerTransactionId || null,
      JSON.stringify({
        confirmationSource: source,
        providerPayload: payload,
      }),
    ]
  );
  const approvedTx = result.rows[0];
  await activateSubscriptionForTransaction(approvedTx, { providerTransactionId, source });
  return approvedTx;
}

async function confirmPayment(req, res, next) {
  try {
    const clientTransactionId = String(
      req.body.clientTransactionId || req.query.clientTransactionId || req.body.clientTxId || req.query.clientTxId || ''
    ).trim();

    if (!clientTransactionId) {
      return res.status(400).json({
        error: 'PAYPHONE_REFERENCIA_REQUERIDA',
        message: 'La referencia de transacción es requerida.',
        correlationId: req.correlationId,
      });
    }

    const txResult = await db.query(
      'SELECT * FROM transacciones_pago WHERE client_transaction_id = $1 LIMIT 1',
      [clientTransactionId]
    );

    if (txResult.rows.length === 0) {
      return res.status(404).json({
        error: 'PAGO_NO_ENCONTRADO',
        message: 'No se encontró la transacción de pago.',
        correlationId: req.correlationId,
      });
    }

    const tx = txResult.rows[0];
    if (tx.estado === 'APPROVED') {
      return res.json({
        success: true,
        data: {
          clientTransactionId,
          status: 'APPROVED',
          idempotent: true,
        },
      });
    }

    const confirmation = await resolveProviderConfirmation({ req, tx, clientTransactionId });
    const providerTotalCents = extractProviderPaymentTotalCents(confirmation.payload);
    if (providerTotalCents > 0 && providerTotalCents !== Number(tx.monto_centavos || 0)) {
      return res.status(409).json({
        error: 'PAYMENT_AMOUNT_MISMATCH',
        message: 'El monto confirmado por PayPhone no coincide con el checkout esperado. No se activo el plan.',
        correlationId: req.correlationId,
      });
    }

    await markTransactionApproved({
        clientTransactionId,
        providerTransactionId: confirmation.providerTransactionId,
        payload: confirmation.payload,
        source: confirmation.source,
    });

    res.json({
      success: true,
      data: {
        clientTransactionId,
        status: 'APPROVED',
      },
    });
  } catch (err) {
    next(err);
  }
}

async function payphoneWebhook(req, res, next) {
  try {
    const payload = req.body || {};
    const clientTransactionId = String(
      payload.clientTransactionId || payload.client_transaction_id || payload.clientTxId || ''
    ).trim();
    const statusCode = Number(payload.statusCode ?? payload.status_code ?? payload.status);
    const providerTransactionId = String(payload.transactionId || payload.id || payload.providerTransactionId || '').trim();

    if (!clientTransactionId) {
      return res.status(400).json({
        error: 'PAYPHONE_REFERENCIA_REQUERIDA',
        message: 'La referencia de transaccion es requerida.',
        correlationId: req.correlationId,
      });
    }

    if (statusCode !== 3) {
      return res.json({
        success: true,
        received: true,
        processed: false,
        reason: 'PAYPHONE_STATUS_NOT_APPROVED',
        correlationId: req.correlationId,
      });
    }

    const txResult = await db.query(
      'SELECT * FROM transacciones_pago WHERE client_transaction_id = $1 LIMIT 1',
      [clientTransactionId]
    );
    if (txResult.rows.length === 0) {
      return res.status(404).json({
        error: 'PAGO_NO_ENCONTRADO',
        message: 'No se encontro la transaccion de pago.',
        correlationId: req.correlationId,
      });
    }

    const tx = txResult.rows[0];
    if (tx.estado === 'APPROVED') {
      return res.json({
        success: true,
        received: true,
        processed: false,
        idempotent: true,
        correlationId: req.correlationId,
      });
    }

    const providerTotalCents = extractProviderPaymentTotalCents(payload);
    if (providerTotalCents > 0 && providerTotalCents !== Number(tx.monto_centavos || 0)) {
      return res.status(409).json({
        error: 'PAYMENT_AMOUNT_MISMATCH',
        message: 'El monto confirmado por PayPhone no coincide con el checkout esperado. No se activo el plan.',
        correlationId: req.correlationId,
      });
    }

    await markTransactionApproved({
      clientTransactionId,
      providerTransactionId,
      payload,
      source: 'PAYPHONE_WEBHOOK',
    });

    return res.json({
      success: true,
      received: true,
      processed: true,
      correlationId: req.correlationId,
    });
  } catch (err) {
    return next(err);
  }
}

async function paymentCancelled(req, res) {
  res.status(200).send(`<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pago cancelado</title></head>
<body style="font-family:Arial,sans-serif;padding:32px;text-align:center;color:#243042">
  <h1>Pago cancelado</h1>
  <p>No se activo ningun plan. Puedes cerrar esta ventana y volver a SKNOMINA.</p>
</body>
</html>`);
}

async function paymentReturn(req, res) {
  const clientTransactionId = String(req.query.clientTransactionId || req.query.clientTxId || '').trim();
  res.status(200).send(`<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pago recibido</title></head>
<body style="font-family:Arial,sans-serif;padding:32px;text-align:center;color:#243042">
  <h1>Pago recibido</h1>
  <p>SKNOMINA registro el retorno del proveedor. La activacion del plan se procesa solo con confirmacion segura POST o webhook.</p>
  <p style="font-family:monospace;background:#f1f5f9;padding:12px;border-radius:8px">${escapeHtml(clientTransactionId || 'sin referencia')}</p>
</body>
</html>`);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function revokePaymentMethod(req, res, next) {
  try {
    await db.query(
      `UPDATE metodos_pago
       SET estado = 'REVOKED', updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2`,
      [req.usuario.tenantId, req.params.paymentMethodId]
    );
    res.json({ success: true, message: 'Método de pago revocado.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  buildPaymentCapabilities,
  listPublicPlans,
  listAdminPlans,
  upsertPlan,
  deletePlan,
  paymentCapabilities,
  tenantCapabilities,
  listPaymentMethods,
  subscriptionStatus,
  createCheckoutIntent,
  confirmPayment,
  paymentReturn,
  payphoneWebhook,
  paymentCancelled,
  revokePaymentMethod,
};
