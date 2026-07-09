// ============================================================
// SKNOMINA - Configuracion de modulos del sistema
// Define los modulos, permisos por defecto por rol y mapeo de rutas.
// ============================================================

const ALL_MODULES = [
  { code: 'empleados', label: 'Empleados', description: 'Gestion de empleados, importacion, terminacion' },
  { code: 'asistencia', label: 'Asistencia', description: 'Marcaciones, novedades, reportes de asistencia' },
  { code: 'operacion', label: 'Operacion', description: 'Permisos laborales, movilizacion' },
  { code: 'nomina', label: 'Nomina', description: 'Periodos, calculo, cierre, roles de pago, pagos bancarios' },
  { code: 'documentos', label: 'Documentos', description: 'Contratos, finiquitos, actas de dotacion' },
  { code: 'reportes', label: 'Reportes', description: 'RDEP, Form107, SAE, archivos bancarios, consolidados' },
  { code: 'parametrizacion', label: 'Parametrizacion', description: 'Centro de configuracion, parametros legales' },
  { code: 'comunicaciones', label: 'Comunicaciones', description: 'Email SMTP, eventos de comunicacion' },
  { code: 'auditoria', label: 'Auditoria', description: 'Log de auditoria del sistema' },
];

const MODULE_CODES = ALL_MODULES.map((m) => m.code);

// Permisos por defecto de cada rol para cada modulo.
// superadmin y owner siempre tienen acceso total; no se listan aqui porque
// su acceso es irrestricto y no puede ser limitado.
const DEFAULT_MODULE_PERMISSIONS = {
  admin_rrhh: {
    empleados: true,
    asistencia: true,
    operacion: true,
    nomina: true,
    documentos: true,
    reportes: true,
    parametrizacion: true,
    comunicaciones: true,
    auditoria: false,
  },
  supervisor: {
    empleados: true,
    asistencia: true,
    operacion: false,
    nomina: false,
    documentos: false,
    reportes: false,
    parametrizacion: false,
    comunicaciones: false,
    auditoria: false,
  },
  empleado: {
    empleados: false,
    asistencia: false,
    operacion: false,
    nomina: false,
    documentos: false,
    reportes: false,
    parametrizacion: false,
    comunicaciones: false,
    auditoria: false,
  },
};

// Mapeo de prefijo de ruta API a codigo de modulo.
// Se usa en requireModule() para resolver automaticamente el modulo
// si no se pasa codigo explicito.
const MODULE_ROUTE_PREFIX = {
  '/api/empleados': 'empleados',
  '/api/onboarding/saldos-iniciales': 'empleados',
  '/api/marcaciones': 'asistencia',
  '/api/novedades': 'asistencia',
  '/api/rutas': 'asistencia',
  '/api/movilizacion': 'operacion',
  '/api/nomina': 'nomina',
  '/api/beneficios': 'nomina',
  '/api/documentos': 'documentos',
  '/api/reportes': 'reportes',
  '/api/configuracion': 'parametrizacion',
  '/api/comunicaciones': 'comunicaciones',
  '/api/auditoria': 'auditoria',
};

// Roles con acceso total irrestricto (no se les aplican restricciones de modulo)
const UNRESTRICTED_ROLES = new Set(['superadmin', 'owner']);

/**
 * Resuelve los permisos efectivos de modulo para un usuario.
 * @param {string} rol - Rol del usuario
 * @param {object|null} overrides - Overrides almacenados en module_permissions (JSON)
 * @returns {object} Mapa { [moduleCode]: boolean }
 */
function resolveEffectivePermissions(rol, overrides) {
  const normalizedRole = String(rol || '').trim().toLowerCase();

  if (UNRESTRICTED_ROLES.has(normalizedRole)) {
    const all = {};
    for (const code of MODULE_CODES) {
      all[code] = true;
    }
    return all;
  }

  const defaults = DEFAULT_MODULE_PERMISSIONS[normalizedRole] || {};
  const effective = {};

  for (const code of MODULE_CODES) {
    if (overrides && typeof overrides[code] === 'boolean') {
      effective[code] = overrides[code];
    } else {
      effective[code] = defaults[code] || false;
    }
  }

  return effective;
}

module.exports = {
  ALL_MODULES,
  MODULE_CODES,
  DEFAULT_MODULE_PERMISSIONS,
  MODULE_ROUTE_PREFIX,
  UNRESTRICTED_ROLES,
  resolveEffectivePermissions,
};
