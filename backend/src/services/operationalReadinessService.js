const db = require('../config/database');
const AppError = require('../utils/AppError');
const { buildReadiness, employeeReadinessSelect } = require('./employeeAppInviteService');
const {
  assertLegalParametersReadyForProduction,
  getLegalParametersForTenant,
} = require('./legalParameterService');
const { formatPeriodMarker, validatePeriod } = require('./monthlyPeriodService');

const CALCULABLE_PERIOD_STATUSES = new Set(['open', 'novelties_loaded', 'reopened', 'calculation_failed']);

function lastDayOfMonth(anio, mes) {
  return new Date(Date.UTC(Number(anio), Number(mes), 0)).toISOString().slice(0, 10);
}

function addIssue(list, code, message, details = {}) {
  list.push({ code, message, details });
}

function summarizeByStatus(rows = []) {
  return rows.reduce((memo, row) => {
    memo[row.estado || row.status] = Number(row.total || 0);
    return memo;
  }, {});
}

function employeeLabel(row) {
  return [row.cedula, row.nombres, row.apellidos].filter(Boolean).join(' - ');
}

function buildEmployeeOperationalBlockers(row = {}) {
  const attendanceControlled = row.controla_asistencia !== false;
  const readiness = attendanceControlled ? buildReadiness(row, { requireEmail: false }) : null;
  const blockers = readiness
    ? readiness.blockers.filter((blocker) => blocker !== 'control_asistencia_desactivado')
    : [];
  if (!Number.isFinite(Number(row.sueldo_bruto_mensual)) || Number(row.sueldo_bruto_mensual) <= 0) {
    blockers.push('sueldo_bruto_requerido');
  }
  if (!row.fecha_ingreso) blockers.push('fecha_ingreso_requerida');
  return blockers;
}

