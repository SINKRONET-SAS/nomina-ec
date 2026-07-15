const db = require('../config/database');
const AppError = require('../utils/AppError');
const { recordAudit } = require('./auditService');
const { ensureWritablePayrollPeriodForDate, todayInEcuador } = require('./monthlyPeriodService');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DEFAULT_WORK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const WEEK_DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MAX_MANUAL_RANGE_DAYS = 31;

function normalizeDate(value, fieldLabel) {
  const date = String(value || '').trim();
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
    throw new AppError(`Selecciona una fecha válida en ${fieldLabel}.`, {
      code: 'MANUAL_ATTENDANCE_DATE_INVALID',
      statusCode: 400,
      details: { field: fieldLabel },
    });
  }
  return date;
}

function daysBetweenInclusive(dateFrom, dateTo) {
  const start = new Date(`${dateFrom}T00:00:00.000Z`);
  const end = new Date(`${dateTo}T00:00:00.000Z`);
  return Math.floor((end - start) / 86400000) + 1;
}

function datesInRange(dateFrom, dateTo) {
  const dates = [];
  const current = new Date(`${dateFrom}T00:00:00.000Z`);
  const end = new Date(`${dateTo}T00:00:00.000Z`);
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

function normalizeManualAttendanceInput(payload = {}) {
  const scope = payload.scope === 'all' ? 'all' : 'employee';
  const employeeId = String(payload.empleadoId || payload.employeeId || '').trim();
  const singleDate = payload.fecha || payload.date;
  const dateFrom = normalizeDate(payload.desde || payload.dateFrom || singleDate, 'desde');
  const dateTo = normalizeDate(payload.hasta || payload.dateTo || singleDate, 'hasta');
  const startTime = String(payload.horaInicio || payload.startTime || '').trim();
  const endTime = String(payload.horaFin || payload.endTime || '').trim();
  const reason = String(payload.justificacion || payload.reason || '').trim();

  if (scope === 'employee' && !UUID_PATTERN.test(employeeId)) {
    throw new AppError('Selecciona el empleado para registrar su jornada.', {
      code: 'MANUAL_ATTENDANCE_EMPLOYEE_REQUIRED',
      statusCode: 400,
    });
  }
  if (dateTo < dateFrom) {
    throw new AppError('La fecha hasta no puede ser anterior a la fecha desde.', {
      code: 'MANUAL_ATTENDANCE_RANGE_INVALID',
      statusCode: 400,
    });
  }
  const rangeDays = daysBetweenInclusive(dateFrom, dateTo);
  if (rangeDays > MAX_MANUAL_RANGE_DAYS) {
    throw new AppError(`La carga manual admite un máximo de ${MAX_MANUAL_RANGE_DAYS} días por operación.`, {
      code: 'MANUAL_ATTENDANCE_RANGE_TOO_LARGE',
      statusCode: 422,
      details: { maxDays: MAX_MANUAL_RANGE_DAYS, rangeDays },
    });
  }
  if (dateTo > todayInEcuador()) {
    throw new AppError('La asistencia manual no puede registrarse para fechas futuras.', {
      code: 'MANUAL_ATTENDANCE_FUTURE_DATE',
      statusCode: 422,
    });
  }
  if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime) || endTime <= startTime) {
    throw new AppError('La hora de salida debe ser posterior a la hora de entrada.', {
      code: 'MANUAL_ATTENDANCE_TIME_INVALID',
      statusCode: 400,
    });
  }
  if (reason.length < 5) {
    throw new AppError('Explica brevemente por qué se registra la asistencia manual.', {
      code: 'MANUAL_ATTENDANCE_REASON_REQUIRED',
      statusCode: 400,
    });
  }

  return {
    scope,
    employeeId: scope === 'employee' ? employeeId : null,
    dateFrom,
    dateTo,
    startTime,
    endTime,
    reason: reason.slice(0, 500),
  };
}

