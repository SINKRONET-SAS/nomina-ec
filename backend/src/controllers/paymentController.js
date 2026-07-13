const db = require('../config/database');
const crypto = require('crypto');
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
const { queueInvoiceForApprovedTransaction } = require('../services/fiscalInvoiceService');
const {
  DEFAULT_TRIAL_DAYS,
  getPlanTrialDays,
  normalizePlanMetadata,
  normalizeTrialDays,
  resolveSubscriptionRuntimeState,
  withPlanTrialMetadata,
} = require('../services/planTrialService');

const MANUAL_BANK_PROVIDER = 'BANK_TRANSFER_MANUAL';
const DIRECT_PAYMENTS_ENABLED_VALUES = new Set(['1', 'true', 'yes', 'si', 'sí', 'on']);
const DIRECT_PAYMENTS_DISABLED_VALUES = new Set(['0', 'false', 'no', 'off', 'disabled', 'manual', 'manual_transfer', 'bank_transfer']);
const BILLING_PERIODS = new Set(['monthly', 'annual']);
const PRICING_INPUT_MODES = new Set(['ANNUAL_PRICE', 'MONTHLY_PAYMENT']);

function normalizeBillingPeriod(value, fallback = 'monthly') {
  const normalized = String(value || fallback || 'monthly').trim().toLowerCase();
  return BILLING_PERIODS.has(normalized) ? normalized : fallback;
}

function normalizePricingInputMode(value, fallback = 'ANNUAL_PRICE') {
  const normalized = String(value || fallback || 'ANNUAL_PRICE').trim().toUpperCase();
  return PRICING_INPUT_MODES.has(normalized) ? normalized : fallback;
}

function normalizeInstallmentCount(value, fallback = 12) {
  const parsed = Math.round(Number(value ?? fallback));
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : fallback;
}

function normalizeNominalAnnualRate(value, fallback = 0) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.round(parsed * 100) / 100;
}

