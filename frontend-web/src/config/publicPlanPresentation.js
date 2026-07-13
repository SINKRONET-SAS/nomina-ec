export const FALLBACK_PUBLIC_PLANS = [
  {
    id: 'TRIAL',
    nombre: 'Prueba',
    descripcion: 'Valida el ciclo completo de nomina, asistencia, roles y reportes antes de pagar.',
    precioMensualCentavos: 0,
    precioAnualCentavos: 0,
    pricingInputMode: 'MONTHLY_PAYMENT',
    cuotasMensuales: 12,
    tasaNominalAnual: 0,
    empleadosMax: 10,
    empresasMax: 1,
    usuariosMax: 2,
    iessEstablecimientosMax: 1,
    archivosBancarios: false,
    appMovil: true,
    rutasCampo: false,
    orden: 10,
  },
  {
    id: 'MICRO',
    nombre: 'Micro',
    descripcion: 'Opera nomina mensual de una empresa pequena con asistencia, roles y archivo bancario.',
    precioMensualCentavos: 1900,
    precioAnualCentavos: 22800,
    pricingInputMode: 'MONTHLY_PAYMENT',
    cuotasMensuales: 12,
    tasaNominalAnual: 0,
    empleadosMax: 25,
    empresasMax: 1,
    usuariosMax: 3,
    iessEstablecimientosMax: 1,
    archivosBancarios: true,
    appMovil: true,
    rutasCampo: false,
    orden: 20,
  },
  {
    id: 'PYME',
    nombre: 'Pyme',
    descripcion: 'Control recurrente para RRHH con reportes, pagos bancarios y trazabilidad de cierre.',
    precioMensualCentavos: 4900,
    precioAnualCentavos: 58800,
    pricingInputMode: 'MONTHLY_PAYMENT',
    cuotasMensuales: 12,
    tasaNominalAnual: 0,
    empleadosMax: 100,
    empresasMax: 3,
    usuariosMax: 8,
    iessEstablecimientosMax: 2,
    archivosBancarios: true,
    appMovil: true,
    rutasCampo: true,
    orden: 30,
  },
  {
    id: 'EMPRESA',
    nombre: 'Empresa',
    descripcion: 'Operacion multiempresa con auditoria visible, soporte ampliado y reportes avanzados.',
    precioMensualCentavos: 9900,
    precioAnualCentavos: 118800,
    pricingInputMode: 'MONTHLY_PAYMENT',
    cuotasMensuales: 12,
    tasaNominalAnual: 0,
    empleadosMax: 500,
    empresasMax: 10,
    usuariosMax: 20,
    iessEstablecimientosMax: 5,
    archivosBancarios: true,
    reportesAvanzados: true,
    appMovil: true,
    rutasCampo: true,
    orden: 40,
  },
];

const PLAN_COMMERCIAL_PROMISE = {
  TRIAL: 'Prueba controlada para validar el cierre mensual completo sin compromiso.',
  MICRO: 'Para negocios pequenos que necesitan pagar nomina sin improvisar archivos ni reportes.',
  PYME: 'Para equipos de RRHH que requieren asistencia, bancos, reportes y auditoria en cada periodo.',
  EMPRESA: 'Para grupos con varias empresas, mayor volumen operativo y supervision comercial.',
  CORPORATIVO: 'Para operacion a medida con acompanamiento y capacidad pactada.',
};

const PLAN_HIGHLIGHTS = {
  TRIAL: ['Flujo completo de prueba', 'App movil de asistencia', 'Reportes de validacion'],
  MICRO: ['Una empresa activa', 'App movil de asistencia', 'Archivo bancario incluido'],
  PYME: ['Hasta 3 empresas', 'App movil de asistencia', 'Rutas de campo'],
  EMPRESA: ['Operacion multiempresa', 'Rutas de campo', 'Reportes avanzados'],
  CORPORATIVO: ['Capacidad pactada', 'App y rutas por contrato', 'Integraciones a medida'],
};

