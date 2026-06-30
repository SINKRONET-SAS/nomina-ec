export const FALLBACK_PUBLIC_PLANS = [
  {
    id: 'TRIAL',
    nombre: 'Prueba',
    descripcion: 'Evalua SKNOMINA con empresa, empleados, asistencia, roles y reportes antes de pagar.',
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
    descripcion: 'Nomina mensual para negocios pequenos con una empresa activa.',
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
    descripcion: 'Gestion recurrente de nomina, reportes y archivos bancarios.',
    precioMensualCentavos: 4900,
    empleadosMax: 100,
    empresasMax: 3,
    usuariosMax: 8,
    archivosBancarios: true,
    orden: 30,
  },
];

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
