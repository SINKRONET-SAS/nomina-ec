// ============================================================
// PLAN HAIKY - Motor de Calculo de Nomina Mensual
// Ecuador
// ============================================================
const db = require('../config/database');
const AppError = require('../utils/AppError');
const { roundMoney, toMoneyString } = require('../utils/money');
const {
  assertLegalParametersReadyForProduction,
  getLegalParametersForTenant,
} = require('./legalParameterService');
const { getApprovedDeductions } = require('./beneficioEmpleadoService');

async function calcularNominaMensual(tenantId, anio, mes) {
  validarPeriodoNomina(anio, mes);
  console.log(`[NOMINA] Calculando ${mes}/${anio} para tenant ${tenantId}`);

  const empleados = await db.query(`
    SELECT *
    FROM empleados
    WHERE tenant_id = $1
      AND activo = true
      AND fecha_ingreso <= $2
  `, [tenantId, `${anio}-${String(mes).padStart(2, '0')}-01`]);

  const resultados = [];

  for (const emp of empleados.rows) {
    try {
      const resultado = await calcularEmpleado(emp, tenantId, anio, mes);
      resultados.push(resultado);
    } catch (err) {
      console.error('[NOMINA] Error calculando empleado', {
        code: err.code || 'NOMINA_EMPLEADO_ERROR',
        statusCode: err.statusCode || 500,
        correlationId: process.env.CORRELATION_ID || 'nomina-mensual',
        userId: null,
        empleadoId: emp.id,
        message: err.message,
      });
      resultados.push({ empleadoId: emp.id, error: err.message });
    }
  }

  return { success: true, total: empleados.rows.length, resultados };
}