function workDaysForEmployee(employee) {
  const rules = employee.calendar_rules && typeof employee.calendar_rules === 'object'
    ? employee.calendar_rules
    : {};
  const workDays = Array.isArray(rules.workDays) ? rules.workDays : [];
  return new Set(workDays.length > 0 ? workDays : DEFAULT_WORK_DAYS);
}

function employeeWorksOnDate(employee, date) {
  if (String(employee.fecha_ingreso).slice(0, 10) > date) return false;
  if (employee.fecha_salida && String(employee.fecha_salida).slice(0, 10) < date) return false;
  const weekDay = WEEK_DAY_NAMES[new Date(`${date}T00:00:00.000Z`).getUTCDay()];
  return workDaysForEmployee(employee).has(weekDay);
}

function buildPlannedAttendanceRows(employees, input, periodByMonth) {
  const dates = datesInRange(input.dateFrom, input.dateTo);
  const isSingleDate = dates.length === 1;
  const rows = [];
  for (const date of dates) {
    for (const employee of employees) {
      if (!isSingleDate && !employeeWorksOnDate(employee, date)) continue;
      rows.push({
        empleado_id: employee.id,
        period_id: periodByMonth.get(date.slice(0, 7)).id,
        operational_date: date,
        start_time: String(isSingleDate ? input.startTime : (employee.shift_start_time || input.startTime)).slice(0, 5),
        end_time: String(isSingleDate ? input.endTime : (employee.shift_end_time || input.endTime)).slice(0, 5),
      });
    }
  }
  return rows;
}

