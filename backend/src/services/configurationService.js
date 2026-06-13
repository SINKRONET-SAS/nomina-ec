const db = require('../config/database');
const AppError = require('../utils/AppError');
const { recordAudit } = require('./auditService');

const ONBOARDING_STEPS = [
  { code: 'empresa', label: 'Datos de empresa' },
  { code: 'legal', label: 'Parametros legales' },
  { code: 'organizacion', label: 'Estructura organizativa' },
  { code: 'jornadas', label: 'Jornadas y calendarios' },
  { code: 'zonas', label: 'Zonas de marcacion' },
  { code: 'novedades', label: 'Tipos de novedades' },
  { code: 'bancos', label: 'Banco y archivo plano' },
  { code: 'usuarios', label: 'Usuarios y roles' },
];

const RESOURCE_CONFIG = {
  catalogs: {
    table: 'configuration_catalogs',
    tenantScoped: false,
    columns: ['scope', 'catalog_type', 'code', 'name', 'description', 'status', 'valid_from', 'valid_to', 'payload'],
    orderBy: 'catalog_type, name',
  },
  legalParameters: {
    table: 'legal_parameter_versions',
    tenantScoped: false,
    columns: ['country_code', 'region_code', 'period_year', 'parameter_key', 'value', 'unit', 'rounding_mode', 'validation_status', 'source_name', 'source_url', 'source_date', 'valid_from', 'valid_to', 'notes'],
    orderBy: 'period_year DESC, parameter_key',
  },
  noveltyTypes: {
    table: 'novelty_type_configs',
    tenantScoped: false,
    columns: ['code', 'name', 'description', 'category', 'payroll_impact', 'affects_iess', 'affects_income_tax', 'affects_decimos', 'affects_vacation', 'affects_bank_file', 'requires_evidence', 'approval_flow', 'applicability', 'status', 'valid_from', 'valid_to'],
    orderBy: 'category, name',
  },
  organizationUnits: {
    table: 'organization_units',
    tenantScoped: true,
    columns: ['parent_id', 'unit_type', 'code', 'name', 'description', 'cost_center_code', 'manager_user_id', 'status', 'valid_from', 'valid_to', 'metadata'],
    orderBy: 'unit_type, name',
  },
  workZones: {
    table: 'work_zones',
    tenantScoped: true,
    columns: ['code', 'name', 'latitude', 'longitude', 'radius_meters', 'min_accuracy_meters', 'requires_photo', 'allows_offline', 'status', 'valid_from', 'valid_to', 'rules'],
    orderBy: 'name',
  },
  workShifts: {
    table: 'work_shifts',
    tenantScoped: true,
    columns: ['code', 'name', 'shift_type', 'weekly_hours', 'start_time', 'end_time', 'break_minutes', 'tolerance_minutes', 'overtime_rules', 'calendar_rules', 'status', 'valid_from', 'valid_to'],
    orderBy: 'name',
  },
  bankProfiles: {
    table: 'perfiles_bancarios',
    tenantScoped: false,
    columns: ['banco_codigo', 'banco_nombre', 'delimiter', 'encoding', 'date_format', 'include_header', 'include_trailer', 'field_map', 'activo'],
    orderBy: 'banco_nombre',
  },
};

function getResourceConfig(resource) {
  const config = RESOURCE_CONFIG[resource];
  if (!config) {
    throw new AppError('Recurso de configuración no soportado.', {
      code: 'CONFIG_RESOURCE_NOT_SUPPORTED',
      statusCode: 404,
    });
  }
  return config;
}

function canUseGlobalScope(user, payload = {}) {
  return user.rol === 'superadmin' && (payload.scope === 'global' || payload.tenantId === null);
}

function resolveTenantId(user, payload = {}) {
  if (canUseGlobalScope(user, payload)) {
    return null;
  }

  if (!user.tenantId) {
    throw new AppError('El usuario no tiene empresa asociada para configurar.', {
      code: 'TENANT_REQUIRED_FOR_CONFIGURATION',
      statusCode: 403,
      userId: user.id,
    });
  }

  return user.tenantId;
}

function normalizePayload(config, payload, user) {
  const values = {};
  for (const column of config.columns) {
    if (Object.prototype.hasOwnProperty.call(payload, column)) {
      values[column] = payload[column];
    }
  }

  if (config.table === 'configuration_catalogs') {
    values.scope = canUseGlobalScope(user, payload) ? 'global' : 'tenant';
  }

  return values;
}