function normalizeOptionalCents(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Math.round(Number(value) || 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function monthlyRateFromNominalAnnual(ratePercent) {
  return normalizeNominalAnnualRate(ratePercent) / 100 / 12;
}

function computeMonthlyInstallmentFromAnnual(annualCents, ratePercent, installments) {
  const principal = Math.max(0, Math.round(Number(annualCents) || 0));
  const months = normalizeInstallmentCount(installments);
  const monthlyRate = monthlyRateFromNominalAnnual(ratePercent);
  if (!principal) return 0;
  if (monthlyRate <= 0) return Math.round(principal / months);
  return Math.round(principal * (monthlyRate / (1 - Math.pow(1 + monthlyRate, -months))));
}

function computeAnnualCashFromMonthly(monthlyCents, ratePercent, installments) {
  const monthly = Math.max(0, Math.round(Number(monthlyCents) || 0));
  const months = normalizeInstallmentCount(installments);
  const monthlyRate = monthlyRateFromNominalAnnual(ratePercent);
  if (!monthly) return 0;
  if (monthlyRate <= 0) return Math.round(monthly * months);
  return Math.round(monthly * ((1 - Math.pow(1 + monthlyRate, -months)) / monthlyRate));
}

function resolvePaymentProvider() {
  return String(process.env.PAYMENT_PROVIDER || 'payphone').trim().toLowerCase();
}

function resolveDirectPaymentsEnabled(paymentProvider = resolvePaymentProvider()) {
  const rawFlag = process.env.DIRECT_PAYMENTS_ENABLED ?? process.env.PAYPHONE_CHECKOUT_ENABLED;
  const normalizedFlag = String(rawFlag || '').trim().toLowerCase();
  if (DIRECT_PAYMENTS_ENABLED_VALUES.has(normalizedFlag)) return true;
  if (DIRECT_PAYMENTS_DISABLED_VALUES.has(normalizedFlag)) return false;
  if (normalizedFlag) return false;
  return paymentProvider !== 'manual'
    && paymentProvider !== 'manual_transfer'
    && paymentProvider !== 'bank_transfer'
    && paymentProvider !== MANUAL_BANK_PROVIDER.toLowerCase();
}

function getPlanBillingMetadata(plan = {}) {
  const metadata = normalizePlanMetadata(plan.metadata);
  const billingPeriod = normalizeBillingPeriod(
    plan.billingPeriod ?? plan.billing_period ?? metadata.billingPeriod ?? metadata.billing_period,
    'monthly'
  );
  const pricingInputMode = normalizePricingInputMode(
    plan.pricingInputMode ?? plan.pricing_input_mode ?? metadata.pricingInputMode ?? metadata.pricing_input_mode,
    'MONTHLY_PAYMENT'
  );
  const cuotasMensuales = normalizeInstallmentCount(
    plan.cuotasMensuales ?? plan.cuotas_mensuales ?? metadata.cuotasMensuales ?? metadata.cuotas_mensuales,
    12
  );
  const tasaNominalAnual = normalizeNominalAnnualRate(
    plan.tasaNominalAnual ?? plan.tasa_nominal_anual ?? metadata.tasaNominalAnual ?? metadata.tasa_nominal_anual,
    0
  );
  const rawMonthlyCents = normalizeOptionalCents(
    plan.precioMensualCentavos ?? plan.precio_mensual_centavos ?? metadata.precioMensualCentavos
  ) ?? 0;
  const annualCandidate = plan.precioAnualCentavos
    ?? plan.precio_anual_centavos
    ?? metadata.precioAnualCentavos
    ?? metadata.precio_anual_centavos;
  const rawAnnualCents = normalizeOptionalCents(annualCandidate) ?? 0;
  let monthlyCents = rawMonthlyCents;
  let annualCents = rawAnnualCents;

  if (pricingInputMode === 'ANNUAL_PRICE') {
    annualCents = rawAnnualCents || computeAnnualCashFromMonthly(rawMonthlyCents, tasaNominalAnual, cuotasMensuales);
    monthlyCents = computeMonthlyInstallmentFromAnnual(annualCents, tasaNominalAnual, cuotasMensuales);
  } else {
    monthlyCents = rawMonthlyCents || computeMonthlyInstallmentFromAnnual(rawAnnualCents, tasaNominalAnual, cuotasMensuales);
    annualCents = computeAnnualCashFromMonthly(monthlyCents, tasaNominalAnual, cuotasMensuales);
  }

  return {
    billingPeriod,
    pricingInputMode,
    cuotasMensuales,
    tasaNominalAnual,
    precioMensualCentavos: monthlyCents,
    precioAnualCentavos: annualCents,
  };
}

function addBillingPeriod(baseDate, billingPeriod) {
  const next = new Date(baseDate);
  if (normalizeBillingPeriod(billingPeriod) === 'annual') {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

function centsFromAmount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed * 100));
}

function getPlanChargeForPeriod(plan, requestedPeriod) {
  const pricing = getPlanBillingMetadata(plan);
  const billingPeriod = normalizeBillingPeriod(requestedPeriod, pricing.billingPeriod);
  return {
    billingPeriod,
    precioCentavos: billingPeriod === 'annual'
      ? pricing.precioAnualCentavos
      : pricing.precioMensualCentavos,
  };
}

function stripVersionSuffix(planId) {
  return String(planId || '').trim().toUpperCase().replace(/(_V\d+)+$/i, '');
}

function getCommercialPlanRootId(plan = {}) {
  const metadata = normalizePlanMetadata(plan.metadata);
  return stripVersionSuffix(metadata.rootPlanId || metadata.previousPlanId || plan.id);
}

function normalizePlan(row) {
  const metadata = normalizePlanMetadata(row.metadata);
  const trialDays = getPlanTrialDays({ ...row, metadata });
  const billing = getPlanBillingMetadata({ ...row, metadata });
  const isSuperseded = metadata.catalogStatus === 'superseded' || Boolean(metadata.supersededByPlanId);
  return {
    id: row.id,
    rootPlanId: getCommercialPlanRootId({ ...row, metadata }),
    nombre: normalizeBrandText(row.nombre),
    descripcion: normalizeBrandText(row.descripcion),
    precioMensualCentavos: billing.precioMensualCentavos,
    precioMensual: Number(billing.precioMensualCentavos || 0) / 100,
    precioAnualCentavos: billing.precioAnualCentavos,
    precioAnual: Number(billing.precioAnualCentavos || 0) / 100,
    pricingInputMode: billing.pricingInputMode,
    cuotasMensuales: billing.cuotasMensuales,
    tasaNominalAnual: billing.tasaNominalAnual,
    billingPeriod: billing.billingPeriod,
    moneda: row.moneda,
    empleadosMax: row.empleados_max,
    empresasMax: row.empresas_max,
    usuariosMax: row.usuarios_max,
    iessEstablecimientosMax: row.iess_establecimientos_max ?? 1,
    archivosBancarios: row.archivos_bancarios,
    reportesAvanzados: row.reportes_avanzados,
    apiAccess: row.api_access,
    appMovil: Boolean(row.app_movil),
    rutasCampo: Boolean(row.rutas_campo),
    soporte: row.soporte,
    publico: row.publico,
    activo: row.activo,
    orden: row.orden,
    trialDays,
    catalogStatus: isSuperseded ? 'superseded' : 'current',
    isSuperseded,
    supersededByPlanId: metadata.supersededByPlanId || null,
    runtimeOnly: Boolean(metadata.runtimeOnly),
    metadata: {
      ...metadata,
      trialDays,
      billingPeriod: billing.billingPeriod,
      precioAnualCentavos: billing.precioAnualCentavos,
      pricingInputMode: billing.pricingInputMode,
      cuotasMensuales: billing.cuotasMensuales,
      tasaNominalAnual: billing.tasaNominalAnual,
    },
  };
}

function normalizeBrandText(value) {
  return String(value || '')
    .replace(/N[oó]mina-EC/gi, 'SKNOMINA')
    .replace(/N[oó]mina-Ec/gi, 'SKNOMINA')
    .replace(/Nomina-Ec/gi, 'SKNOMINA')
    .replace(/Nomina-EC/gi, 'SKNOMINA');
}

async function listPublicPlans(_req, res, next) {
  try {
    const result = await db.query(
      `WITH ranked AS (
        SELECT p.*,
          ROW_NUMBER() OVER (
            PARTITION BY COALESCE(
              NULLIF(p.metadata->>'rootPlanId', ''),
              NULLIF(p.metadata->>'previousPlanId', ''),
              regexp_replace(p.id, '(_V[0-9]+)+$', '', 'i')
            )
            ORDER BY
              CASE WHEN COALESCE(p.metadata->>'catalogStatus', '') = 'superseded'
                OR NULLIF(p.metadata->>'supersededByPlanId', '') IS NOT NULL
                THEN 0 ELSE 1 END DESC,
              CASE WHEN p.id ~ '_V[0-9]+$' THEN 1 ELSE 0 END DESC,
              p.created_at DESC,
              p.updated_at DESC,
              p.id DESC
          ) AS catalog_rank
        FROM planes_comerciales p
        WHERE p.publico = true AND p.activo = true
      )
      SELECT *
      FROM ranked
      WHERE catalog_rank = 1
        AND COALESCE(metadata->>'catalogStatus', '') <> 'superseded'
        AND NULLIF(metadata->>'supersededByPlanId', '') IS NULL
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
      `WITH ranked AS (
        SELECT p.*,
          ROW_NUMBER() OVER (
            PARTITION BY COALESCE(
              NULLIF(p.metadata->>'rootPlanId', ''),
              NULLIF(p.metadata->>'previousPlanId', ''),
              regexp_replace(p.id, '(_V[0-9]+)+$', '', 'i')
            )
            ORDER BY
              CASE WHEN COALESCE(p.metadata->>'catalogStatus', '') = 'superseded'
                OR NULLIF(p.metadata->>'supersededByPlanId', '') IS NOT NULL
                THEN 0 ELSE 1 END DESC,
              CASE WHEN p.id ~ '_V[0-9]+$' THEN 1 ELSE 0 END DESC,
              p.created_at DESC,
              p.updated_at DESC,
              p.id DESC
          ) AS catalog_rank
        FROM planes_comerciales p
      )
      SELECT *
      FROM ranked
      WHERE catalog_rank = 1
      ORDER BY orden ASC, id ASC`
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
  const incomingMetadata = normalizePlanMetadata(body.metadata);
  const trialDays = normalizeTrialDays(
    body.trialDays ?? incomingMetadata.trialDays ?? incomingMetadata.trial_days,
    id === 'TRIAL' ? DEFAULT_TRIAL_DAYS : 0
  );
  const billingPeriod = normalizeBillingPeriod(
    body.billingPeriod ?? incomingMetadata.billingPeriod ?? incomingMetadata.billing_period,
    'monthly'
  );
  const pricingInputMode = normalizePricingInputMode(
    body.pricingInputMode ?? incomingMetadata.pricingInputMode ?? incomingMetadata.pricing_input_mode,
    'MONTHLY_PAYMENT'
  );
  const cuotasMensuales = normalizeInstallmentCount(
    body.cuotasMensuales ?? incomingMetadata.cuotasMensuales ?? incomingMetadata.cuotas_mensuales,
    12
  );
  const tasaNominalAnual = normalizeNominalAnnualRate(
    body.tasaNominalAnual ?? incomingMetadata.tasaNominalAnual ?? incomingMetadata.tasa_nominal_anual,
    0
  );
  const precioAnualCentavos = Math.max(0, Math.round(Number(
    body.precioAnualCentavos
      ?? incomingMetadata.precioAnualCentavos
      ?? incomingMetadata.precio_anual_centavos
      ?? precioMensualCentavos * 12
  ) || 0));

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

  const rawIessEstablishmentsMax = body.iessEstablecimientosMax
    ?? incomingMetadata.iessEstablecimientosMax
    ?? incomingMetadata.iess_establecimientos_max
    ?? 1;
  const iessEstablecimientosMax = Number(rawIessEstablishmentsMax) === -1
    ? -1
    : Math.max(1, Math.round(Number(rawIessEstablishmentsMax) || 1));

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
    iessEstablecimientosMax,
    archivosBancarios: Boolean(body.archivosBancarios),
    reportesAvanzados: Boolean(body.reportesAvanzados),
    apiAccess: Boolean(body.apiAccess),
    appMovil: Boolean(body.appMovil),
    rutasCampo: Boolean(body.rutasCampo),
    soporte: String(body.soporte || 'comunidad'),
    publico: body.publico !== false,
    activo: body.activo !== false,
    orden: Math.round(Number(body.orden || 0)),
    trialDays,
    billingPeriod,
    pricingInputMode,
    cuotasMensuales,
    tasaNominalAnual,
    precioAnualCentavos,
    metadata: {
      ...withPlanTrialMetadata(incomingMetadata, trialDays),
      billingPeriod,
      pricingInputMode,
      cuotasMensuales,
      tasaNominalAnual,
      precioAnualCentavos,
    },
  };
}

async function upsertPlan(req, res, next) {
  try {
    const payload = validatePlanPayload({ ...req.body, id: req.params.planId || req.body.id });
    const existing = await db.query('SELECT * FROM planes_comerciales WHERE id = $1', [payload.id]);
    if (existing.rows.length > 0 && req.params.planId) {
      const existingPlan = existing.rows[0];
      const rootPlanId = getCommercialPlanRootId(existingPlan);
      const activeSubscriptions = await db.query(
        `SELECT COUNT(*)::int AS total
         FROM suscripciones
         WHERE plan_id = $1
           AND (
             (estado = 'active' AND vence_en IS NOT NULL AND vence_en > NOW())
             OR (estado = 'trial' AND vence_en IS NOT NULL AND vence_en > NOW())
           )`,
        [payload.id]
      );
      const hasActiveSubscribers = Number(activeSubscriptions.rows[0]?.total || 0) > 0;
      if (hasActiveSubscribers && req.body.forceInPlace !== true) {
        const versionedPayload = {
          ...payload,
          id: buildVersionedCommercialPlanId(rootPlanId),
          metadata: {
            ...payload.metadata,
            rootPlanId,
            previousPlanId: payload.id,
            versionedFromActiveSubscriptions: true,
            versionedAt: new Date().toISOString(),
          },
        };
        const versioned = await insertCommercialPlan(versionedPayload);
        await db.query(
          `UPDATE planes_comerciales
           SET publico = false,
               metadata = metadata || $2::jsonb,
               updated_at = NOW()
           WHERE id = $1`,
          [
            payload.id,
            JSON.stringify({
              catalogStatus: 'superseded',
              supersededByPlanId: versionedPayload.id,
              supersededAt: new Date().toISOString(),
              runtimeOnly: true,
            }),
          ]
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
        usuarios_max, iess_establecimientos_max, archivos_bancarios, reportes_avanzados, api_access, app_movil, rutas_campo,
        soporte, publico, activo, orden, metadata
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      ON CONFLICT (id) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        descripcion = EXCLUDED.descripcion,
        precio_mensual_centavos = EXCLUDED.precio_mensual_centavos,
        empleados_max = EXCLUDED.empleados_max,
        empresas_max = EXCLUDED.empresas_max,
        usuarios_max = EXCLUDED.usuarios_max,
        iess_establecimientos_max = EXCLUDED.iess_establecimientos_max,
        archivos_bancarios = EXCLUDED.archivos_bancarios,
        reportes_avanzados = EXCLUDED.reportes_avanzados,
        api_access = EXCLUDED.api_access,
        app_movil = EXCLUDED.app_movil,
        rutas_campo = EXCLUDED.rutas_campo,
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
        payload.iessEstablecimientosMax,
        payload.archivosBancarios,
        payload.reportesAvanzados,
        payload.apiAccess,
        payload.appMovil,
        payload.rutasCampo,
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
  const root = stripVersionSuffix(rootPlanId).slice(0, 26);
  const suffix = String(Date.now()).slice(-10);
  return `${root}_V${suffix}`;
}

function insertCommercialPlan(payload) {
  return db.query(
    `INSERT INTO planes_comerciales (
      id, nombre, descripcion, precio_mensual_centavos, empleados_max, empresas_max,
      usuarios_max, iess_establecimientos_max, archivos_bancarios, reportes_avanzados, api_access, app_movil, rutas_campo,
      soporte, publico, activo, orden, metadata
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
    RETURNING *`,
    [
      payload.id,
      payload.nombre,
      payload.descripcion,
      payload.precioMensualCentavos,
      payload.empleadosMax,
      payload.empresasMax,
      payload.usuariosMax,
      payload.iessEstablecimientosMax,
      payload.archivosBancarios,
      payload.reportesAvanzados,
      payload.apiAccess,
      payload.appMovil,
      payload.rutasCampo,
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
          supportedProviders: buildPaymentCapabilities().supportedProviders,
          supportsManualEntry: true,
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
      `SELECT s.*, p.nombre AS plan_nombre, p.precio_mensual_centavos, p.metadata AS plan_metadata
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
        estado: resolveSubscriptionRuntimeState(result.rows[0]),
        estadoRegistrado: result.rows[0].estado,
        venceEn: result.rows[0].vence_en,
        precioMensualCentavos: result.rows[0].precio_mensual_centavos,
        billingPeriod: normalizePlanMetadata(result.rows[0].metadata).billingPeriod
          || normalizePlanMetadata(result.rows[0].plan_metadata).billingPeriod
          || 'monthly',
      } : null,
    });
  } catch (err) {
    next(err);
  }
}

