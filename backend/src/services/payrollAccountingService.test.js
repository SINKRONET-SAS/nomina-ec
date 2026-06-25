jest.mock('../config/database', () => ({
  getClient: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  query: jest.fn(),
}));

const db = require('../config/database');
const {
  persistPayrollCalculationLines,
} = require('./payrollAccountingService');

describe('payrollAccountingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('exporta y persiste lineas de calculo normalizadas por lote', async () => {
    const client = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
    };
    db.getClient.mockResolvedValueOnce(client);

    const lines = await persistPayrollCalculationLines({
      payrollId: 'payroll-1',
      calculationBatchId: 'batch-1',
      tenantId: 'tenant-1',
      empleadoId: 'employee-1',
      anio: 2026,
      mes: 6,
      employee: {
        departamento: 'OPS',
        unidad_organizativa_codigo: 'OPS',
        cargo: 'Mercaderista',
      },
      detalleCalculo: {
        sueldoProporcional: 600,
        aporteIess: 56.7,
        netoRecibir: 543.3,
      },
    });

    expect(lines.map((line) => line.concept_code)).toEqual(expect.arrayContaining([
      'sueldo_base',
      'aporte_iess_personal',
      'neto_banco',
    ]));
    expect(client.query).toHaveBeenCalledWith(
      'DELETE FROM payroll_calculation_lines WHERE payroll_id = $1',
      ['payroll-1']
    );
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO payroll_calculation_lines'), expect.any(Array));
    expect(db.commit).toHaveBeenCalledWith(client);
  });
});
