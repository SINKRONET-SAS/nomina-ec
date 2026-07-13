const db = require('../config/database');
const AppError = require('../utils/AppError');
const { recordAudit } = require('./auditService');
const { getTenantPlanCapabilities } = require('./planCapabilityService');
const { getLegalParameters } = require('../config/legal-ecuador');
const {
  PAYROLL_CONCEPTS,
  buildPayrollConceptCatalog,
  ensureDefaultPayrollAccountingMappings,
  ensurePayrollAccountingMappingForNoveltyConfig,
} = require('./payrollAccountingService');
const { VALID_CALCULATION_MODES, normalizeNoveltyCode } = require('./payrollNoveltyService');
const { yearInEcuador } = require('../utils/dateEcuador');

const ONBOARDING_STEPS = [
  { code: 'empresa', label: 'Datos de empresa' },
  { code: 'legal', label: 'Parámetros legales' },
  { code: 'organizacion', label: 'Estructura organizativa' },
  { code: 'cargos', label: 'Cargos y rangos salariales' },
  { code: 'jornadas', label: 'Jornadas y calendarios' },
  { code: 'zonas', label: 'Zonas de marcación' },
  { code: 'novedades', label: 'Tipos de novedades' },
  { code: 'contabilidad', label: 'Esquema contable de nómina' },
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
    columns: ['country_code', 'region_code', 'period_year', 'parameter_key', 'value', 'unit', 'rounding_mode', 'validation_status', 'source_name', 'source_url', 'source_date', 'valid_from', 'valid_to', 'notes', 'approved_by', 'approved_at'],
    orderBy: 'period_year DESC, parameter_key, updated_at DESC',
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
    columns: ['parent_id', 'unit_type', 'code', 'name', 'description', 'cost_center_code', 'manager_user_id', 'work_zone_id', 'status', 'valid_from', 'valid_to', 'metadata'],
    orderBy: 'unit_type, name',
  },
  jobPositions: {
    table: 'job_positions',
    tenantScoped: true,
    columns: ['organization_unit_id', 'code', 'name', 'description', 'salary_min', 'salary_max', 'currency', 'effective_from', 'effective_to', 'status', 'metadata'],
    orderBy: 'name',
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
  payrollAccountingMappings: {
    table: 'payroll_accounting_mappings',
    tenantScoped: true,
    columns: [
      'concept_code',
      'concept_label',
      'category',
      'entry_type',
      'debit_account_code',
      'debit_account_name',
      'credit_account_code',
      'credit_account_name',
      'cost_center_mode',
      'fixed_cost_center_code',
      'requires_employee_breakdown',
      'status',
      'valid_from',
      'valid_to',
      'metadata',
    ],
    orderBy: 'category, concept_code, entry_type, valid_from DESC',
  },
  bankProfiles: {
    table: 'perfiles_bancarios',
    tenantScoped: false,
    supportsCreatedBy: false,
    columns: ['banco_codigo', 'banco_nombre', 'delimiter', 'encoding', 'date_format', 'include_header', 'include_trailer', 'field_map', 'activo'],
    orderBy: 'banco_nombre',
  },
  bankFieldMappings: {
    table: 'bank_field_mappings',
    tenantScoped: false,
    supportsCreatedBy: false,
    columns: ['bank_profile_id', 'banco_codigo', 'canonical_field', 'bank_field_name', 'position', 'formatter', 'required', 'metadata'],
    orderBy: 'banco_codigo, position',
  },
};

const LEGAL_PARAMETER_VALIDATED_STATUS = 'validado_oficial';

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
  if (config.table === 'job_positions') {
    return normalizeJobPositionPayload(payload);
  }
  if (config.table === 'novelty_type_configs') {
    return normalizeNoveltyTypePayload(payload, user);
  }
  if (config.table === 'payroll_accounting_mappings') {
    return normalizePayrollAccountingMappingPayload(payload, user);
  }

  const values = {};
  for (const column of config.columns) {
    if (Object.prototype.hasOwnProperty.call(payload, column)) {
      values[column] = payload[column];
    }
  }

  if (config.table === 'configuration_catalogs') {
    values.scope = canUseGlobalScope(user, payload) ? 'global' : 'tenant';
    return normalizeConfigurationCatalogPayload(values, payload, user);
  }

  return values;
}

function normalizeNoveltyTypePayload(payload = {}, user) {
  const code = normalizeNoveltyCode(payload.code);
  const name = normalizeOptionalText(payload.name);
  if (!code || !name) {
    throw new AppError('El tipo de novedad requiere código y nombre.', {
      code: 'NOVELTY_TYPE_INVALID',
      statusCode: 400,
      userId: user?.id,
    });
  }

  const payrollImpact = normalizeOptionalText(payload.payroll_impact, { lowercase: true }) || 'informativo';
  if (!['ingreso', 'descuento', 'informativo'].includes(payrollImpact)) {
    throw new AppError('El impacto de nómina de la novedad no es válido.', {
      code: 'NOVELTY_PAYROLL_IMPACT_INVALID',
      statusCode: 400,
      userId: user?.id,
    });
  }

  const applicability = payload.applicability && typeof payload.applicability === 'object' ? payload.applicability : {};
  const calculationMode = String(payload.calculation_mode || applicability.calculationMode || '').trim()
    || (payrollImpact === 'informativo' ? 'informational' : 'amount');
  if (!VALID_CALCULATION_MODES.has(calculationMode)) {
    throw new AppError('La forma de cálculo de la novedad no es válida.', {
      code: 'NOVELTY_CALCULATION_MODE_INVALID',
      statusCode: 400,
      userId: user?.id,
    });
  }

  return {
    code,
    name,
    description: normalizeOptionalText(payload.description) || '',
    category: normalizeOptionalText(payload.category, { lowercase: true }) || 'ajuste',
    payroll_impact: payrollImpact,
    affects_iess: Boolean(payload.affects_iess),
    affects_income_tax: Boolean(payload.affects_income_tax),
    affects_decimos: Boolean(payload.affects_decimos),
    affects_vacation: Boolean(payload.affects_vacation),
    affects_bank_file: Boolean(payload.affects_bank_file),
    requires_evidence: Boolean(payload.requires_evidence),
    approval_flow: payload.approval_flow && typeof payload.approval_flow === 'object' ? payload.approval_flow : {},
    applicability: {
      ...applicability,
      calculationMode,
    },
    status: normalizeOptionalText(payload.status, { lowercase: true }) || 'activo',
    valid_from: normalizeOptionalDate(payload.valid_from) || `${yearInEcuador()}-01-01`,
    valid_to: normalizeOptionalDate(payload.valid_to),
  };
}

