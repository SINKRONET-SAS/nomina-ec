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
  closeEmptyPastPayrollPeriods,
  closeOperationalPayrollPeriod,
  createNoveltyBatch,
  ensurePayrollPeriodForDate,
  ensureWritablePayrollPeriodForDate,
  extractPeriodFromDate,
  formatPeriodMarker,
  generateAnnualPayrollPeriods,
  getPayrollPeriodState,
  openPayrollPeriod,
  periodEndDate,
  periodStartDate,
  updatePayrollPeriodDates,
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

  test('getPayrollPeriodState resuelve el nombre y cedula del alcance individual', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 'period-1', status: 'open' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{
        id: 'batch-1',
        scope_type: 'employee',
        scope_value: 'emp-1',
        scope_label: 'Perez Ana - 0102030405',
      }] });

    const result = await getPayrollPeriodState({ tenantId: 'tenant-1', anio: 2026, mes: 6 });

    expect(db.query.mock.calls[3][0]).toContain('LEFT JOIN empleados');
    expect(result.batches[0]).toMatchObject({
      scope_value: 'emp-1',
      scope_label: 'Perez Ana - 0102030405',
    });
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
    expect(result.periods[11]).toEqual(expect.objectContaining({
      mes: 12,
      fecha_desde: '2026-12-01',
      fecha_hasta: '2026-12-31',
      status: 'planned',
    }));
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'nomina.periodos.generate_year',
      newData: expect.objectContaining({ anio: 2026, total: 12 }),
    }));
  });

  test('updatePayrollPeriodDates permite corregir fechas dentro del anio sin roles', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'period-1',
          status: 'planned',
          fecha_desde: '2026-01-01',
          fecha_hasta: '2026-01-31',
          payroll_total: 0,
        }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'period-1',
          status: 'planned',
          fecha_desde: '2026-01-02',
          fecha_hasta: '2026-01-30',
        }],
      });

    const result = await updatePayrollPeriodDates({
      tenantId: 'tenant-1',
      userId: 'user-1',
      correlationId: 'corr-1',
      ipAddress: '127.0.0.1',
      anio: 2026,
      mes: 1,
      fechaDesde: '2026-01-02',
      fechaHasta: '2026-01-30',
    });

    expect(result).toEqual(expect.objectContaining({
      fecha_desde: '2026-01-02',
      fecha_hasta: '2026-01-30',
    }));
    expect(db.query.mock.calls[1][0]).toContain('UPDATE payroll_periods');
    expect(db.query.mock.calls[1][1]).toEqual(expect.arrayContaining([
      '2026-01-02',
      '2026-01-30',
      '2026-01-01',
      '2026-01-31',
    ]));
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'nomina.periodo.update_dates',
      previousData: { fechaDesde: '2026-01-01', fechaHasta: '2026-01-31' },
      newData: expect.objectContaining({ fechaDesde: '2026-01-02', fechaHasta: '2026-01-30' }),
    }));
  });

  test('updatePayrollPeriodDates bloquea fechas fuera del anio seleccionado', async () => {
    await expect(updatePayrollPeriodDates({
      tenantId: 'tenant-1',
      userId: 'user-1',
      anio: 2026,
      mes: 1,
      fechaDesde: '2025-12-31',
      fechaHasta: '2026-01-31',
    })).rejects.toMatchObject({
      code: 'PAYROLL_PERIOD_DATE_YEAR_MISMATCH',
      statusCode: 422,
    });
    expect(db.query).not.toHaveBeenCalled();
  });

  test('updatePayrollPeriodDates bloquea periodos calculados o con roles', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 'period-1',
        status: 'open',
        fecha_desde: '2026-01-01',
        fecha_hasta: '2026-01-31',
        payroll_total: 1,
      }],
    });

    await expect(updatePayrollPeriodDates({
      tenantId: 'tenant-1',
      userId: 'user-1',
      anio: 2026,
      mes: 1,
      fechaDesde: '2026-01-02',
      fechaHasta: '2026-01-30',
    })).rejects.toMatchObject({
      code: 'PAYROLL_PERIOD_DATE_EDIT_BLOCKED',
      statusCode: 409,
    });
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

  test('closeEmptyPastPayrollPeriods cierra meses anteriores sin datos y omite meses con actividad', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [
          { id: 'period-1', anio: 2026, mes: 1, status: 'planned', payroll_total: 0, novedades_total: 0 },
          { id: 'period-2', anio: 2026, mes: 2, status: 'open', payroll_total: 1, novedades_total: 0 },
          { id: 'period-3', anio: 2026, mes: 3, status: 'planned', payroll_total: 0, novedades_total: 0 },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { id: 'period-1', status: 'closed' },
          { id: 'period-3', status: 'closed' },
        ],
      });

    const result = await closeEmptyPastPayrollPeriods({
      tenantId: 'tenant-1',
      userId: 'user-1',
      correlationId: 'corr-1',
      ipAddress: '127.0.0.1',
      anio: 2026,
      hastaMes: 3,
      motivo: 'Empresa inicia operacion en abril y cierra meses vacios',
    });

    expect(result.totalClosed).toBe(2);
    expect(result.skipped).toEqual([
      expect.objectContaining({ mes: 2, payrollTotal: 1 }),
    ]);
    expect(db.query.mock.calls[1][0]).toContain('UPDATE payroll_periods');
    expect(db.query.mock.calls[1][1][1]).toEqual(['period-1', 'period-3']);
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'nomina.periodos.close_empty_past',
      newData: expect.objectContaining({
        anio: 2026,
        hastaMes: 3,
        totalClosed: 2,
      }),
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
