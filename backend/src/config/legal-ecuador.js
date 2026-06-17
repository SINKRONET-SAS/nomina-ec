// ============================================================
// PLAN HAIKY - Parametros legales Ecuador
// ============================================================

const LEGAL_PARAMETERS = {
  2026: {
    sourceStatus: 'pendiente_validacion_oficial',
    notes: [
      'Valores migrados desde docs/CUMPLIMIENTO_LEGAL.md.',
      'Tabla IR 2026 confirmada contra PDF SRI: Resolucion Nro. NAC-DGERCGC25-00000043, Segundo Suplemento del Registro Oficial No. 194, 30/12/2025.',
      'SBU 2026 confirmado en noticia oficial del Ministerio del Trabajo: USD 482.',
      'IESS y otros parametros laborales requieren validacion final con abogado laboral y contador ecuatoriano antes de produccion.',
    ],
    payroll: {
      monthlyWorkHours: 240,
      personalIessRate: 0.0945,
      employerIessRate: 0.1115,
      vacationProvisionRate: 1 / 24,
      thirteenthSalaryProvisionRate: 1 / 12,
      fourteenthSalaryProvisionRate: 1 / 12,
      reserveFundRate: 1 / 12,
      reserveFundStartsAfterMonths: 12,
      personalExpenseDeductionLimit: 16302,
      thirteenthSalaryPaymentMonth: 12,
      fourteenthSalaryCostaGalapagosPaymentMonth: 3,
      fourteenthSalarySierraAmazoniaPaymentMonth: 8,
      unifiedBaseSalary: 482,
      vacationDaysAfterFirstYear: 15,
      weeklyMaxHours: 40,
      dailyMaxHours: 8,
    },
    incomeTax: [
      { from: 0, to: 12208, rate: 0, baseTax: 0 },
      { from: 12208, to: 15549, rate: 0.05, baseTax: 0 },
      { from: 15549, to: 20188, rate: 0.10, baseTax: 167 },
      { from: 20188, to: 26700, rate: 0.12, baseTax: 631 },
      { from: 26700, to: 35136, rate: 0.15, baseTax: 1412 },
      { from: 35136, to: 46575, rate: 0.20, baseTax: 2678 },
      { from: 46575, to: 62005, rate: 0.25, baseTax: 4965 },
      { from: 62005, to: 82679, rate: 0.30, baseTax: 8823 },
      { from: 82679, to: 109956, rate: 0.35, baseTax: 15025 },
      { from: 109956, to: null, rate: 0.37, baseTax: 24572 },
    ],
  },
};

function getLegalParameters(year) {
  const parameters = LEGAL_PARAMETERS[year];

  if (!parameters) {
    throw new Error(`No existen parametros legales configurados para el anio ${year}`);
  }

  return parameters;
}

module.exports = {
  LEGAL_PARAMETERS,
  getLegalParameters,
};
