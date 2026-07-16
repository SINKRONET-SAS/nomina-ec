// ============================================================
// CRN26 - Novedades configurables para calculo de nomina
// ============================================================
const db = require('../config/database');
const AppError = require('../utils/AppError');
const { roundMoney } = require('../utils/money');

const DEFAULT_NOVELTY_RULES = {
  hora_extra_50: {
    name: 'Hora extra 50%',
    payrollImpact: 'ingreso',
    calculationMode: 'minutes_hourly_1_5',
    conceptCode: 'horas_extra_50',
    affectsIess: true,
    affectsIncomeTax: true,
    affectsDecimos: true,
    affectsVacation: true,
    affectsBankFile: true,
  },
  hora_extra_100: {
    name: 'Hora extra 100%',
    payrollImpact: 'ingreso',
    calculationMode: 'minutes_hourly_2',
    conceptCode: 'horas_extra_100',
    affectsIess: true,
    affectsIncomeTax: true,
    affectsDecimos: true,
    affectsVacation: true,
    affectsBankFile: true,
  },
  bono_desempeno: {
    name: 'Bono de desempeno',
    payrollImpact: 'ingreso',
    calculationMode: 'amount',
    conceptCode: 'bono_desempeno',
    affectsIess: true,
    affectsIncomeTax: true,
    affectsDecimos: true,
    affectsVacation: true,
    affectsBankFile: true,
  },
  comision: {
    name: 'Comisiones',
    payrollImpact: 'ingreso',
    calculationMode: 'amount',
    conceptCode: 'comision',
    affectsIess: true,
    affectsIncomeTax: true,
    affectsDecimos: true,
    affectsVacation: true,
    affectsBankFile: true,
  },
  falta: {
    name: 'Falta injustificada',
    payrollImpact: 'descuento',
    calculationMode: 'absence_day',
    conceptCode: 'descuento_faltas',
    affectsBankFile: true,
  },
  atraso: {
    name: 'Atraso',
    payrollImpact: 'descuento',
    calculationMode: 'minutes_hourly',
    affectsBankFile: true,
  },
  salida_temprana: {
    name: 'Salida temprana',
    payrollImpact: 'descuento',
    calculationMode: 'minutes_hourly',
    affectsBankFile: true,
  },
  permiso_con_sueldo: {
    name: 'Permiso con sueldo',
    payrollImpact: 'informativo',
    calculationMode: 'informational',
    conceptCode: 'permiso_con_sueldo',
    affectsBankFile: false,
  },
  permiso_sin_sueldo: {
    name: 'Permiso sin sueldo',
    payrollImpact: 'descuento',
    calculationMode: 'absence_day',
    conceptCode: 'descuento_permiso_sin_sueldo',
    affectsBankFile: true,
  },
  anticipo_movilizacion: {
    name: 'Anticipo movilización',
    payrollImpact: 'ingreso',
    calculationMode: 'amount',
    conceptCode: 'anticipo_movilizacion',
    affectsIess: false,
    affectsIncomeTax: false,
    affectsDecimos: false,
    affectsVacation: false,
    affectsBankFile: true,
  },
};

const VALID_PAYROLL_IMPACTS = new Set(['ingreso', 'descuento', 'informativo']);
const VALID_CALCULATION_MODES = new Set([
  'amount',
  'minutes_hourly',
  'minutes_hourly_1_5',
  'minutes_hourly_2',
  'absence_day',
  'informational',
]);

