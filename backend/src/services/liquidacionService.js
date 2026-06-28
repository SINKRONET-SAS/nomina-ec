// ============================================================
// SKNOMINA - Servicio de Liquidacion y Finiquito
// ============================================================
const db = require('../config/database');
const AppError = require('../utils/AppError');
const { roundMoney, toMoneyString } = require('../utils/money');
const { generarActaFiniquito } = require('./templateGenerator');
const { getLegalParametersForTenant } = require('./legalParameterService');

async function calcularLiquidacion(empleadoId, tenantId, causaTerminacion, options = {}) {
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
  const fechaSalida = options.fechaSalida ? new Date(options.fechaSalida) : new Date();
  const anio = fechaSalida.getFullYear();
  const legalParameters = await getLegalParametersForTenant(tenantId, anio);
  const sueldo = Number.parseFloat(emp.sueldo_bruto_mensual);
  const diasServicio = Math.max(0, Math.floor((fechaSalida - fechaIngreso) / 86400000) + 1);
  const aniosServicio = diasServicio / 365.25;
  const sueldoDiario = sueldo / 30;
  const sueldoPendiente = roundMoney(sueldoDiario * fechaSalida.getDate());
  const diasDecimoTercero = calcularDiasDecimoTercero(fechaIngreso, fechaSalida);
  const diasDecimoCuarto = Math.min(diasServicio % 365, 365);
  const decimoTercero = roundMoney(sueldo * (diasDecimoTercero / 360));
  const decimoCuarto = roundMoney(legalParameters.payroll.unifiedBaseSalary * (diasDecimoCuarto / 365));
  const vacationDays = calcularDiasVacacionesPendientes(fechaIngreso, fechaSalida, legalParameters.payroll);
  const vacaciones = roundMoney(sueldoDiario * vacationDays.totalDays);
  const fondoReserva = calcularFondoReservaLiquidacion(fechaIngreso, fechaSalida, sueldo, legalParameters.payroll);
  const indemnizacion = calcularIndemnizacionDespidoIntempestivo(sueldo, aniosServicio, causaTerminacion);
  const desahucio = calcularDesahucio(sueldo, aniosServicio, causaTerminacion);

  const equiposPendientes = await verificarDevolucionEquipos(empleadoId, tenantId);
  if (equiposPendientes > 0) {
    throw new AppError(`El empleado tiene ${equiposPendientes} equipos sin devolver. No se puede generar el acta de finiquito.`, {
      code: 'EQUIPOS_PENDIENTES_FINIQUITO',
      statusCode: 409,
    });
  }

  const total = roundMoney(sueldoPendiente + decimoTercero + decimoCuarto + vacaciones + fondoReserva + indemnizacion + desahucio);
  const liquidacion = {
    sueldoPendiente: toMoneyString(sueldoPendiente),
    decimoTercero: toMoneyString(decimoTercero),
    decimoCuarto: toMoneyString(decimoCuarto),
    vacaciones: toMoneyString(vacaciones),
    fondoReserva: toMoneyString(fondoReserva),
    indemnizacion: toMoneyString(indemnizacion),
    desahucio: toMoneyString(desahucio),
    total: toMoneyString(total),
    detalle: {
      diasServicio,
      diasDecimoTercero,
      diasDecimoCuarto,
      fechaSalida: fechaSalida.toISOString().slice(0, 10),
      indemnizacionMaxMeses: 25,
      vacacionesDiasBase: vacationDays.baseDays,
      vacacionesDiasAdicionales: vacationDays.additionalDays,
      vacacionesDiasTotal: vacationDays.totalDays,
    },
  };

  await db.query(`
    UPDATE empleados
    SET activo = false, fecha_salida = $3, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
  `, [empleadoId, tenantId, fechaSalida.toISOString().slice(0, 10)]);

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

function calcularDiasVacacionesPendientes(fechaIngreso, fechaSalida, payrollParameters = {}) {
  const annualVacationDays = Number(payrollParameters.vacationDaysPerYear ?? 15);
  const extraAfterYears = Number(payrollParameters.vacationAdditionalAfterYears ?? 5);
  const extraDaysPerYear = Number(payrollParameters.vacationAdditionalDaysPerYear ?? 1);
  const days = Math.max(0, Math.floor((fechaSalida - fechaIngreso) / 86400000) + 1);
  const years = days / 365.25;
  const completedYears = Math.floor(years);
  const baseDays = years * annualVacationDays;
  const additionalDays = Math.max(0, completedYears - extraAfterYears) * extraDaysPerYear;

  return {
    baseDays,
    additionalDays,
    totalDays: baseDays + additionalDays,
  };
}

function calcularDiasDecimoTercero(fechaIngreso, fechaSalida) {
  const year = fechaSalida.getFullYear();
  const periodStart = fechaSalida.getMonth() === 11
    ? new Date(year, 11, 1)
    : new Date(year - 1, 11, 1);
  const start = fechaIngreso > periodStart ? fechaIngreso : periodStart;

  if (fechaSalida < start) return 0;

  return Math.min(360, Math.max(0, Math.floor((fechaSalida - start) / 86400000) + 1));
}

function calcularIndemnizacionDespidoIntempestivo(sueldo, aniosServicio, causaTerminacion) {
  if (causaTerminacion !== 'despido_intempestivo') return 0;

  const completedYears = Math.floor(Math.max(0, aniosServicio));
  const months = completedYears <= 3
    ? 3
    : Math.min(25, 3 + (completedYears - 3));

  return roundMoney(sueldo * months);
}

function calcularDesahucio(sueldo, aniosServicio, causaTerminacion) {
  if (!['desahucio', 'renuncia_voluntaria'].includes(causaTerminacion)) return 0;
  return roundMoney(sueldo * 0.25 * Math.floor(Math.max(0, aniosServicio)));
}

function calcularFondoReservaLiquidacion(fechaIngreso, fechaSalida, sueldo, payrollParameters = {}) {
  const startsAfterMonths = Number(payrollParameters.reserveFundStartsAfterMonths ?? 12);
  const reserveRate = Number(payrollParameters.reserveFundRate ?? (1 / 12));
  const firstEligibleDate = new Date(fechaIngreso);
  firstEligibleDate.setMonth(firstEligibleDate.getMonth() + startsAfterMonths);

  if (fechaSalida < firstEligibleDate) {
    return 0;
  }

  const yearStart = new Date(fechaSalida.getFullYear(), 0, 1);
  const start = firstEligibleDate > yearStart ? firstEligibleDate : yearStart;
  const days = Math.max(0, Math.floor((fechaSalida - start) / 86400000) + 1);
  return roundMoney(sueldo * reserveRate * (Math.min(days, 365) / 365));
}

async function verificarDevolucionEquipos(empleadoId, tenantId) {
  const result = await db.query(`
    SELECT COALESCE(
      SUM(GREATEST(jsonb_array_length(COALESCE(items, '[]'::jsonb)), 1)),
      0
    ) as pendientes
    FROM acta_entrega_equipos
    WHERE empleado_id = $1 AND tenant_id = $2 AND devuelto = false
  `, [empleadoId, tenantId]);

  return Number.parseInt(result.rows[0].pendientes, 10) || 0;
}

module.exports = {
  calcularLiquidacion,
  verificarDevolucionEquipos,
  calcularDiasDecimoTercero,
  calcularDiasVacacionesPendientes,
  calcularIndemnizacionDespidoIntempestivo,
  calcularDesahucio,
  calcularFondoReservaLiquidacion,
};