async function registerManualAttendance({
  tenantId,
  userId,
  correlationId,
  ipAddress,
  payload,
}) {
  const input = normalizeManualAttendanceInput(payload);
  const dates = datesInRange(input.dateFrom, input.dateTo);
  const monthDates = [...new Map(dates.map((date) => [date.slice(0, 7), date])).entries()];
  const periods = await Promise.all(monthDates.map(async ([month, date]) => [
    month,
    await ensureWritablePayrollPeriodForDate({ tenantId, fecha: date }),
  ]));
  const periodByMonth = new Map(periods);

  const client = await db.getClient(tenantId, userId);
  let employees;
  let plannedRows;
  let inserted;

  try {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`manual-attendance:${tenantId}`]);
    employees = await client.query(`
      SELECT
        e.id,
        e.cedula,
        e.nombres,
        e.apellidos,
        e.fecha_ingreso,
        e.fecha_salida,
        e.controla_asistencia,
        ws.start_time AS shift_start_time,
        ws.end_time AS shift_end_time,
        ws.calendar_rules
      FROM empleados e
      LEFT JOIN work_shifts ws
        ON ws.tenant_id = e.tenant_id
       AND ws.code = e.jornada_codigo
       AND ws.status = 'activo'
      WHERE e.tenant_id = $1
        AND e.fecha_ingreso <= $3::date
        AND (e.fecha_salida IS NULL OR e.fecha_salida >= $2::date)
        AND ($4::uuid IS NOT NULL OR e.controla_asistencia = true)
        AND ($4::uuid IS NULL OR e.id = $4::uuid)
      ORDER BY e.apellidos, e.nombres
    `, [tenantId, input.dateFrom, input.dateTo, input.employeeId]);

    if (employees.rows.length === 0) {
      throw new AppError(
        input.scope === 'all'
          ? 'No hay empleados incluidos en control de asistencia para el rango seleccionado.'
          : 'El empleado no tiene una relación laboral vigente en la fecha seleccionada.',
        {
          code: 'MANUAL_ATTENDANCE_NO_ELIGIBLE_EMPLOYEES',
          statusCode: 409,
          details: { desde: input.dateFrom, hasta: input.dateTo, empleadoId: input.employeeId },
        }
      );
    }
    if (input.scope === 'employee' && employees.rows[0].controla_asistencia === false) {
      throw new AppError('Activa “Incluir en control de asistencia” en la ficha del empleado antes de registrar su jornada.', {
        code: 'MANUAL_ATTENDANCE_CONTROL_DISABLED',
        statusCode: 409,
        details: { empleadoId: input.employeeId },
      });
    }

    plannedRows = buildPlannedAttendanceRows(employees.rows, input, periodByMonth);
    if (plannedRows.length === 0) {
      throw new AppError('El rango no contiene días laborables según las jornadas configuradas.', {
        code: 'MANUAL_ATTENDANCE_NO_WORK_DAYS',
        statusCode: 409,
        details: { desde: input.dateFrom, hasta: input.dateTo },
      });
    }

    const metadata = JSON.stringify({
      source: 'manual_rrhh',
      scope: input.scope,
      reason: input.reason,
      registeredBy: userId || null,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
    });
    inserted = await client.query(`
      WITH planned AS (
        SELECT *
        FROM jsonb_to_recordset($2::jsonb) AS row_data(
          empleado_id uuid,
          period_id uuid,
          operational_date date,
          start_time time,
          end_time time
        )
      ), expanded_marks AS (
        SELECT empleado_id, period_id, operational_date,
               'inicio_jornada'::"AttendanceMarkType" AS tipo_marcacion,
               start_time AS local_time
        FROM planned
        UNION ALL
        SELECT empleado_id, period_id, operational_date,
               'fin_jornada'::"AttendanceMarkType",
               end_time
        FROM planned
      )
      INSERT INTO marcaciones (
        empleado_id, tenant_id, period_id, operational_date, tipo_marcacion,
        timestamp, dentro_perimetro, distancia_metros, ip_address, source,
        audit_correlation_id, metadata
      )
      SELECT
        mark.empleado_id,
        $1,
        mark.period_id,
        mark.operational_date,
        mark.tipo_marcacion,
        ((mark.operational_date + mark.local_time) AT TIME ZONE 'America/Guayaquil'),
        true,
        0,
        $3,
        'manual_rrhh',
        $4,
        $5::jsonb
      FROM expanded_marks mark
      WHERE NOT EXISTS (
        SELECT 1
        FROM marcaciones existing
        WHERE existing.tenant_id = $1
          AND existing.empleado_id = mark.empleado_id
          AND COALESCE(existing.operational_date, DATE(existing.timestamp AT TIME ZONE 'America/Guayaquil')) = mark.operational_date
          AND existing.tipo_marcacion = mark.tipo_marcacion
      )
      RETURNING id, empleado_id, operational_date, tipo_marcacion, timestamp
    `, [tenantId, JSON.stringify(plannedRows), ipAddress || null, correlationId || null, metadata]);
    const expectedMarks = plannedRows.length * 2;
    await recordAudit({
      tenantId,
      userId,
      correlationId,
      action: 'asistencia.manual.registrar',
      entity: 'marcaciones',
      entityId: inserted.rows[0]?.id || null,
      newData: {
        scope: input.scope,
        desde: input.dateFrom,
        hasta: input.dateTo,
        totalEmpleados: employees.rows.length,
        diasRango: dates.length,
        jornadasPlanificadas: plannedRows.length,
        marcacionesEsperadas: expectedMarks,
        marcacionesCreadas: inserted.rows.length,
        marcacionesExistentes: expectedMarks - inserted.rows.length,
        justificacion: input.reason,
      },
      ipAddress,
      dbClient: client,
    });
    await db.commit(client);
  } catch (err) {
    await db.rollback(client);
    throw err;
  }

  const expectedMarks = plannedRows.length * 2;
  const result = {
    scope: input.scope,
    desde: input.dateFrom,
    hasta: input.dateTo,
    totalEmpleados: employees.rows.length,
    diasRango: dates.length,
    jornadasPlanificadas: plannedRows.length,
    marcacionesEsperadas: expectedMarks,
    marcacionesCreadas: inserted.rows.length,
    marcacionesExistentes: expectedMarks - inserted.rows.length,
  };

  return result;
}

module.exports = {
  buildPlannedAttendanceRows,
  normalizeManualAttendanceInput,
  registerManualAttendance,
};
