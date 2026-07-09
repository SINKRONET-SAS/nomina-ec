// ============================================================
// SKNOMINA - Parametros legales versionados
// ============================================================
const db = require('../config/database');
const AppError = require('../utils/AppError');
const { getLegalParameters } = require('../config/legal-ecuador');
const logger = require('../utils/logger');

const VALIDATED_SOURCE_STATUS = 'validado_oficial';
const PENDING_SOURCE_STATUS = 'pendiente_validacion_oficial';

async function getLegalParametersForTenant(tenantId, year) {
  const versionedParameters = await getVersionedLegalParametersForTenant(tenantId, year);
  const result = await db.query(`
    SELECT *
    FROM parametros_legales
    WHERE anio = $1
      AND pais = 'EC'
      AND vigente = true
      AND (tenant_id = $2 OR tenant_id IS NULL)
    ORDER BY tenant_id NULLS LAST
    LIMIT 1
  `, [year, tenantId]);

  if (result.rows.length === 0) {
    return withLegalSourceMetadata(mergeVersionedParameters(getLegalParameters(year), versionedParameters), versionedParameters, null, year, tenantId);
  }

  const row = result.rows[0];
  const legacyParameters = {
    sourceStatus: row.fuente,
    payroll: {
      monthlyWorkHours: 240,
      personalIessRate: Number(row.aporte_personal_pct),
      employerIessRate: Number(row.aporte_patronal_pct),
      vacationProvisionRate: 1 / 24,
      thirteenthSalaryProvisionRate: 1 / 12,
      thirteenthSalaryPeriodStartMonth: 12,
      thirteenthSalaryPeriodEndMonth: 11,
      fourteenthSalaryProvisionRate: 1 / 12,
      fourteenthSalaryCostaGalapagosPeriodStartMonth: 3,
      fourteenthSalaryCostaGalapagosPeriodEndMonth: 2,
      fourteenthSalarySierraAmazoniaPeriodStartMonth: 8,
      fourteenthSalarySierraAmazoniaPeriodEndMonth: 7,
      reserveFundRate: 1 / 12,
      reserveFundStartsAfterMonths: 12,
      personalExpenseDeductionLimit: Number(row.gastos_personales_limite || 16302),
      thirteenthSalaryPaymentMonth: 12,
      fourteenthSalaryCostaGalapagosPaymentMonth: Number(row.decimo_cuarto_costa_mes),
      fourteenthSalarySierraAmazoniaPaymentMonth: Number(row.decimo_cuarto_sierra_mes),
      unifiedBaseSalary: Number(row.salario_basico),
      vacationDaysAfterFirstYear: 15,
      weeklyMaxHours: Number(row.jornada_maxima_semanal),
      maxWeeklyOvertimeHours: 12,
      overtimeSupplementMultiplier: 1.5,
      overtimeExtraordinaryMultiplier: 2,
      dailyMaxHours: 8,
    },
    incomeTax: row.tabla_impuesto_renta,
  };
  const merged = mergeVersionedParameters(legacyParameters, versionedParameters);
  const divergences = detectLegalParameterDivergence(legacyParameters, merged, versionedParameters);
  if (divergences.length > 0) {
    console.error('[LEGAL] Divergencia entre parametros legales versionados y tabla legado', {
      code: 'LEGAL_PARAMETERS_DIVERGENCE',
      statusCode: 409,
      correlationId: process.env.CORRELATION_ID || 'legal-parameters',
      tenantId,
      year,
      divergences,
    });
    if (requiresOfficialLegalValidation()) {
      throw new AppError('Existen divergencias entre fuentes legales. Unifica parametros antes de calcular nomina.', {
        code: 'LEGAL_PARAMETERS_DIVERGENCE',
        statusCode: 409,
        correlationId: process.env.CORRELATION_ID || 'legal-parameters',
        details: { year, tenantId, divergences },
      });
    }
  }

  return withLegalSourceMetadata(merged, versionedParameters, row, year, tenantId);
}

