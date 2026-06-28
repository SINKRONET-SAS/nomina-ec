// ============================================================
// SKNOMINA - Trabajos Programados
// ============================================================
const cron = require('node-cron');
const { calcularNominaMensual } = require('../services/calculoNominaService');
const { ensurePayrollPeriodForDate, todayInEcuador } = require('../services/monthlyPeriodService');
const db = require('../config/database');
const logger = require('../utils/logger');

function iniciarCronJobs() {
  logger.info({ code: 'CRON_JOBS_STARTING', correlationId: 'cron-startup' }, 'Iniciando trabajos programados');

  cron.schedule('0 22 * * 1-5', runCron('cron-marcaciones-faltantes', verificarMarcacionesFaltantes), {
    timezone: 'America/Guayaquil',
  });

  cron.schedule('0 23 28-31 * *', runCron('cron-nomina-mensual', async () => {
    const hoy = new Date();
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();

    if (hoy.getDate() !== ultimoDia) {
      logger.info({ code: 'CRON_MONTHLY_PAYROLL_SKIPPED', correlationId: 'cron-nomina-mensual' }, 'Calculo mensual omitido porque no es ultimo dia del mes');
      return;
    }

    await calcularNominaTodosTenants(hoy.getFullYear(), hoy.getMonth() + 1);
  }), {
    timezone: 'America/Guayaquil',
  });

  cron.schedule('0 * * * *', runCron('cron-session-cleanup', async () => {
    await db.query('DELETE FROM sesiones WHERE expira_en < NOW()');
  }));

  cron.schedule('0 8 1 * *', runCron('cron-alerta-decimos', alertaDecimos), {
    timezone: 'America/Guayaquil',
  });

  logger.info({ code: 'CRON_JOBS_STARTED', correlationId: 'cron-startup' }, 'Trabajos programados iniciados correctamente');
}

function runCron(correlationId, handler) {
  return async () => {
    try {
      process.env.CORRELATION_ID = correlationId;
      await handler();
    } catch (err) {
      console.error('[CRON] Error ejecutando job', {
        code: err.code || 'CRON_JOB_ERROR',
        statusCode: err.statusCode || 500,
        correlationId,
        userId: null,
        message: err.message,
      });
    }
  };
}

async function verificarMarcacionesFaltantes() {
  const tenants = await db.query('SELECT id FROM tenants WHERE activo = true');

  for (const tenant of tenants.rows) {
    const fechaNovedad = todayInEcuador();
    const period = await ensurePayrollPeriodForDate({ tenantId: tenant.id, userId: null, fecha: fechaNovedad });
    if (period.status === 'closed') {
      console.error('[CRON] Marcaciones faltantes omitidas por periodo cerrado', {
        code: 'CRON_NOVEDAD_PERIODO_CERRADO',
        statusCode: 422,
        correlationId: process.env.CORRELATION_ID || 'cron-marcaciones-faltantes',
        userId: null,
        tenantId: tenant.id,
        periodoNomina: period.periodoNomina,
      });
      continue;
    }
    const empleados = await db.query(`
      SELECT e.id
      FROM empleados e
      WHERE e.tenant_id = $1
        AND e.activo = true
        AND NOT EXISTS (
          SELECT 1
          FROM marcaciones m
          WHERE m.empleado_id = e.id
            AND m.timestamp >= CURRENT_DATE
            AND m.timestamp < CURRENT_DATE + INTERVAL '1 day'
            AND m.tipo_marcacion = 'inicio_jornada'
        )
    `, [tenant.id]);

    for (const empleado of empleados.rows) {
      await db.query(`
        INSERT INTO novedades_asistencia (
          empleado_id, tenant_id, period_id, periodo_nomina, fecha, tipo_novedad, justificacion, estado
        )
        VALUES ($1,$2,$3,$4,$5,'falta','No registro marcacion de entrada','pendiente')
        ON CONFLICT DO NOTHING
      `, [empleado.id, tenant.id, period.id, period.periodoNomina, fechaNovedad]);
    }

    logger.info({
      code: 'CRON_MISSING_MARKS_CREATED',
      correlationId: process.env.CORRELATION_ID || 'cron-marcaciones-faltantes',
      tenantId: tenant.id,
      totalEmpleados: empleados.rows.length,
    }, 'Novedades por marcaciones faltantes generadas');
  }
}

async function calcularNominaTodosTenants(anio, mes) {
  const tenants = await db.query('SELECT id FROM tenants WHERE activo = true');

  for (const tenant of tenants.rows) {
    try {
      logger.info({
        code: 'CRON_PAYROLL_CALCULATION_STARTED',
        correlationId: process.env.CORRELATION_ID || 'cron-nomina-mensual',
        tenantId: tenant.id,
        anio,
        mes,
      }, 'Calculo de nomina iniciado por cron');
      await calcularNominaMensual(tenant.id, anio, mes);
    } catch (err) {
      console.error('[CRON] Error calculando nomina tenant', {
        code: err.code || 'CRON_NOMINA_TENANT_ERROR',
        statusCode: err.statusCode || 500,
        correlationId: process.env.CORRELATION_ID || 'cron-nomina-mensual',
        userId: null,
        tenantId: tenant.id,
        message: err.message,
      });
    }
  }
}

async function alertaDecimos() {
  const mes = new Date().getMonth() + 1;
  const tenants = await db.query('SELECT id FROM tenants WHERE activo = true');
  const tipo = mes === 12 ? 'decimo_tercero' : (mes === 3 || mes === 8 ? 'decimo_cuarto' : null);

  if (!tipo) {
    logger.info({ code: 'CRON_DECIMOS_ALERT_SKIPPED', correlationId: 'cron-alerta-decimos' }, 'No hay alerta de decimos para este mes');
    return;
  }

  for (const tenant of tenants.rows) {
    logger.info({
      code: 'CRON_DECIMOS_ALERT_PENDING',
      correlationId: 'cron-alerta-decimos',
      tenantId: tenant.id,
      tipo,
    }, 'Alerta de decimos pendiente de envio');
  }
}

if (require.main === module) {
  iniciarCronJobs();
  setInterval(() => {
    logger.info({ code: 'CRON_HEARTBEAT', correlationId: 'cron-heartbeat' }, 'Heartbeat de trabajos programados');
  }, 60000);
}

module.exports = {
  iniciarCronJobs,
  verificarMarcacionesFaltantes,
  calcularNominaTodosTenants,
  alertaDecimos,
};