function buildPaymentCapabilities() {
  const paymentProvider = resolvePaymentProvider();
  const directPaymentsEnabled = resolveDirectPaymentsEnabled(paymentProvider);
  if (!directPaymentsEnabled) {
    return {
      supportsMultiple: false,
      provider: MANUAL_BANK_PROVIDER,
      supportedProviders: [MANUAL_BANK_PROVIDER],
      supportsManualEntry: true,
      supportsDefaultSwitch: false,
      supportsRevoke: true,
      mockMode: false,
      checkoutAvailable: false,
      directPaymentsEnabled: false,
      providerConfigured: true,
      publicCallbackConfigured: false,
      status: 'manual_transfer_only',
      blockedReason: 'Los pagos directos estan deshabilitados. La activacion se realiza por transferencia bancaria revisada por SUPERADMIN.',
    };
  }

  if (paymentProvider === 'stripe') {
    const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
    return {
      supportsMultiple: false,
      provider: 'STRIPE',
      supportedProviders: ['STRIPE', 'PAYPHONE', MANUAL_BANK_PROVIDER],
      supportsManualEntry: false,
      supportsDefaultSwitch: false,
      supportsRevoke: true,
      mockMode: false,
      checkoutAvailable: false,
      directPaymentsEnabled: true,
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
    supportedProviders: ['PAYPHONE', MANUAL_BANK_PROVIDER],
    supportsManualEntry: true,
    supportsDefaultSwitch: false,
    supportsRevoke: true,
    mockMode,
    checkoutAvailable,
    directPaymentsEnabled: true,
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
        error: capabilities.directPaymentsEnabled === false ? 'PAGOS_DIRECTOS_DESHABILITADOS' : 'PAYPHONE_NO_CONFIGURADO',
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
    const charge = getPlanChargeForPeriod(plan, req.body.billingPeriod);
    const amounts = buildPayphoneAmounts(charge.precioCentavos);
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
          billingPeriod: charge.billingPeriod,
          precioPlanCentavos: charge.precioCentavos,
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
        billingPeriod: charge.billingPeriod,
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

function snapshotSubscription(row = null) {
  if (!row) return null;
  return {
    planId: row.plan_id,
    estado: row.estado,
    inicioEn: row.inicio_en,
    venceEn: row.vence_en,
    renovacionAutomatica: Boolean(row.renovacion_automatica),
    metadata: normalizePlanMetadata(row.metadata),
  };
}

async function fetchCurrentSubscription(tenantId) {
  const result = await db.query(
    'SELECT * FROM suscripciones WHERE tenant_id = $1 LIMIT 1',
    [tenantId]
  );
  return result.rows[0] || null;
}

async function activateSubscriptionForTransaction(approvedTx, confirmation = {}) {
  const planResult = await db.query(
    'SELECT * FROM planes_comerciales WHERE id = $1 LIMIT 1',
    [approvedTx.plan_id]
  );
  const plan = planResult.rows[0] || {};
  const txMetadata = normalizePlanMetadata(approvedTx.metadata);
  const planBilling = getPlanBillingMetadata(plan);
  const billingPeriod = normalizeBillingPeriod(
    confirmation.billingPeriod || txMetadata.billingPeriod || planBilling.billingPeriod,
    planBilling.billingPeriod
  );
  const previousSubscription = await fetchCurrentSubscription(approvedTx.tenant_id);
  const now = new Date();
  const previousExpiry = previousSubscription?.vence_en ? new Date(previousSubscription.vence_en) : null;
  const extendsCurrentPlan = previousSubscription
    && previousSubscription.plan_id === approvedTx.plan_id
    && previousSubscription.estado === 'active'
    && previousExpiry
    && !Number.isNaN(previousExpiry.getTime())
    && previousExpiry.getTime() > now.getTime();
  const expiryBase = extendsCurrentPlan ? previousExpiry : now;
  const nextExpiry = addBillingPeriod(expiryBase, billingPeriod);
  const activationMetadata = {
    activatedByPayment: approvedTx.client_transaction_id,
    providerTransactionId: approvedTx.provider_transaction_id || confirmation.providerTransactionId || null,
    confirmationSource: confirmation.source || 'PAYPHONE_CONFIRM',
    billingPeriod,
    previousSubscription: txMetadata.previousSubscription || snapshotSubscription(previousSubscription),
    upgradeFromPlan: previousSubscription?.plan_id || null,
    renewedFromVenceEn: extendsCurrentPlan ? previousSubscription.vence_en : null,
    activatedAt: now.toISOString(),
    expiresAt: nextExpiry.toISOString(),
  };

  await db.query(
    `INSERT INTO suscripciones (tenant_id, plan_id, estado, inicio_en, vence_en, renovacion_automatica, metadata)
     VALUES ($1, $2, 'active', NOW(), $3, $4, $5)
     ON CONFLICT (tenant_id) DO UPDATE SET
       plan_id = EXCLUDED.plan_id,
       estado = 'active',
       vence_en = EXCLUDED.vence_en,
       renovacion_automatica = EXCLUDED.renovacion_automatica,
       metadata = EXCLUDED.metadata,
       updated_at = NOW()`,
    [
      approvedTx.tenant_id,
      approvedTx.plan_id,
      nextExpiry,
      confirmation.source !== MANUAL_BANK_PROVIDER,
      JSON.stringify(activationMetadata),
    ]
  );
}

async function markTransactionApproved({
  clientTransactionId,
  providerTransactionId = null,
  payload = {},
  extraMetadata = {},
  source = 'PAYPHONE_CONFIRM',
  correlationId = 'payment-confirm',
  userId = null,
}) {
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
        ...extraMetadata,
        confirmationSource: source,
        providerPayload: payload,
      }),
    ]
  );
  const approvedTx = result.rows[0];
  if (!approvedTx) {
    const err = new Error('No se encontro la transaccion para aprobar.');
    err.code = 'PAGO_NO_ENCONTRADO';
    err.statusCode = 404;
    throw err;
  }
  await activateSubscriptionForTransaction(approvedTx, { providerTransactionId, source });
  await queueInvoiceForApprovedTransaction(approvedTx, {
    correlationId,
    userId: userId || approvedTx?.usuario_id || null,
  });
  return approvedTx;
}

