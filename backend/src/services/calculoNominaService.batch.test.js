jest.mock('../config/database', () => ({ query: jest.fn() }));
jest.mock('./beneficioEmpleadoService', () => ({
  getApprovedDeductions: jest.fn(async () => ({ anticipos: 0, prestamos: 0, items: [] })),
}));
jest.mock('./legalParameterService', () => ({
  assertLegalParametersReadyForProduction: jest.fn(),
  getLegalParametersForTenant: jest.fn(),
}));

const db = require('../config/database');
const {
  assertLegalParametersReadyForProduction,
  getLegalParametersForTenant,
} = require('./legalParameterService');
const { calcularNominaMensual } = require('./calculoNominaService');

const legalParameters = {
  sourceStatus: 'validado_oficial',
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
  incomeTax: [{ from: 0, to: null, rate: 0, baseTax: 0 }],
};

function employee(id) {
  return {
    id,
    nombres: 'Empleado',
    apellidos: id,
    fecha_ingreso: '2026-01-01',
    sueldo_bruto_mensual: 600,
    gastos_personales_anuales: 0,
    tipo_contrato: 'indefinido',
    jornada_horas_mensuales: 240,
  };
}

describe('calculoNominaService lote AIV50', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getLegalParametersForTenant.mockResolvedValue(legalParameters);
    db.query.mockImplementation(async (sql) => {
      if (String(sql).includes('FROM empleados')) return { rows: [employee('emp-1'), employee('emp-2')] };
      if (String(sql).includes('GROUP BY tipo_novedad')) return { rows: [] };
      if (String(sql).includes("tipo_novedad = 'falta'")) return { rows: [{ total: '0' }] };
      if (String(sql).includes('INSERT INTO nominas')) return { rows: [] };
      return { rows: [] };
    });
  });

  test('carga parametros legales una sola vez por calculo mensual', async () => {
    const result = await calcularNominaMensual('tenant-1', 2026, 6);

    expect(result.total).toBe(2);
    expect(getLegalParametersForTenant).toHaveBeenCalledTimes(1);
    expect(assertLegalParametersReadyForProduction).toHaveBeenCalledTimes(1);
  });
});