async function getVersionedLegalParametersForTenant(tenantId, year) {
  const result = await db.query(`
    SELECT parameter_key, value, validation_status, source_name, source_url
    FROM legal_parameter_versions
    WHERE period_year = $1
      AND country_code = 'EC'
      AND (tenant_id = $2 OR tenant_id IS NULL)
      AND parameter_key IN (
        'income_tax_table',
        'tabla_impuesto_renta',
        'sbu',
        'iess_aporte_personal',
        'iess_aporte_patronal',
        'jornada_horas_mensuales',
        'jornada_maxima_semanal',
        'horas_extra_limite_semanal',
        'horas_extra_recargo_suplementaria',
        'horas_extra_recargo_extraordinaria',
        'provision_vacaciones',
        'vacaciones_dias_anuales',
        'decimo_tercero',
        'decimo_cuarto_costa_galapagos',
        'decimo_cuarto_sierra_amazonia',
        'fondo_reserva'
      )
    ORDER BY tenant_id NULLS LAST, valid_from DESC, created_at DESC
  `, [year, tenantId]);

  const parameters = {};
  for (const row of result.rows) {
    if (!parameters[row.parameter_key]) {
      parameters[row.parameter_key] = row;
    }
  }
  return parameters;
}

function extractIncomeTaxTable(row) {
  if (!row) return null;
  const brackets = Array.isArray(row.value?.brackets) ? row.value.brackets : [];
  if (brackets.length === 0) return null;

  return brackets.map((bracket) => ({
    from: Number(bracket.from ?? bracket.fraccion_basica ?? 0),
    to: bracket.to ?? bracket.exceso_hasta ?? null,
    baseTax: Number(bracket.baseTax ?? bracket.impuesto_fraccion_basica ?? 0),
    rate: Number(bracket.rate ?? bracket.porcentaje ?? 0),
    fraccion_basica: Number(bracket.from ?? bracket.fraccion_basica ?? 0),
    exceso_hasta: bracket.to ?? bracket.exceso_hasta ?? null,
    impuesto_fraccion_basica: Number(bracket.baseTax ?? bracket.impuesto_fraccion_basica ?? 0),
    porcentaje: Number(bracket.rate ?? bracket.porcentaje ?? 0),
  }));
}

