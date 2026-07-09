const TENANT_OPERATION_ROLES = new Set(['owner', 'admin_rrhh', 'supervisor']);

export function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

export function isFounderTenantSession(user) {
  return normalizeRole(user?.rol) === 'superadmin' && Boolean(user?.tenantId);
}

export function hasRoleAccess(user, requiredRoles) {
  if (!requiredRoles || requiredRoles.length === 0) return true;

  const normalizedRoles = requiredRoles.map(normalizeRole);
  const role = normalizeRole(user?.rol);
  if (normalizedRoles.includes(role)) return true;

  if (!isFounderTenantSession(user)) return false;
  return normalizedRoles.some((requiredRole) => TENANT_OPERATION_ROLES.has(requiredRole));
}

export function sessionRoleLabel(user) {
  if (isFounderTenantSession(user)) return 'Soporte global';
  const labels = {
    owner: 'Administrador principal',
    admin_rrhh: 'RRHH',
    supervisor: 'Supervisor',
    empleado: 'Empleado',
    superadmin: 'Soporte global',
  };
  const role = normalizeRole(user?.rol);
  return labels[role] || role;
}
