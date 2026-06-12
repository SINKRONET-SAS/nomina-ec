// ============================================================
// PLAN HAIKY - Servicio de Liquidacion y Finiquito
// ============================================================
const db = require('../config/database');
const AppError = require('../utils/AppError');
const { roundMoney, toMoneyString } = require('../utils/money');
const { generarActaFiniquito } = require('./templateGenerator');
const { getLegalParametersForTenant } = require('./legalParameterService');

async function calcularLiquidacion(empleadoId, tenantId, causaTerminacion) {
  const empResult = await db.query(`
    SELECT * FROM empleados WHERE id = $1 AND tenant_id = $2
  `, [empleadoId, tenantId]);

  if (empResult.rows.length === 0) {
    throw new AppError('Empleado no encontrado', {
      code: 'EMPLEADO_NO_ENCONTRADO',
      statusCode: 404,
    });
  }

  const emp = empResult.rows[0];
  const tenantResult = await db.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
  const tenant = tenantResult.rows[0];
  const fechaIngreso = new Date(emp.fecha_ingreso);
  const fechaSalida = new Date();
  const anio = fechaSalida.getFullYear();
  const legalParameters = await getLegalParametersForTenant(tenantId, anio);
  const sueldo = Number.parseFloat(emp.sueldo_bruto_mensual);
  const diasServicio = Math.max(0, Math.floor((fechaSalida - fechaIngreso) / 86400000));
  const aniosServicio = diasServicio / 365.25;
  const mesesServicio = Math.floor(aniosServicio * 12);
  const sueldoDiario = sueldo / 30;
  const sueldoPendiente = roundMoney(sueldoDiario * fechaSalida.getDate());
  const decimoTercero = roundMoney(sueldo * (mesesServicio % 12) / 12);
  const decimoCuarto = roundMoney(legalParameters.payroll.unifiedBaseSalary * (diasServicio % 365) / 365);
  const vacaciones = roundMoney(sueldo * mesesServicio / 24);
  let indemnizacion = 0;

  if (causaTerminacion === 'despido_intempestivo') {
    indemnizacion = aniosServicio < 3
      ? roundMoney(sueldo * 3)
      : roundMoney(sueldo * Math.max(4, Math.floor(aniosServicio)));
  }

  let desahucio = 0;
  if (causaTerminacion === 'desahucio') {
    desahucio = roundMoney(sueldo * 0.25 * Math.floor(aniosServicio));
  }

  const equiposPendientes = await verificarDevolucionEquipos(empleadoId, tenantId);
  if (equiposPendientes > 0) {
    throw new AppError(`El empleado tiene ${equiposPendientes} equipos sin devolver. No se puede generar el acta de finiquito.`, {
      code: 'EQUIPOS_PENDIENTES_FINIQUITO',
      statusCode: 409,
    });
  }

  const total = roundMoney(sueldoPendiente + decimoTercero + decimoCuarto + vacaciones + indemnizacion + desahucio);
  const liquidacion = {
    sueldoPendiente: toMoneyString(sueldoPendiente),
    decimoTercero: toMoneyString(decimoTercero),
    decimoCuarto: toMoneyString(decimoCuarto),
    vacaciones: toMoneyString(vacaciones),
    indemnizacion: toMoneyString(indemnizacion),
    desahucio: toMoneyString(desahucio),
    total: toMoneyString(total),
  };

  await db.query(`
    UPDATE empleados
    SET activo = false, fecha_salida = CURRENT_DATE, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
  `, [empleadoId, tenantId]);

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

async function verificarDevolucionEquipos(empleadoId, tenantId) {
  const result = await db.query(`
    SELECT COUNT(*) as pendientes
    FROM acta_entrega_equipos
    WHERE empleado_id = $1 AND tenant_id = $2 AND devuelto = false
  `, [empleadoId, tenantId]);

  return Number.parseInt(result.rows[0].pendientes, 10) || 0;
}

module.exports = { calcularLiquidacion, verificarDevolucionEquipos };