function ensureWriteAllowed(user) {
  const allowed = ['superadmin', 'owner', 'admin_rrhh'];
  if (!allowed.includes(user.rol)) {
    throw new AppError('No tiene permisos para administrar configuración.', {
      code: 'CONFIG_PERMISSION_DENIED',
      statusCode: 403,
      userId: user.id,
    });
  }
}

async function listResource(resource, user) {
  const config = getResourceConfig(resource);
  const tenantId = user.tenantId || null;
  const params = [];
  let where = '';

  if (config.tenantScoped) {
    params.push(tenantId);
    where = 'WHERE tenant_id = $1';
  } else if (user.rol === 'superadmin' && !tenantId) {
    where = '';
  } else {
    params.push(tenantId);
    where = 'WHERE (tenant_id = $1 OR tenant_id IS NULL)';
  }

  const result = await db.query(
    `SELECT * FROM ${config.table} ${where} ORDER BY ${config.orderBy}`,
    params
  );
  return result.rows;
}

async function createResource(resource, payload, user, context = {}) {
  ensureWriteAllowed(user);
  const config = getResourceConfig(resource);
  const tenantId = resolveTenantId(user, payload);
  const values = normalizePayload(config, payload, user);
  values.created_by = user.id;

  if (config.table !== 'configuration_catalogs' || values.scope !== 'global') {
    values.tenant_id = tenantId;
  }

  const columns = Object.keys(values);
  if (columns.length === 0) {
    throw new AppError('No hay datos de configuración para guardar.', {
      code: 'CONFIG_EMPTY_PAYLOAD',
      statusCode: 400,
      userId: user.id,
    });
  }

  const placeholders = columns.map((_, index) => `$${index + 1}`);
  const params = columns.map((column) => {
    const value = values[column];
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      return JSON.stringify(value);
    }
    return value;
  });

  const result = await db.query(
    `INSERT INTO ${config.table} (${columns.join(', ')})
     VALUES (${placeholders.join(', ')})
     RETURNING *`,
    params
  );

  await recordAudit({
    tenantId,
    userId: user.id,
    correlationId: context.correlationId,
    action: 'configuracion.crear',
    entity: config.table,
    entityId: result.rows[0].id,
    newData: result.rows[0],
    ipAddress: context.ipAddress,
  });

  return result.rows[0];
}

async function updateResource(resource, id, payload, user, context = {}) {
  ensureWriteAllowed(user);
  const config = getResourceConfig(resource);
  const values = normalizePayload(config, payload, user);

  if (Object.keys(values).length === 0) {
    throw new AppError('No hay datos de configuración para actualizar.', {
      code: 'CONFIG_EMPTY_PAYLOAD',
      statusCode: 400,
      userId: user.id,
    });
  }

  const tenantId = user.rol === 'superadmin' ? null : user.tenantId;
  const whereParams = [id];
  let scopeWhere = '';
  if (user.rol !== 'superadmin') {
    whereParams.push(user.tenantId);
    scopeWhere = ` AND tenant_id = $${whereParams.length}`;
  }

  const previous = await db.query(
    `SELECT * FROM ${config.table} WHERE id = $1${scopeWhere}`,
    whereParams
  );
  if (previous.rows.length === 0) {
    throw new AppError('Registro de configuración no encontrado.', {
      code: 'CONFIG_NOT_FOUND',
      statusCode: 404,
      userId: user.id,
    });
  }

  const columns = Object.keys(values);
  const setClause = columns.map((column, index) => `${column} = $${index + 1}`).join(', ');
  const params = columns.map((column) => {
    const value = values[column];
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      return JSON.stringify(value);
    }
    return value;
  });
  params.push(id);

  let updateWhere = `id = $${params.length}`;
  if (user.rol !== 'superadmin') {
    params.push(user.tenantId);
    updateWhere += ` AND tenant_id = $${params.length}`;
  }

  const result = await db.query(
    `UPDATE ${config.table}
     SET ${setClause}, updated_at = now()
     WHERE ${updateWhere}
     RETURNING *`,
    params
  );

  await recordAudit({
    tenantId: result.rows[0].tenant_id || tenantId,
    userId: user.id,
    correlationId: context.correlationId,
    action: 'configuracion.actualizar',
    entity: config.table,
    entityId: id,
    previousData: previous.rows[0],
    newData: result.rows[0],
    ipAddress: context.ipAddress,
  });

  return result.rows[0];
}