function normalizePayrollAccountingMappingPayload(payload = {}, user) {
  const conceptCode = normalizeOptionalText(payload.concept_code, { lowercase: true });
  const concept = PAYROLL_CONCEPTS.find((item) => item.code === conceptCode);
  const dynamicNoveltyConcept = !concept && conceptCode?.startsWith('novedad_')
    ? {
        code: conceptCode,
        label: normalizeOptionalText(payload.concept_label) || conceptCode,
        category: normalizeOptionalText(payload.category, { lowercase: true }) || 'ingreso',
        entryType: normalizeOptionalText(payload.entry_type, { uppercase: true }) || 'DEVENGAMIENTO',
      }
    : null;
  const resolvedConcept = concept || dynamicNoveltyConcept;
  const debitAccountCode = normalizeOptionalText(payload.debit_account_code);
  const debitAccountName = normalizeOptionalText(payload.debit_account_name);
  const creditAccountCode = normalizeOptionalText(payload.credit_account_code);
  const creditAccountName = normalizeOptionalText(payload.credit_account_name);

  if (!resolvedConcept) {
    throw new AppError('Seleccione un concepto de nómina válido para configurar su esquema contable.', {
      code: 'PAYROLL_ACCOUNTING_CONCEPT_INVALID',
      statusCode: 400,
      userId: user?.id,
    });
  }

  if (!debitAccountCode || !debitAccountName || !creditAccountCode || !creditAccountName) {
    throw new AppError('El esquema contable requiere cuentas debe/haber completas.', {
      code: 'PAYROLL_ACCOUNTING_MAPPING_INVALID',
      statusCode: 400,
      userId: user?.id,
    });
  }

  const category = resolvedConcept.category;
  const entryType = normalizeOptionalText(payload.entry_type, { uppercase: true }) || resolvedConcept.entryType || 'DEVENGAMIENTO';
  const costCenterMode = normalizeOptionalText(payload.cost_center_mode, { lowercase: true }) || 'employee';
  const status = normalizeOptionalText(payload.status, { lowercase: true }) || 'activo';
  const allowedEntryTypes = ['DEVENGAMIENTO', 'PROVISION', 'PAGO', 'AJUSTE'];
  const allowedCostCenterModes = ['employee', 'fixed', 'none'];

  if (!allowedEntryTypes.includes(entryType) || !allowedCostCenterModes.includes(costCenterMode)) {
    throw new AppError('El esquema contable incluye asiento o centro de costo no permitido.', {
      code: 'PAYROLL_ACCOUNTING_MAPPING_RULE_INVALID',
      statusCode: 400,
      userId: user?.id,
    });
  }

  return {
    concept_code: conceptCode,
    concept_label: resolvedConcept.label,
    category,
    entry_type: entryType,
    debit_account_code: debitAccountCode,
    debit_account_name: debitAccountName,
    credit_account_code: creditAccountCode,
    credit_account_name: creditAccountName,
    cost_center_mode: costCenterMode,
    fixed_cost_center_code: normalizeOptionalText(payload.fixed_cost_center_code) || '',
    requires_employee_breakdown: Boolean(payload.requires_employee_breakdown ?? true),
    status,
    valid_from: normalizeOptionalDate(payload.valid_from) || `${yearInEcuador()}-01-01`,
    valid_to: normalizeOptionalDate(payload.valid_to),
    metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {},
  };
}

function pickPayloadValue(payload, aliases) {
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(payload, alias)) {
      return payload[alias];
    }
  }
  return undefined;
}

function normalizeOptionalText(value, { uppercase = false, lowercase = false } = {}) {
  if (typeof value === 'undefined') return undefined;
  if (value === null) return null;
  const text = String(value).trim();
  if (text === '') return '';
  if (uppercase) return text.toUpperCase();
  if (lowercase) return text.toLowerCase();
  return text;
}

function normalizeOptionalDate(value) {
  if (typeof value === 'undefined') return undefined;
  if (value === null || value === '') return null;
  return String(value).slice(0, 10);
}

function normalizeOptionalNumber(value) {
  if (typeof value === 'undefined') return undefined;
  if (value === null || value === '') return null;
  return Number(value);
}

function normalizeDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeIessEstablishmentCode(value) {
  const clean = normalizeDigits(value);
  if (!clean || clean.length > 4) return '';
  return clean.padStart(4, '0');
}

function booleanFlag(value) {
  return value === true || String(value || '').toLowerCase() === 'true';
}

function safeObject(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
}

function normalizeConfigurationCatalogPayload(values, payload = {}, user) {
  if (values.catalog_type !== 'iess_establecimiento') return values;

  const payloadBody = safeObject(values.payload);
  const code = normalizeIessEstablishmentCode(
    values.code
      || payloadBody.codigoEstablecimiento
      || payloadBody.iessCodigoEstablecimiento
      || payloadBody.iess_codigo_establecimiento
  );
  if (!code) {
    throw new AppError('El establecimiento IESS requiere un codigo numerico de 1 a 4 digitos.', {
      code: 'IESS_ESTABLISHMENT_CODE_REQUIRED',
      statusCode: 400,
      userId: user?.id,
    });
  }

  const principal = booleanFlag(payloadBody.principal ?? payloadBody.isPrincipal);
  const direccion = normalizeOptionalText(payloadBody.direccion ?? payload.direccion) || '';
  return {
    ...values,
    catalog_type: 'iess_establecimiento',
    code,
    name: normalizeOptionalText(values.name) || `Establecimiento IESS ${code}`,
    description: normalizeOptionalText(values.description) || direccion,
    status: normalizeOptionalText(values.status, { lowercase: true }) || 'activo',
    payload: {
      ...payloadBody,
      codigoEstablecimiento: code,
      principal,
      isPrincipal: principal,
      direccion,
      monetizable: true,
      source: payloadBody.source || 'datos_empresa_iess',
    },
  };
}

function normalizeJobPositionPayload(payload = {}) {
  const values = {};
  const organizationUnitId = pickPayloadValue(payload, ['organization_unit_id', 'organizationUnitId']);
  const organizationUnitCode = pickPayloadValue(payload, ['organization_unit_code', 'organizationUnitCode']);
  const code = pickPayloadValue(payload, ['code', 'codigo']);
  const name = pickPayloadValue(payload, ['name', 'nombre']);
  const description = pickPayloadValue(payload, ['description', 'descripcion']);
  const salaryMin = pickPayloadValue(payload, ['salary_min', 'salaryMin', 'sueldo_minimo']);
  const salaryMax = pickPayloadValue(payload, ['salary_max', 'salaryMax', 'sueldo_maximo']);
  const currency = pickPayloadValue(payload, ['currency', 'moneda']);
  const effectiveFrom = pickPayloadValue(payload, ['effective_from', 'effectiveFrom', 'vigente_desde']);
  const effectiveTo = pickPayloadValue(payload, ['effective_to', 'effectiveTo', 'vigente_hasta']);
  const status = pickPayloadValue(payload, ['status', 'estado']);
  const metadata = pickPayloadValue(payload, ['metadata']);

  if (typeof organizationUnitId !== 'undefined') values.organization_unit_id = organizationUnitId;
  if (typeof organizationUnitCode !== 'undefined') values.organization_unit_code = normalizeOptionalText(organizationUnitCode, { uppercase: true });
  if (typeof code !== 'undefined') values.code = normalizeOptionalText(code, { uppercase: true });
  if (typeof name !== 'undefined') values.name = normalizeOptionalText(name);
  if (typeof description !== 'undefined') values.description = normalizeOptionalText(description);
  if (typeof salaryMin !== 'undefined') values.salary_min = normalizeOptionalNumber(salaryMin);
  if (typeof salaryMax !== 'undefined') values.salary_max = normalizeOptionalNumber(salaryMax);
  if (typeof currency !== 'undefined') values.currency = normalizeOptionalText(currency, { uppercase: true }) || 'USD';
  if (typeof effectiveFrom !== 'undefined') values.effective_from = normalizeOptionalDate(effectiveFrom);
  if (typeof effectiveTo !== 'undefined') values.effective_to = normalizeOptionalDate(effectiveTo);
  if (typeof status !== 'undefined') values.status = normalizeOptionalText(status, { lowercase: true });
  if (typeof metadata !== 'undefined') values.metadata = metadata || {};

  return values;
}