export const COMMERCIAL_IVA_PERCENT = 15;
const COMMERCIAL_IVA_RATE = COMMERCIAL_IVA_PERCENT / 100;
const DEFAULT_INSTALLMENTS = 12;

function normalizePricingInputMode(value) {
  return String(value || 'ANNUAL_PRICE').trim().toUpperCase() === 'MONTHLY_PAYMENT'
    ? 'MONTHLY_PAYMENT'
    : 'ANNUAL_PRICE';
}

function normalizeInstallments(value) {
  const parsed = Math.round(Number(value || DEFAULT_INSTALLMENTS));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_INSTALLMENTS;
}

function normalizeNominalAnnualRate(value) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100) / 100;
}

function normalizeCents(value) {
  const parsed = Math.round(Number(value || 0));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function formatMoneyFromCents(value) {
  return `$${(normalizeCents(value) / 100).toFixed(2)}`;
}

function addIva(cents) {
  const baseCentavos = normalizeCents(cents);
  const ivaCentavos = Math.round(baseCentavos * COMMERCIAL_IVA_RATE);
  return {
    baseCentavos,
    ivaCentavos,
    totalCentavos: baseCentavos + ivaCentavos,
    baseDisplay: formatMoneyFromCents(baseCentavos),
    ivaDisplay: formatMoneyFromCents(ivaCentavos),
    totalDisplay: formatMoneyFromCents(baseCentavos + ivaCentavos),
  };
}

function monthlyRateFromNominalAnnual(ratePercent) {
  return normalizeNominalAnnualRate(ratePercent) / 100 / 12;
}

function computeMonthlyInstallmentFromAnnual(annualCents, ratePercent, installments) {
  const annual = normalizeCents(annualCents);
  const months = normalizeInstallments(installments);
  const monthlyRate = monthlyRateFromNominalAnnual(ratePercent);
  if (!annual) return 0;
  if (monthlyRate <= 0) return Math.round(annual / months);
  return Math.round(annual * (monthlyRate / (1 - Math.pow(1 + monthlyRate, -months))));
}

function computeAnnualCashFromMonthly(monthlyCents, ratePercent, installments) {
  const monthly = normalizeCents(monthlyCents);
  const months = normalizeInstallments(installments);
  const monthlyRate = monthlyRateFromNominalAnnual(ratePercent);
  if (!monthly) return 0;
  if (monthlyRate <= 0) return Math.round(monthly * months);
  return Math.round(monthly * ((1 - Math.pow(1 + monthlyRate, -months)) / monthlyRate));
}

export function normalizeBrandText(value) {
  return String(value || '')
    .replace(/N[o\u00f3]mina-EC/gi, 'SKNOMINA')
    .replace(/N[o\u00f3]mina-Ec/gi, 'SKNOMINA')
    .replace(/Nomina-Ec/gi, 'SKNOMINA')
    .replace(/Nomina-EC/gi, 'SKNOMINA');
}

export function normalizePublicPlan(plan = {}) {
  const metadata = plan.metadata || {};
  const monthlyCents = normalizeCents(plan.precioMensualCentavos ?? metadata.precioMensualCentavos);
  const pricingInputMode = normalizePricingInputMode(
    plan.pricingInputMode ?? metadata.pricingInputMode ?? (monthlyCents > 0 ? 'MONTHLY_PAYMENT' : 'ANNUAL_PRICE')
  );
  const cuotasMensuales = normalizeInstallments(plan.cuotasMensuales ?? metadata.cuotasMensuales);
  const tasaNominalAnual = normalizeNominalAnnualRate(plan.tasaNominalAnual ?? metadata.tasaNominalAnual);
  const annualCandidate = plan.precioAnualCentavos ?? metadata.precioAnualCentavos ?? metadata.precio_anual_centavos;
  const annualCents = annualCandidate === undefined || annualCandidate === null || annualCandidate === ''
    ? computeAnnualCashFromMonthly(monthlyCents, tasaNominalAnual, cuotasMensuales)
    : normalizeCents(annualCandidate);

  return {
    ...plan,
    id: String(plan.id || '').trim().toUpperCase(),
    nombre: normalizeBrandText(plan.nombre),
    descripcion: normalizeBrandText(plan.descripcion),
    precioMensualCentavos: monthlyCents || computeMonthlyInstallmentFromAnnual(annualCents, tasaNominalAnual, cuotasMensuales),
    precioAnualCentavos: annualCents,
    pricingInputMode,
    cuotasMensuales,
    tasaNominalAnual,
    billingPeriod: plan.billingPeriod || metadata.billingPeriod || 'monthly',
    trialDays: plan.trialDays ?? metadata.trialDays ?? (String(plan.id || '').trim().toUpperCase() === 'TRIAL' ? 14 : 0),
    archivosBancarios: Boolean(plan.archivosBancarios),
    reportesAvanzados: Boolean(plan.reportesAvanzados),
    apiAccess: Boolean(plan.apiAccess),
    appMovil: Boolean(plan.appMovil),
    rutasCampo: Boolean(plan.rutasCampo),
    iessEstablecimientosMax: plan.iessEstablecimientosMax ?? metadata.iessEstablecimientosMax ?? 1,
  };
}

export function normalizePublicPlans(plans = []) {
  const source = Array.isArray(plans) && plans.length > 0 ? plans : FALLBACK_PUBLIC_PLANS;
  return source
    .map(normalizePublicPlan)
    .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0));
}