async function getTenantPayrollReadiness({ tenantId, anio, mes, mode = 'diagnostic' }) {
  const periodInput = validatePeriod(anio, mes);
  const periodoNomina = formatPeriodMarker(periodInput.anio, periodInput.mes);
  const blockers = [];
  const warnings = [];

  const tenantResult = await db.query(`
    SELECT id, ruc, razon_social, activo, configuracion
    FROM tenants
    WHERE id = $1
    LIMIT 1
  `, [tenantId]);

  const tenant = tenantResult.rows[0];
  if (!tenant || tenant.activo === false) {
    addIssue(blockers, 'TENANT_INACTIVO', 'La empresa no esta activa para operar nomina.', { tenantId });
    return { ready: false, blockers, warnings, period: null, payrollByStatus: {}, periodoNomina };
  }

  const ownerResult = await db.query(`
    SELECT
      COUNT(*)::int AS owners,
      COUNT(*) FILTER (WHERE email_verificado_en IS NOT NULL)::int AS owners_verificados
    FROM usuarios
    WHERE tenant_id = $1
      AND activo = true
      AND rol IN ('owner', 'admin_rrhh', 'superadmin')
  `, [tenantId]);
  const ownerSummary = ownerResult.rows[0] || { owners: 0, owners_verificados: 0 };
  if (Number(ownerSummary.owners || 0) === 0) {
    addIssue(blockers, 'TENANT_SIN_OWNER', 'La empresa no tiene responsable activo.', { tenantId });
  } else if (Number(ownerSummary.owners_verificados || 0) === 0) {
    addIssue(blockers, 'OWNER_EMAIL_NO_VERIFICADO', 'Verifica el correo del responsable antes de procesar nomina.', { tenantId });
  }

  const periodResult = await db.query(`
    SELECT *
    FROM payroll_periods
    WHERE tenant_id = $1 AND anio = $2 AND mes = $3
    LIMIT 1
  `, [tenantId, periodInput.anio, periodInput.mes]);
  const period = periodResult.rows[0] || null;

  if (!period) {
    addIssue(blockers, 'PAYROLL_PERIOD_NOT_OPEN', 'Abre el periodo antes de procesar nomina.', { periodoNomina });
  } else if (mode === 'calculation' && !CALCULABLE_PERIOD_STATUSES.has(period.status)) {
    addIssue(blockers, 'PAYROLL_PERIOD_NOT_CALCULABLE', 'El periodo no esta en un estado calculable.', {
      periodoNomina,
      status: period.status,
      allowed: [...CALCULABLE_PERIOD_STATUSES],
    });
  } else if (mode === 'close' && period.status !== 'calculated') {
    addIssue(blockers, 'PAYROLL_PERIOD_NOT_CALCULATED', 'Calcula la nomina sin errores antes de cerrar.', {
      periodoNomina,
      status: period.status,
    });
  }

  try {
    const legalParameters = await getLegalParametersForTenant(tenantId, periodInput.anio);
    assertLegalParametersReadyForProduction(legalParameters, {
      year: periodInput.anio,
      tenantId,
      operation: `e2e26_${mode}`,
    });
  } catch (err) {
    addIssue(blockers, err.code || 'LEGAL_PARAMETERS_NOT_READY', err.message, {
      year: periodInput.anio,
      source: 'legalParameterService',
    });
  }

  const employeeResult = await db.query(employeeReadinessSelect(`
    WHERE e.tenant_id = $1
      AND e.activo = true
      AND e.fecha_ingreso <= $2::date
    ORDER BY e.apellidos, e.nombres
  `), [tenantId, lastDayOfMonth(periodInput.anio, periodInput.mes)]);

  if (employeeResult.rows.length === 0) {
    addIssue(blockers, 'TENANT_SIN_EMPLEADOS_OPERATIVOS', 'No hay empleados activos para el periodo.', { periodoNomina });
  }

  const employeesWithBlockers = [];
  for (const row of employeeResult.rows) {
    const employeeBlockers = buildEmployeeOperationalBlockers(row);
    if (employeeBlockers.length > 0) {
      employeesWithBlockers.push({
        empleadoId: row.id,
        label: employeeLabel(row),
        blockers: employeeBlockers,
      });
    }
  }

  if (employeesWithBlockers.length > 0) {
    addIssue(blockers, 'EMPLEADOS_NO_OPERATIVOS', 'Hay empleados activos con ficha laboral incompleta.', {
      total: employeesWithBlockers.length,
      employees: employeesWithBlockers.slice(0, 20),
    });
  }

  const noveltyResult = await db.query(`
    SELECT estado, COUNT(*)::int AS total
    FROM novedades_asistencia
    WHERE tenant_id = $1
      AND (
        periodo_nomina = $2
        OR (EXTRACT(YEAR FROM fecha) = $3 AND EXTRACT(MONTH FROM fecha) = $4)
      )
    GROUP BY estado
  `, [tenantId, periodoNomina, periodInput.anio, periodInput.mes]);
  const noveltyByStatus = summarizeByStatus(noveltyResult.rows);
  if (Number(noveltyByStatus.pendiente || 0) > 0) {
    addIssue(blockers, 'NOVEDADES_PENDIENTES', 'Aprueba o rechaza todas las novedades antes de calcular/cerrar.', {
      periodoNomina,
      pendientes: noveltyByStatus.pendiente,
    });
  }

  if (period) {
    const batchResult = await db.query(`
      SELECT status, COUNT(*)::int AS total
      FROM novelty_batches
      WHERE tenant_id = $1
        AND period_id = $2
      GROUP BY status
    `, [tenantId, period.id]);
    const batchByStatus = summarizeByStatus(batchResult.rows);
    const openBatches = Object.entries(batchByStatus)
      .filter(([status]) => !['completado', 'completado_con_errores'].includes(status))
      .reduce((total, [, count]) => total + count, 0);
    if (openBatches > 0) {
      addIssue(blockers, 'LOTES_NOVEDADES_ABIERTOS', 'Hay lotes de novedades sin finalizar.', {
        periodoNomina,
        batchesByStatus: batchByStatus,
      });
    }
  }

  const payrollResult = await db.query(`
    SELECT
      estado,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE neto_recibir < 0)::int AS netos_negativos,
      COUNT(*) FILTER (WHERE rol_pdf_url IS NULL OR rol_pdf_url = '')::int AS sin_rol_pdf
    FROM nominas
    WHERE tenant_id = $1 AND anio = $2 AND mes = $3
    GROUP BY estado
  `, [tenantId, periodInput.anio, periodInput.mes]);
  const payrollByStatus = summarizeByStatus(payrollResult.rows);
  const payrollRows = payrollResult.rows || [];
  const negativeNetPayrolls = payrollRows.reduce((total, row) => total + Number(row.netos_negativos || 0), 0);
  const missingPdfRows = payrollRows.reduce((total, row) => total + Number(row.sin_rol_pdf || 0), 0);

  if (mode === 'close') {
    if (Number(payrollByStatus.borrador || 0) === 0) {
      addIssue(blockers, 'NOMINA_SIN_BORRADORES', 'No hay roles en borrador para cerrar.', { periodoNomina });
    }

    const missingPayrollResult = await db.query(`
      SELECT e.id, e.cedula, e.nombres, e.apellidos
      FROM empleados e
      WHERE e.tenant_id = $1
        AND e.activo = true
        AND e.fecha_ingreso <= $4::date
        AND NOT EXISTS (
          SELECT 1
          FROM nominas n
          WHERE n.tenant_id = e.tenant_id
            AND n.empleado_id = e.id
            AND n.anio = $2
            AND n.mes = $3
            AND n.estado = 'borrador'
        )
      ORDER BY e.apellidos, e.nombres
      LIMIT 20
    `, [tenantId, periodInput.anio, periodInput.mes, lastDayOfMonth(periodInput.anio, periodInput.mes)]);
    if (missingPayrollResult.rows.length > 0) {
      addIssue(blockers, 'EMPLEADOS_SIN_NOMINA_BORRADOR', 'Todos los empleados activos deben tener nomina calculada en borrador.', {
        periodoNomina,
        employees: missingPayrollResult.rows.map((row) => ({ empleadoId: row.id, label: employeeLabel(row) })),
      });
    }
  }

  if (negativeNetPayrolls > 0) {
    addIssue(blockers, 'NOMINA_NETOS_NEGATIVOS', 'Existen roles con neto negativo.', {
      periodoNomina,
      total: negativeNetPayrolls,
    });
  }

  if (missingPdfRows > 0 && mode === 'close') {
    addIssue(warnings, 'ROLES_PDF_PENDIENTES', 'Hay roles sin PDF; genera los PDF antes de entrega formal.', {
      periodoNomina,
      total: missingPdfRows,
    });
  }

  return {
    ready: blockers.length === 0,
    tenant: {
      id: tenant.id,
      ruc: tenant.ruc,
      razonSocial: tenant.razon_social,
    },
    period,
    periodoNomina,
    mode,
    blockers,
    warnings,
    counts: {
      employees: employeeResult.rows.length,
      noveltyByStatus,
      payrollByStatus,
    },
  };
}

async function assertTenantPayrollReady(options) {
  const readiness = await getTenantPayrollReadiness(options);
  if (!readiness.ready) {
    throw new AppError('El periodo no cumple el prechequeo operativo E2E26.', {
      code: 'E2E26_PAYROLL_PRECHECK_BLOCKED',
      statusCode: 409,
      details: readiness,
    });
  }
  return readiness;
}

module.exports = {
  buildEmployeeOperationalBlockers,
  assertTenantPayrollReady,
  getTenantPayrollReadiness,
};
