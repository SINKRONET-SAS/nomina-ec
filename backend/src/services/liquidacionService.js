// ============================================================
// PLAN HAIKY - Servicio de Liquidación (Finiquito)
// Cálculo de haberes al terminar relación laboral
// ============================================================
const db = require('../config/database');
const { generarActaFiniquito } = require('./templateGenerator');

/**
 * Calcula la liquidación de un empleado
 */
async function calcularLiquidacion(empleadoId, tenantId, causaTerminacion) {
  // 1. Obtener datos del empleado
  const empResult = await db.query(`
    SELECT * FROM empleados WHERE id = $1 AND tenant_id = $2
  `, [empleadoId, tenantId]);
  
  if (empResult.rows.length === 0) throw new Error('Empleado no encontrado');
  const emp = empResult.rows[0];
  
  // 2. Obtener datos del tenant
  const tenantResult = await db.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
  const tenant = tenantResult.rows[0];
  
  // 3. Calcular tiempo de servicio
  const fechaIngreso = new Date(emp.fecha_ingreso);
  const fechaSalida = new Date();
  const aniosServicio = (fechaSalida - fechaIngreso) / (1000 * 60 * 60 * 24 * 365.25);
  const mesesServicio = Math.floor(aniosServicio * 12);
  const diasServicio = Math.floor((fechaSalida - fechaIngreso) / (1000 * 60 * 60 * 24));
  
  // 4. Calcular sueldo pendiente (días del último mes)
  const ultimoDiaMes = new Date(fechaSalida.getFullYear(), fechaSalida.getMonth() + 1, 0).getDate();
  const diasMesActual = fechaSalida.getDate();
  const sueldoDiario = parseFloat(emp.sueldo_bruto_mensual) / 30;
  const sueldoPendiente = sueldoDiario * diasMesActual;
  
  // 5. Calcular décimo tercero proporcional
  const decimoTercero = parseFloat(emp.sueldo_bruto_mensual) * (mesesServicio % 12) / 12;
  
  // 6. Calcular décimo cuarto proporcional
  const decimoCuarto = 460 * (diasServicio % 365) / 365; // $460 anuales (2026)
  
  // 7. Calcular vacaciones proporcionales
  // 1 mes de sueldo por cada 2 años = 1/24 del sueldo mensual por mes trabajado
  const vacaciones = parseFloat(emp.sueldo_bruto_mensual) * mesesServicio / 24;
  
  // 8. Calcular indemnización por despido intempestivo (si aplica)
  let indemnizacion = 0;
  if (causaTerminacion === 'despido_intempestivo') {
    // Art. 188 Código del Trabajo
    if (aniosServicio < 3) {
      indemnizacion = parseFloat(emp.sueldo_bruto_mensual) * 3; // 3 meses
    } else if (aniosServicio < 5) {
      indemnizacion = parseFloat(emp.sueldo_bruto_mensual) * 4; // 4 meses
    } else {
      // 1 mes por cada año de servicio a partir del 5to
      indemnizacion = parseFloat(emp.sueldo_bruto_mensual) * Math.max(4, Math.floor(aniosServicio));
    }
  }
  
  // 9. Calcular desahucio (si aplica)
  let desahucio = 0;
  if (causaTerminacion === 'desahucio') {
    // Art. 185 Código del Trabajo: 25% del último sueldo por cada año
    desahucio = parseFloat(emp.sueldo_bruto_mensual) * 0.25 * Math.floor(aniosServicio);
  }
  
  // 10. Total liquidación
  const total = sueldoPendiente + decimoTercero + decimoCuarto + vacaciones + indemnizacion + desahucio;
  
  // 11. VALIDACIÓN REGLA IRRENUNCIABLE: Verificar devolución de equipos
  const equiposPendientes = await verificarDevolucionEquipos(empleadoId, tenantId);
  if (equiposPendientes > 0) {
    throw new Error(`VIOLACION_REGLA_IRRENUNCIABLE: El empleado tiene ${equiposPendientes} equipos sin devolver. No se puede generar el acta de finiquito.`);
  }
  
  // 12. Actualizar empleado como inactivo
  await db.query(`
    UPDATE empleados SET 
      activo = false, 
      fecha_salida = CURRENT_DATE,
      causa_salida = $1
    WHERE id = $2
  `, [causaTerminacion, empleadoId]);
  
  // 13. Generar acta de finiquito
  const liquidacion = {
    sueldoPendiente: sueldoPendiente.toFixed(2),
    decimoTercero: decimoTercero.toFixed(2),
    decimoCuarto: decimoCuarto.toFixed(2),
    vacaciones: vacaciones.toFixed(2),
    indemnizacion: indemnizacion.toFixed(2),
    desahucio: desahucio.toFixed(2),
    total: total.toFixed(2),
  };
  
  const actaUrl = await generarActaFiniquito(emp, tenant, causaTerminacion, liquidacion);
  
  return {
    empleadoId,
    nombre: `${emp.nombres} ${emp.apellidos}`,
    cedula: emp.cedula,
    aniosServicio: aniosServicio.toFixed(2),
    liquidacion,
    actaUrl,
  };
}

/**
 * Verifica si el empleado tiene equipos sin devolver
 */
async function verificarDevolucionEquipos(empleadoId, tenantId) {
  const result = await db.query(`
    SELECT COUNT(*) as pendientes FROM acta_entrega_equipos
    WHERE empleado_id = $1 AND tenant_id = $2 AND tipo = 'entrega'
    AND NOT EXISTS (
      SELECT 1 FROM acta_entrega_equipos d
      WHERE d.empleado_id = $1 AND d.tipo = 'devolucion'
      AND d.items @> acta_entrega_equipos.items
    )
  `, [empleadoId, tenantId]);
  
  return parseInt(result.rows[0].pendientes) || 0;
}

module.exports = { calcularLiquidacion };

