const db = require('../config/database');
const AppError = require('../utils/AppError');

const CAPABILITY_FIELDS = {
  bankFiles: 'archivos_bancarios',
  advancedReports: 'reportes_avanzados',
  apiAccess: 'api_access',
  mobileApp: 'app_movil',
  fieldRoutes: 'rutas_campo',
};

const CAPABILITY_LABELS = {
  bankFiles: 'archivos bancarios',
  advancedReports: 'reportes avanzados',
  apiAccess: 'API externa',
  mobileApp: 'app móvil',
  fieldRoutes: 'rutas de campo',
};

async function getTenantPlanCapabilities(tenantId) {
  const result = await db.query(`
    SELECT p.*
    FROM suscripciones s
    JOIN planes_comerciales p ON p.id = s.plan_id
    WHERE s.tenant_id = $1
      AND s.estado IN ('trial', 'active')
      AND p.activo = true
    ORDER BY s.updated_at DESC
    LIMIT 1
  `, [tenantId]);

  if (result.rows.length === 0) {
    return {
      planId: null,
      planNombre: 'Sin plan activo',
      allowed: {
        bankFiles: false,
        advancedReports: false,
        apiAccess: false,
        mobileApp: false,
        fieldRoutes: false,
      },
      limits: {
        employeesMax: 0,
        companiesMax: 0,
        usersMax: 0,
      },
    };
  }

  const plan = result.rows[0];
  return {
    planId: plan.id,
    planNombre: plan.nombre,
    allowed: {
      bankFiles: Boolean(plan.archivos_bancarios),
      advancedReports: Boolean(plan.reportes_avanzados),
      apiAccess: Boolean(plan.api_access),
      mobileApp: Boolean(plan.app_movil),
      fieldRoutes: Boolean(plan.rutas_campo),
    },
    limits: {
      employeesMax: plan.empleados_max,
      companiesMax: plan.empresas_max,
      usersMax: plan.usuarios_max,
    },
  };
}

async function assertCapability(tenantId, capability, context = {}) {
  const column = CAPABILITY_FIELDS[capability];
  if (!column) {
    throw new AppError('La capacidad comercial solicitada no esta soportada.', {
      code: 'PLAN_CAPABILITY_UNKNOWN',
      statusCode: 400,
      userId: context.userId,
    });
  }

  const capabilities = await getTenantPlanCapabilities(tenantId);
  if (!capabilities.allowed[capability]) {
    const label = CAPABILITY_LABELS[capability] || 'esta funcionalidad';
    throw new AppError(`El plan actual no incluye ${label}. Activa un plan que ofrezca esta funcionalidad.`, {
      code: 'PLAN_CAPABILITY_BLOCKED',
      statusCode: 402,
      userId: context.userId,
      correlationId: context.correlationId,
      details: {
        capability,
        label,
        planId: capabilities.planId,
      },
    });
  }

  return capabilities;
}

module.exports = {
  getTenantPlanCapabilities,
  assertCapability,
};