function mergeVersionedParameters(baseParameters, versionedParameters) {
  const incomeTaxRow = versionedParameters.income_tax_table || versionedParameters.tabla_impuesto_renta;
  const incomeTax = extractIncomeTaxTable(incomeTaxRow);
  const payroll = { ...baseParameters.payroll };

  const thirteenth = versionedParameters.decimo_tercero?.value;
  const fourteenthCosta = versionedParameters.decimo_cuarto_costa_galapagos?.value;
  const fourteenthSierra = versionedParameters.decimo_cuarto_sierra_amazonia?.value;
  const reserveFund = versionedParameters.fondo_reserva?.value;
  const sbu = versionedParameters.sbu?.value;
  const personalIess = versionedParameters.iess_aporte_personal?.value;
  const employerIess = versionedParameters.iess_aporte_patronal?.value;
  const monthlyHours = versionedParameters.jornada_horas_mensuales?.value;
  const weeklyHours = versionedParameters.jornada_maxima_semanal?.value;
  const overtimeLimit = versionedParameters.horas_extra_limite_semanal?.value;
  const overtimeSupplement = versionedParameters.horas_extra_recargo_suplementaria?.value;
  const overtimeExtraordinary = versionedParameters.horas_extra_recargo_extraordinaria?.value;
  const vacationProvision = versionedParameters.provision_vacaciones?.value;
  const vacationDays = versionedParameters.vacaciones_dias_anuales?.value;

  if (sbu) payroll.unifiedBaseSalary = Number(sbu.amount ?? payroll.unifiedBaseSalary);
  if (personalIess) payroll.personalIessRate = Number(personalIess.amount ?? payroll.personalIessRate);
  if (employerIess) payroll.employerIessRate = Number(employerIess.amount ?? payroll.employerIessRate);
  if (monthlyHours) payroll.monthlyWorkHours = Number(monthlyHours.amount ?? payroll.monthlyWorkHours);
  if (weeklyHours) payroll.weeklyMaxHours = Number(weeklyHours.amount ?? payroll.weeklyMaxHours);
  if (overtimeLimit) payroll.maxWeeklyOvertimeHours = Number(overtimeLimit.amount ?? payroll.maxWeeklyOvertimeHours);
  if (overtimeSupplement) payroll.overtimeSupplementMultiplier = overtimeMultiplier(overtimeSupplement, payroll.overtimeSupplementMultiplier);
  if (overtimeExtraordinary) payroll.overtimeExtraordinaryMultiplier = overtimeMultiplier(overtimeExtraordinary, payroll.overtimeExtraordinaryMultiplier);
  if (vacationProvision) payroll.vacationProvisionRate = Number(vacationProvision.amount ?? payroll.vacationProvisionRate);
  if (vacationDays) payroll.vacationDaysAfterFirstYear = Number(vacationDays.amount ?? payroll.vacationDaysAfterFirstYear);

  if (thirteenth) {
    payroll.thirteenthSalaryProvisionRate = Number(thirteenth.rate ?? payroll.thirteenthSalaryProvisionRate ?? (1 / 12));
    payroll.thirteenthSalaryPaymentMonth = Number(thirteenth.paymentMonth ?? payroll.thirteenthSalaryPaymentMonth ?? 12);
    payroll.thirteenthSalaryPeriodStartMonth = Number(thirteenth.periodStartMonth ?? payroll.thirteenthSalaryPeriodStartMonth ?? 12);
    payroll.thirteenthSalaryPeriodEndMonth = Number(thirteenth.periodEndMonth ?? payroll.thirteenthSalaryPeriodEndMonth ?? 11);
  }

  if (fourteenthCosta || fourteenthSierra) {
    payroll.fourteenthSalaryProvisionRate = Number((fourteenthCosta || fourteenthSierra).rate ?? payroll.fourteenthSalaryProvisionRate ?? (1 / 12));
    payroll.fourteenthSalaryCostaGalapagosPaymentMonth = Number(fourteenthCosta?.paymentMonth ?? payroll.fourteenthSalaryCostaGalapagosPaymentMonth ?? 3);
    payroll.fourteenthSalarySierraAmazoniaPaymentMonth = Number(fourteenthSierra?.paymentMonth ?? payroll.fourteenthSalarySierraAmazoniaPaymentMonth ?? 8);
    payroll.fourteenthSalaryCostaGalapagosPeriodStartMonth = Number(fourteenthCosta?.periodStartMonth ?? payroll.fourteenthSalaryCostaGalapagosPeriodStartMonth ?? 3);
    payroll.fourteenthSalaryCostaGalapagosPeriodEndMonth = Number(fourteenthCosta?.periodEndMonth ?? payroll.fourteenthSalaryCostaGalapagosPeriodEndMonth ?? 2);
    payroll.fourteenthSalarySierraAmazoniaPeriodStartMonth = Number(fourteenthSierra?.periodStartMonth ?? payroll.fourteenthSalarySierraAmazoniaPeriodStartMonth ?? 8);
    payroll.fourteenthSalarySierraAmazoniaPeriodEndMonth = Number(fourteenthSierra?.periodEndMonth ?? payroll.fourteenthSalarySierraAmazoniaPeriodEndMonth ?? 7);
  }

  if (reserveFund) {
    payroll.reserveFundRate = Number(reserveFund.rate ?? payroll.reserveFundRate ?? (1 / 12));
    payroll.reserveFundStartsAfterMonths = Number(reserveFund.startsAfterMonths ?? payroll.reserveFundStartsAfterMonths ?? 12);
  }

  const statusRows = Object.values(versionedParameters).filter(Boolean);
  const sourceStatus = statusRows.length > 0 && statusRows.every((row) => row.validation_status === VALIDATED_SOURCE_STATUS)
    ? VALIDATED_SOURCE_STATUS
    : (statusRows[0]?.validation_status || baseParameters.sourceStatus);

  if (!incomeTax) {
    return {
      ...baseParameters,
      payroll,
      sourceStatus,
    };
  }

  return {
    ...baseParameters,
    payroll,
    sourceStatus,
    source: {
      name: incomeTaxRow.source_name || '',
      url: incomeTaxRow.source_url || '',
    },
    incomeTax,
  };
}