async function calcularEmpleado(emp, tenantId, anio, mes) {
  const legalParameters = await getLegalParametersForTenant(tenantId, anio);
  assertLegalParametersReadyForProduction(legalParameters, {
    year: anio,
    tenantId,
    operation: 'calculo_nomina',
  });
  const payrollParameters = legalParameters.payroll;

  const novedades = await db.query(`
    SELECT tipo_novedad, SUM(minutos) as total_minutos
    FROM novedades_asistencia
    WHERE empleado_id = $1
      AND EXTRACT(YEAR FROM fecha) = $2
      AND EXTRACT(MONTH FROM fecha) = $3
      AND estado = 'aprobado'
    GROUP BY tipo_novedad
  `, [emp.id, anio, mes]);

  const noveltyByType = {};
  novedades.rows.forEach((novedad) => {
    noveltyByType[novedad.tipo_novedad] = Number.parseInt(novedad.total_minutos, 10) || 0;
  });

  const diasTrabajados = calcularDiasTrabajados(emp.fecha_ingreso, anio, mes);
  const sueldo = Number.parseFloat(emp.sueldo_bruto_mensual);
  const sueldoProporcional = roundMoney((sueldo * diasTrabajados) / 30);
  const valorHora = calcularValorHora(emp, payrollParameters);
  const extras50 = (noveltyByType.hora_extra_50 || 0) / 60;
  const extras100 = (noveltyByType.hora_extra_100 || 0) / 60;
  const montoExtras50 = roundMoney(extras50 * valorHora * 1.5);
  const montoExtras100 = roundMoney(extras100 * valorHora * 2);

  const faltas = await db.query(`
    SELECT COUNT(*) as total
    FROM novedades_asistencia
    WHERE empleado_id = $1
      AND tipo_novedad = 'falta'
      AND estado = 'aprobado'
      AND EXTRACT(YEAR FROM fecha) = $2
      AND EXTRACT(MONTH FROM fecha) = $3
  `, [emp.id, anio, mes]);
  const descuentoFaltas = roundMoney((Number.parseInt(faltas.rows[0].total, 10) || 0) * valorHora * payrollParameters.dailyMaxHours);

  const totalIngresos = roundMoney(sueldoProporcional + montoExtras50 + montoExtras100);
  const aporteIess = roundMoney(totalIngresos * payrollParameters.personalIessRate);
  const aportePatronal = roundMoney(totalIngresos * payrollParameters.employerIessRate);
  const baseImponible = roundMoney(totalIngresos - aporteIess);
  const impuestoRenta = calcularIR(
    baseImponible,
    legalParameters,
    Number.parseFloat(emp.gastos_personales_anuales || 0)
  );
  const provisionDecimoTercero = roundMoney(totalIngresos * (payrollParameters.thirteenthSalaryProvisionRate ?? (1 / 12)));
  const provisionDecimoCuarto = roundMoney(payrollParameters.unifiedBaseSalary * (payrollParameters.fourteenthSalaryProvisionRate ?? (1 / 12)));
  const provisionVacaciones = roundMoney(totalIngresos * payrollParameters.vacationProvisionRate);
  const provisionFondosReserva = calcularProvisionFondosReserva(emp.fecha_ingreso, totalIngresos, anio, mes, payrollParameters);
  const costoEmpleador = roundMoney(
    totalIngresos
    + aportePatronal
    + provisionDecimoTercero
    + provisionDecimoCuarto
    + provisionVacaciones
    + provisionFondosReserva
  );
  const benefitDeductions = await getApprovedDeductions(tenantId, emp.id, anio, mes);
  const anticipos = benefitDeductions.anticipos;
  const prestamos = benefitDeductions.prestamos;
  const totalDeducciones = roundMoney(aporteIess + impuestoRenta + descuentoFaltas + anticipos + prestamos);
  const netoRecibir = roundMoney(totalIngresos - totalDeducciones);

  if (netoRecibir < 0) {
    throw new AppError('El neto a recibir no puede ser negativo', {
      code: 'NOMINA_NETO_NEGATIVO',
      statusCode: 422,
    });
  }

  const detalleCalculo = {
    fuenteLegal: legalParameters.sourceStatus,
    diasTrabajados,
    sueldoProporcional,
    valorHora: roundMoney(valorHora),
    jornadaHorasMensuales: getEmployeeMonthlyHours(emp, payrollParameters),
    gastosPersonalesAnuales: roundMoney(Number.parseFloat(emp.gastos_personales_anuales || 0)),
    extras50,
    extras100,
    montoExtras50,
    montoExtras100,
    descuentoFaltas,
    aporteIess,
    aportePatronal,
    baseImponible,
    impuestoRenta,
    provisionDecimoTercero,
    provisionDecimoCuarto,
    provisionVacaciones,
    provisionFondosReserva,
    costoEmpleador,
    anticipos,
    prestamos,
    beneficiosDescontados: benefitDeductions.items,
    totalIngresos,
    totalDeducciones,
    netoRecibir,
  };

  await db.query(`
    INSERT INTO nominas (
      tenant_id, empleado_id, anio, mes, dias_trabajados,
      sueldo_bruto, horas_extras_50, horas_extras_100, total_ingresos,
      aporte_iess_personal, impuesto_renta, anticipos, prestamos,
      total_deducciones, neto_recibir, estado, detalle_calculo
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'borrador',$16)
    ON CONFLICT (tenant_id, empleado_id, anio, mes) DO UPDATE SET
      dias_trabajados = EXCLUDED.dias_trabajados,
      sueldo_bruto = EXCLUDED.sueldo_bruto,
      horas_extras_50 = EXCLUDED.horas_extras_50,
      horas_extras_100 = EXCLUDED.horas_extras_100,
      total_ingresos = EXCLUDED.total_ingresos,
      aporte_iess_personal = EXCLUDED.aporte_iess_personal,
      impuesto_renta = EXCLUDED.impuesto_renta,
      anticipos = EXCLUDED.anticipos,
      prestamos = EXCLUDED.prestamos,
      total_deducciones = EXCLUDED.total_deducciones,
      neto_recibir = EXCLUDED.neto_recibir,
      detalle_calculo = EXCLUDED.detalle_calculo,
      updated_at = NOW()
    WHERE nominas.estado = 'borrador'
  `, [
    tenantId,
    emp.id,
    anio,
    mes,
    diasTrabajados,
    sueldoProporcional,
    montoExtras50,
    montoExtras100,
    totalIngresos,
    aporteIess,
    impuestoRenta,
    anticipos,
    prestamos,
    totalDeducciones,
    netoRecibir,
    JSON.stringify(detalleCalculo),
  ]);

  return {
    empleadoId: emp.id,
    nombre: `${emp.nombres} ${emp.apellidos}`,
    totalIngresos: toMoneyString(totalIngresos),
    netoRecibir: toMoneyString(netoRecibir),
    detalleCalculo,
  };
}