async function ensureOnboardingSteps(tenantId) {
  for (const step of ONBOARDING_STEPS) {
    await db.query(`
      INSERT INTO tenant_onboarding_steps (tenant_id, step_code)
      VALUES ($1, $2)
      ON CONFLICT (tenant_id, step_code) DO NOTHING
    `, [tenantId, step.code]);
  }
}

async function getOnboardingStatus(user) {
  if (!user.tenantId) {
    return { steps: [], completionPercent: 0 };
  }

  await ensureOnboardingSteps(user.tenantId);
  const result = await db.query(`
    SELECT step_code, status, completed_by, completed_at, evidence, notes
    FROM tenant_onboarding_steps
    WHERE tenant_id = $1
    ORDER BY array_position($2::text[], step_code)
  `, [user.tenantId, ONBOARDING_STEPS.map((step) => step.code)]);

  const labels = new Map(ONBOARDING_STEPS.map((step) => [step.code, step.label]));
  const steps = result.rows.map((row) => ({
    ...row,
    label: labels.get(row.step_code) || row.step_code,
  }));
  const completed = steps.filter((step) => step.status === 'completado').length;

  return {
    steps,
    completionPercent: steps.length ? Math.round((completed / steps.length) * 100) : 0,
  };
}

async function completeOnboardingStep(stepCode, payload, user, context = {}) {
  ensureWriteAllowed(user);
  if (!user.tenantId) {
    throw new AppError('El usuario no tiene empresa asociada para completar onboarding.', {
      code: 'TENANT_REQUIRED_FOR_ONBOARDING',
      statusCode: 403,
      userId: user.id,
    });
  }

  await ensureOnboardingSteps(user.tenantId);
  const result = await db.query(`
    UPDATE tenant_onboarding_steps
    SET status = $1,
        completed_by = $2,
        completed_at = now(),
        evidence = $3,
        notes = $4,
        updated_at = now()
    WHERE tenant_id = $5 AND step_code = $6
    RETURNING *
  `, [
    payload.status || 'completado',
    user.id,
    JSON.stringify(payload.evidence || {}),
    payload.notes || '',
    user.tenantId,
    stepCode,
  ]);

  if (result.rows.length === 0) {
    throw new AppError('Paso de onboarding no encontrado.', {
      code: 'ONBOARDING_STEP_NOT_FOUND',
      statusCode: 404,
      userId: user.id,
    });
  }

  await recordAudit({
    tenantId: user.tenantId,
    userId: user.id,
    correlationId: context.correlationId,
    action: 'onboarding.completar_paso',
    entity: 'tenant_onboarding_steps',
    entityId: result.rows[0].id,
    newData: result.rows[0],
    ipAddress: context.ipAddress,
  });

  return result.rows[0];
}

async function getConfigurationSummary(user) {
  const resources = {};
  for (const resource of Object.keys(RESOURCE_CONFIG)) {
    resources[resource] = await listResource(resource, user);
  }
  const onboarding = await getOnboardingStatus(user);

  return {
    resources,
    onboarding,
    qaChecklist: [
      { code: 'registro_empresa', label: 'Registro de empresa', passed: Boolean(user.tenantId) },
      { code: 'legal', label: 'Parámetros legales configurados', passed: resources.legalParameters.length > 0 },
      { code: 'organizacion', label: 'Estructura organizativa creada', passed: resources.organizationUnits.length > 0 },
      { code: 'jornada_zona', label: 'Jornada y zona configuradas', passed: resources.workShifts.length > 0 && resources.workZones.length > 0 },
      { code: 'novedades', label: 'Tipos de novedades configurados', passed: resources.noveltyTypes.length > 0 },
      { code: 'bancos', label: 'Perfil bancario disponible', passed: resources.bankProfiles.length > 0 },
    ],
  };
}

module.exports = {
  RESOURCE_CONFIG,
  ONBOARDING_STEPS,
  listResource,
  createResource,
  updateResource,
  getConfigurationSummary,
  getOnboardingStatus,
  completeOnboardingStep,
};