export function getPlanPriceBreakdown(plan = {}) {
  const normalized = normalizePublicPlan(plan);
  const installments = normalizeInstallments(normalized.cuotasMensuales);
  const rate = normalizeNominalAnnualRate(normalized.tasaNominalAnual);
  const pricingInputMode = normalizePricingInputMode(normalized.pricingInputMode);
  const annualBaseCentavos = normalizeCents(normalized.precioAnualCentavos)
    || computeAnnualCashFromMonthly(normalized.precioMensualCentavos, rate, installments);
  const monthlyBaseCentavos = normalizeCents(normalized.precioMensualCentavos)
    || computeMonthlyInstallmentFromAnnual(annualBaseCentavos, rate, installments);
  const activeBaseCentavos = normalized.billingPeriod === 'annual' ? annualBaseCentavos : monthlyBaseCentavos;
  const activeTax = addIva(activeBaseCentavos);
  const annualTax = addIva(annualBaseCentavos);
  const monthlyTax = addIva(monthlyBaseCentavos);
  const activeSuffix = normalized.billingPeriod === 'annual' ? 'anio' : 'mes';
  const rateLabel = rate > 0 ? `Tasa nominal anual ${rate.toFixed(2)}%` : 'Sin tasa nominal';

  return {
    hasPrice: activeBaseCentavos > 0,
    pricingInputMode,
    cuotasMensuales: installments,
    tasaNominalAnual: rate,
    ivaPercent: COMMERCIAL_IVA_PERCENT,
    activeBaseCentavos,
    annualBaseCentavos,
    monthlyBaseCentavos,
    primaryBaseLabel: `${activeTax.baseDisplay} + IVA/${activeSuffix}`,
    primaryTotalLabel: `Total ${activeTax.totalDisplay} incl. IVA ${COMMERCIAL_IVA_PERCENT}%`,
    activeIvaDisplay: activeTax.ivaDisplay,
    activeTotalDisplay: activeTax.totalDisplay,
    annualBaseLabel: `Contado anual: ${annualTax.baseDisplay} + IVA`,
    annualTotalLabel: `Total contado: ${annualTax.totalDisplay}`,
    monthlyBaseLabel: `${installments} mensualidades: ${monthlyTax.baseDisplay} + IVA c/u`,
    monthlyTotalLabel: `Total mensual: ${monthlyTax.totalDisplay}`,
    monthlyIvaDisplay: monthlyTax.ivaDisplay,
    rateLabel,
  };
}

