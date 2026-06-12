// ============================================================
// PLAN HAIKY - Parametros legales versionados
// ============================================================
const db = require('../config/database');
const AppError = require('../utils/AppError');
const { getLegalParameters } = require('../config/legal-ecuador');

const VALIDATED_SOURCE_STATUS = 'validado_oficial';
const PENDING_SOURCE_STATUS = 'pendiente_validacion_oficial';

async function getLegalParametersForTenant(tenantId, year) {
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
    return getLegalParameters(year);
  }

  const row = result.rows[0];
  return {
    sourceStatus: row.fuente,
    payroll: {
      monthlyWorkHours: 240,
      personalIessRate: Number(row.aporte_personal_pct),
      employerIessRate: Number(row.aporte_patronal_pct),
      vacationProvisionRate: 1 / 24,
      unifiedBaseSalary: Number(row.salario_basico),
      vacationDaysAfterFirstYear: 15,
      weeklyMaxHours: Number(row.jornada_maxima_semanal),
      dailyMaxHours: 8,
    },
    incomeTax: row.tabla_impuesto_renta,
  };
}

function requiresOfficialLegalValidation() {
  return process.env.NODE_ENV === 'production' || process.env.REQUIRE_VALIDATED_LEGAL_PARAMETERS === 'true';
}

function assertLegalParametersReadyForProduction(legalParameters, context = {}) {
  const sourceStatus = legalParameters?.sourceStatus || PENDING_SOURCE_STATUS;

  if (!requiresOfficialLegalValidation()) {
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
