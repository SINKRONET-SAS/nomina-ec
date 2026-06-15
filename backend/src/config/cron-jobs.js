// ============================================================
// PLAN HAIKY - Trabajos Programados
// ============================================================
const cron = require('node-cron');
const { calcularNominaMensual } = require('../services/calculoNominaService');
const db = require('../config/database');

function iniciarCronJobs() {
  console.log('[CRON] Iniciando trabajos programados...');

  cron.schedule('0 22 * * 1-5', runCron('cron-marcaciones-faltantes', verificarMarcacionesFaltantes), {
    timezone: 'America/Guayaquil',
  });

  cron.schedule('0 23 28-31 * *', runCron('cron-nomina-mensual', async () => {
    const hoy = new Date();
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();

    if (hoy.getDate() !== ultimoDia) {
      console.log('[CRON] Calculo mensual omitido porque no es ultimo dia del mes');
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

  console.log('[CRON] Trabajos programados iniciados correctamente');
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
        INSERT INTO novedades_asistencia (empleado_id, tenant_id, fecha, tipo_novedad, justificacion, estado)
        VALUES ($1,$2,CURRENT_DATE,'falta','No registro marcacion de entrada','pendiente')
        ON CONFLICT DO NOTHING
      `, [empleado.id, tenant.id]);
    }

    console.log(`[CRON] Marcaciones faltantes tenant ${tenant.id}: ${empleados.rows.length}`);
  }
}

async function calcularNominaTodosTenants(anio, mes) {
  const tenants = await db.query('SELECT id FROM tenants WHERE activo = true');

  for (const tenant of tenants.rows) {
    try {
      console.log(`[CRON] Calculando nomina para tenant ${tenant.id} - ${mes}/${anio}`);
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
    console.log('[CRON] No hay alerta de decimos para este mes');
    return;
  }

  for (const tenant of tenants.rows) {
    console.log(`[CRON] Alerta ${tipo} pendiente de envio para tenant ${tenant.id}`);
  }
}

if (require.main === module) {
  iniciarCronJobs();
  setInterval(() => {
    console.log('[CRON] heartbeat');
  }, 60000);
}

module.exports = {
  iniciarCronJobs,
  verificarMarcacionesFaltantes,
  calcularNominaTodosTenants,
  alertaDecimos,
};