export function formatPublicPlanPrice(plan) {
  const pricing = getPlanPriceBreakdown(plan);
  if (!pricing.hasPrice) {
    return plan?.id === 'CORPORATIVO' ? 'Contrato' : '$0.00';
  }
  return pricing.primaryBaseLabel;
}

export function publicPlanActionLabel(plan) {
  if (plan?.id === 'TRIAL') return 'Empezar prueba';
  if (plan?.id === 'CORPORATIVO') return 'Hablar con ventas';
  return 'Activar plan';
}

export function getPlanCommercialPromise(plan = {}) {
  const planId = String(plan.id || '').trim().toUpperCase();
  return plan.metadata?.commercialPromise
    || normalizeBrandText(plan.descripcion)
    || PLAN_COMMERCIAL_PROMISE[planId]
    || 'Plan comercial SKNOMINA para operar nomina con trazabilidad.';
}

export function getPlanHighlights(plan = {}) {
  const planId = String(plan.id || '').trim().toUpperCase();
  if (Array.isArray(plan.metadata?.highlights) && plan.metadata.highlights.length > 0) {
    return plan.metadata.highlights.slice(0, 4).map(normalizeBrandText);
  }
  if (PLAN_HIGHLIGHTS[planId]) return PLAN_HIGHLIGHTS[planId];
  const commercialCapabilities = [
    plan.appMovil ? 'App movil de empleados' : '',
    plan.rutasCampo ? 'Rutas de campo' : '',
    plan.archivosBancarios ? 'Archivo bancario incluido' : '',
    plan.reportesAvanzados ? 'Reportes avanzados' : '',
  ].filter(Boolean);
  return [
    ...commercialCapabilities,
    `Empleados: ${plan.empleadosMax || 'pactado'}`,
    `Empresas: ${plan.empresasMax || 1}`,
    `Establecimientos IESS: ${Number(plan.iessEstablecimientosMax) === -1 ? 'sin limite' : plan.iessEstablecimientosMax || 1}`,
  ].slice(0, 4);
}

export function getPlanFunctionality(plan = {}) {
  const support = plan.soporte ? `Soporte ${String(plan.soporte).toLowerCase()}` : 'Soporte segun plan';
  return [
    {
      key: 'payroll',
      label: 'Nomina mensual, roles y novedades',
      enabled: true,
      group: 'base',
    },
    {
      key: 'attendance',
      label: 'Asistencia y marcaciones',
      enabled: true,
      group: 'base',
    },
    {
      key: 'mobileApp',
      label: 'App movil para empleados',
      enabled: Boolean(plan.appMovil),
      group: 'operacion',
    },
    {
      key: 'fieldRoutes',
      label: 'Rutas de campo y visitas por tienda',
      enabled: Boolean(plan.rutasCampo),
      group: 'operacion',
    },
    {
      key: 'bankFiles',
      label: 'Archivo bancario de pagos',
      enabled: Boolean(plan.archivosBancarios),
      group: 'nomina',
    },
    {
      key: 'advancedReports',
      label: 'Reportes avanzados y trazabilidad',
      enabled: Boolean(plan.reportesAvanzados),
      group: 'reportes',
    },
    {
      key: 'apiAccess',
      label: 'API externa para integraciones',
      enabled: Boolean(plan.apiAccess),
      group: 'integraciones',
    },
    {
      key: 'support',
      label: support,
      enabled: true,
      group: 'soporte',
    },
  ];
}

export function getPlanLimits(plan = {}) {
  return [
    `${plan.empleadosMax || 'Capacidad pactada'} empleados`,
    `${plan.empresasMax || 1} empresa${Number(plan.empresasMax || 1) === 1 ? '' : 's'}`,
    `${plan.usuariosMax || 'Usuarios pactados'} usuarios`,
    `${Number(plan.iessEstablecimientosMax) === -1 ? 'Establecimientos IESS sin limite' : `${plan.iessEstablecimientosMax || 1} establecimiento(s) IESS`}`,
    `${Number(plan.trialDays || 0)} dias de prueba`,
  ];
}
