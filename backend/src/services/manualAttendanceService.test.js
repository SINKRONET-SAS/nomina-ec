jest.mock('../config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
}));

jest.mock('./auditService', () => ({
  recordAudit: jest.fn(),
}));

jest.mock('./monthlyPeriodService', () => ({
  ensureWritablePayrollPeriodForDate: jest.fn(),
  todayInEcuador: jest.fn(() => '2026-07-14'),
}));

const db = require('../config/database');
const { recordAudit } = require('./auditService');
const { ensureWritablePayrollPeriodForDate } = require('./monthlyPeriodService');
const {
  normalizeManualAttendanceInput,
  registerManualAttendance,
} = require('./manualAttendanceService');

const employeeId = '11111111-1111-4111-8111-111111111111';
const client = { query: jest.fn() };

function employee(id = employeeId, overrides = {}) {
  return {
    id,
    cedula: '0102030405',
    nombres: 'Ana',
    apellidos: 'Demo',
    fecha_ingreso: '2026-01-01',
    fecha_salida: null,
    controla_asistencia: true,
    shift_start_time: '08:00:00',
    shift_end_time: '17:00:00',
    calendar_rules: { workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
    ...overrides,
  };
}

describe('manualAttendanceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.getClient.mockResolvedValue(client);
    db.commit.mockResolvedValue();
    db.rollback.mockResolvedValue();
    ensureWritablePayrollPeriodForDate.mockResolvedValue({
      id: 'period-1',
      status: 'open',
      periodoNomina: '2026-06',
    });
    recordAudit.mockResolvedValue();
  });

  test('exige empleado en modo individual', () => {
    try {
      normalizeManualAttendanceInput({
        scope: 'employee',
        fecha: '2026-06-10',
        horaInicio: '08:00',
        horaFin: '17:00',
        justificacion: 'Olvido de marcación',
      });
      throw new Error('La validación debía rechazar el empleado vacío.');
    } catch (err) {
      expect(err.code).toBe('MANUAL_ATTENDANCE_EMPLOYEE_REQUIRED');
    }
  });

  test('registra inicio y fin faltantes para un empleado en una fecha', async () => {
    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [employee()] })
      .mockResolvedValueOnce({
        rows: [
          { id: 'mark-1', empleado_id: employeeId, tipo_marcacion: 'inicio_jornada' },
          { id: 'mark-2', empleado_id: employeeId, tipo_marcacion: 'fin_jornada' },
        ],
      });

    const result = await registerManualAttendance({
      tenantId: 'tenant-1',
      userId: 'user-1',
      correlationId: 'corr-manual',
      ipAddress: '127.0.0.1',
      payload: {
        scope: 'employee',
        empleadoId: employeeId,
        fecha: '2026-06-10',
        horaInicio: '08:00',
        horaFin: '17:00',
        justificacion: 'Registro autorizado por RRHH',
      },
    });

    expect(ensureWritablePayrollPeriodForDate).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      fecha: '2026-06-10',
    });
    expect(client.query.mock.calls[2][0]).toContain("'manual_rrhh'");
    expect(db.commit).toHaveBeenCalledWith(client);
    expect(result).toMatchObject({
      scope: 'employee',
      jornadasPlanificadas: 1,
      marcacionesCreadas: 2,
      marcacionesExistentes: 0,
    });
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'asistencia.manual.registrar',
      entity: 'marcaciones',
    }));
  });

  test('explica como habilitar el control cuando el empleado esta excluido', async () => {
    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [employee(employeeId, { controla_asistencia: false })] });

    await expect(registerManualAttendance({
      tenantId: 'tenant-1',
      userId: 'user-1',
      payload: {
        scope: 'employee',
        empleadoId: employeeId,
        fecha: '2026-06-10',
        horaInicio: '08:00',
        horaFin: '17:00',
        justificacion: 'Registro autorizado por RRHH',
      },
    })).rejects.toMatchObject({ code: 'MANUAL_ATTENDANCE_CONTROL_DISABLED' });

    expect(db.rollback).toHaveBeenCalledWith(client);
    expect(db.commit).not.toHaveBeenCalled();
  });

  test('modo global aplica rango laborable y omite marcaciones existentes', async () => {
    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          employee(),
          employee('22222222-2222-4222-8222-222222222222', { cedula: '0102030406', nombres: 'Luis' }),
        ],
      })
      .mockResolvedValueOnce({
        rows: Array.from({ length: 19 }, (_, index) => ({ id: `mark-${index + 1}` })),
      });

    const result = await registerManualAttendance({
      tenantId: 'tenant-1',
      userId: 'user-1',
      correlationId: 'corr-global',
      payload: {
        scope: 'all',
        desde: '2026-06-08',
        hasta: '2026-06-12',
        horaInicio: '07:30',
        horaFin: '16:30',
        justificacion: 'Carga global autorizada',
      },
    });

    expect(client.query.mock.calls[1][1]).toEqual(['tenant-1', '2026-06-08', '2026-06-12', null]);
    expect(result).toMatchObject({
      scope: 'all',
      totalEmpleados: 2,
      diasRango: 5,
      jornadasPlanificadas: 10,
      marcacionesEsperadas: 20,
      marcacionesCreadas: 19,
      marcacionesExistentes: 1,
    });
    const plannedRows = JSON.parse(client.query.mock.calls[2][1][1]);
    expect(plannedRows).toHaveLength(10);
    expect(plannedRows[0]).toMatchObject({
      start_time: '08:00',
      end_time: '17:00',
    });
  });

  test('permite un rango mensual para un empleado y respeta su jornada', async () => {
    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [employee()] })
      .mockResolvedValueOnce({ rows: Array.from({ length: 10 }, (_, index) => ({ id: `mark-${index + 1}` })) });

    const result = await registerManualAttendance({
      tenantId: 'tenant-1',
      userId: 'user-1',
      payload: {
        scope: 'employee',
        empleadoId: employeeId,
        desde: '2026-06-08',
        hasta: '2026-06-12',
        horaInicio: '08:00',
        horaFin: '17:00',
        justificacion: 'Regularización mensual individual',
      },
    });

    expect(result).toMatchObject({
      scope: 'employee',
      jornadasPlanificadas: 5,
      marcacionesCreadas: 10,
    });
  });

  test('el global diario aplica la fecha elegida aunque sea fin de semana', async () => {
    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [employee()] })
      .mockResolvedValueOnce({ rows: [{ id: 'mark-1' }, { id: 'mark-2' }] });

    const result = await registerManualAttendance({
      tenantId: 'tenant-1',
      userId: 'user-1',
      payload: {
        scope: 'all',
        fecha: '2026-06-14',
        horaInicio: '08:00',
        horaFin: '17:00',
        justificacion: 'Jornada global extraordinaria',
      },
    });

    expect(result.jornadasPlanificadas).toBe(1);
  });

  test('modo global no crea jornadas en fines de semana', async () => {
    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [employee()] })
      .mockResolvedValueOnce({ rows: Array.from({ length: 4 }, (_, index) => ({ id: `mark-${index + 1}` })) });

    const result = await registerManualAttendance({
      tenantId: 'tenant-1',
      userId: 'user-1',
      payload: {
        scope: 'all',
        desde: '2026-06-12',
        hasta: '2026-06-15',
        horaInicio: '08:00',
        horaFin: '17:00',
        justificacion: 'Regularización del periodo',
      },
    });

    expect(result.jornadasPlanificadas).toBe(2);
  });
});
