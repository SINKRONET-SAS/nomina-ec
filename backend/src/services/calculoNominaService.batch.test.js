jest.mock('../config/database', () => ({ query: jest.fn() }));
jest.mock('./beneficioEmpleadoService', () => ({
  getApprovedDeductions: jest.fn(async () => ({ anticipos: 0, prestamos: 0, items: [] })),
}));
jest.mock('./legalParameterService', () => ({
  assertLegalParametersReadyForProduction: jest.fn(),
  getLegalParametersForTenant: jest.fn(),
}));
jest.mock('./payrollAccountingService', () => ({
  ensureDefaultPayrollAccountingMappings: jest.fn(async () => []),
  persistPayrollCalculationLines: jest.fn(async () => []),
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
  let employeeRows;

  beforeEach(() => {
    jest.clearAllMocks();
    employeeRows = [employee('emp-1'), employee('emp-2')];
    getLegalParametersForTenant.mockResolvedValue(legalParameters);
    db.query.mockImplementation(async (sql) => {
      if (String(sql).includes('INSERT INTO payroll_periods')) {
        return { rows: [{ id: 'period-1', status: 'open' }] };
      }
      if (String(sql).includes('INSERT INTO payroll_calculation_batches')) {
        return { rows: [{ id: 'batch-1', status: 'processing' }] };
      }
      if (String(sql).includes('UPDATE payroll_calculation_batches')) {
        return { rows: [{ id: 'batch-1', status: 'completed', total_calculadas: 2, total_errores: 0 }] };
      }
      if (String(sql).includes('FROM empleados')) return { rows: employeeRows };
      if (String(sql).includes('FROM novelty_type_configs')) return { rows: [] };
      if (String(sql).includes('FROM novedades_asistencia')) return { rows: [] };
      if (String(sql).includes('INSERT INTO nominas')) return { rows: [{ id: `payroll-${Date.now()}` }] };
      return { rows: [] };
    });
  });

  test('carga parametros legales una sola vez por calculo mensual', async () => {
    const result = await calcularNominaMensual('tenant-1', 2026, 6);

    expect(result.total).toBe(2);
    expect(getLegalParametersForTenant).toHaveBeenCalledTimes(1);
    expect(assertLegalParametersReadyForProduction).toHaveBeenCalledTimes(1);
  });

  test('genera rol proporcional para ingreso durante el mes sin novedad de falta', async () => {
    employeeRows = [{
      ...employee('emp-ingreso-junio'),
      fecha_ingreso: '2026-06-16',
    }];

    const result = await calcularNominaMensual('tenant-1', 2026, 6);
    const employeeQuery = db.query.mock.calls.find(([sql]) => String(sql).includes('FROM empleados'));

    expect(employeeQuery[1]).toEqual(['tenant-1', '2026-06-30']);
    expect(result).toMatchObject({
      total: 1,
      resultados: [{
        empleadoId: 'emp-ingreso-junio',
        detalleCalculo: {
          diasTrabajados: 15,
          descuentoFaltas: 0,
        },
      }],
    });
  });

  test('recupera la transaccion por empleado y conserva el primer error SQL', async () => {
    let transactionAborted = false;
    const transactionClient = {
      query: jest.fn(async (sql, params = []) => {
        const text = String(sql).trim();
        if (text.startsWith('ROLLBACK TO SAVEPOINT')) {
          transactionAborted = false;
          return { rows: [] };
        }
        if (transactionAborted) {
          const abortedError = new Error('current transaction is aborted, commands ignored until end of transaction block');
          abortedError.code = '25P02';
          throw abortedError;
        }
        if (text.startsWith('SAVEPOINT') || text.startsWith('RELEASE SAVEPOINT')) return { rows: [] };
        if (text.includes('INSERT INTO payroll_periods')) {
          return { rows: [{ id: 'period-1', status: 'open' }] };
        }
        if (text.includes('INSERT INTO payroll_calculation_batches')) {
          return { rows: [{ id: 'batch-1', status: 'processing' }] };
        }
        if (text.includes('UPDATE payroll_calculation_batches')) {
          return { rows: [{ id: 'batch-1', status: params[2], total_calculadas: params[4], total_errores: params[5] }] };
        }
        if (text.includes('FROM empleados')) return { rows: employeeRows };
        if (text.includes('INSERT INTO nominas') && params[1] === 'emp-1') {
          transactionAborted = true;
          const originalError = new Error('column accounting_code does not exist');
          originalError.code = '42703';
          throw originalError;
        }
        if (text.includes('INSERT INTO nominas')) return { rows: [{ id: 'payroll-2' }] };
        return { rows: [] };
      }),
    };

    const result = await calcularNominaMensual('tenant-1', 2026, 6, {
      userId: 'user-1',
      correlationId: 'corr-savepoint',
      dbClient: transactionClient,
    });

    expect(result.resultados).toHaveLength(2);
    expect(result.resultados[0]).toMatchObject({
      empleadoId: 'emp-1',
      nombre: 'Empleado emp-1',
      errorCode: 'NOMINA_EMPLEADO_PERSISTENCIA_ERROR',
    });
    expect(result.resultados[0].error).not.toContain('transaction is aborted');
    expect(result.resultados[1]).toMatchObject({ empleadoId: 'emp-2' });
    expect(transactionClient.query).toHaveBeenCalledWith('ROLLBACK TO SAVEPOINT payroll_employee_work');
    const finishCall = transactionClient.query.mock.calls.find(([sql]) => String(sql).includes('UPDATE payroll_calculation_batches'));
    expect(finishCall[1][2]).toBe('partial_failed');
    expect(finishCall[1][4]).toBe(1);
    expect(finishCall[1][5]).toBe(1);
  });
});
