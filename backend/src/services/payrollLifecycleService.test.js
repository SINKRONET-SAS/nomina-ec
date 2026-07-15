jest.mock('../config/database', () => ({
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
  discardPayrollDraft,
  discardPayrollPeriodCalculation,
  invalidateEmployeePayrollForNovelty,
  normalizeIntent,
  normalizeReason,
} = require('./payrollLifecycleService');

describe('payrollLifecycleService', () => {
  beforeEach(() => {
    db.getClient.mockReset();
    db.commit.mockReset();
    db.commit.mockResolvedValue(undefined);
    db.rollback.mockReset();
    db.rollback.mockResolvedValue(undefined);
    recordAudit.mockReset();
  });

  test('valida motivo e intencion de descarte', () => {
    expect(normalizeReason('Correccion de horas extra')).toBe('Correccion de horas extra');
    expect(normalizeIntent('correction')).toBe('correction');
    expect(() => normalizeReason('corto')).toThrow(expect.objectContaining({
      code: 'NOMINA_DESCARTE_MOTIVO_INVALIDO',
    }));
    expect(() => normalizeIntent('manual_total')).toThrow(expect.objectContaining({
      code: 'NOMINA_DESCARTE_INTENCION_INVALIDA',
    }));
  });

  test('descarta un rol borrador y libera el periodo para corregir novedades', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({
          rows: [{
            id: 'payroll-1',
            empleado_id: 'employee-1',
            calculation_batch_id: '11111111-1111-1111-1111-111111111111',
            anio: 2026,
            mes: 6,
            estado: 'borrador',
            total_ingresos: '1000.00',
            total_deducciones: '100.00',
            neto_recibir: '900.00',
            period_id: 'period-1',
            period_status: 'calculated',
            calculation_lines: 8,
          }],
        })
        .mockResolvedValueOnce({ rows: [{ id: 'payroll-1' }] })
        .mockResolvedValueOnce({ rows: [{ id: '11111111-1111-1111-1111-111111111111' }] })
        .mockResolvedValueOnce({ rows: [{ total: 2 }] })
        .mockResolvedValueOnce({ rows: [{ id: 'period-1', anio: 2026, mes: 6, status: 'novelties_loaded', calculated_at: null }] }),
    };
    db.getClient.mockResolvedValueOnce(client);

    const result = await discardPayrollDraft({
      tenantId: 'tenant-1',
      payrollId: 'payroll-1',
      userId: 'user-1',
      correlationId: 'corr-1',
      ipAddress: '127.0.0.1',
      reason: 'Corregir horas extra aprobadas',
      intent: 'correction',
    });

    expect(result).toEqual(expect.objectContaining({
      deleted: 1,
      payrollId: 'payroll-1',
      empleadoId: 'employee-1',
      nextAction: 'correct_sources',
    }));
    expect(client.query.mock.calls[1][0]).toContain("estado = 'borrador'");
    expect(client.query.mock.calls[2][0]).toContain('discardHistory');
    expect(client.query.mock.calls[4][0]).toContain('calculated_at = NULL');
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'nomina.borrador.descartar',
      entityId: 'payroll-1',
      correlationId: 'corr-1',
      dbClient: client,
    }));
    expect(db.commit).toHaveBeenCalledWith(client);
    expect(db.rollback).not.toHaveBeenCalled();
  });

  test('bloquea eliminar un rol cerrado y revierte la transaccion', async () => {
    const client = {
      query: jest.fn().mockResolvedValueOnce({
        rows: [{
          id: 'payroll-1',
          estado: 'cerrada',
          period_status: 'closed',
        }],
      }),
    };
    db.getClient.mockResolvedValueOnce(client);

    await expect(discardPayrollDraft({
      tenantId: 'tenant-1',
      payrollId: 'payroll-1',
      userId: 'user-1',
      reason: 'Intento de corregir rol cerrado',
    })).rejects.toMatchObject({
      code: 'NOMINA_ROL_FINAL_INMUTABLE',
      statusCode: 409,
    });
    expect(db.rollback).toHaveBeenCalledWith(client);
    expect(db.commit).not.toHaveBeenCalled();
  });

  test('descarta todos los borradores del periodo y conserva lotes historicos', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'period-1', status: 'calculated' }] })
        .mockResolvedValueOnce({
          rows: [
            { id: 'payroll-1', empleado_id: 'employee-1', calculation_batch_id: '11111111-1111-1111-1111-111111111111', estado: 'borrador' },
            { id: 'payroll-2', empleado_id: 'employee-2', calculation_batch_id: '11111111-1111-1111-1111-111111111111', estado: 'borrador' },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ id: 'payroll-1' }, { id: 'payroll-2' }] })
        .mockResolvedValueOnce({ rows: [{ id: '11111111-1111-1111-1111-111111111111' }] })
        .mockResolvedValueOnce({ rows: [{ total: 0 }] })
        .mockResolvedValueOnce({ rows: [{ id: 'period-1', anio: 2026, mes: 6, status: 'open', calculated_at: null }] }),
    };
    db.getClient.mockResolvedValueOnce(client);

    const result = await discardPayrollPeriodCalculation({
      tenantId: 'tenant-1',
      anio: 2026,
      mes: 6,
      userId: 'user-1',
      correlationId: 'corr-period',
      reason: 'Recalculo completo por novedades corregidas',
    });

    expect(result).toEqual(expect.objectContaining({
      deleted: 2,
      batchesUpdated: 1,
      nextAction: 'correct_sources_and_recalculate',
    }));
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'nomina.calculo_periodo.descartar',
      entityId: 'period-1',
      dbClient: client,
    }));
    expect(db.commit).toHaveBeenCalledWith(client);
  });

  test('bloquea descarte masivo si encuentra un rol final', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'period-1', status: 'calculated' }] })
        .mockResolvedValueOnce({
          rows: [
            { id: 'payroll-1', estado: 'borrador' },
            { id: 'payroll-2', estado: 'pagada' },
          ],
        }),
    };
    db.getClient.mockResolvedValueOnce(client);

    await expect(discardPayrollPeriodCalculation({
      tenantId: 'tenant-1',
      anio: 2026,
      mes: 6,
      userId: 'user-1',
      reason: 'Recalculo solicitado por administracion',
    })).rejects.toMatchObject({
      code: 'NOMINA_PERIODO_CONTIENE_ROLES_FINALES',
      statusCode: 409,
    });
    expect(db.rollback).toHaveBeenCalledWith(client);
    expect(db.commit).not.toHaveBeenCalled();
  });

  test('revierte si falla la actualizacion posterior a eliminar borradores', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'period-1', status: 'calculated' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'payroll-1', calculation_batch_id: null, estado: 'borrador' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'payroll-1' }] })
        .mockResolvedValueOnce({ rows: [{ total: 1 }] })
        .mockRejectedValueOnce(Object.assign(new Error('database unavailable'), { code: '08006' })),
    };
    db.getClient.mockResolvedValueOnce(client);

    await expect(discardPayrollPeriodCalculation({
      tenantId: 'tenant-1',
      anio: 2026,
      mes: 6,
      userId: 'user-1',
      reason: 'Recalculo por novedades del periodo',
    })).rejects.toMatchObject({ code: '08006' });
    expect(db.rollback).toHaveBeenCalledWith(client);
    expect(db.commit).not.toHaveBeenCalled();
  });

  test('invalida solo el calculo del empleado asociado a la novedad', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'period-1', status: 'calculated' }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 'nov-1',
            empleado_id: 'employee-1',
            tenant_id: 'tenant-1',
            periodo_nomina: '2026-06',
            fecha: '2026-06-15',
            tipo_novedad: 'hora_extra_50',
            estado: 'aprobado',
          }],
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 'payroll-1',
            empleado_id: 'employee-1',
            calculation_batch_id: '11111111-1111-1111-1111-111111111111',
            anio: 2026,
            mes: 6,
            estado: 'borrador',
            total_ingresos: '1000.00',
            total_deducciones: '100.00',
            neto_recibir: '900.00',
            calculation_lines: 7,
          }],
        })
        .mockResolvedValueOnce({ rows: [{ total: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 'payroll-1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'nov-1', estado: 'pendiente' }] })
        .mockResolvedValueOnce({ rows: [{ id: '11111111-1111-1111-1111-111111111111' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'period-1', anio: 2026, mes: 6, status: 'reopened', calculated_at: null }] }),
    };
    db.getClient.mockResolvedValueOnce(client);

    const result = await invalidateEmployeePayrollForNovelty({
      tenantId: 'tenant-1',
      employeeId: 'employee-1',
      anio: 2026,
      mes: 6,
      noveltyId: 'nov-1',
      userId: 'user-1',
      correlationId: 'corr-employee',
      ipAddress: '127.0.0.1',
      reason: 'Corregir horas extra de un empleado',
    });

    expect(result).toMatchObject({
      scope: 'employee',
      empleadoId: 'employee-1',
      nominasInvalidas: 1,
      lineasInvalidas: 7,
      novedadEditable: true,
    });
    expect(client.query.mock.calls[4][0]).toContain('DELETE FROM nominas');
    expect(client.query.mock.calls[4][0]).toContain('empleado_id = $3');
    expect(client.query.mock.calls[4][0]).toContain('anio = $4');
    expect(client.query.mock.calls[4][0]).toContain('mes = $5');
    expect(client.query.mock.calls[4][1]).toEqual([
      'payroll-1',
      'tenant-1',
      'employee-1',
      2026,
      6,
    ]);
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'novedades.empleado.invalidar_calculo',
      entity: 'nominas',
      entityId: 'payroll-1',
      dbClient: client,
    }));
    expect(db.commit).toHaveBeenCalledWith(client);
    expect(db.rollback).not.toHaveBeenCalled();
  });

  test('bloquea invalidacion individual cuando el periodo esta cerrado', async () => {
    const client = {
      query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 'period-1', status: 'closed' }] }),
    };
    db.getClient.mockResolvedValueOnce(client);

    await expect(invalidateEmployeePayrollForNovelty({
      tenantId: 'tenant-1',
      employeeId: 'employee-1',
      anio: 2026,
      mes: 6,
      noveltyId: 'nov-1',
      userId: 'user-1',
      correlationId: 'corr-closed',
      reason: 'Corregir novedad individual',
    })).rejects.toMatchObject({
      code: 'NOMINA_CERRADA_REQUIERE_REAPERTURA',
      statusCode: 409,
    });
    expect(client.query).toHaveBeenCalledTimes(1);
    expect(db.rollback).toHaveBeenCalledWith(client);
    expect(db.commit).not.toHaveBeenCalled();
  });
});