function overtimeMultiplier(value = {}, fallback) {
  const direct = Number(value.multiplier ?? value.amount);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const rate = Number(value.rate ?? value.surchargeRate);
  if (Number.isFinite(rate) && rate >= 0) return 1 + rate;

  return fallback;
}

function withLegalSourceMetadata(parameters, versionedParameters, legacyRow, year, tenantId) {
  const versionedRows = Object.values(versionedParameters).filter(Boolean);
  return {
    ...parameters,
    legalSource: {
      sourceOfTruth: versionedRows.length > 0 ? 'legal_parameter_versions' : (legacyRow ? 'parametros_legales' : 'config/legal-ecuador.js'),
      year,
      tenantId: tenantId || null,
      versionedParameters: versionedRows.map((row) => ({
        key: row.parameter_key,
        status: row.validation_status,
        sourceName: row.source_name || '',
        sourceUrl: row.source_url || '',
      })),
      legacyFallbackUsed: versionedRows.length === 0 && Boolean(legacyRow),
    },
  };
}

function detectLegalParameterDivergence(baseParameters, mergedParameters, versionedParameters) {
  if (Object.keys(versionedParameters || {}).length === 0) return [];
  const checks = [
    ['sbu', 'payroll.unifiedBaseSalary'],
    ['iess_aporte_personal', 'payroll.personalIessRate'],
    ['iess_aporte_patronal', 'payroll.employerIessRate'],
    ['jornada_maxima_semanal', 'payroll.weeklyMaxHours'],
  ];

  return checks.reduce((items, [key, itemPath]) => {
    if (!versionedParameters[key]) return items;
    const legacyValue = getByPath(baseParameters, itemPath);
    const mergedValue = getByPath(mergedParameters, itemPath);
    if (legacyValue == null || mergedValue == null) return items;
    if (Math.abs(Number(legacyValue) - Number(mergedValue)) > 0.000001) {
      items.push({ key, legacyValue: Number(legacyValue), versionedValue: Number(mergedValue) });
    }
    return items;
  }, []);
}

function getByPath(value, itemPath) {
  return itemPath.split('.').reduce((current, key) => current?.[key], value);
}
function requiresOfficialLegalValidation() {
  return process.env.NODE_ENV === 'production' || process.env.REQUIRE_VALIDATED_LEGAL_PARAMETERS === 'true';
}

function assertLegalParametersReadyForProduction(legalParameters, context = {}) {
  const sourceStatus = legalParameters?.sourceStatus || PENDING_SOURCE_STATUS;

  if (!requiresOfficialLegalValidation()) {
    logger.info({
      code: 'LEGAL_PARAMETERS_VALIDATION_SKIPPED',
      correlationId: process.env.CORRELATION_ID || 'legal-parameters',
      anio: context.year || null,
      tenantId: context.tenantId || null,
      operacion: context.operation || 'calculo_legal',
    }, 'Validacion oficial de parametros omitida por configuracion de entorno');
    return;
  }

  if (sourceStatus !== VALIDATED_SOURCE_STATUS) {
    throw new AppError('Los parametros legales del periodo no tienen validacion oficial para calculos productivos', {
      code: 'LEGAL_PARAMETERS_NOT_VALIDATED',
      statusCode: 423,
      correlationId: process.env.CORRELATION_ID || 'legal-parameters',
      userId: context.userId || null,
      details: {
        anio: context.year || null,
        tenantId: context.tenantId || null,
        operacion: context.operation || 'calculo_legal',
        fuente: sourceStatus,
      },
    });
  }
}

module.exports = {
  getLegalParametersForTenant,
  assertLegalParametersReadyForProduction,
  VALIDATED_SOURCE_STATUS,
  PENDING_SOURCE_STATUS,
  detectLegalParameterDivergence,
  mergeVersionedParameters,
};