function assertRequiredText(value, message, code, user) {
  if (!String(value || '').trim()) {
    throw new AppError(message, {
      code,
      statusCode: 400,
      userId: user.id,
    });
  }
}

function assertMoneyRange(value, message, code, user) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new AppError(message, {
      code,
      statusCode: 400,
      userId: user.id,
    });
  }
  return amount;
}

async function ensureJobPositionOrganizationUnit(values, tenantId, user, previous = {}) {
  const code = values.organization_unit_code;
  const organizationUnitId = values.organization_unit_id || previous.organization_unit_id;

  if (!organizationUnitId && !code) {
    throw new AppError('El cargo debe estar asociado a una unidad organizativa.', {
      code: 'JOB_POSITION_ORGANIZATION_UNIT_REQUIRED',
      statusCode: 400,
      userId: user.id,
    });
  }

  if (!Object.prototype.hasOwnProperty.call(values, 'organization_unit_id') && !code && previous.id) {
    delete values.organization_unit_code;
    return;
  }

  const result = code
    ? await db.query(`
        SELECT id, code, status
        FROM organization_units
        WHERE tenant_id = $1
          AND LOWER(code) = LOWER($2)
        LIMIT 1
      `, [tenantId, code])
    : await db.query(`
        SELECT id, code, status
        FROM organization_units
        WHERE tenant_id = $1
          AND id = $2
        LIMIT 1
      `, [tenantId, organizationUnitId]);

  const organizationUnit = result.rows[0];
  if (!organizationUnit || organizationUnit.status !== 'activo') {
    throw new AppError('La unidad organizativa del cargo no existe o no esta activa para esta empresa.', {
      code: 'JOB_POSITION_ORGANIZATION_UNIT_INVALID',
      statusCode: 400,
      userId: user.id,
    });
  }

  values.organization_unit_id = organizationUnit.id;
  delete values.organization_unit_code;
}

async function validateJobPositionPayload(values, tenantId, user, previous = {}) {
  if (!tenantId) {
    throw new AppError('Los cargos deben pertenecer a una empresa.', {
      code: 'JOB_POSITION_TENANT_REQUIRED',
      statusCode: 400,
      userId: user.id,
    });
  }

  await ensureJobPositionOrganizationUnit(values, tenantId, user, previous);

  const merged = { ...previous, ...values };
  assertRequiredText(merged.code, 'El codigo del cargo es obligatorio.', 'JOB_POSITION_CODE_REQUIRED', user);
  assertRequiredText(merged.name, 'El nombre del cargo es obligatorio.', 'JOB_POSITION_NAME_REQUIRED', user);

  const salaryMin = assertMoneyRange(merged.salary_min, 'El sueldo minimo del cargo no es valido.', 'JOB_POSITION_SALARY_MIN_INVALID', user);
  const salaryMax = assertMoneyRange(merged.salary_max, 'El sueldo maximo del cargo no es valido.', 'JOB_POSITION_SALARY_MAX_INVALID', user);
  if (salaryMax < salaryMin) {
    throw new AppError('El sueldo maximo del cargo no puede ser menor que el sueldo minimo.', {
      code: 'JOB_POSITION_SALARY_RANGE_INVALID',
      statusCode: 400,
      userId: user.id,
    });
  }

  if (Object.prototype.hasOwnProperty.call(values, 'salary_min')) values.salary_min = salaryMin;
  if (Object.prototype.hasOwnProperty.call(values, 'salary_max')) values.salary_max = salaryMax;

  const allowedStatus = new Set(['activo', 'inactivo', 'archivado']);
  if (merged.status && !allowedStatus.has(String(merged.status).toLowerCase())) {
    throw new AppError('El estado del cargo no es valido.', {
      code: 'JOB_POSITION_STATUS_INVALID',
      statusCode: 400,
      userId: user.id,
    });
  }

  if (merged.effective_from && merged.effective_to && String(merged.effective_to).slice(0, 10) < String(merged.effective_from).slice(0, 10)) {
    throw new AppError('La fecha fin de vigencia no puede ser anterior a la fecha de inicio.', {
      code: 'JOB_POSITION_EFFECTIVE_RANGE_INVALID',
      statusCode: 400,
      userId: user.id,
    });
  }

  if (!merged.currency) {
    values.currency = 'USD';
  }
}

