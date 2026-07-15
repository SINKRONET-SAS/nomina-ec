const db = require('../config/database');
const AppError = require('../utils/AppError');
const { recordAudit } = require('./auditService');
const { ensureWritablePayrollPeriodForDate, todayInEcuador } = require('./monthlyPeriodService');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DEFAULT_WORK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const WEEK_DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MAX_MANUAL_RANGE_DAYS = 31;
const MAX_MANUAL_BULK_ROWS = 1000;
const CEDULA_PATTERN = /^\d{10,13}$/;
const MANUAL_ATTENDANCE_BULK_TEMPLATE_COLUMNS = [
  'empleadoId',
  'cedula',
  'desde',
  'hasta',
  'horaInicio',
  'horaFin',
  'justificacion',
];

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

function databaseDateOnly(value) {
  if (!value) return '';
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  const isoDate = text.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (isoDate) return isoDate;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
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
  const normalizedWorkDays = workDays
    .map((workDay) => String(workDay || '').trim().toLowerCase())
    .filter((workDay) => WEEK_DAY_NAMES.includes(workDay));
  return new Set(normalizedWorkDays.length > 0 ? normalizedWorkDays : DEFAULT_WORK_DAYS);
}

function employeeWorksOnDate(employee, date) {
  const hireDate = databaseDateOnly(employee.fecha_ingreso);
  const terminationDate = databaseDateOnly(employee.fecha_salida);
  if (hireDate && hireDate > date) return false;
  if (terminationDate && terminationDate < date) return false;
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

function rowField(row, ...keys) {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null) return row[key];
  }
  return '';
}

