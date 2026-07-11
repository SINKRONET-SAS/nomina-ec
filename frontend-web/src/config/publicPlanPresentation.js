export const FALLBACK_PUBLIC_PLANS = [
  {
    id: 'TRIAL',
    nombre: 'Prueba',
    descripcion: 'Valida el ciclo completo de nómina, asistencia, roles y reportes antes de pagar.',
    precioMensualCentavos: 0,
    empleadosMax: 10,
    empresasMax: 1,
    usuariosMax: 2,
    archivosBancarios: false,
    appMovil: true,
    rutasCampo: false,
    orden: 10,
  },
  {
    id: 'MICRO',
    nombre: 'Micro',
    descripcion: 'Opera nómina mensual de una empresa pequeña con asistencia, roles y archivo bancario.',
    precioMensualCentavos: 1900,
    empleadosMax: 25,
    empresasMax: 1,
    usuariosMax: 3,
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
    empleadosMax: 100,
    empresasMax: 3,
    usuariosMax: 8,
    archivosBancarios: true,
    appMovil: true,
    rutasCampo: true,
    orden: 30,
  },
  {
    id: 'EMPRESA',
    nombre: 'Empresa',
    descripcion: 'Operación multiempresa con auditoría visible, soporte ampliado y reportes avanzados.',
    precioMensualCentavos: 9900,
    empleadosMax: 500,
    empresasMax: 10,
    usuariosMax: 20,
    archivosBancarios: true,
    reportesAvanzados: true,
    appMovil: true,
    rutasCampo: true,
    orden: 40,
  },
];

const PLAN_COMMERCIAL_PROMISE = {
  TRIAL: 'Prueba controlada para validar el cierre mensual completo sin compromiso.',
  MICRO: 'Para negocios pequeños que necesitan pagar nómina sin improvisar archivos ni reportes.',
  PYME: 'Para equipos de RRHH que requieren asistencia, bancos, reportes y auditoría en cada periodo.',
  EMPRESA: 'Para grupos con varias empresas, mayor volumen operativo y supervisión comercial.',
  CORPORATIVO: 'Para operación a medida con acompañamiento y capacidad pactada.',
};

const PLAN_HIGHLIGHTS = {
  TRIAL: ['Flujo completo de prueba', 'App móvil de asistencia', 'Reportes de validación'],
  MICRO: ['Una empresa activa', 'App móvil de asistencia', 'Archivo bancario incluido'],
  PYME: ['Hasta 3 empresas', 'App móvil de asistencia', 'Rutas de campo'],
  EMPRESA: ['Operación multiempresa', 'Rutas de campo', 'Reportes avanzados'],
  CORPORATIVO: ['Capacidad pactada', 'App y rutas por contrato', 'Integraciones a medida'],
};

export function normalizeBrandText(value) {
  return String(value || '')
    .replace(/N[oó]mina-EC/gi, 'SKNOMINA')
    .replace(/N[oó]mina-Ec/gi, 'SKNOMINA')
    .replace(/Nomina-Ec/gi, 'SKNOMINA')
    .replace(/Nomina-EC/gi, 'SKNOMINA');
}

export function normalizePublicPlan(plan = {}) {
  return {
    ...plan,
    id: String(plan.id || '').trim().toUpperCase(),
    nombre: normalizeBrandText(plan.nombre),
    descripcion: normalizeBrandText(plan.descripcion),
    precioAnualCentavos: plan.precioAnualCentavos ?? plan.metadata?.precioAnualCentavos ?? Number(plan.precioMensualCentavos || 0) * 12,
    billingPeriod: plan.billingPeriod || plan.metadata?.billingPeriod || 'monthly',
    trialDays: plan.trialDays ?? plan.metadata?.trialDays ?? (String(plan.id || '').trim().toUpperCase() === 'TRIAL' ? 14 : 0),
    archivosBancarios: Boolean(plan.archivosBancarios),
    reportesAvanzados: Boolean(plan.reportesAvanzados),
    apiAccess: Boolean(plan.apiAccess),
    appMovil: Boolean(plan.appMovil),
    rutasCampo: Boolean(plan.rutasCampo),
  };
}

export function normalizePublicPlans(plans = []) {
  const source = Array.isArray(plans) && plans.length > 0 ? plans : FALLBACK_PUBLIC_PLANS;
  return source
    .map(normalizePublicPlan)
    .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0));
}

export function formatPublicPlanPrice(plan) {
  if (!plan?.precioMensualCentavos) {
    return plan?.id === 'CORPORATIVO' ? 'Contrato' : '$0.00';
  }
  if (plan?.billingPeriod === 'annual') {
    return `$${(Number(plan.precioAnualCentavos || 0) / 100).toFixed(2)}/año`;
  }
  return `$${(Number(plan.precioMensualCentavos) / 100).toFixed(2)}/mes`;
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
    || 'Plan comercial SKNOMINA para operar nómina con trazabilidad.';
}

export function getPlanHighlights(plan = {}) {
  const planId = String(plan.id || '').trim().toUpperCase();
  if (Array.isArray(plan.metadata?.highlights) && plan.metadata.highlights.length > 0) {
    return plan.metadata.highlights.slice(0, 4).map(normalizeBrandText);
  }
  if (PLAN_HIGHLIGHTS[planId]) return PLAN_HIGHLIGHTS[planId];
  const commercialCapabilities = [
    plan.appMovil ? 'App móvil de empleados' : '',
    plan.rutasCampo ? 'Rutas de campo' : '',
    plan.archivosBancarios ? 'Archivo bancario incluido' : '',
    plan.reportesAvanzados ? 'Reportes avanzados' : '',
  ].filter(Boolean);
  return [
    ...commercialCapabilities,
    `Empleados: ${plan.empleadosMax || 'pactado'}`,
    `Empresas: ${plan.empresasMax || 1}`,
  ].slice(0, 4);
}

export function getPlanFunctionality(plan = {}) {
  const support = plan.soporte ? `Soporte ${String(plan.soporte).toLowerCase()}` : 'Soporte según plan';
  return [
    {
      key: 'payroll',
      label: 'Nómina mensual, roles y novedades',
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
      label: 'App móvil para empleados',
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
    `${Number(plan.trialDays || 0)} dias de prueba`,
  ];
}
