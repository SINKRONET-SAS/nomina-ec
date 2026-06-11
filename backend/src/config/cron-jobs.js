// ============================================================
// PLAN HAIKY - Trabajos Programados (Cron Jobs)
// ============================================================
const cron = require('node-cron');
const { calcularNominaMensual } = require('../services/calculoNominaService');
const db = require('../config/database');

/**
 * Inicia todos los trabajos programados
 */
function iniciarCronJobs() {
  console.log('[CRON] Iniciando trabajos programados...');
  
  // 1. Procesamiento nocturno de marcaciones (23:59 diario)
  // Calcula horas trabajadas y genera novedades automáticas
  cron.schedule('59 23 * * *', async () => {
    console.log('[CRON] Ejecutando procesamiento nocturno de marcaciones...');
    try {
      await procesarMarcacionesDiarias();
    } catch (err) {
      console.error('[CRON] Error en procesamiento nocturno:', err);
    }
  }, {
    timezone: 'America/Guayaquil'
  });
  
  // 2. Cálculo automático de nómina (último día del mes, 23:00)
  cron.schedule('0 23 28-31 * *', async () => {
    // Verificar si es el último día del mes
    const hoy = new Date();
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
    
    if (hoy.getDate() === ultimoDia) {
      console.log('[CRON] Ejecutando cálculo de nómina mensual...');
      try {
        await calcularNominaTodosTenants(hoy.getFullYear(), hoy.getMonth() + 1);
      } catch (err) {
        console.error('[CRON] Error en cálculo de nómina:', err);
      }
    }
  }, {
    timezone: 'America/Guayaquil'
  });
  
  // 3. Limpieza de sesiones expiradas (cada hora)
  cron.schedule('0 * * * *', async () => {
    try {
      await db.query(`
        DELETE FROM sesiones WHERE expira_en < NOW()
      `);
    } catch (err) {
      console.error('[CRON] Error limpiando sesiones expiradas', {
        code: err.code || 'CRON_SESSION_CLEANUP_ERROR',
        statusCode: 500,
        correlationId: process.env.CORRELATION_ID || 'cron-session-cleanup',
        userId: null,
        message: err.message,
      });
    }
  });
  
  // 4. Recordatorio de marcaciones pendientes (17:00 diario)
  cron.schedule('0 17 * * 1-5', async () => {
    console.log('[CRON] Verificando marcaciones pendientes...');
    try {
      await recordarMarcacionesPendientes();
    } catch (err) {
      console.error('[CRON] Error en recordatorio:', err);
    }
  }, {
    timezone: 'America/Guayaquil'
  });
  
  console.log('[CRON] Trabajos programados iniciados correctamente');
}

/**
 * Procesa las marcaciones del día y genera novedades
 */
async function procesarMarcacionesDiarias() {
  const fecha = new Date();
  const anio = fecha.getFullYear();
  const mes = fecha.getMonth() + 1;
  const dia = fecha.getDate();
  
  // Obtener todos los tenants activos
  const tenants = await db.query('SELECT id FROM tenants WHERE activo = true');
  
  for (const tenant of tenants.rows) {
    // Obtener empleados que no marcaron fin de jornada
    const sinFinJornada = await db.query(`
      SELECT e.id, e.nombres, e.apellidos
      FROM empleados e
      WHERE e.tenant_id = $1 AND e.activo = true
      AND EXISTS (
        SELECT 1 FROM marcaciones m
        WHERE m.empleado_id = e.id
        AND DATE(m.timestamp) = CURRENT_DATE
        AND m.tipo_marcacion = 'inicio_jornada'
      )
      AND NOT EXISTS (
        SELECT 1 FROM marcaciones m
        WHERE m.empleado_id = e.id
        AND DATE(m.timestamp) = CURRENT_DATE
        AND m.tipo_marcacion = 'fin_jornada'
      )
    `, [tenant.id]);
    
    if (sinFinJornada.rows.length > 0) {
      console.log(`[CRON] ${sinFinJornada.rows.length} empleados sin fin de jornada en tenant ${tenant.id}`);
      
      // Generar novedad de falta de marcación
      for (const emp of sinFinJornada.rows) {
        await db.query(`
          INSERT INTO novedades_asistencia (empleado_id, tenant_id, fecha, tipo_novedad, justificacion, estado)
          VALUES ($1, $2, CURRENT_DATE, 'falta', 'No registró fin de jornada', 'pendiente')
          ON CONFLICT DO NOTHING
        `, [emp.id, tenant.id]);
      }
    }
  }
}

/**
 * Calcula nómina para todos los tenants
 */
async function calcularNominaTodosTenants(anio, mes) {
  const tenants = await db.query('SELECT id FROM tenants WHERE activo = true');
  
  for (const tenant of tenants.rows) {
    try {
      console.log(`[CRON] Calculando nómina para tenant ${tenant.id} - ${mes}/${anio}`);
      await calcularNominaMensual(tenant.id, anio, mes);
    } catch (err) {
      console.error(`[CRON] Error calculando nómina tenant ${tenant.id}:`, err.message);
    }
  }
}

/**
 * Envía recordatorio a empleados que no han marcado
 */
async function recordarMarcacionesPendientes() {
  // En producción, integrar con servicio de notificaciones (email, push, SMS)
  console.log('[CRON] Recordatorio enviado a empleados sin marcación');
}

// Si se ejecuta directamente
if (require.main === module) {
  iniciarCronJobs();
  
  // Mantener el proceso vivo
  setInterval(() => {
    console.log('[CRON] heartbeat');
  }, 60000);
}

module.exports = { iniciarCronJobs };