function normalizeManualBankTransfer(row = {}) {
  const metadata = normalizePlanMetadata(row.metadata);
  const status = metadata.manualBankStatus || (row.estado === 'APPROVED' ? 'APPLIED' : row.estado);
  return {
    id: row.id,
    tenantId: row.tenant_id,
    tenantName: row.razon_social || null,
    tenantRuc: row.ruc || null,
    ownerEmail: row.owner_email || null,
    planId: row.plan_id,
    planNombre: row.plan_nombre || row.plan_id,
    amountCentavos: row.monto_centavos,
    amount: Number(row.monto_centavos || 0) / 100,
    currency: row.moneda || 'USD',
    provider: row.proveedor,
    status,
    paymentChannel: metadata.paymentChannel || MANUAL_BANK_PROVIDER,
    clientTransactionId: row.client_transaction_id,
    bankReference: metadata.bankReference || row.provider_transaction_id || '',
    paidAt: metadata.paidAt || null,
    confirmedAt: metadata.confirmedAt || null,
    appliedAt: metadata.appliedAt || null,
    rejectedAt: metadata.rejectedAt || null,
    reversedAt: metadata.reversedAt || null,
    billingPeriod: metadata.billingPeriod || metadata.appliedBillingPeriod || 'monthly',
    evidenceUrl: metadata.evidenceUrl || '',
    notes: metadata.notes || '',
    rejectionReason: metadata.rejectionReason || '',
    reversalReason: metadata.reversalReason || '',
    previousSubscription: metadata.previousSubscription || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchManualBankTransferById(id) {
  const result = await db.query(
    `SELECT tr.*, p.nombre AS plan_nombre, t.razon_social, t.ruc, owner.email AS owner_email
     FROM transacciones_pago tr
     JOIN tenants t ON t.id = tr.tenant_id
     LEFT JOIN planes_comerciales p ON p.id = tr.plan_id
     LEFT JOIN usuarios owner ON owner.id = tr.usuario_id
     WHERE tr.id = $1 AND tr.proveedor = $2
     LIMIT 1`,
    [id, MANUAL_BANK_PROVIDER]
  );
  return result.rows[0] || null;
}

async function resolveManualTransferTarget(payload = {}) {
  const target = String(payload.target || payload.owner || payload.ownerEmail || payload.tenantId || payload.tenantRuc || '').trim();
  const tenantId = String(payload.tenantId || '').trim();
  const ownerEmail = String(payload.ownerEmail || '').trim().toLowerCase();
  const digits = String(payload.tenantRuc || payload.ruc || target).replace(/\D/g, '');
  const params = [];
  const filters = [];

  if (tenantId) {
    params.push(tenantId);
    filters.push(`t.id::text = $${params.length}`);
  }
  if (ownerEmail || target.includes('@')) {
    params.push(ownerEmail || target.toLowerCase());
    filters.push(`lower(owner.email) = lower($${params.length})`);
  }
  if (digits) {
    params.push(digits);
    filters.push(`regexp_replace(COALESCE(t.ruc, ''), '\\D', '', 'g') = $${params.length}`);
  }
  if (target && !target.includes('@') && !digits) {
    params.push(target);
    filters.push(`t.id::text = $${params.length}`);
  }

  if (filters.length === 0) {
    const err = new Error('Indica OWNER por email, RUC o tenantId.');
    err.code = 'TRANSFERENCIA_OWNER_REQUERIDO';
    err.statusCode = 400;
    throw err;
  }

  const result = await db.query(
    `SELECT t.id AS tenant_id, t.razon_social, t.ruc, owner.id AS owner_user_id, owner.email AS owner_email
     FROM tenants t
     LEFT JOIN LATERAL (
       SELECT u.id, u.email
       FROM usuarios u
       WHERE u.tenant_id = t.id AND u.rol = 'owner' AND u.activo = true
       ORDER BY u.created_at ASC
       LIMIT 1
     ) owner ON true
     WHERE ${filters.join(' OR ')}
     ORDER BY t.created_at DESC
     LIMIT 1`,
    params
  );

  if (result.rows.length === 0) {
    const err = new Error('No encontramos el OWNER indicado para aplicar el pago.');
    err.code = 'TRANSFERENCIA_OWNER_NO_ENCONTRADO';
    err.statusCode = 404;
    throw err;
  }
  return result.rows[0];
}

async function listManualBankTransfers(req, res, next) {
  try {
    const status = String(req.query.status || '').trim().toUpperCase();
    const params = [MANUAL_BANK_PROVIDER];
    const statusFilter = status ? `AND COALESCE(tr.metadata->>'manualBankStatus', tr.estado) = $2` : '';
    if (status) params.push(status);
    const result = await db.query(
      `SELECT tr.*, p.nombre AS plan_nombre, t.razon_social, t.ruc, owner.email AS owner_email
       FROM transacciones_pago tr
       JOIN tenants t ON t.id = tr.tenant_id
       LEFT JOIN planes_comerciales p ON p.id = tr.plan_id
       LEFT JOIN usuarios owner ON owner.id = tr.usuario_id
       WHERE tr.proveedor = $1
         ${statusFilter}
       ORDER BY tr.created_at DESC
       LIMIT 100`,
      params
    );
    res.json({
      success: true,
      data: {
        items: result.rows.map(normalizeManualBankTransfer),
        provider: MANUAL_BANK_PROVIDER,
      },
      correlationId: req.correlationId,
    });
  } catch (err) {
    next(err);
  }
}

async function createManualBankTransfer(req, res, next) {
  try {
    const target = await resolveManualTransferTarget(req.body || {});
    const planId = String(req.body.planId || req.body.planCode || '').trim().toUpperCase();
    const planResult = await db.query(
      'SELECT * FROM planes_comerciales WHERE id = $1 AND activo = true LIMIT 1',
      [planId]
    );
    if (planResult.rows.length === 0) {
      return res.status(404).json({
        error: 'PLAN_NO_ENCONTRADO',
        message: 'El plan seleccionado no existe o no esta activo.',
        correlationId: req.correlationId,
      });
    }

    const amountCentavos = req.body.amountCentavos !== undefined
      ? Math.max(0, Math.round(Number(req.body.amountCentavos) || 0))
      : centsFromAmount(req.body.amount);
    const bankReference = String(req.body.bankReference || req.body.referencia || '').trim();
    if (amountCentavos <= 0 || !bankReference) {
      return res.status(400).json({
        error: 'TRANSFERENCIA_DATOS_REQUERIDOS',
        message: 'Completa monto recibido y referencia bancaria.',
        correlationId: req.correlationId,
      });
    }

    const plan = planResult.rows[0];
    const charge = getPlanChargeForPeriod(plan, req.body.billingPeriod);
    const clientTransactionId = `sknomina-bank-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const result = await db.query(
      `INSERT INTO transacciones_pago (
        tenant_id, usuario_id, plan_id, proveedor, estado, monto_centavos,
        base_gravada_centavos, base_no_gravada_centavos, iva_centavos,
        moneda, client_transaction_id, provider_transaction_id, metadata
      )
      VALUES ($1,$2,$3,$4,'PENDING_REVIEW',$5,$6,0,0,'USD',$7,$8,$9)
      RETURNING *`,
      [
        target.tenant_id,
        target.owner_user_id || null,
        plan.id,
        MANUAL_BANK_PROVIDER,
        amountCentavos,
        amountCentavos,
        clientTransactionId,
        bankReference,
        JSON.stringify({
          manualBankStatus: 'PENDING_REVIEW',
          paymentChannel: MANUAL_BANK_PROVIDER,
          bankReference,
          paidAt: req.body.paidAt || new Date().toISOString(),
          evidenceUrl: String(req.body.evidenceUrl || '').trim(),
          notes: String(req.body.notes || req.body.observation || '').trim(),
          billingPeriod: charge.billingPeriod,
          expectedPlanAmountCentavos: charge.precioCentavos,
          createdBy: req.usuarioId || req.usuario?.id || null,
          createdAt: new Date().toISOString(),
        }),
      ]
    );

    const row = await fetchManualBankTransferById(result.rows[0].id);
    res.status(201).json({
      success: true,
      data: normalizeManualBankTransfer(row),
      correlationId: req.correlationId,
    });
  } catch (err) {
    next(err);
  }
}

async function updateManualBankTransferStatus(req, res, next) {
  try {
    const action = req.params.action;
    const row = await fetchManualBankTransferById(req.params.id);
    if (!row) {
      return res.status(404).json({
        error: 'TRANSFERENCIA_NO_ENCONTRADA',
        message: 'No encontramos la transferencia bancaria.',
        correlationId: req.correlationId,
      });
    }

    const metadata = normalizePlanMetadata(row.metadata);
    const currentStatus = metadata.manualBankStatus || row.estado;
    let updated;
    if (action === 'confirmar') {
      if (currentStatus !== 'PENDING_REVIEW') {
        return res.status(409).json({
          error: 'TRANSFERENCIA_ESTADO_INVALIDO',
          message: 'Solo una transferencia en revision puede confirmarse.',
          correlationId: req.correlationId,
        });
      }
      updated = await db.query(
        `UPDATE transacciones_pago
         SET estado = 'CONFIRMED',
             metadata = metadata || $2::jsonb,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          row.id,
          JSON.stringify({
            manualBankStatus: 'CONFIRMED',
            confirmedAt: new Date().toISOString(),
            confirmedBy: req.usuarioId || req.usuario?.id || null,
          }),
        ]
      );
    } else if (action === 'rechazar') {
      if (!['PENDING_REVIEW', 'CONFIRMED'].includes(currentStatus)) {
        return res.status(409).json({
          error: 'TRANSFERENCIA_ESTADO_INVALIDO',
          message: 'Solo una transferencia pendiente o confirmada puede rechazarse.',
          correlationId: req.correlationId,
        });
      }
      updated = await db.query(
        `UPDATE transacciones_pago
         SET estado = 'REJECTED',
             metadata = metadata || $2::jsonb,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          row.id,
          JSON.stringify({
            manualBankStatus: 'REJECTED',
            rejectedAt: new Date().toISOString(),
            rejectedBy: req.usuarioId || req.usuario?.id || null,
            rejectionReason: String(req.body.reason || req.body.motivo || '').trim(),
          }),
        ]
      );
    } else {
      return res.status(400).json({
        error: 'TRANSFERENCIA_ACCION_INVALIDA',
        message: 'Accion no soportada.',
        correlationId: req.correlationId,
      });
    }

    const refreshed = await fetchManualBankTransferById(updated.rows[0].id);
    return res.json({
      success: true,
      data: normalizeManualBankTransfer(refreshed),
      correlationId: req.correlationId,
    });
  } catch (err) {
    return next(err);
  }
}

async function applyManualBankTransfer(req, res, next) {
  try {
    const row = await fetchManualBankTransferById(req.params.id);
    if (!row) {
      return res.status(404).json({
        error: 'TRANSFERENCIA_NO_ENCONTRADA',
        message: 'No encontramos la transferencia bancaria.',
        correlationId: req.correlationId,
      });
    }

    const metadata = normalizePlanMetadata(row.metadata);
    const currentStatus = metadata.manualBankStatus || row.estado;
    if (currentStatus === 'APPLIED' || row.estado === 'APPROVED') {
      return res.json({
        success: true,
        data: normalizeManualBankTransfer(row),
        idempotent: true,
        correlationId: req.correlationId,
      });
    }
    if (currentStatus !== 'CONFIRMED') {
      return res.status(409).json({
        error: 'TRANSFERENCIA_NO_CONFIRMADA',
        message: 'Confirma la transferencia antes de aplicarla al plan.',
        correlationId: req.correlationId,
      });
    }

    const previousSubscription = snapshotSubscription(await fetchCurrentSubscription(row.tenant_id));
    const appliedAt = new Date().toISOString();
    const approved = await markTransactionApproved({
      clientTransactionId: row.client_transaction_id,
      providerTransactionId: row.provider_transaction_id || metadata.bankReference || row.client_transaction_id,
      payload: {
        provider: MANUAL_BANK_PROVIDER,
        bankReference: metadata.bankReference || row.provider_transaction_id || '',
        amountCentavos: row.monto_centavos,
      },
      extraMetadata: {
        manualBankStatus: 'APPLIED',
        paymentChannel: MANUAL_BANK_PROVIDER,
        appliedAt,
        appliedBy: req.usuarioId || req.usuario?.id || null,
        previousSubscription,
        billingPeriod: normalizeBillingPeriod(req.body.billingPeriod || metadata.billingPeriod, metadata.billingPeriod || 'monthly'),
      },
      source: MANUAL_BANK_PROVIDER,
      correlationId: req.correlationId,
      userId: req.usuarioId || req.usuario?.id || row.usuario_id || null,
    });

    const refreshed = await fetchManualBankTransferById(approved.id);
    return res.json({
      success: true,
      data: normalizeManualBankTransfer(refreshed),
      correlationId: req.correlationId,
    });
  } catch (err) {
    return next(err);
  }
}

async function reverseManualBankTransfer(req, res, next) {
  try {
    const row = await fetchManualBankTransferById(req.params.id);
    if (!row) {
      return res.status(404).json({
        error: 'TRANSFERENCIA_NO_ENCONTRADA',
        message: 'No encontramos la transferencia bancaria.',
        correlationId: req.correlationId,
      });
    }

    const metadata = normalizePlanMetadata(row.metadata);
    const currentStatus = metadata.manualBankStatus || (row.estado === 'APPROVED' ? 'APPLIED' : row.estado);
    if (currentStatus !== 'APPLIED') {
      return res.status(409).json({
        error: 'TRANSFERENCIA_NO_APLICADA',
        message: 'Solo una transferencia aplicada puede reversarse.',
        correlationId: req.correlationId,
      });
    }

    const previous = metadata.previousSubscription;
    if (previous?.planId) {
      await db.query(
        `INSERT INTO suscripciones (tenant_id, plan_id, estado, inicio_en, vence_en, renovacion_automatica, metadata)
         VALUES ($1,$2,$3,COALESCE($4::timestamptz, NOW()),$5,$6,$7)
         ON CONFLICT (tenant_id) DO UPDATE SET
           plan_id = EXCLUDED.plan_id,
           estado = EXCLUDED.estado,
           inicio_en = EXCLUDED.inicio_en,
           vence_en = EXCLUDED.vence_en,
           renovacion_automatica = EXCLUDED.renovacion_automatica,
           metadata = EXCLUDED.metadata,
           updated_at = NOW()`,
        [
          row.tenant_id,
          previous.planId,
          previous.estado || 'expired',
          previous.inicioEn || null,
          previous.venceEn || null,
          Boolean(previous.renovacionAutomatica),
          JSON.stringify({
            ...normalizePlanMetadata(previous.metadata),
            restoredByManualBankReversal: row.client_transaction_id,
            restoredAt: new Date().toISOString(),
          }),
        ]
      );
    } else {
      await db.query(
        `UPDATE suscripciones
         SET estado = 'expired',
             vence_en = NOW(),
             renovacion_automatica = false,
             metadata = metadata || $2::jsonb,
             updated_at = NOW()
         WHERE tenant_id = $1`,
        [
          row.tenant_id,
          JSON.stringify({
            expiredByManualBankReversal: row.client_transaction_id,
            reversedAt: new Date().toISOString(),
          }),
        ]
      );
    }

    await db.query(
      `UPDATE transacciones_pago
       SET estado = 'REVERSED',
           metadata = metadata || $2::jsonb,
           updated_at = NOW()
       WHERE id = $1`,
      [
        row.id,
        JSON.stringify({
          manualBankStatus: 'REVERSED',
          reversedAt: new Date().toISOString(),
          reversedBy: req.usuarioId || req.usuario?.id || null,
          reversalReason: String(req.body.reason || req.body.motivo || '').trim(),
        }),
      ]
    );

    const refreshed = await fetchManualBankTransferById(row.id);
    return res.json({
      success: true,
      data: normalizeManualBankTransfer(refreshed),
      correlationId: req.correlationId,
    });
  } catch (err) {
    return next(err);
  }
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
        correlationId: req.correlationId,
        userId: tx.usuario_id || null,
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
      correlationId: req.correlationId,
      userId: tx.usuario_id || null,
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
  listManualBankTransfers,
  createManualBankTransfer,
  updateManualBankTransferStatus,
  applyManualBankTransfer,
  reverseManualBankTransfer,
  createCheckoutIntent,
  confirmPayment,
  paymentReturn,
  payphoneWebhook,
  paymentCancelled,
  revokePaymentMethod,
};