function normalizeNoveltyCode(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function conceptCodeForNovelty(code, config = {}) {
  const normalized = normalizeNoveltyCode(code || config.code);
  const defaultRule = DEFAULT_NOVELTY_RULES[normalized];
  if (defaultRule?.conceptCode) return defaultRule.conceptCode;
  return `novedad_${normalized}`;
}

function normalizeJson(value) {
  if (!value || typeof value !== 'object') return {};
  return value;
}

function normalizeConfig(row = {}) {
  const code = normalizeNoveltyCode(row.code);
  const defaults = DEFAULT_NOVELTY_RULES[code] || {};
  const applicability = normalizeJson(row.applicability);
  const payrollImpact = String(row.payroll_impact || row.payrollImpact || defaults.payrollImpact || 'informativo').toLowerCase();
  const calculationMode = String(applicability.calculationMode || defaults.calculationMode || '').trim() || inferCalculationMode(payrollImpact);

  return {
    id: row.id || null,
    code,
    name: row.name || defaults.name || code,
    description: row.description || '',
    payrollImpact: VALID_PAYROLL_IMPACTS.has(payrollImpact) ? payrollImpact : 'informativo',
    calculationMode: VALID_CALCULATION_MODES.has(calculationMode) ? calculationMode : inferCalculationMode(payrollImpact),
    conceptCode: conceptCodeForNovelty(code, row),
    affectsIess: booleanWithDefault(row.affects_iess ?? row.affectsIess, defaults.affectsIess || false),
    affectsIncomeTax: booleanWithDefault(row.affects_income_tax ?? row.affectsIncomeTax, defaults.affectsIncomeTax || false),
    affectsDecimos: booleanWithDefault(row.affects_decimos ?? row.affectsDecimos, defaults.affectsDecimos || false),
    affectsVacation: booleanWithDefault(row.affects_vacation ?? row.affectsVacation, defaults.affectsVacation || false),
    affectsBankFile: booleanWithDefault(row.affects_bank_file ?? row.affectsBankFile, defaults.affectsBankFile || false),
    metadata: {
      applicability,
      defaultRule: Boolean(defaults.name),
    },
  };
}

function booleanWithDefault(value, fallback) {
  if (typeof value === 'undefined' || value === null) return Boolean(fallback);
  return Boolean(value);
}

function inferCalculationMode(payrollImpact) {
  return payrollImpact === 'informativo' ? 'informational' : 'amount';
}

function defaultConfigForCode(code) {
  return normalizeConfig({
    code,
    ...(DEFAULT_NOVELTY_RULES[normalizeNoveltyCode(code)] || {}),
  });
}

async function getActiveNoveltyTypeConfigs(tenantId, anio, mes) {
  const periodDate = `${Number(anio)}-${String(Number(mes)).padStart(2, '0')}-01`;
  const result = await db.query(`
    SELECT DISTINCT ON (LOWER(code))
      id, tenant_id, code, name, description, payroll_impact,
      affects_iess, affects_income_tax, affects_decimos, affects_vacation,
      affects_bank_file, applicability, status, valid_from, valid_to
    FROM novelty_type_configs
    WHERE status = 'activo'
      AND valid_from <= $2::date
      AND (valid_to IS NULL OR valid_to >= $2::date)
      AND (tenant_id = $1 OR tenant_id IS NULL)
    ORDER BY LOWER(code), tenant_id NULLS LAST, valid_from DESC, updated_at DESC
  `, [tenantId, periodDate]);

  return result.rows.map(normalizeConfig);
}

async function getActiveNoveltyTypeConfigsWithExecutor(executor, tenantId, anio, mes) {
  const periodDate = `${Number(anio)}-${String(Number(mes)).padStart(2, '0')}-01`;
  const result = await executor.query(`
    SELECT DISTINCT ON (LOWER(code))
      id, tenant_id, code, name, description, payroll_impact,
      affects_iess, affects_income_tax, affects_decimos, affects_vacation,
      affects_bank_file, applicability, status, valid_from, valid_to
    FROM novelty_type_configs
    WHERE status = 'activo'
      AND valid_from <= $2::date
      AND (valid_to IS NULL OR valid_to >= $2::date)
      AND (tenant_id = $1 OR tenant_id IS NULL)
    ORDER BY LOWER(code), tenant_id NULLS LAST, valid_from DESC, updated_at DESC
  `, [tenantId, periodDate]);

  return result.rows.map(normalizeConfig);
}

async function ensureNoveltyTypeAllowed({ tenantId, tipoNovedad, anio, mes, userId = null }) {
  const code = normalizeNoveltyCode(tipoNovedad);
  if (!code) {
    throw new AppError('Tipo de novedad requerido.', {
      code: 'NOVELTY_TYPE_REQUIRED',
      statusCode: 400,
      userId,
    });
  }

  const configs = await getActiveNoveltyTypeConfigs(tenantId, anio, mes);
  const config = configs.find((item) => item.code === code) || (DEFAULT_NOVELTY_RULES[code] ? defaultConfigForCode(code) : null);
  if (!config) {
    throw new AppError('El tipo de novedad no esta configurado o activo para el periodo.', {
      code: 'NOVELTY_TYPE_NOT_CONFIGURED',
      statusCode: 422,
      userId,
      details: { tipoNovedad: code, anio, mes },
    });
  }
  return config;
}

async function getApprovedPayrollNoveltyImpacts({
  tenantId,
  empleadoId,
  anio,
  mes,
  valorHora,
  dailyMaxHours,
  dbClient = null,
}) {
  const executor = dbClient || db;
  const configs = await getActiveNoveltyTypeConfigsWithExecutor(executor, tenantId, anio, mes);
  const result = await executor.query(`
    SELECT id, tipo_novedad, fecha, minutos, monto, justificacion, metadata
    FROM novedades_asistencia
    WHERE empleado_id = $1
      AND tenant_id = $2
      AND EXTRACT(YEAR FROM fecha) = $3
      AND EXTRACT(MONTH FROM fecha) = $4
      AND estado = 'aprobado'
    ORDER BY fecha, tipo_novedad, id
  `, [empleadoId, tenantId, anio, mes]);

  return calculateNoveltyImpacts(result.rows, configs, { valorHora, dailyMaxHours });
}

function calculateNoveltyImpacts(rows = [], configs = [], context = {}) {
  const configByCode = new Map(configs.map((config) => [config.code, config]));
  const lines = [];
  const totals = {
    income: 0,
    incomeAffectsIess: 0,
    incomeAffectsIncomeTax: 0,
    incomeAffectsDecimos: 0,
    incomeAffectsVacation: 0,
    incomeNotAffectsIess: 0,
    deductions: 0,
  };
  const amountByConcept = {};
  const minutesByConcept = {};
  const weeklyOvertimeMinutes = {};
  const weeklyOvertimeExceptionMinutes = {};

  for (const row of rows) {
    const code = normalizeNoveltyCode(row.tipo_novedad || row.tipoNovedad);
    const config = configByCode.get(code) || (DEFAULT_NOVELTY_RULES[code] ? defaultConfigForCode(code) : null);
    if (!config) {
      throw new AppError('Existe una novedad aprobada sin tipo configurado activo para el periodo.', {
        code: 'NOVELTY_APPROVED_TYPE_NOT_CONFIGURED',
        statusCode: 422,
        details: {
          noveltyId: row.id || '',
          tipoNovedad: code,
        },
      });
    }
    const amount = calculateNoveltyAmount(row, config, context);
    if (amount <= 0 || config.payrollImpact === 'informativo') continue;

    const category = config.payrollImpact === 'ingreso' ? 'ingreso' : 'deduccion';
    const overtimeWeekKey = isOvertimeConcept(config.conceptCode) ? weekKeyFromDate(row.fecha) : '';
    const rowMetadata = normalizeJson(row.metadata);
    const line = {
      noveltyId: row.id || '',
      code,
      conceptCode: config.conceptCode,
      label: config.name,
      category,
      payrollImpact: config.payrollImpact,
      amount,
      minutes: Number(row.minutos || 0),
      hours: roundMoney(Number(row.minutos || 0) / 60),
      source: 'novedad',
      sourceId: row.id || code,
      legalParameterKey: '',
      affectsIess: config.affectsIess,
      affectsIncomeTax: config.affectsIncomeTax,
      affectsDecimos: config.affectsDecimos,
      affectsVacation: config.affectsVacation,
      affectsBankFile: config.affectsBankFile,
      calculationMode: config.calculationMode,
      metadata: {
        fecha: row.fecha,
        justificacion: row.justificacion || '',
        tipoNovedad: code,
        configId: config.id,
        overtimeWeekKey,
        overtimeLimitException: normalizeOvertimeLimitException(rowMetadata.overtimeLimitException),
      },
    };
    lines.push(line);

    amountByConcept[line.conceptCode] = roundMoney((amountByConcept[line.conceptCode] || 0) + amount);
    minutesByConcept[line.conceptCode] = (minutesByConcept[line.conceptCode] || 0) + Number(row.minutos || 0);
    if (overtimeWeekKey) {
      weeklyOvertimeMinutes[overtimeWeekKey] = (weeklyOvertimeMinutes[overtimeWeekKey] || 0) + Number(row.minutos || 0);
      if (hasApprovedOvertimeLimitException(rowMetadata)) {
        weeklyOvertimeExceptionMinutes[overtimeWeekKey] = (weeklyOvertimeExceptionMinutes[overtimeWeekKey] || 0) + Number(row.minutos || 0);
      }
    }

    if (category === 'ingreso') {
      totals.income += amount;
      if (line.affectsIess) totals.incomeAffectsIess += amount;
      if (line.affectsIncomeTax) totals.incomeAffectsIncomeTax += amount;
      if (line.affectsDecimos) totals.incomeAffectsDecimos += amount;
      if (line.affectsVacation) totals.incomeAffectsVacation += amount;
      if (!line.affectsIess) totals.incomeNotAffectsIess += amount;
    } else {
      totals.deductions += amount;
    }
  }

  for (const key of Object.keys(totals)) {
    totals[key] = roundMoney(totals[key]);
  }

  return { lines, totals, amountByConcept, minutesByConcept, weeklyOvertimeMinutes, weeklyOvertimeExceptionMinutes };
}

function isOvertimeConcept(conceptCode) {
  return conceptCode === 'horas_extra_50' || conceptCode === 'horas_extra_100';
}

function weekKeyFromDate(value) {
  const isoDate = String(value || '').slice(0, 10);
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return 'sin_fecha';
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

function normalizeOvertimeLimitException(value = {}) {
  const metadata = normalizeJson(value);
  if (metadata.approved !== true) return null;
  return {
    approved: true,
    approvedBy: metadata.approvedBy || null,
    approvedAt: metadata.approvedAt || null,
    reason: String(metadata.reason || '').trim(),
    limitHours: metadata.limitHours ?? null,
    approvedVia: metadata.approvedVia || '',
  };
}

function hasApprovedOvertimeLimitException(metadata = {}) {
  return normalizeOvertimeLimitException(normalizeJson(metadata).overtimeLimitException)?.approved === true;
}

function calculateNoveltyAmount(row, config, context = {}) {
  const minutes = Math.max(0, Number(row.minutos || 0));
  const amount = Math.max(0, Number(row.monto || 0));
  const valorHora = Math.max(0, Number(context.valorHora || 0));
  const dailyMaxHours = Math.max(0, Number(context.dailyMaxHours || 8));
  const overtimeSupplementMultiplier = Math.max(0, Number(context.overtimeSupplementMultiplier || 1.5));
  const overtimeExtraordinaryMultiplier = Math.max(0, Number(context.overtimeExtraordinaryMultiplier || 2));

  switch (config.calculationMode) {
    case 'amount':
      return roundMoney(amount);
    case 'minutes_hourly':
      return roundMoney((minutes / 60) * valorHora);
    case 'minutes_hourly_1_5':
      return roundMoney((minutes / 60) * valorHora * overtimeSupplementMultiplier);
    case 'minutes_hourly_2':
      return roundMoney((minutes / 60) * valorHora * overtimeExtraordinaryMultiplier);
    case 'absence_day':
      if (amount > 0) return roundMoney(amount);
      if (minutes > 0) return roundMoney((minutes / 60) * valorHora);
      return roundMoney(valorHora * dailyMaxHours);
    case 'informational':
    default:
      return 0;
  }
}

module.exports = {
  DEFAULT_NOVELTY_RULES,
  VALID_CALCULATION_MODES,
  calculateNoveltyImpacts,
  conceptCodeForNovelty,
  defaultConfigForCode,
  ensureNoveltyTypeAllowed,
  getActiveNoveltyTypeConfigs,
  getActiveNoveltyTypeConfigsWithExecutor,
  getApprovedPayrollNoveltyImpacts,
  hasApprovedOvertimeLimitException,
  isOvertimeConcept,
  normalizeOvertimeLimitException,
  normalizeConfig,
  normalizeNoveltyCode,
  weekKeyFromDate,
};
