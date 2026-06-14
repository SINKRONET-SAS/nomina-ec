const db = require('../config/database');
const AppError = require('../utils/AppError');
const { recordAudit } = require('./auditService');
const { getLegalParameters } = require('../config/legal-ecuador');

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
    supportsCreatedBy: false,
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

function normalizeIncomeTaxTable(value) {
  const brackets = Array.isArray(value?.brackets) ? value.brackets : [];
  if (brackets.length === 0) {
    throw new AppError('La tabla de impuesto a la renta debe incluir al menos un intervalo.', {
      code: 'INCOME_TAX_TABLE_EMPTY',
      statusCode: 400,
    });
  }

  return {
    brackets: brackets.map((bracket, index) => {
      const from = Number(bracket.from ?? bracket.fraccion_basica);
      const toValue = bracket.to ?? bracket.exceso_hasta;
      const to = toValue === null || toValue === '' || typeof toValue === 'undefined' ? null : Number(toValue);
      const baseTax = Number(bracket.baseTax ?? bracket.impuesto_fraccion_basica);
      const rate = Number(bracket.rate ?? bracket.porcentaje);

      if (!Number.isFinite(from) || from < 0) {
        throw new AppError(`La fraccion basica del intervalo ${index + 1} no es valida.`, {
          code: 'INCOME_TAX_FROM_INVALID',
          statusCode: 400,
        });
      }
      if (to !== null && (!Number.isFinite(to) || to <= from)) {
        throw new AppError(`El exceso hasta del intervalo ${index + 1} debe ser mayor que la fraccion basica.`, {
          code: 'INCOME_TAX_TO_INVALID',
          statusCode: 400,
        });
      }
      if (!Number.isFinite(baseTax) || baseTax < 0) {
        throw new AppError(`El impuesto de fraccion basica del intervalo ${index + 1} no es valido.`, {
          code: 'INCOME_TAX_BASE_TAX_INVALID',
          statusCode: 400,
        });
      }
      if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
        throw new AppError(`El porcentaje del intervalo ${index + 1} debe expresarse como decimal entre 0 y 1.`, {
          code: 'INCOME_TAX_RATE_INVALID',
          statusCode: 400,
        });
      }

      return {
        from,
        to,
        baseTax,
        rate,
        fraccion_basica: from,
        exceso_hasta: to,
        impuesto_fraccion_basica: baseTax,
        porcentaje: rate,
      };
    }),
  };
}