function handleConfigurationDbError(err, config, user) {
  if (config.table === 'novelty_type_configs' && err.code === '23505') {
    throw new AppError('Ya existe un tipo de novedad con ese codigo para esta empresa.', {
      code: 'NOVELTY_TYPE_CODE_DUPLICATED',
      statusCode: 409,
      userId: user.id,
    });
  }
  if (config.table === 'job_positions' && err.code === '23505') {
    throw new AppError('Ya existe un cargo con ese codigo en esta empresa.', {
      code: 'JOB_POSITION_CODE_DUPLICATED',
      statusCode: 409,
      userId: user.id,
    });
  }
  if (config.table === 'job_positions' && err.code === '23514') {
    throw new AppError('El cargo no cumple las reglas de rango salarial o vigencia.', {
      code: 'JOB_POSITION_CONSTRAINT_INVALID',
      statusCode: 400,
      userId: user.id,
    });
  }
  throw err;
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

function normalizeLegalParameterPayload(payload = {}) {
  const normalized = { ...payload };
  if (Object.prototype.hasOwnProperty.call(normalized, 'owner_validated')) {
    normalized.validation_status = normalized.owner_validated
      ? LEGAL_PARAMETER_VALIDATED_STATUS
      : 'pendiente_validacion_oficial';
    if (normalized.owner_validated && !normalized.source_name) {
      normalized.source_name = 'Validación del owner';
    }
    if (!normalized.source_url) {
      normalized.source_url = '';
    }
  }

  if (!['income_tax_table', 'tabla_impuesto_renta'].includes(normalized.parameter_key)) {
    return normalized;
  }

  return {
    ...normalized,
    parameter_key: 'income_tax_table',
    value: normalizeIncomeTaxTable(normalized.value),
    unit: normalized.unit || 'tabla_anual',
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

function canValidateLegalParameters(user) {
  return ['superadmin', 'owner'].includes(user?.rol);
}

function assertLegalParameterOwnerValidationAllowed(user, values = {}, previous = {}) {
  const previousValidated = previous.validation_status === LEGAL_PARAMETER_VALIDATED_STATUS;
  const nextStatus = Object.prototype.hasOwnProperty.call(values, 'validation_status')
    ? values.validation_status
    : previous.validation_status;
  const nextValidated = nextStatus === LEGAL_PARAMETER_VALIDATED_STATUS;

  if ((previousValidated || nextValidated) && !canValidateLegalParameters(user)) {
    throw new AppError('Solo el owner puede validar o modificar parámetros legales validados.', {
      code: 'LEGAL_PARAMETER_OWNER_VALIDATION_REQUIRED',
      statusCode: 403,
      userId: user.id,
      details: {
        previousStatus: previous.validation_status || null,
        nextStatus: nextStatus || null,
      },
    });
  }
}

function applyLegalParameterApprovalMetadata(values, user, previous = {}) {
  if (values.validation_status !== LEGAL_PARAMETER_VALIDATED_STATUS) return;
  if (previous.validation_status === LEGAL_PARAMETER_VALIDATED_STATUS && values.approved_by && values.approved_at) return;
  values.approved_by = user.id;
  values.approved_at = new Date();
}

async function ensureOrganizationUnitWorkZone(values, tenantId, user) {
  if (!values.work_zone_id) {
    throw new AppError('Cada unidad organizativa debe tener una zona de marcación asociada.', {
      code: 'ORGANIZATION_UNIT_WORK_ZONE_REQUIRED',
      statusCode: 400,
      userId: user.id,
    });
  }

  const result = await db.query(`
    SELECT id
    FROM work_zones
    WHERE id = $1
      AND tenant_id = $2
      AND status = 'activo'
    LIMIT 1
  `, [values.work_zone_id, tenantId]);

  if (result.rows.length === 0) {
    throw new AppError('La zona de marcación seleccionada no existe o no pertenece a esta empresa.', {
      code: 'ORGANIZATION_UNIT_WORK_ZONE_INVALID',
      statusCode: 400,
      userId: user.id,
    });
  }
}

function legalParameterPayloadsFromBase(year) {
  const parameters = getLegalParameters(year);
  const payroll = parameters.payroll || {};
  const defaultValidationStatus = legalValidationStatusFromBase(parameters);

  return [
    {
      parameter_key: 'sbu',
      value: { amount: Number(payroll.unifiedBaseSalary) },
      unit: 'USD',
      notes: 'Salario básico unificado cargado como parámetro obligatorio revisable.',
    },
    {
      parameter_key: 'iess_aporte_personal',
      value: { amount: Number(payroll.personalIessRate) },
      unit: 'porcentaje_decimal',
      sourceName: 'IESS - Servicios y prestaciones',
      sourceUrl: 'https://www.iess.gob.ec/en/web/afiliado/servicios-y-prestaciones',
      validationStatus: 'validado_oficial',
      notes: 'Aporte personal IESS confirmado por fuente oficial IESS: afiliado 9.45% del sueldo o salario.',
    },
    {
      parameter_key: 'iess_aporte_patronal',
      value: { amount: Number(payroll.employerIessRate) },
      unit: 'porcentaje_decimal',
      sourceName: 'IESS - Servicios y prestaciones',
      sourceUrl: 'https://www.iess.gob.ec/en/web/afiliado/servicios-y-prestaciones',
      validationStatus: 'validado_oficial',
      notes: 'Aporte patronal IESS confirmado por fuente oficial IESS: empleador 11.15% del salario del trabajador.',
    },
    {
      parameter_key: 'jornada_horas_mensuales',
      value: { amount: Number(payroll.monthlyWorkHours) },
      unit: 'horas',
      notes: 'Horas mensuales de referencia para cálculo de valor hora.',
    },
    {
      parameter_key: 'jornada_maxima_semanal',
      value: { amount: Number(payroll.weeklyMaxHours) },
      unit: 'horas',
      notes: 'Jornada máxima semanal cargada como parámetro obligatorio revisable.',
    },
    {
      parameter_key: 'horas_extra_limite_semanal',
      value: { amount: Number(payroll.maxWeeklyOvertimeHours ?? 12) },
      unit: 'horas',
      notes: 'Limite semanal de horas suplementarias cargado como parametro obligatorio revisable.',
    },
    {
      parameter_key: 'horas_extra_recargo_suplementaria',
      value: {
        multiplier: Number(payroll.overtimeSupplementMultiplier ?? 1.5),
        rate: Number((payroll.overtimeSupplementMultiplier ?? 1.5) - 1),
        calculationBase: 'valor_hora',
      },
      unit: 'regla',
      notes: 'Horas suplementarias: multiplicador parametrizable sobre valor hora.',
    },
    {
      parameter_key: 'horas_extra_recargo_extraordinaria',
      value: {
        multiplier: Number(payroll.overtimeExtraordinaryMultiplier ?? 2),
        rate: Number((payroll.overtimeExtraordinaryMultiplier ?? 2) - 1),
        calculationBase: 'valor_hora',
      },
      unit: 'regla',
      notes: 'Horas extraordinarias: multiplicador parametrizable sobre valor hora.',
    },
    {
      parameter_key: 'provision_vacaciones',
      value: { amount: Number(payroll.vacationProvisionRate) },
      unit: 'porcentaje_decimal',
      notes: 'Provisión de vacaciones cargada como parámetro obligatorio revisable.',
    },
    {
      parameter_key: 'decimo_tercero',
      value: {
        rate: Number(payroll.thirteenthSalaryProvisionRate ?? (1 / 12)),
        paymentMonth: Number(payroll.thirteenthSalaryPaymentMonth ?? 12),
        calculationBase: 'remuneracion_anual',
      },
      unit: 'regla',
      notes: 'Décimo tercer sueldo: doceava parte de remuneraciones del periodo anual; pago hasta diciembre según Código del Trabajo.',
    },
    {
      parameter_key: 'decimo_cuarto_costa_galapagos',
      value: {
        amount: Number(payroll.unifiedBaseSalary),
        rate: Number(payroll.fourteenthSalaryProvisionRate ?? (1 / 12)),
        paymentMonth: Number(payroll.fourteenthSalaryCostaGalapagosPaymentMonth ?? 3),
        region: 'costa_galapagos',
        calculationBase: 'sbu_vigente',
      },
      unit: 'regla',
      notes: 'Décimo cuarto sueldo Costa/Galápagos: equivalente a un SBU anual, pago regional en marzo; validar calendario vigente.',
    },
    {
      parameter_key: 'decimo_cuarto_sierra_amazonia',
      value: {
        amount: Number(payroll.unifiedBaseSalary),
        rate: Number(payroll.fourteenthSalaryProvisionRate ?? (1 / 12)),
        paymentMonth: Number(payroll.fourteenthSalarySierraAmazoniaPaymentMonth ?? 8),
        region: 'sierra_amazonia',
        calculationBase: 'sbu_vigente',
      },
      unit: 'regla',
      notes: 'Décimo cuarto sueldo Sierra/Amazonía: equivalente a un SBU anual, pago regional en agosto; validar calendario vigente.',
    },
    {
      parameter_key: 'fondo_reserva',
      value: {
        rate: Number(payroll.reserveFundRate ?? (1 / 12)),
        startsAfterMonths: Number(payroll.reserveFundStartsAfterMonths ?? 12),
        paymentMode: 'pago_mensual_o_deposito_iess',
        calculationBase: 'remuneracion_aportada',
      },
      unit: 'regla',
      notes: 'Fondo de reserva: provisión desde el primer año cumplido; puede pagarse al trabajador o depositarse en IESS según elección.',
    },
    {
      parameter_key: 'vacaciones_dias_anuales',
      value: { amount: Number(payroll.vacationDaysAfterFirstYear) },
      unit: 'días',
      notes: 'Días de vacaciones anuales desde el primer año completo.',
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
      notes: 'Tabla anual de impuesto a la renta cargada como parámetro obligatorio revisable.',
    },
  ].map((payload) => ({
    ...payload,
    validationStatus: payload.validationStatus || defaultValidationStatus,
  }));
}

function legalValidationStatusFromBase(parameters = {}) {
  const sourceStatus = String(parameters.sourceStatus || '').trim().toLowerCase();
  const pendingValidation = Array.isArray(parameters.pendingValidation)
    ? parameters.pendingValidation
    : [];
  return ['validado', 'validado_oficial'].includes(sourceStatus) && pendingValidation.length === 0
    ? 'validado_oficial'
    : 'pendiente_validacion_oficial';
}

async function loadMandatoryLegalParameters(year, user, context = {}) {
  ensureWriteAllowed(user);
  if (!canValidateLegalParameters(user)) {
    throw new AppError('Solo el owner puede cargar y validar parámetros legales obligatorios.', {
      code: 'LEGAL_PARAMETER_OWNER_VALIDATION_REQUIRED',
      statusCode: 403,
      userId: user.id,
    });
  }
  const periodYear = Number(year);

  if (!Number.isInteger(periodYear) || periodYear < 2000 || periodYear > 2100) {
    throw new AppError('El año fiscal para cargar parámetros legales no es válido.', {
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
      payload.sourceName || `Parámetros base SKNOMINA ${periodYear}`,
      payload.sourceUrl || 'https://www.sri.gob.ec/formularios-e-instructivos1',
      payload.validationStatus || 'pendiente_validacion_oficial',
      payload.validationStatus === 'validado_oficial'
        ? payload.notes
        : `${payload.notes} Validar contra fuente oficial vigente antes de producción.`,
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
        AND valid_to IS NULL
      ORDER BY valid_from DESC, updated_at DESC, created_at DESC
      LIMIT 1
    `, [tenantId, periodYear, payload.parameter_key]);

    const result = existing.rows.length > 0
      ? await db.query(`
          UPDATE legal_parameter_versions
          SET value = $4,
              unit = $5,
              source_name = $6,
              source_url = $7,
              validation_status = $8,
              source_date = CURRENT_DATE,
              notes = $9,
              updated_at = now()
          WHERE id = $11
          RETURNING *
        `, [...params, existing.rows[0].id])
      : await db.query(`
          INSERT INTO legal_parameter_versions (
            tenant_id, country_code, region_code, period_year, parameter_key, value, unit,
            rounding_mode, validation_status, source_name, source_url, source_date, notes, created_by
          )
          VALUES ($1, 'EC', 'NACIONAL', $2, $3, $4, $5, 'half_up_2',
            $8, $6, $7, CURRENT_DATE, $9, $10)
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
      notes: `Parámetros legales obligatorios ${periodYear} cargados para revisión.`,
      evidence: { periodYear, count: rows.length },
    }, user, context);
  }

  return { periodYear, count: rows.length, rows };
}


async function syncLegalParametersFromGlobal(year, user, context = {}, options = {}) {
  ensureWriteAllowed(user);
  const periodYear = Number(year);

  if (!Number.isInteger(periodYear) || periodYear < 2000 || periodYear > 2100) {
    throw new AppError('El año fiscal para sincronizar parámetros legales no es válido.', {
      code: 'LEGAL_PARAMETERS_YEAR_INVALID',
      statusCode: 400,
      userId: user.id,
    });
  }

  const explicitTenantId = options.tenantId || null;
  const targetTenantIds = [];

  if (user.rol === 'superadmin' && options.allTenants) {
    const tenants = await db.query(`
      SELECT id
      FROM tenants
      WHERE activo = true
      ORDER BY created_at ASC
    `);
    targetTenantIds.push(...tenants.rows.map((row) => row.id));
  } else if (user.rol === 'superadmin' && explicitTenantId) {
    targetTenantIds.push(explicitTenantId);
  } else {
    targetTenantIds.push(resolveTenantId(user, {}));
  }

  if (targetTenantIds.length === 0) {
    throw new AppError('No existen empresas activas para sincronizar parámetros legales.', {
      code: 'LEGAL_PARAMETERS_SYNC_NO_TENANTS',
      statusCode: 404,
      userId: user.id,
    });
  }

  const globalResult = await db.query(`
    SELECT *
    FROM legal_parameter_versions
    WHERE tenant_id IS NULL
      AND country_code = 'EC'
      AND region_code = 'NACIONAL'
      AND period_year = $1
      AND valid_to IS NULL
    ORDER BY parameter_key, valid_from DESC, updated_at DESC, created_at DESC
  `, [periodYear]);

  if (globalResult.rows.length === 0) {
    throw new AppError('No hay parámetros legales globales publicados para el año indicado.', {
      code: 'LEGAL_PARAMETERS_GLOBAL_SOURCE_EMPTY',
      statusCode: 404,
      userId: user.id,
    });
  }

  const synced = [];
  for (const tenantId of targetTenantIds) {
    const tenantRows = [];
    for (const source of globalResult.rows) {
      const params = [
        tenantId,
        source.country_code,
        source.region_code,
        source.period_year,
        source.parameter_key,
        JSON.stringify(source.value),
        source.unit,
        source.rounding_mode,
        source.validation_status,
        source.source_name,
        source.source_url,
        source.source_date,
        source.valid_from,
        source.notes,
        source.approved_by,
        source.approved_at,
        user.id,
      ];
      const result = await db.query(`
        INSERT INTO legal_parameter_versions (
          tenant_id, country_code, region_code, period_year, parameter_key, value, unit,
          rounding_mode, validation_status, source_name, source_url, source_date, valid_from,
          valid_to, notes, approved_by, approved_at, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NULL, $14, $15, $16, $17)
        ON CONFLICT (
          COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
          country_code, region_code, period_year, parameter_key
        ) WHERE valid_to IS NULL
        DO UPDATE SET
          value = EXCLUDED.value,
          unit = EXCLUDED.unit,
          rounding_mode = EXCLUDED.rounding_mode,
          validation_status = EXCLUDED.validation_status,
          source_name = EXCLUDED.source_name,
          source_url = EXCLUDED.source_url,
          source_date = EXCLUDED.source_date,
          valid_from = EXCLUDED.valid_from,
          notes = CONCAT(EXCLUDED.notes, ' Sincronizado desde parámetros globales por SUPERADMIN.'),
          approved_by = EXCLUDED.approved_by,
          approved_at = EXCLUDED.approved_at,
          updated_at = now()
        RETURNING *
      `, params);
      tenantRows.push(result.rows[0]);
    }

    await recordAudit({
      tenantId,
      userId: user.id,
      correlationId: context.correlationId,
      action: 'configuracion.sincronizar_parametros_legales_globales',
      entity: 'legal_parameter_versions',
      entityId: null,
      newData: { periodYear, count: tenantRows.length, parameterKeys: tenantRows.map((row) => row.parameter_key) },
      ipAddress: context.ipAddress,
    });
    synced.push({ tenantId, count: tenantRows.length, parameterKeys: tenantRows.map((row) => row.parameter_key) });
  }

  return { periodYear, sourceScope: 'global', tenantCount: synced.length, parameterCount: globalResult.rows.length, synced };
}

async function listResource(resource, user) {
  const config = getResourceConfig(resource);
  const tenantId = user.tenantId || null;
  const params = [];
  let where = '';

  if (config.table === 'legal_parameter_versions') {
    if (user.rol === 'superadmin' && !tenantId) {
      const result = await db.query(`
        SELECT DISTINCT ON (
          COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
          country_code,
          region_code,
          period_year,
          parameter_key
        ) *
        FROM legal_parameter_versions
        WHERE valid_to IS NULL
        ORDER BY
          COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
          country_code,
          region_code,
          period_year,
          parameter_key,
          valid_from DESC,
          updated_at DESC,
          created_at DESC
      `);
      return result.rows;
    }

    const result = await db.query(`
      SELECT DISTINCT ON (country_code, region_code, period_year, parameter_key) *
      FROM legal_parameter_versions
      WHERE valid_to IS NULL
        AND (tenant_id = $1 OR tenant_id IS NULL)
      ORDER BY
        country_code,
        region_code,
        period_year,
        parameter_key,
        tenant_id NULLS LAST,
        valid_from DESC,
        updated_at DESC,
        created_at DESC
    `, [tenantId]);
    return result.rows;
  }

  if (config.table === 'novelty_type_configs') {
    if (user.rol === 'superadmin' && !tenantId) {
      const result = await db.query(`
        SELECT DISTINCT ON (
          COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
          LOWER(BTRIM(code))
        ) *
        FROM novelty_type_configs
        ORDER BY
          COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
          LOWER(BTRIM(code)),
          CASE WHEN status = 'activo' THEN 0 ELSE 1 END,
          CASE WHEN valid_to IS NULL THEN 0 ELSE 1 END,
          valid_from DESC,
          updated_at DESC,
          created_at DESC
      `);
      return result.rows;
    }

    const result = await db.query(`
      SELECT DISTINCT ON (LOWER(BTRIM(code))) *
      FROM novelty_type_configs
      WHERE tenant_id = $1 OR tenant_id IS NULL
      ORDER BY
        LOWER(BTRIM(code)),
        CASE WHEN tenant_id = $1 THEN 0 ELSE 1 END,
        CASE WHEN status = 'activo' THEN 0 ELSE 1 END,
        CASE WHEN valid_to IS NULL THEN 0 ELSE 1 END,
        valid_from DESC,
        updated_at DESC,
        created_at DESC
    `, [tenantId]);
    return result.rows;
  }

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

async function synchronizeUnifiedAccountingMatrix(config, record, user, context = {}) {
  if (config.table !== 'novelty_type_configs') return;

  const tenantId = record.tenant_id || user.tenantId || null;
  if (!tenantId || String(record.status || '').toLowerCase() !== 'activo') return;
  if (String(record.payroll_impact || '').toLowerCase() === 'informativo') return;

  const mappings = await ensurePayrollAccountingMappingForNoveltyConfig(tenantId, record, { userId: user.id });
  if (mappings.length === 0) return;

  await recordAudit({
    tenantId,
    userId: user.id,
    correlationId: context.correlationId,
    action: 'configuracion.sincronizar_matriz_contable_nomina',
    entity: 'payroll_accounting_mappings',
    entityId: null,
    newData: {
      source: 'novelty_type_configs',
      noveltyCode: record.code,
      conceptCodes: mappings.map((mapping) => mapping.concept_code),
    },
    ipAddress: context.ipAddress,
  });
}

function isIessEstablishmentCatalog(values = {}) {
  return values.catalog_type === 'iess_establecimiento';
}

async function assertIessEstablishmentLimitAvailable(values, tenantId, user, currentId = null) {
  if (!isIessEstablishmentCatalog(values) || !tenantId) return;
  if (String(values.status || 'activo').toLowerCase() !== 'activo') return;

  const capabilities = await getTenantPlanCapabilities(tenantId);
  const rawLimit = Number(capabilities.limits?.iessEstablishmentsMax ?? 1);
  if (rawLimit === -1) return;

  const limit = Number.isFinite(rawLimit) ? rawLimit : 1;
  const params = [tenantId];
  let exclusion = '';
  if (currentId) {
    params.push(currentId);
    exclusion = ` AND id <> $${params.length}`;
  }

  const result = await db.query(`
    SELECT COUNT(*)::int AS count
    FROM configuration_catalogs
    WHERE tenant_id = $1
      AND catalog_type = 'iess_establecimiento'
      AND status = 'activo'
      ${exclusion}
  `, params);

  if (Number(result.rows[0]?.count || 0) >= limit) {
    throw new AppError('El plan actual no permite registrar mas establecimientos IESS activos.', {
      code: 'PLAN_IESS_ESTABLISHMENT_LIMIT_REACHED',
      statusCode: 402,
      userId: user.id,
      details: {
        limit,
        current: Number(result.rows[0]?.count || 0),
      },
    });
  }
}

async function ensureSinglePrincipalIessEstablishment(config, record) {
  if (config.table !== 'configuration_catalogs' || !isIessEstablishmentCatalog(record)) return;
  const payload = safeObject(record.payload);
  if (!booleanFlag(payload.principal) && !booleanFlag(payload.isPrincipal)) return;
  if (!record.tenant_id || !record.id) return;

  await db.query(`
    UPDATE configuration_catalogs
    SET payload = jsonb_set(
          jsonb_set(COALESCE(payload, '{}'::jsonb), '{principal}', 'false'::jsonb, true),
          '{isPrincipal}', 'false'::jsonb,
          true
        ),
        updated_at = now()
    WHERE tenant_id = $1
      AND catalog_type = 'iess_establecimiento'
      AND id <> $2
  `, [record.tenant_id, record.id]);
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

  if (config.table === 'organization_units') {
    await ensureOrganizationUnitWorkZone(values, tenantId, user);
  }
  if (config.table === 'job_positions') {
    await validateJobPositionPayload(values, tenantId, user);
  }
  if (config.table === 'legal_parameter_versions') {
    assertLegalParameterOwnerValidationAllowed(user, values);
    applyLegalParameterApprovalMetadata(values, user);
  }
  await assertIessEstablishmentLimitAvailable(values, tenantId, user);

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

  if (config.table === 'legal_parameter_versions') {
    const existing = await db.query(`
      SELECT id, validation_status, approved_by, approved_at
      FROM legal_parameter_versions
      WHERE COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE($1::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
        AND country_code = $2
        AND region_code = $3
        AND period_year = $4
        AND parameter_key = $5
        AND valid_to IS NULL
      ORDER BY valid_from DESC, updated_at DESC, created_at DESC
      LIMIT 1
    `, [
      values.tenant_id || null,
      values.country_code || 'EC',
      values.region_code || 'NACIONAL',
      Number(values.period_year),
      values.parameter_key,
    ]);

    if (existing.rows.length > 0) {
      assertLegalParameterOwnerValidationAllowed(user, values, existing.rows[0]);
      applyLegalParameterApprovalMetadata(values, user, existing.rows[0]);
      const updateColumns = columns.filter((column) => column !== 'created_by');
      const updateParams = updateColumns.map((column) => {
        const value = values[column];
        if (value && typeof value === 'object' && !(value instanceof Date)) {
          return JSON.stringify(value);
        }
        return value;
      });
      updateParams.push(existing.rows[0].id);
      const setClause = updateColumns.map((column, index) => `${column} = $${index + 1}`).join(', ');
      const result = await db.query(
        `UPDATE legal_parameter_versions
         SET ${setClause}, updated_at = now()
         WHERE id = $${updateParams.length}
         RETURNING *`,
        updateParams
      );

      await recordAudit({
        tenantId,
        userId: user.id,
        correlationId: context.correlationId,
        action: 'configuracion.actualizar_parametro_legal_activo',
        entity: config.table,
        entityId: result.rows[0].id,
        newData: result.rows[0],
        ipAddress: context.ipAddress,
      });

      return result.rows[0];
    }
  }

  let result;
  try {
    result = await db.query(
      `INSERT INTO ${config.table} (${columns.join(', ')})
       VALUES (${placeholders.join(', ')})
       RETURNING *`,
      params
    );
  } catch (err) {
    handleConfigurationDbError(err, config, user);
  }

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

  await synchronizeUnifiedAccountingMatrix(config, result.rows[0], user, context);
  await ensureSinglePrincipalIessEstablishment(config, result.rows[0]);

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

  if (config.table === 'organization_units') {
    await ensureOrganizationUnitWorkZone({
      ...previous.rows[0],
      ...values,
    }, previous.rows[0].tenant_id || user.tenantId, user);
  }
  if (config.table === 'job_positions') {
    await validateJobPositionPayload(values, previous.rows[0].tenant_id || user.tenantId, user, previous.rows[0]);
  }
  if (config.table === 'legal_parameter_versions') {
    assertLegalParameterOwnerValidationAllowed(user, values, previous.rows[0]);
    applyLegalParameterApprovalMetadata(values, user, previous.rows[0]);
  }
  await assertIessEstablishmentLimitAvailable({
    ...previous.rows[0],
    ...values,
  }, previous.rows[0].tenant_id || user.tenantId, user, id);

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

  let result;
  try {
    result = await db.query(
      `UPDATE ${config.table}
       SET ${setClause}, updated_at = now()
       WHERE ${updateWhere}
       RETURNING *`,
      params
    );
  } catch (err) {
    handleConfigurationDbError(err, config, user);
  }

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

  await synchronizeUnifiedAccountingMatrix(config, result.rows[0], user, context);
  await ensureSinglePrincipalIessEstablishment(config, result.rows[0]);

  return result.rows[0];
}

async function countUsage(label, sql, params) {
  const result = await db.query(sql, params);
  return {
    label,
    count: Number(result.rows[0]?.count || 0),
  };
}

async function usageChecksForResource(config, record) {
  const tenantId = record.tenant_id || null;
  const code = record.code || record.banco_codigo || record.parameter_key || '';

  if (config.table === 'legal_parameter_versions') {
    return [
      await countUsage(
        'nominas',
        'SELECT COUNT(*)::int AS count FROM nominas WHERE anio = $1 AND ($2::uuid IS NULL OR tenant_id = $2)',
        [Number(record.period_year), tenantId]
      ),
    ];
  }

  if (config.table === 'novelty_type_configs') {
    return [
      await countUsage(
        'novedades_asistencia',
        'SELECT COUNT(*)::int AS count FROM novedades_asistencia WHERE ($1::uuid IS NULL OR tenant_id = $1) AND LOWER(tipo_novedad::text) = LOWER($2)',
        [tenantId, code]
      ),
      await countUsage(
        'novelty_batches',
        'SELECT COUNT(*)::int AS count FROM novelty_batches WHERE ($1::uuid IS NULL OR tenant_id = $1) AND LOWER(tipo_novedad::text) = LOWER($2)',
        [tenantId, code]
      ),
    ];
  }

  if (config.table === 'organization_units') {
    return [
      await countUsage(
        'empleados',
        'SELECT COUNT(*)::int AS count FROM empleados WHERE tenant_id = $1 AND LOWER(unidad_organizativa_codigo) = LOWER($2)',
        [tenantId, code]
      ),
      await countUsage(
        'marcaciones',
        'SELECT COUNT(*)::int AS count FROM marcaciones WHERE tenant_id = $1 AND organization_unit_id = $2',
        [tenantId, record.id]
      ),
      await countUsage(
        'unidades_hijas',
        'SELECT COUNT(*)::int AS count FROM organization_units WHERE tenant_id = $1 AND parent_id = $2',
        [tenantId, record.id]
      ),
    ];
  }

  if (config.table === 'job_positions') {
    return [
      await countUsage(
        'empleados',
        'SELECT COUNT(*)::int AS count FROM empleados WHERE tenant_id = $1 AND position_id = $2',
        [tenantId, record.id]
      ),
      await countUsage(
        'nominas',
        `SELECT COUNT(*)::int AS count
         FROM nominas n
         INNER JOIN empleados e ON e.id = n.empleado_id
         WHERE n.tenant_id = $1
           AND e.position_id = $2`,
        [tenantId, record.id]
      ),
      await countUsage(
        'documentos_legales',
        `SELECT COUNT(*)::int AS count
         FROM documentos_legales d
         INNER JOIN empleados e ON e.id = d.empleado_id
         WHERE d.tenant_id = $1
           AND e.position_id = $2`,
        [tenantId, record.id]
      ),
      await countUsage(
        'lotes_novedades',
        `SELECT COUNT(*)::int AS count
         FROM novelty_batches
         WHERE tenant_id = $1
           AND scope_type = 'position'
           AND (
             scope_value = $2
             OR LOWER(scope_value) = LOWER($3)
             OR LOWER(scope_value) = LOWER($4)
           )`,
        [tenantId, record.id, record.code || '', record.name || '']
      ),
    ];
  }

  if (config.table === 'payroll_accounting_mappings') {
    return [
      await countUsage(
        'lineas_calculo_nomina',
        'SELECT COUNT(*)::int AS count FROM payroll_calculation_lines WHERE tenant_id = $1 AND LOWER(concept_code) = LOWER($2)',
        [tenantId, record.concept_code || '']
      ),
    ];
  }

  if (config.table === 'work_zones') {
    return [
      await countUsage(
        'organization_units',
        'SELECT COUNT(*)::int AS count FROM organization_units WHERE tenant_id = $1 AND work_zone_id = $2',
        [tenantId, record.id]
      ),
      await countUsage(
        'empleados',
        'SELECT COUNT(*)::int AS count FROM empleados WHERE tenant_id = $1 AND LOWER(zona_marcacion_codigo) = LOWER($2)',
        [tenantId, code]
      ),
      await countUsage(
        'marcaciones',
        'SELECT COUNT(*)::int AS count FROM marcaciones WHERE tenant_id = $1 AND work_zone_id = $2',
        [tenantId, record.id]
      ),
    ];
  }

  if (config.table === 'work_shifts') {
    return [
      await countUsage(
        'empleados',
        'SELECT COUNT(*)::int AS count FROM empleados WHERE tenant_id = $1 AND LOWER(jornada_codigo) = LOWER($2)',
        [tenantId, code]
      ),
      await countUsage(
        'organization_units',
        `SELECT COUNT(*)::int AS count
         FROM organization_units
         WHERE tenant_id = $1
           AND (
             metadata->>'workShiftId' = $2
             OR LOWER(COALESCE(metadata->>'workShiftCode', '')) = LOWER($3)
           )`,
        [tenantId, record.id, code]
      ),
      await countUsage(
        'marcaciones',
        'SELECT COUNT(*)::int AS count FROM marcaciones WHERE tenant_id = $1 AND work_shift_id = $2',
        [tenantId, record.id]
      ),
    ];
  }

  if (config.table === 'perfiles_bancarios') {
    return [
      await countUsage(
        'empleados',
        'SELECT COUNT(*)::int AS count FROM empleados WHERE ($1::uuid IS NULL OR tenant_id = $1) AND UPPER(banco) = UPPER($2)',
        [tenantId, code]
      ),
      await countUsage(
        'bank_field_mappings',
        `SELECT COUNT(*)::int AS count
         FROM bank_field_mappings
         WHERE ($1::uuid IS NULL OR tenant_id = $1)
           AND (bank_profile_id = $2 OR UPPER(banco_codigo) = UPPER($3))`,
        [tenantId, record.id, code]
      ),
    ];
  }

  return [];
}

async function ensureResourceCanBeDeleted(config, record, user) {
  const usages = (await usageChecksForResource(config, record)).filter((usage) => usage.count > 0);
  if (usages.length === 0) return;

  throw new AppError('No se puede eliminar este registro porque ya tiene consumos operativos. Modificalo o dejalo inactivo si aplica.', {
    code: 'CONFIG_RESOURCE_IN_USE',
    statusCode: 409,
    userId: user.id,
    details: {
      table: config.table,
      id: record.id,
      usages,
    },
  });
}

async function deleteResource(resource, id, user, context = {}) {
  ensureWriteAllowed(user);
  const config = getResourceConfig(resource);
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
    throw new AppError('Registro de configuracion no encontrado.', {
      code: 'CONFIG_NOT_FOUND',
      statusCode: 404,
      userId: user.id,
    });
  }

  if (config.table === 'legal_parameter_versions') {
    assertLegalParameterOwnerValidationAllowed(user, {}, previous.rows[0]);
  }

  await ensureResourceCanBeDeleted(config, previous.rows[0], user);

  const deleteParams = [id];
  let deleteWhere = 'id = $1';
  if (user.rol !== 'superadmin') {
    deleteParams.push(user.tenantId);
    deleteWhere += ` AND tenant_id = $${deleteParams.length}`;
  }

  try {
    await db.query(`DELETE FROM ${config.table} WHERE ${deleteWhere}`, deleteParams);
  } catch (err) {
    if (err.code === '23503') {
      throw new AppError('No se puede eliminar este registro porque esta referenciado por otros datos operativos.', {
        code: 'CONFIG_RESOURCE_IN_USE',
        statusCode: 409,
        userId: user.id,
        details: { table: config.table, id },
      });
    }
    throw err;
  }

  await recordAudit({
    tenantId: previous.rows[0].tenant_id || user.tenantId || null,
    userId: user.id,
    correlationId: context.correlationId,
    action: 'configuracion.eliminar',
    entity: config.table,
    entityId: id,
    previousData: previous.rows[0],
    ipAddress: context.ipAddress,
  });

  return {
    deleted: true,
    resource,
    id,
  };
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
  if (user.tenantId) {
    await ensureDefaultPayrollAccountingMappings(user.tenantId, { userId: user.id });
  }

  const resources = {};
  for (const resource of Object.keys(RESOURCE_CONFIG)) {
    resources[resource] = await listResource(resource, user);
  }
  resources.payrollConcepts = buildPayrollConceptCatalog(resources.noveltyTypes);
  const onboarding = await getOnboardingStatus(user);

  return {
    resources,
    onboarding,
    qaChecklist: [
      { code: 'registro_empresa', label: 'Registro de empresa', passed: Boolean(user.tenantId) },
      { code: 'legal', label: 'Parámetros legales configurados', passed: resources.legalParameters.length > 0 },
      { code: 'organizacion', label: 'Estructura organizativa creada', passed: resources.organizationUnits.length > 0 },
      { code: 'cargos', label: 'Cargos y rangos salariales configurados', passed: resources.jobPositions.length > 0 },
      { code: 'jornada_zona', label: 'Jornada y zona configuradas', passed: resources.workShifts.length > 0 && resources.workZones.length > 0 },
      { code: 'novedades', label: 'Tipos de novedades configurados', passed: resources.noveltyTypes.length > 0 },
      { code: 'contabilidad_nomina', label: 'Esquema contable de nómina configurado', passed: resources.payrollAccountingMappings.length > 0 },
      { code: 'bancos', label: 'Perfil bancario disponible', passed: resources.bankProfiles.length > 0 },
      { code: 'homologacion_bancaria', label: 'Homologación bancaria configurada', passed: resources.bankFieldMappings.length > 0 },
    ],
  };
}

module.exports = {
  RESOURCE_CONFIG,
  ONBOARDING_STEPS,
  loadMandatoryLegalParameters,
  syncLegalParametersFromGlobal,
  listResource,
  createResource,
  updateResource,
  deleteResource,
  getConfigurationSummary,
  getOnboardingStatus,
  completeOnboardingStep,
};
