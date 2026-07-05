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
  closeOperationalPayrollPeriod,
  createNoveltyBatch,
  ensurePayrollPeriodForDate,
  ensureWritablePayrollPeriodForDate,
  extractPeriodFromDate,
  formatPeriodMarker,
  generateAnnualPayrollPeriods,
  openPayrollPeriod,
  periodEndDate,
  periodStartDate,
  validatePeriod,
} = require('./monthlyPeriodService');

describe('monthlyPeriodService', () => {
  beforeEach(() => {
    db.query.mockReset();
    db.query.mockResolvedValue({ rows: [] });
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

  test('buildEmployeeQuery soporta cargo real e historico', () => {
    const query = buildEmployeeQuery('position', 'ANALISTA');
    expect(query.where).toContain('job_positions');
    expect(query.where).toContain('position_id');
    expect(query.where).toContain('UPPER(cargo)');
    expect(query.params).toEqual(['ANALISTA']);
  });

  test('extractPeriodFromDate marca periodo YYYY-MM', () => {
    expect(extractPeriodFromDate('2026-06-15')).toEqual({
      anio: 2026,
      mes: 6,
      periodoNomina: '2026-06',
      fecha: '2026-06-15',
    });
    expect(formatPeriodMarker(2026, 6)).toBe('2026-06');
    expect(periodStartDate(2026, 2)).toBe('2026-02-01');
    expect(periodEndDate(2026, 2)).toBe('2026-02-28');
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

  test('ensureWritablePayrollPeriodForDate rechaza si el mes no fue abierto', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    await expect(ensureWritablePayrollPeriodForDate({
      tenantId: 'tenant-1',
      fecha: '2026-07-05',
    })).rejects.toMatchObject({
      code: 'PAYROLL_PERIOD_NOT_OPEN_FOR_NOVELTY',
      statusCode: 409,
    });
  });

  test('ensureWritablePayrollPeriodForDate rechaza meses ya calculados o cerrados', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 'period-1', status: 'calculated' }] });

    await expect(ensureWritablePayrollPeriodForDate({
      tenantId: 'tenant-1',
      fecha: '2026-06-15',
    })).rejects.toMatchObject({
      code: 'PAYROLL_PERIOD_NOT_WRITABLE_FOR_NOVELTY',
      statusCode: 409,
    });
  });

  test('ensureWritablePayrollPeriodForDate retorna periodo abierto existente', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 'period-1', status: 'novelties_loaded' }] });

    const period = await ensureWritablePayrollPeriodForDate({
      tenantId: 'tenant-1',
      fecha: '2026-06-15',
    });

    expect(period).toEqual(expect.objectContaining({
      id: 'period-1',
      status: 'novelties_loaded',
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

  test('generateAnnualPayrollPeriods crea doce meses planificados con fechas', async () => {
    db.query.mockImplementation((sql, params) => Promise.resolve({
      rows: [{
        id: `period-${params[2]}`,
        anio: params[1],
        mes: params[2],
        fecha_desde: params[3],
        fecha_hasta: params[4],
        status: 'planned',
      }],
    }));

    const result = await generateAnnualPayrollPeriods({
      tenantId: 'tenant-1',
      userId: 'user-1',
      correlationId: 'corr-1',
      ipAddress: '127.0.0.1',
      anio: 2026,
    });

    expect(result.total).toBe(12);
    expect(result.periods[0]).toEqual(expect.objectContaining({
      mes: 1,
      fecha_desde: '2026-01-01',
      fecha_hasta: '2026-01-31',
      status: 'planned',
    }));
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'nomina.periodos.generate_year',
      newData: expect.objectContaining({ anio: 2026, total: 12 }),
    }));
  });

  test('closeOperationalPayrollPeriod bloquea periodos calculados', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 'period-1', status: 'calculated' }] });

    await expect(closeOperationalPayrollPeriod({
      tenantId: 'tenant-1',
      userId: 'user-1',
      correlationId: 'corr-1',
      ipAddress: '127.0.0.1',
      anio: 2026,
      mes: 6,
      motivo: 'Cierre operativo solicitado por RRHH',
    })).rejects.toMatchObject({
      code: 'PAYROLL_PERIOD_CLOSE_REQUIRES_PAYROLL_CLOSE',
      statusCode: 409,
    });
  });

  test('closeOperationalPayrollPeriod cierra si no hay pendientes operativos', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 'period-1', status: 'open' }] })
      .mockResolvedValueOnce({ rows: [{ payroll_borrador: 0, novedades_pendientes: 0 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'period-1', status: 'closed' }] });

    const result = await closeOperationalPayrollPeriod({
      tenantId: 'tenant-1',
      userId: 'user-1',
      correlationId: 'corr-1',
      ipAddress: '127.0.0.1',
      anio: 2026,
      mes: 6,
      motivo: 'Cierre operativo solicitado por RRHH',
    });

    expect(result.status).toBe('closed');
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'nomina.periodo.close_operational',
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

  test('createNoveltyBatch acepta horas y persiste minutos normalizados', async () => {
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
        horas: 1.5,
      },
    });

    expect(result.batch.id).toBe('batch-1');
    expect(client.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO novelty_batches'),
      expect.arrayContaining([90])
    );
    expect(client.query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('INSERT INTO novedades_asistencia'),
      expect.arrayContaining([90])
    );
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
