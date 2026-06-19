jest.mock('../config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
}));

jest.mock('./auditService', () => ({
  recordAudit: jest.fn(),
}));

const db = require('../config/database');
const { recordAudit } = require('./auditService');
const {
  buildEmployeeQuery,
  createNoveltyBatch,
  ensurePayrollPeriodForDate,
  extractPeriodFromDate,
  formatPeriodMarker,
  openPayrollPeriod,
  validatePeriod,
} = require('./monthlyPeriodService');

describe('monthlyPeriodService', () => {
  beforeEach(() => {
    db.query.mockReset();
    db.getClient.mockReset();
    db.commit.mockReset();
    db.rollback.mockReset();
    recordAudit.mockReset();
  });

  test('validatePeriod normaliza anio y mes', () => {
    expect(validatePeriod('2026', '6')).toEqual({ anio: 2026, mes: 6 });
  });

  test('buildEmployeeQuery soporta departamento', () => {
    expect(buildEmployeeQuery('department', 'ADM')).toEqual({
      where: 'AND departamento = $2',
      params: ['ADM'],
    });
  });

  test('extractPeriodFromDate marca periodo YYYY-MM', () => {
    expect(extractPeriodFromDate('2026-06-15')).toEqual({
      anio: 2026,
      mes: 6,
      periodoNomina: '2026-06',
      fecha: '2026-06-15',
    });
    expect(formatPeriodMarker(2026, 6)).toBe('2026-06');
  });

  test('ensurePayrollPeriodForDate crea o reutiliza periodo de la novedad', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 'period-1', status: 'open' }] });

    const period = await ensurePayrollPeriodForDate({
      tenantId: 'tenant-1',
      userId: 'user-1',
      fecha: '2026-06-15',
    });

    expect(period).toEqual(expect.objectContaining({
      id: 'period-1',
      status: 'open',
      periodoNomina: '2026-06',
    }));
  });

  test('openPayrollPeriod crea o reabre periodo abierto', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 'period-1', status: 'open' }] });

    const result = await openPayrollPeriod({
      tenantId: 'tenant-1',
      userId: 'user-1',
      correlationId: 'corr-1',
      ipAddress: '127.0.0.1',
      anio: 2026,
      mes: 6,
    });

    expect(result.id).toBe('period-1');
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'nomina.periodo.open',
      entityId: 'period-1',
    }));
  });

  test('createNoveltyBatch crea novedades para empleados del alcance', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'period-1', status: 'open' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'emp-1', cedula: '1710034065', nombres: 'Maria', apellidos: 'Demo' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'batch-1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'nov-1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'batch-1', status: 'completado', total_empleados: 1, total_creadas: 1 }] })
        .mockResolvedValueOnce({ rows: [] }),
    };
    db.getClient.mockResolvedValueOnce(client);

    const result = await createNoveltyBatch({
      tenantId: 'tenant-1',
      userId: 'user-1',
      correlationId: 'corr-1',
      ipAddress: '127.0.0.1',
      payload: {
        anio: 2026,
        mes: 6,
        scopeType: 'company',
        tipoNovedad: 'hora_extra_50',
        fecha: '2026-06-15',
        minutos: 60,
      },
    });

    expect(result.batch.id).toBe('batch-1');
    expect(db.commit).toHaveBeenCalledWith(client);
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'nomina.novedades.batch.create',
      entityId: 'batch-1',
    }));
  });

  test('createNoveltyBatch registra bono de desempeno con monto y periodo', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'period-1', status: 'open' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'emp-1', cedula: '1710034065', nombres: 'Maria', apellidos: 'Demo' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'batch-1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'nov-1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'batch-1', status: 'completado', total_empleados: 1, total_creadas: 1 }] })
        .mockResolvedValueOnce({ rows: [] }),
    };
    db.getClient.mockResolvedValueOnce(client);

    const result = await createNoveltyBatch({
      tenantId: 'tenant-1',
      userId: 'user-1',
      correlationId: 'corr-1',
      ipAddress: '127.0.0.1',
      payload: {
        anio: 2026,
        mes: 6,
        scopeType: 'company',
        tipoNovedad: 'bono_desempeno',
        fecha: '2026-06-15',
        monto: 125.55,
      },
    });

    expect(result.batch.id).toBe('batch-1');
    expect(client.query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('periodo_nomina'),
      expect.arrayContaining(['period-1', '2026-06', 'bono_desempeno', 125.55])
    );
  });
});
