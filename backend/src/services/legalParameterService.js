// ============================================================
// PLAN HAIKY - Parametros legales versionados
// ============================================================
const db = require('../config/database');
const AppError = require('../utils/AppError');
const { getLegalParameters } = require('../config/legal-ecuador');

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
    return mergeVersionedParameters(getLegalParameters(year), versionedParameters);
  }

  const row = result.rows[0];
  return mergeVersionedParameters({
    sourceStatus: row.fuente,
    payroll: {
      monthlyWorkHours: 240,
      personalIessRate: Number(row.aporte_personal_pct),
      employerIessRate: Number(row.aporte_patronal_pct),
      vacationProvisionRate: 1 / 24,
      thirteenthSalaryProvisionRate: 1 / 12,
      fourteenthSalaryProvisionRate: 1 / 12,
      reserveFundRate: 1 / 12,
      reserveFundStartsAfterMonths: 12,
      thirteenthSalaryPaymentMonth: 12,
      fourteenthSalaryCostaGalapagosPaymentMonth: Number(row.decimo_cuarto_costa_mes),
      fourteenthSalarySierraAmazoniaPaymentMonth: Number(row.decimo_cuarto_sierra_mes),
      unifiedBaseSalary: Number(row.salario_basico),
      vacationDaysAfterFirstYear: 15,
      weeklyMaxHours: Number(row.jornada_maxima_semanal),
      dailyMaxHours: 8,
    },
    incomeTax: row.tabla_impuesto_renta,
  }, versionedParameters);
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

  if (thirteenth) {
    payroll.thirteenthSalaryProvisionRate = Number(thirteenth.rate ?? payroll.thirteenthSalaryProvisionRate ?? (1 / 12));
    payroll.thirteenthSalaryPaymentMonth = Number(thirteenth.paymentMonth ?? payroll.thirteenthSalaryPaymentMonth ?? 12);
  }

  if (fourteenthCosta || fourteenthSierra) {
    payroll.fourteenthSalaryProvisionRate = Number((fourteenthCosta || fourteenthSierra).rate ?? payroll.fourteenthSalaryProvisionRate ?? (1 / 12));
    payroll.fourteenthSalaryCostaGalapagosPaymentMonth = Number(fourteenthCosta?.paymentMonth ?? payroll.fourteenthSalaryCostaGalapagosPaymentMonth ?? 3);
    payroll.fourteenthSalarySierraAmazoniaPaymentMonth = Number(fourteenthSierra?.paymentMonth ?? payroll.fourteenthSalarySierraAmazoniaPaymentMonth ?? 8);
  }

  if (reserveFund) {
    payroll.reserveFundRate = Number(reserveFund.rate ?? payroll.reserveFundRate ?? (1 / 12));
    payroll.reserveFundStartsAfterMonths = Number(reserveFund.startsAfterMonths ?? payroll.reserveFundStartsAfterMonths ?? 12);
  }

  if (!incomeTax) {
    return {
      ...baseParameters,
      payroll,
    };
  }

  return {
    ...baseParameters,
    payroll,
    sourceStatus: incomeTaxRow.validation_status || baseParameters.sourceStatus,
    source: {
      name: incomeTaxRow.source_name || '',
      url: incomeTaxRow.source_url || '',
    },
    incomeTax,
  };
}

function requiresOfficialLegalValidation() {
  return process.env.NODE_ENV === 'production' || process.env.REQUIRE_VALIDATED_LEGAL_PARAMETERS === 'true';
}

function assertLegalParametersReadyForProduction(legalParameters, context = {}) {
  const sourceStatus = legalParameters?.sourceStatus || PENDING_SOURCE_STATUS;

  if (!requiresOfficialLegalValidation()) {
    console.log('[LEGAL] Validacion oficial de parametros omitida por configuracion de entorno', {
      correlationId: process.env.CORRELATION_ID || 'legal-parameters',
      anio: context.year || null,
      tenantId: context.tenantId || null,
      operacion: context.operation || 'calculo_legal',
    });
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
};
