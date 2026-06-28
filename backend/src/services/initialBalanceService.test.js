jest.mock('../config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
}));
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const db = require('../config/database');
const {
  buildTemplateCsv,
  createDryRunBatch,
  getCommittedInitialBalanceEffects,
  normalizeRows,
} = require('./initialBalanceService');

function mockClient() {
  return {
    query: jest.fn(),
  };
}

describe('initialBalanceService MSF26', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('normaliza filas de plantilla con periodo por fecha de corte', () => {
    const rows = normalizeRows([
      { cedula: '0102030405', tipoSaldo: 'Vacaciones dias', dias: '5,50' },
    ], '2026-06-28');

    expect(rows[0]).toEqual(expect.objectContaining({
      cedula: '0102030405',
      balanceType: 'vacaciones_dias',
      periodKey: '2026-06',
      days: 5.5,
    }));
  });

  test('genera plantilla CSV con catalogo de tipos permitidos', () => {
    const csv = buildTemplateCsv();

    expect(csv).toContain('Plantilla MSF26-v1');
    expect(csv).toContain('vacaciones_dias');
    expect(csv).toContain('cedula,tipoSaldo,periodo,valor,horas,dias,descripcion');
  });

  test('prevalida lote y marca filas bloqueadas cuando el periodo ya esta cerrado', async () => {
    const client = mockClient();
    db.getClient.mockResolvedValue(client);
    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'emp-1',
          cedula: '0102030405',
          nombres: 'Ana',
          apellidos: 'Perez',
        }],
      })
      .mockResolvedValueOnce({ rows: [{ periodo_nomina: '2026-06', status: 'closed' }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'batch-1',
          tenant_id: 'tenant-1',
          period_cut: '2026-06-28',
          status: 'blocked',
          template_version: 'MSF26-v1',
          source_filename: 'saldos.csv',
          source_hash: 'hash',
          total_rows: 1,
          valid_rows: 0,
          error_rows: 1,
          summary: {},
        }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'item-1',
          row_number: 2,
          empleado_id: 'emp-1',
          cedula: '0102030405',
          employee_name: 'Perez Ana',
          balance_type: 'vacaciones_dias',
          period_key: '2026-06',
          amount: '0',
          hours: '0',
          days: '5.50',
          description: '',
          status: 'error',
          errors: ['El periodo ya existe como cerrado en SKNOMINA.'],
        }],
      });
    client.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'batch-1',
          tenant_id: 'tenant-1',
          period_cut: '2026-06-28',
          status: 'blocked',
          template_version: 'MSF26-v1',
          source_filename: 'saldos.csv',
          source_hash: 'hash',
          total_rows: 1,
          valid_rows: 0,
          error_rows: 1,
          summary: {},
        }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await createDryRunBatch({
      tenantId: 'tenant-1',
      userId: 'user-1',
      periodCut: '2026-06-28',
      sourceFilename: 'saldos.csv',
      rows: [{ cedula: '0102030405', tipoSaldo: 'vacaciones_dias', dias: '5.5', periodo: '2026-06' }],
      correlationId: 'corr-saldos',
    });

    expect(db.commit).toHaveBeenCalledWith(client);
    expect(client.query.mock.calls[0][0]).toContain('INSERT INTO initial_balance_batches');
    expect(result.status).toBe('blocked');
    expect(result.items[0].errors).toContain('El periodo ya existe como cerrado en SKNOMINA.');
  });

  test('resume saldos comprometidos para el motor de nomina sin tocar periodos cerrados', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        { id: 'i1', balance_type: 'anticipo', amount: '25.50', hours: '0', days: '0', description: '', period_key: '2026-05' },
        { id: 'i2', balance_type: 'prestamo', amount: '40.00', hours: '0', days: '0', description: '', period_key: '2026-05' },
        { id: 'i3', balance_type: 'beneficio_recurrente', amount: '15.00', hours: '0', days: '0', description: '', period_key: '2026-05' },
        { id: 'i4', balance_type: 'descuento_recurrente', amount: '10.00', hours: '0', days: '0', description: '', period_key: '2026-05' },
      ],
    });

    const result = await getCommittedInitialBalanceEffects({
      tenantId: 'tenant-1',
      empleadoId: 'emp-1',
      anio: 2026,
      mes: 6,
    });

    expect(db.query.mock.calls[0][0]).toContain("status = 'committed'");
    expect(result).toEqual(expect.objectContaining({
      anticipos: 25.5,
      prestamos: 40,
      beneficioRecurrente: 15,
      descuentoRecurrente: 10,
    }));
  });
});