function normalizeLegalParameterPayload(payload) {
  if (!['income_tax_table', 'tabla_impuesto_renta'].includes(payload.parameter_key)) {
    return payload;
  }

  return {
    ...payload,
    parameter_key: 'income_tax_table',
    value: normalizeIncomeTaxTable(payload.value),
    unit: payload.unit || 'tabla_anual',
  };
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

function legalParameterPayloadsFromBase(year) {
  const parameters = getLegalParameters(year);
  const payroll = parameters.payroll || {};

  return [
    {
      parameter_key: 'sbu',
      value: { amount: Number(payroll.unifiedBaseSalary) },
      unit: 'USD',
      notes: 'Salario basico unificado cargado como parametro obligatorio revisable.',
    },
    {
      parameter_key: 'iess_aporte_personal',
      value: { amount: Number(payroll.personalIessRate) },
      unit: 'porcentaje_decimal',
      notes: 'Aporte personal IESS cargado como parametro obligatorio revisable.',
    },
    {
      parameter_key: 'iess_aporte_patronal',
      value: { amount: Number(payroll.employerIessRate) },
      unit: 'porcentaje_decimal',
      notes: 'Aporte patronal IESS cargado como parametro obligatorio revisable.',
    },
    {
      parameter_key: 'jornada_horas_mensuales',
      value: { amount: Number(payroll.monthlyWorkHours) },
      unit: 'horas',
      notes: 'Horas mensuales de referencia para calculo de valor hora.',
    },
    {
      parameter_key: 'jornada_maxima_semanal',
      value: { amount: Number(payroll.weeklyMaxHours) },
      unit: 'horas',
      notes: 'Jornada maxima semanal cargada como parametro obligatorio revisable.',
    },
    {
      parameter_key: 'provision_vacaciones',
      value: { amount: Number(payroll.vacationProvisionRate) },
      unit: 'porcentaje_decimal',
      notes: 'Provision de vacaciones cargada como parametro obligatorio revisable.',
    },
    {
      parameter_key: 'vacaciones_dias_anuales',
      value: { amount: Number(payroll.vacationDaysAfterFirstYear) },
      unit: 'dias',
      notes: 'Dias de vacaciones anuales desde el primer anio completo.',
    },
    {
      parameter_key: 'income_tax_table',
      value: {
        brackets: (parameters.incomeTax || []).map((bracket) => ({
          from: Number(bracket.from ?? bracket.fraccion_basica ?? 0),
          to: bracket.to ?? bracket.exceso_hasta ?? null,
          baseTax: Number(bracket.baseTax ?? bracket.impuesto_fraccion_basica ?? 0),
          rate: Number(bracket.rate ?? bracket.porcentaje ?? 0),
          fraccion_basica: Number(bracket.from ?? bracket.fraccion_basica ?? 0),
          exceso_hasta: bracket.to ?? bracket.exceso_hasta ?? null,
          impuesto_fraccion_basica: Number(bracket.baseTax ?? bracket.impuesto_fraccion_basica ?? 0),
          porcentaje: Number(bracket.rate ?? bracket.porcentaje ?? 0),
        })),
      },
      unit: 'tabla_anual',
      notes: 'Tabla anual de impuesto a la renta cargada como parametro obligatorio revisable.',
    },
  ];
}

async function loadMandatoryLegalParameters(year, user, context = {}) {
  ensureWriteAllowed(user);
  const periodYear = Number(year);

  if (!Number.isInteger(periodYear) || periodYear < 2000 || periodYear > 2100) {
    throw new AppError('El anio fiscal para cargar parametros legales no es valido.', {
      code: 'LEGAL_PARAMETERS_YEAR_INVALID',
      statusCode: 400,
      userId: user.id,
    });
  }

  const tenantId = user.rol === 'superadmin' && !user.tenantId ? null : resolveTenantId(user, {});
  const payloads = legalParameterPayloadsFromBase(periodYear);
  const rows = [];

  for (const payload of payloads) {
    const params = [
      tenantId,
      periodYear,
      payload.parameter_key,
      JSON.stringify(payload.value),
      payload.unit,
      `Parametros base Nomina-Ec ${periodYear}`,
      'https://www.sri.gob.ec/formularios-e-instructivos1',
      `${payload.notes} Validar contra fuente oficial vigente antes de produccion.`,
      user.id,
    ];
    const existing = await db.query(`
      SELECT id
      FROM legal_parameter_versions
      WHERE COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE($1::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
        AND country_code = 'EC'
        AND region_code = 'NACIONAL'
        AND period_year = $2
        AND parameter_key = $3
        AND valid_from = CURRENT_DATE
      LIMIT 1
    `, [tenantId, periodYear, payload.parameter_key]);

    const result = existing.rows.length > 0
      ? await db.query(`
          UPDATE legal_parameter_versions
          SET value = $4,
              unit = $5,
              source_name = $6,
              source_url = $7,
              source_date = CURRENT_DATE,
              notes = $8,
              updated_at = now()
          WHERE id = $10
          RETURNING *
        `, [...params, existing.rows[0].id])
      : await db.query(`
          INSERT INTO legal_parameter_versions (
            tenant_id, country_code, region_code, period_year, parameter_key, value, unit,
            rounding_mode, validation_status, source_name, source_url, source_date, notes, created_by
          )
          VALUES ($1, 'EC', 'NACIONAL', $2, $3, $4, $5, 'half_up_2',
            'pendiente_validacion_oficial', $6, $7, CURRENT_DATE, $8, $9)
          RETURNING *
        `, params);
    rows.push(result.rows[0]);
  }

  await recordAudit({
    tenantId,
    userId: user.id,
    correlationId: context.correlationId,
    action: 'configuracion.cargar_parametros_legales_obligatorios',
    entity: 'legal_parameter_versions',
    entityId: null,
    newData: { periodYear, count: rows.length, parameterKeys: rows.map((row) => row.parameter_key) },
    ipAddress: context.ipAddress,
  });

  if (tenantId) {
    await completeOnboardingStep('legal', {
      notes: `Parametros legales obligatorios ${periodYear} cargados para revision.`,
      evidence: { periodYear, count: rows.length },
    }, user, context);
  }

  return { periodYear, count: rows.length, rows };
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
  const normalizedPayload = resource === 'legalParameters' ? normalizeLegalParameterPayload(payload) : payload;
  const tenantId = resolveTenantId(user, normalizedPayload);
  const values = normalizePayload(config, normalizedPayload, user);
  if (config.supportsCreatedBy !== false) {
    values.created_by = user.id;
  }

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
  const normalizedPayload = resource === 'legalParameters' ? normalizeLegalParameterPayload(payload) : payload;
  const values = normalizePayload(config, normalizedPayload, user);

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
  loadMandatoryLegalParameters,
  listResource,
  createResource,
  updateResource,
  getConfigurationSummary,
  getOnboardingStatus,
  completeOnboardingStep,
};
