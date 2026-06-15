const db = require('../config/database');
const AppError = require('../utils/AppError');

const CAPABILITY_FIELDS = {
  bankFiles: 'archivos_bancarios',
  advancedReports: 'reportes_avanzados',
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
    throw new AppError('El plan actual no incluye esta funcionalidad.', {
      code: 'PLAN_CAPABILITY_BLOCKED',
      statusCode: 402,
      userId: context.userId,
      details: {
        capability,
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
