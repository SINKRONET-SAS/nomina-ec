const db = require('../config/database');
const AppError = require('../utils/AppError');
const { getLegalParametersForTenant } = require('./legalParameterService');
const {
  DEFAULT_NOVELTY_RULES,
  getActiveNoveltyTypeConfigsWithExecutor,
  hasApprovedOvertimeLimitException,
  isOvertimeConcept,
  weekKeyFromDate,
} = require('./payrollNoveltyService');

const OVERTIME_LIMIT_APPROVAL_REASON_MIN_LENGTH = 10;

function defaultOvertimeCodes() {
  return Object.entries(DEFAULT_NOVELTY_RULES)
    .filter(([, rule]) => isOvertimeConcept(rule.conceptCode))
    .map(([code]) => code);
}

function overtimeCodesForConfigs(configs = []) {
  const codes = new Set(defaultOvertimeCodes());
  for (const config of configs) {
    if (isOvertimeConcept(config.conceptCode)) {
      codes.add(config.code);
    }
  }
  return Array.from(codes);
}

function approvedExceptionMinutes(row = {}) {
  return hasApprovedOvertimeLimitException(row.metadata) ? Number(row.minutos || 0) : 0;
}

function buildApprovalPayload({ userId, reason, maxWeeklyOvertimeHours, approvedVia }) {
  return {
    approved: true,
    approvedBy: userId || null,
    approvedAt: new Date().toISOString(),
    reason,
    limitHours: maxWeeklyOvertimeHours,
    approvedVia,
  };
}

async function approvePayrollOvertimeLimitExceptions({
  tenantId,
  anio,
  mes,
  userId = null,
  reason = '',
  approvedVia = 'nomina.calcular',
  empleadoId = null,
  dbClient = null,
} = {}) {
  const trimmedReason = String(reason || '').trim();
  if (trimmedReason.length < OVERTIME_LIMIT_APPROVAL_REASON_MIN_LENGTH) {
    throw new AppError('La aprobacion para exceder el limite de horas extra requiere un motivo de al menos 10 caracteres.', {
      code: 'NOMINA_HORAS_EXTRA_EXCESO_MOTIVO_REQUERIDO',
      statusCode: 422,
      details: { minLength: OVERTIME_LIMIT_APPROVAL_REASON_MIN_LENGTH },
    });
  }

  const executor = dbClient || db;
  const anioNumber = Number(anio);
  const mesNumber = Number(mes);
  const configs = await getActiveNoveltyTypeConfigsWithExecutor(executor, tenantId, anioNumber, mesNumber);
  const overtimeCodes = overtimeCodesForConfigs(configs);
  if (overtimeCodes.length === 0) {
    return { updated: 0, exceptionIds: [], violations: [], maxWeeklyOvertimeHours: null };
  }

  const params = [tenantId, anioNumber, mesNumber, overtimeCodes];
  const employeeFilter = empleadoId ? `AND empleado_id = $${params.push(empleadoId)}::uuid` : '';
  const result = await executor.query(`
    SELECT id, empleado_id, fecha::text AS fecha, tipo_novedad, minutos, metadata
    FROM novedades_asistencia
    WHERE tenant_id = $1
      AND EXTRACT(YEAR FROM fecha) = $2
      AND EXTRACT(MONTH FROM fecha) = $3
      AND estado = 'aprobado'
      AND tipo_novedad = ANY($4::text[])
      AND COALESCE(minutos, 0) > 0
      ${employeeFilter}
    ORDER BY empleado_id, fecha, id
  `, params);

  if (result.rows.length === 0) {
    return { updated: 0, exceptionIds: [], violations: [], maxWeeklyOvertimeHours: null };
  }

  const legalParameters = await getLegalParametersForTenant(tenantId, anioNumber);
  const maxWeeklyOvertimeHours = Number(legalParameters.payroll?.maxWeeklyOvertimeHours ?? 12);
  const maxWeeklyMinutes = maxWeeklyOvertimeHours * 60;
  if (!Number.isFinite(maxWeeklyMinutes) || maxWeeklyMinutes <= 0) {
    return { updated: 0, exceptionIds: [], violations: [], maxWeeklyOvertimeHours };
  }

  const groups = new Map();
  for (const row of result.rows) {
    const weekStartDate = weekKeyFromDate(row.fecha);
    const key = `${row.empleado_id}|${weekStartDate}`;
    const current = groups.get(key) || {
      empleadoId: row.empleado_id,
      weekStartDate,
      minutes: 0,
      exceptionMinutes: 0,
      rows: [],
    };
    current.minutes += Number(row.minutos || 0);
    current.exceptionMinutes += approvedExceptionMinutes(row);
    current.rows.push(row);
    groups.set(key, current);
  }

  const exceptionIds = new Set();
  const violations = [];
  for (const group of groups.values()) {
    const excessMinutes = Math.max(0, group.minutes - maxWeeklyMinutes);
    if (excessMinutes <= group.exceptionMinutes) continue;

    const candidates = group.rows.filter((row) => !hasApprovedOvertimeLimitException(row.metadata));
    candidates.forEach((row) => exceptionIds.add(String(row.id)));
    violations.push({
      empleadoId: group.empleadoId,
      weekStartDate: group.weekStartDate,
      hours: Math.round((group.minutes / 60) * 100) / 100,
      maxHours: maxWeeklyOvertimeHours,
      excessHours: Math.round((excessMinutes / 60) * 100) / 100,
      approvedExceptionHours: Math.round((group.exceptionMinutes / 60) * 100) / 100,
    });
  }

  if (exceptionIds.size === 0) {
    return { updated: 0, exceptionIds: [], violations, maxWeeklyOvertimeHours };
  }

  const approvalPayload = buildApprovalPayload({
    userId,
    reason: trimmedReason,
    maxWeeklyOvertimeHours,
    approvedVia,
  });
  const updateResult = await executor.query(`
    UPDATE novedades_asistencia
    SET metadata = COALESCE(metadata, '{}'::jsonb)
      || jsonb_build_object('overtimeLimitException', $3::jsonb),
        updated_at = NOW()
    WHERE tenant_id = $1
      AND id = ANY($2::uuid[])
    RETURNING id
  `, [tenantId, Array.from(exceptionIds), JSON.stringify(approvalPayload)]);

  return {
    updated: updateResult.rows.length,
    exceptionIds: updateResult.rows.map((row) => String(row.id)),
    violations,
    maxWeeklyOvertimeHours,
  };
}

module.exports = {
  approvePayrollOvertimeLimitExceptions,
  OVERTIME_LIMIT_APPROVAL_REASON_MIN_LENGTH,
};