function calcularDiasTrabajados(fechaIngreso, anio, mes) {
  const inicioMes = new Date(anio, mes - 1, 1);
  const finMes = new Date(anio, mes, 0);
  const ingreso = new Date(fechaIngreso);

  if (ingreso > finMes) {
    return 0;
  }

  const inicioCalculo = ingreso > inicioMes ? ingreso : inicioMes;
  const dias = Math.floor((finMes - inicioCalculo) / 86400000) + 1;
  return Math.max(0, Math.min(30, dias));
}

function validarPeriodoNomina(anio, mes) {
  if (!Number.isInteger(Number(anio)) || !Number.isInteger(Number(mes))) {
    throw new AppError('El periodo de nómina debe incluir año y mes válidos', {
      code: 'NOMINA_PERIODO_INVALIDO',
      statusCode: 400,
    });
  }

  if (Number(mes) < 1 || Number(mes) > 12) {
    throw new AppError('El mes de nómina debe estar entre 1 y 12', {
      code: 'NOMINA_MES_INVALIDO',
      statusCode: 400,
    });
  }
}

function calcularProvisionFondosReserva(fechaIngreso, totalIngresos, anio, mes, payrollParameters = {}) {
  const ingreso = new Date(fechaIngreso);
  const finPeriodo = new Date(anio, mes, 0);
  const aniosServicio = (finPeriodo - ingreso) / (365.25 * 86400000);
  const startsAfterMonths = Number(payrollParameters.reserveFundStartsAfterMonths ?? 12);

  if ((aniosServicio * 12) < startsAfterMonths) {
    return 0;
  }

  return roundMoney(totalIngresos * Number(payrollParameters.reserveFundRate ?? (1 / 12)));
}

function calcularValorHora(emp, payrollParameters = {}) {
  const sueldo = Number.parseFloat(emp.sueldo_bruto_mensual || 0);
  const tipoContrato = String(emp.tipo_contrato || '').trim().toLowerCase();

  if (tipoContrato === 'hora') {
    return sueldo;
  }

  const monthlyHours = getEmployeeMonthlyHours(emp, payrollParameters);
  return sueldo / monthlyHours;
}

function getEmployeeMonthlyHours(emp = {}, payrollParameters = {}) {
  const employeeHours = Number.parseFloat(emp.jornada_horas_mensuales || 0);
  const configuredHours = Number.parseFloat(payrollParameters.monthlyWorkHours || 0);
  const monthlyHours = employeeHours > 0 ? employeeHours : configuredHours;

  if (!Number.isFinite(monthlyHours) || monthlyHours <= 0) {
    throw new AppError('La jornada mensual debe ser mayor a cero para calcular valor hora', {
      code: 'NOMINA_JORNADA_INVALIDA',
      statusCode: 422,
    });
  }

  return monthlyHours;
}

function calcularIR(baseMensual, legalParameters, gastosPersonalesAnuales = 0) {
  const limit = Number(legalParameters.payroll?.personalExpenseDeductionLimit ?? 0);
  const deductibleExpenses = Math.min(
    Math.max(0, Number(gastosPersonalesAnuales || 0)),
    Math.max(0, limit)
  );
  const baseAnual = Math.max(0, (baseMensual * 12) - deductibleExpenses);
  const brackets = legalParameters.incomeTax;
  let annualTax = 0;

  for (const bracket of brackets) {
    const from = Number(bracket.from ?? bracket.fraccion_basica ?? 0);
    const to = bracket.to ?? bracket.exceso_hasta ?? null;
    const upperLimit = to === null ? Number.POSITIVE_INFINITY : Number(to);
    const rate = Number(bracket.rate ?? bracket.porcentaje ?? 0);
    const baseTax = Number(bracket.baseTax ?? bracket.impuesto_fraccion_basica ?? 0);

    if (baseAnual > from && baseAnual <= upperLimit) {
      annualTax = baseTax + ((baseAnual - from) * rate);
      break;
    }
  }

  return roundMoney(annualTax / 12);
}

module.exports = {
  calcularNominaMensual,
  calcularEmpleado,
  calcularDiasTrabajados,
  calcularProvisionFondosReserva,
  calcularValorHora,
  getEmployeeMonthlyHours,
  calcularIR,
};
