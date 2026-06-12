const crypto = require('crypto');
const db = require('../config/database');
const { buildPayphoneAmounts, formatUsdFromCents } = require('../services/paymentPricingService');

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
    data: {
      supportsMultiple: false,
      supportedProviders: ['PAYPHONE'],
      supportsManualEntry: false,
      supportsDefaultSwitch: false,
      supportsRevoke: true,
      mockMode: String(process.env.PAYPHONE_MOCK_MODE || 'true').toLowerCase() === 'true',
    },
  });
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

function buildCheckoutUrl(clientTransactionId) {
  const baseUrl = process.env.PAYPHONE_BASE_URL || '';
  const confirmUrl = process.env.PAYPHONE_CONFIRM_URL || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pago/resultado`;

  if (String(process.env.PAYPHONE_MOCK_MODE || 'true').toLowerCase() === 'true' || !baseUrl) {
    return `${confirmUrl}?provider=PAYPHONE&clientTransactionId=${encodeURIComponent(clientTransactionId)}&mock=true`;
  }

  return `${baseUrl.replace(/\/$/, '')}/?clientTransactionId=${encodeURIComponent(clientTransactionId)}`;
}

async function createCheckoutIntent(req, res, next) {
  try {
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
    const clientTransactionId = `NOMINAEC-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const checkoutUrl = buildCheckoutUrl(clientTransactionId);

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
        JSON.stringify({ planNombre: plan.nombre, ivaPercent: amounts.ivaPercent }),
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
      },
    });
  } catch (err) {
    next(err);
  }
}

async function confirmPayment(req, res, next) {
  try {
    const clientTransactionId = String(
      req.body.clientTransactionId || req.query.clientTransactionId || ''
    ).trim();
    const providerTransactionId = String(
      req.body.transactionId || req.query.transactionId || req.body.providerTransactionId || ''
    ).trim() || null;

    if (!clientTransactionId) {
      return res.status(400).json({
        error: 'PAYPHONE_REFERENCIA_REQUERIDA',
        message: 'La referencia de transacción es requerida.',
        correlationId: req.correlationId,
      });
    }

    const result = await db.query(
      `UPDATE transacciones_pago
       SET estado = 'APPROVED',
           provider_transaction_id = COALESCE($2, provider_transaction_id),
           updated_at = NOW()
       WHERE client_transaction_id = $1
       RETURNING *`,
      [clientTransactionId, providerTransactionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'PAGO_NO_ENCONTRADO',
        message: 'No se encontró la transacción de pago.',
        correlationId: req.correlationId,
      });
    }

    const tx = result.rows[0];
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
        tx.tenant_id,
        tx.plan_id,
        JSON.stringify({ activatedByPayment: tx.client_transaction_id }),
      ]
    );

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
  listPublicPlans,
  listAdminPlans,
  upsertPlan,
  deletePlan,
  paymentCapabilities,
  listPaymentMethods,
  subscriptionStatus,
  createCheckoutIntent,
  confirmPayment,
  revokePaymentMethod,
};
