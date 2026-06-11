// ============================================================
// PLAN HAIKY - Parametros legales Ecuador
// ============================================================

const LEGAL_PARAMETERS = {
  2026: {
    sourceStatus: 'pendiente_validacion_oficial',
    notes: [
      'Valores migrados desde docs/CUMPLIMIENTO_LEGAL.md.',
      'Requiere validacion final con abogado laboral y contador ecuatoriano antes de produccion.',
    ],
    payroll: {
      monthlyWorkHours: 240,
      personalIessRate: 0.0945,
      employerIessRate: 0.1115,
      vacationProvisionRate: 1 / 24,
      unifiedBaseSalary: 460,
      vacationDaysAfterFirstYear: 15,
      weeklyMaxHours: 40,
      dailyMaxHours: 8,
    },
    incomeTax: [
      { from: 0, to: 12208, rate: 0, baseTax: 0 },
      { from: 12208, to: 15188, rate: 0.05, baseTax: 0 },
      { from: 15188, to: 19572, rate: 0.10, baseTax: 148.95 },
      { from: 19572, to: 23950, rate: 0.12, baseTax: 587.15 },
      { from: 23950, to: 41545, rate: 0.15, baseTax: 1112.53 },
      { from: 41545, to: 45820, rate: 0.20, baseTax: 3751.63 },
      { from: 45820, to: 55645, rate: 0.25, baseTax: 4606.23 },
      { from: 55645, to: 72545, rate: 0.30, baseTax: 7062.23 },
      { from: 72545, to: 102130, rate: 0.35, baseTax: 12132.23 },
      { from: 102130, to: null, rate: 0.37, baseTax: 22486.98 },
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
