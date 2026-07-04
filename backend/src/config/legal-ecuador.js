// ============================================================
// SKNOMINA - Parametros legales Ecuador
// ============================================================

const LEGAL_PARAMETERS = {
  2025: {
    sourceStatus: 'legacy',
    validatedFields: [
      'incomeTax',
      'payroll.unifiedBaseSalary',
      'payroll.personalIessRate',
      'payroll.employerIessRate',
    ],
    pendingValidation: [],
    validationSources: [
      { field: 'payroll.unifiedBaseSalary', source: 'Ministerio del Trabajo - SBU 2025 USD 460', status: 'confirmado' },
    ],
    notes: ['Parámetros 2025 para retroactivos. sourceStatus legacy.'],
    payroll: {
      monthlyWorkHours: 240,
      personalIessRate: 0.0945,
      employerIessRate: 0.1115,
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
      personalExpenseDeductionLimit: 15767.16,
      thirteenthSalaryPaymentMonth: 12,
      fourteenthSalaryCostaGalapagosPaymentMonth: 3,
      fourteenthSalarySierraAmazoniaPaymentMonth: 8,
      unifiedBaseSalary: 460,
      vacationDaysAfterFirstYear: 15,
      weeklyMaxHours: 40,
      maxWeeklyOvertimeHours: 12,
      dailyMaxHours: 8,
    },
    incomeTax: [
      { from: 0, to: 11902, rate: 0, baseTax: 0 },
      { from: 11902, to: 15159, rate: 0.05, baseTax: 0 },
      { from: 15159, to: 19682, rate: 0.10, baseTax: 163 },
      { from: 19682, to: 26031, rate: 0.12, baseTax: 615 },
      { from: 26031, to: 34255, rate: 0.15, baseTax: 1377 },
      { from: 34255, to: 45407, rate: 0.20, baseTax: 2611 },
      { from: 45407, to: 60450, rate: 0.25, baseTax: 4841 },
      { from: 60450, to: 80605, rate: 0.30, baseTax: 8602 },
      { from: 80605, to: 107199, rate: 0.35, baseTax: 14649 },
      { from: 107199, to: null, rate: 0.37, baseTax: 23957 },
    ],
  },
  2026: {
    sourceStatus: 'validado',
    validatedFields: [
      'incomeTax',
      'payroll.unifiedBaseSalary',
      'payroll.personalIessRate',
      'payroll.employerIessRate',
      'payroll.fourteenthSalaryCostaGalapagosPeriodStartMonth',
      'payroll.fourteenthSalarySierraAmazoniaPeriodStartMonth',
      'payroll.reserveFundStartsAfterMonths',
      'payroll.maxWeeklyOvertimeHours',
      'payroll.personalExpenseDeductionLimit',
    ],
    pendingValidation: [],
    validationSources: [
      {
        field: 'incomeTax',
        source: 'SRI Resolucion NAC-DGERCGC25-00000043',
        status: 'confirmado',
      },
      {
        field: 'payroll.unifiedBaseSalary',
        source: 'Ministerio del Trabajo - SBU 2026 USD 482',
        status: 'confirmado',
      },
      {
        field: 'payroll.personalIessRate',
        source: 'IESS - Servicios y prestaciones',
        status: 'confirmado',
      },
      {
        field: 'payroll.employerIessRate',
        source: 'IESS - Servicios y prestaciones',
        status: 'confirmado',
      },
      {
        field: 'payroll.fourteenthSalaryCostaGalapagosPeriodStartMonth',
        source: 'Código del Trabajo Art. 113 - Costa y Galápagos marzo',
        status: 'confirmado',
      },
      {
        field: 'payroll.fourteenthSalarySierraAmazoniaPeriodStartMonth',
        source: 'Código del Trabajo Art. 113 - Sierra y Amazonía agosto',
        status: 'confirmado',
      },
      {
        field: 'payroll.reserveFundStartsAfterMonths',
        source: 'Código del Trabajo Art. 196 - Después de 12 meses',
        status: 'confirmado',
      },
      {
        field: 'payroll.maxWeeklyOvertimeHours',
        source: 'Código del Trabajo Art. 55 - Máximo 12 horas semanales',
        status: 'confirmado',
      },
      {
        field: 'payroll.personalExpenseDeductionLimit',
        source: 'SRI - Gastos personales 2026',
        status: 'confirmado',
      },
    ],
    notes: [
      'Valores migrados desde docs/CUMPLIMIENTO_LEGAL.md.',
      'Tabla IR 2026 confirmada contra PDF SRI: Resolucion Nro. NAC-DGERCGC25-00000043, Segundo Suplemento del Registro Oficial No. 194, 30/12/2025.',
      'SBU 2026 confirmado en noticia oficial del Ministerio del Trabajo: USD 482.',
      'Aportes IESS confirmados contra pagina oficial IESS Servicios y prestaciones: afiliado 9.45% y empleador 11.15%.',
      'sourceStatus validado: todos los parámetros 2026 confirmados contra fuentes oficiales.',
      'Décimo cuarto Costa marzo, Sierra agosto (Art. 113 CT). Fondo reserva 12 meses (Art. 196 CT). HE máx. 12h/sem (Art. 55 CT).',
    ],
    payroll: {
      monthlyWorkHours: 240,
      personalIessRate: 0.0945,
      employerIessRate: 0.1115,
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
      personalExpenseDeductionLimit: 16302,
      thirteenthSalaryPaymentMonth: 12,
      fourteenthSalaryCostaGalapagosPaymentMonth: 3,
      fourteenthSalarySierraAmazoniaPaymentMonth: 8,
      unifiedBaseSalary: 482,
      vacationDaysAfterFirstYear: 15,
      weeklyMaxHours: 40,
      maxWeeklyOvertimeHours: 12,
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
    throw new Error(`No existen parámetros legales configurados para el año ${year}`);
  }

  return parameters;
}

module.exports = {
  LEGAL_PARAMETERS,
  getLegalParameters,
};
