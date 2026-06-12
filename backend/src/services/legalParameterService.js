// ============================================================
// PLAN HAIKY - Parametros legales versionados
// ============================================================
const db = require('../config/database');
const { getLegalParameters } = require('../config/legal-ecuador');

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

module.exports = { getLegalParametersForTenant };