function normalizeManualAttendanceBulkRows(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new AppError('La carga masiva requiere al menos una fila.', {
      code: 'MANUAL_ATTENDANCE_BULK_EMPTY',
      statusCode: 400,
    });
  }
  if (rows.length > MAX_MANUAL_BULK_ROWS) {
    throw new AppError(`La carga masiva admite hasta ${MAX_MANUAL_BULK_ROWS} filas por lote.`, {
      code: 'MANUAL_ATTENDANCE_BULK_TOO_LARGE',
      statusCode: 422,
      details: { maxRows: MAX_MANUAL_BULK_ROWS, totalRows: rows.length },
    });
  }

  const normalizedRows = [];
  const validationErrors = [];
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    try {
      const employeeId = String(rowField(row, 'empleadoId', 'employeeId', 'empleado_id')).trim();
      const cedula = String(rowField(row, 'cedula', 'identificacion')).replace(/\s+/g, '');
      if (employeeId && !UUID_PATTERN.test(employeeId)) {
        throw new AppError('El empleadoId no tiene un formato valido.', {
          code: 'MANUAL_ATTENDANCE_BULK_EMPLOYEE_ID_INVALID',
          statusCode: 422,
        });
      }
      if (cedula && !CEDULA_PATTERN.test(cedula)) {
        throw new AppError('La cedula debe contener entre 10 y 13 digitos.', {
          code: 'MANUAL_ATTENDANCE_BULK_CEDULA_INVALID',
          statusCode: 422,
        });
      }
      if (!employeeId && !cedula) {
        throw new AppError('Indica empleadoId o una cedula valida.', {
          code: 'MANUAL_ATTENDANCE_BULK_EMPLOYEE_REQUIRED',
          statusCode: 422,
        });
      }
      const fecha = rowField(row, 'fecha');
      const normalized = normalizeManualAttendanceInput({
        scope: 'all',
        desde: rowField(row, 'desde', 'dateFrom') || fecha,
        hasta: rowField(row, 'hasta', 'dateTo') || fecha,
        horaInicio: rowField(row, 'horaInicio', 'startTime', 'entrada'),
        horaFin: rowField(row, 'horaFin', 'endTime', 'salida'),
        justificacion: rowField(row, 'justificacion', 'reason', 'motivo'),
      });
      normalizedRows.push({
        ...normalized,
        rowNumber,
        employeeId: UUID_PATTERN.test(employeeId) ? employeeId : null,
        cedula: CEDULA_PATTERN.test(cedula) ? cedula : '',
      });
    } catch (err) {
      validationErrors.push({
        rowNumber,
        status: 'error',
        error: err.code || 'MANUAL_ATTENDANCE_BULK_ROW_INVALID',
        message: err.message,
      });
    }
  });

  if (validationErrors.length > 0) {
    throw new AppError('Corrige las filas indicadas antes de registrar la carga masiva.', {
      code: 'MANUAL_ATTENDANCE_BULK_VALIDATION_FAILED',
      statusCode: 422,
      details: { results: validationErrors },
    });
  }
  return normalizedRows;
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
        e.fecha_ingreso::text AS fecha_ingreso,
        e.fecha_salida::text AS fecha_salida,
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
      throw new AppError('No encontramos días laborables en el período. Revisa la fecha de ingreso y la jornada del empleado en Parametrización, o registra una jornada extraordinaria con la opción Un día.', {
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

async function registerManualAttendanceBulk({
  tenantId,
  userId,
  correlationId,
  ipAddress,
  rows,
}) {
  const normalizedRows = normalizeManualAttendanceBulkRows(rows);
  const representativeDates = new Map();
  for (const row of normalizedRows) {
    for (const date of datesInRange(row.dateFrom, row.dateTo)) {
      if (!representativeDates.has(date.slice(0, 7))) representativeDates.set(date.slice(0, 7), date);
    }
  }
  const periods = await Promise.all([...representativeDates.entries()].map(async ([month, date]) => [
    month,
    await ensureWritablePayrollPeriodForDate({ tenantId, fecha: date }),
  ]));
  const periodByMonth = new Map(periods);
  const client = await db.getClient(tenantId, userId);

  try {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`manual-attendance:${tenantId}`]);
    const employeeIds = [...new Set(normalizedRows.map((row) => row.employeeId).filter(Boolean))];
    const cedulas = [...new Set(normalizedRows.map((row) => row.cedula).filter(Boolean))];
    const employeeResult = await client.query(`
      SELECT
        e.id,
        e.cedula,
        e.nombres,
        e.apellidos,
        e.fecha_ingreso::text AS fecha_ingreso,
        e.fecha_salida::text AS fecha_salida,
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
        AND (e.id = ANY($2::uuid[]) OR e.cedula = ANY($3::text[]))
      ORDER BY e.apellidos, e.nombres
      FOR SHARE OF e
    `, [tenantId, employeeIds, cedulas]);
    const employeesById = new Map(employeeResult.rows.map((employee) => [String(employee.id), employee]));
    const employeesByCedula = new Map(employeeResult.rows.map((employee) => [String(employee.cedula), employee]));
    const plannedRows = [];
    const rowPlanCounts = new Map();
    const plannedKeys = new Map();
    const validationErrors = [];

    for (const row of normalizedRows) {
      const byId = row.employeeId ? employeesById.get(row.employeeId) : null;
      const byCedula = row.cedula ? employeesByCedula.get(row.cedula) : null;
      if (row.employeeId && row.cedula && (!byId || !byCedula || byId.id !== byCedula.id)) {
        validationErrors.push({
          rowNumber: row.rowNumber,
          status: 'error',
          error: 'MANUAL_ATTENDANCE_BULK_EMPLOYEE_MISMATCH',
          message: 'El empleadoId y la cedula pertenecen a empleados diferentes.',
        });
        continue;
      }
      const employee = byId || byCedula;
      if (!employee) {
        validationErrors.push({
          rowNumber: row.rowNumber,
          status: 'error',
          error: 'MANUAL_ATTENDANCE_BULK_EMPLOYEE_NOT_FOUND',
          message: 'No encontramos al empleado dentro de esta empresa.',
        });
        continue;
      }
      if (employee.controla_asistencia === false) {
        validationErrors.push({
          rowNumber: row.rowNumber,
          status: 'error',
          error: 'MANUAL_ATTENDANCE_CONTROL_DISABLED',
          message: 'Activa Incluir en control de asistencia en la ficha del empleado.',
        });
        continue;
      }

      const employeePlan = buildPlannedAttendanceRows([employee], row, periodByMonth);
      if (employeePlan.length === 0) {
        validationErrors.push({
          rowNumber: row.rowNumber,
          status: 'error',
          error: 'MANUAL_ATTENDANCE_NO_WORK_DAYS',
          message: 'El rango no contiene dias laborables para la relacion laboral y jornada configuradas.',
        });
        continue;
      }
      let duplicate = null;
      for (const plan of employeePlan) {
        const key = `${employee.id}:${plan.operational_date}`;
        if (plannedKeys.has(key)) {
          duplicate = plannedKeys.get(key);
          break;
        }
      }
      if (duplicate) {
        validationErrors.push({
          rowNumber: row.rowNumber,
          status: 'error',
          error: 'MANUAL_ATTENDANCE_BULK_DUPLICATE_DATE',
          message: `La misma fecha del empleado ya fue incluida en la fila ${duplicate}.`,
        });
        continue;
      }
      for (const plan of employeePlan) {
        plannedKeys.set(`${employee.id}:${plan.operational_date}`, row.rowNumber);
        plannedRows.push({
          ...plan,
          row_number: row.rowNumber,
          reason: row.reason,
        });
      }
      rowPlanCounts.set(row.rowNumber, employeePlan.length);
    }

    if (validationErrors.length > 0) {
      throw new AppError('No se registro ninguna marcacion. Corrige las filas indicadas y procesa nuevamente el lote.', {
        code: 'MANUAL_ATTENDANCE_BULK_VALIDATION_FAILED',
        statusCode: 422,
        details: { results: validationErrors },
      });
    }

    const inserted = await client.query(`
      WITH planned AS (
        SELECT *
        FROM jsonb_to_recordset($2::jsonb) AS row_data(
          empleado_id uuid,
          period_id uuid,
          operational_date date,
          start_time time,
          end_time time,
          row_number integer,
          reason text
        )
      ), expanded_marks AS (
        SELECT empleado_id, period_id, operational_date,
               'inicio_jornada'::"AttendanceMarkType" AS tipo_marcacion,
               start_time AS local_time, row_number, reason
        FROM planned
        UNION ALL
        SELECT empleado_id, period_id, operational_date,
               'fin_jornada'::"AttendanceMarkType",
               end_time, row_number, reason
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
        jsonb_build_object(
          'source', 'manual_rrhh_bulk',
          'rowNumber', mark.row_number,
          'reason', mark.reason,
          'registeredBy', $5::text
        )
      FROM expanded_marks mark
      WHERE NOT EXISTS (
        SELECT 1
        FROM marcaciones existing
        WHERE existing.tenant_id = $1
          AND existing.empleado_id = mark.empleado_id
          AND COALESCE(existing.operational_date, DATE(existing.timestamp AT TIME ZONE 'America/Guayaquil')) = mark.operational_date
          AND existing.tipo_marcacion = mark.tipo_marcacion
      )
      RETURNING id, empleado_id, operational_date, tipo_marcacion, metadata
    `, [tenantId, JSON.stringify(plannedRows), ipAddress || null, correlationId || null, userId || null]);
    const createdByRow = new Map();
    for (const mark of inserted.rows) {
      const rowNumber = Number(mark.metadata?.rowNumber || 0);
      createdByRow.set(rowNumber, (createdByRow.get(rowNumber) || 0) + 1);
    }
    const results = normalizedRows.map((row) => {
      const planned = rowPlanCounts.get(row.rowNumber) || 0;
      const expected = planned * 2;
      const created = createdByRow.get(row.rowNumber) || 0;
      return {
        rowNumber: row.rowNumber,
        status: 'processed',
        jornadasPlanificadas: planned,
        marcacionesCreadas: created,
        marcacionesExistentes: expected - created,
      };
    });
    const expectedMarks = plannedRows.length * 2;

    await recordAudit({
      tenantId,
      userId,
      correlationId,
      action: 'asistencia.manual.carga_masiva',
      entity: 'marcaciones',
      entityId: inserted.rows[0]?.id || null,
      newData: {
        totalFilas: normalizedRows.length,
        jornadasPlanificadas: plannedRows.length,
        marcacionesEsperadas: expectedMarks,
        marcacionesCreadas: inserted.rows.length,
        marcacionesExistentes: expectedMarks - inserted.rows.length,
      },
      ipAddress,
      dbClient: client,
    });
    await db.commit(client);

    return {
      totalFilas: normalizedRows.length,
      jornadasPlanificadas: plannedRows.length,
      marcacionesEsperadas: expectedMarks,
      marcacionesCreadas: inserted.rows.length,
      marcacionesExistentes: expectedMarks - inserted.rows.length,
      results,
    };
  } catch (err) {
    await db.rollback(client);
    throw err;
  }
}

module.exports = {
  MANUAL_ATTENDANCE_BULK_TEMPLATE_COLUMNS,
  buildPlannedAttendanceRows,
  databaseDateOnly,
  normalizeManualAttendanceBulkRows,
  normalizeManualAttendanceInput,
  registerManualAttendance,
  registerManualAttendanceBulk,
};
