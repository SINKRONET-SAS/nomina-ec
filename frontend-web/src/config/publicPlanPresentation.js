export const FALLBACK_PUBLIC_PLANS = [
  {
    id: 'TRIAL',
    nombre: 'Prueba',
    descripcion: 'Valida el ciclo completo de nomina, asistencia, roles y reportes antes de pagar.',
    precioMensualCentavos: 0,
    empleadosMax: 10,
    empresasMax: 1,
    usuariosMax: 2,
    archivosBancarios: false,
    orden: 10,
  },
  {
    id: 'MICRO',
    nombre: 'Micro',
    descripcion: 'Opera nomina mensual de una empresa pequena con asistencia, roles y archivo bancario.',
    precioMensualCentavos: 1900,
    empleadosMax: 25,
    empresasMax: 1,
    usuariosMax: 3,
    archivosBancarios: true,
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
    orden: 30,
  },
  {
    id: 'EMPRESA',
    nombre: 'Empresa',
    descripcion: 'Operacion multiempresa con auditoria visible, soporte ampliado y reportes avanzados.',
    precioMensualCentavos: 9900,
    empleadosMax: 500,
    empresasMax: 10,
    usuariosMax: 20,
    archivosBancarios: true,
    reportesAvanzados: true,
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
  TRIAL: ['Flujo completo de prueba', 'Roles y asistencia', 'Reportes de validacion'],
  MICRO: ['Una empresa activa', 'Archivo bancario incluido', 'Roles y novedades mensuales'],
  PYME: ['Hasta 3 empresas', 'Reportes avanzados', 'Trazabilidad para RRHH'],
  EMPRESA: ['Operacion multiempresa', 'Auditoria visible', 'Soporte ampliado'],
  CORPORATIVO: ['Capacidad pactada', 'Acompanamiento dedicado', 'Integraciones a medida'],
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
    || 'Plan comercial SKNOMINA para operar nomina con trazabilidad.';
}

export function getPlanHighlights(plan = {}) {
  const planId = String(plan.id || '').trim().toUpperCase();
  if (Array.isArray(plan.metadata?.highlights) && plan.metadata.highlights.length > 0) {
    return plan.metadata.highlights.slice(0, 4).map(normalizeBrandText);
  }
  return PLAN_HIGHLIGHTS[planId] || [
    `Empleados: ${plan.empleadosMax || 'pactado'}`,
    `Empresas: ${plan.empresasMax || 1}`,
    plan.archivosBancarios ? 'Archivo bancario incluido' : 'Reportes base',
  ];
}
