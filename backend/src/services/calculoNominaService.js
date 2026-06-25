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
const {
  ensureDefaultPayrollAccountingMappings,
  persistPayrollCalculationLines,
} = require('./payrollAccountingService');
const { getApprovedPayrollNoveltyImpacts } = require('./payrollNoveltyService');

const FOURTEENTH_REGION_PARAMETERS = {
  costa_galapagos: 'decimo_cuarto_costa_galapagos',
  sierra_amazonia: 'decimo_cuarto_sierra_amazonia',
};

function resolveFourteenthSalaryRegion(value) {
  const regionCode = String(value || 'sierra_amazonia').trim().toLowerCase();
  return {
    regionCode: FOURTEENTH_REGION_PARAMETERS[regionCode] ? regionCode : 'sierra_amazonia',
    parameterKey: FOURTEENTH_REGION_PARAMETERS[regionCode] || FOURTEENTH_REGION_PARAMETERS.sierra_amazonia,
  };
}

async function calcularNominaMensual(tenantId, anio, mes, context = {}) {
  validarPeriodoNomina(anio, mes);
  console.log(`[NOMINA] Calculando ${mes}/${anio} para tenant ${tenantId}`);

  const batch = await createPayrollCalculationBatch({
    tenantId,
    anio,
    mes,
    userId: context.userId || null,
    correlationId: context.correlationId || '',
  });
  if (!batch?.id) {
    throw new AppError('No se pudo crear el lote de calculo de nomina.', {
      code: 'NOMINA_CALCULATION_BATCH_CREATE_FAILED',
      statusCode: 500,
    });
  }

  let empleados = { rows: [] };
  const resultados = [];

  try {
    const legalParameters = await getLegalParametersForTenant(tenantId, anio);
    assertLegalParametersReadyForProduction(legalParameters, {
      year: anio,
      tenantId,
      operation: 'calculo_nomina',
    });
    await ensureDefaultPayrollAccountingMappings(tenantId, {
      userId: context.userId || null,
      anio,
      mes,
    });

    empleados = await db.query(`
      SELECT e.*, ws.weekly_hours AS jornada_weekly_hours
      FROM empleados e
      LEFT JOIN work_shifts ws
        ON ws.tenant_id = e.tenant_id
        AND ws.code = e.jornada_codigo
        AND ws.status = 'activo'
      WHERE e.tenant_id = $1
        AND e.activo = true
        AND e.fecha_ingreso <= $2
    `, [tenantId, `${anio}-${String(mes).padStart(2, '0')}-01`]);

    for (const emp of empleados.rows) {
      try {
        const resultado = await calcularEmpleado(emp, tenantId, anio, mes, legalParameters, {
          calculationBatchId: batch.id,
        });
        resultados.push(resultado);
      } catch (err) {
        console.error('[NOMINA] Error calculando empleado', {
          code: err.code || 'NOMINA_EMPLEADO_ERROR',
          statusCode: err.statusCode || 500,
          correlationId: context.correlationId || process.env.CORRELATION_ID || 'nomina-mensual',
          userId: context.userId || null,
          empleadoId: emp.id,
          message: err.message,
        });
        resultados.push({ empleadoId: emp.id, error: err.message });
      }
    }

    const errores = resultados.filter((row) => row.error);
    const completedBatch = await finishPayrollCalculationBatch({
      tenantId,
      batchId: batch.id,
      status: errores.length > 0 ? 'failed' : 'completed',
      totalEmpleados: empleados.rows.length,
      totalCalculadas: resultados.length - errores.length,
      totalErrores: errores.length,
      errores,
    });

    return { success: true, total: empleados.rows.length, batch: completedBatch, resultados };
  } catch (err) {
    await finishPayrollCalculationBatch({
      tenantId,
      batchId: batch.id,
      status: 'failed',
      totalEmpleados: empleados.rows.length,
      totalCalculadas: 0,
      totalErrores: 1,
      errores: [{ error: err.message }],
    });
    throw err;
  }
}

async function calcularEmpleado(emp, tenantId, anio, mes, preloadedLegalParameters = null, options = {}) {
  if (!options.calculationBatchId) {
    throw new AppError('Cada calculo de nomina debe estar asociado a un lote.', {
      code: 'NOMINA_CALCULATION_BATCH_REQUIRED',
      statusCode: 422,
    });
  }

  const legalParameters = preloadedLegalParameters || await getLegalParametersForTenant(tenantId, anio);
  if (!preloadedLegalParameters) {
    assertLegalParametersReadyForProduction(legalParameters, {
      year: anio,
      tenantId,
      operation: 'calculo_nomina',
    });
  }
  const payrollParameters = legalParameters.payroll;

  const diasTrabajados = calcularDiasTrabajados(emp.fecha_ingreso, anio, mes);
  const sueldo = Number.parseFloat(emp.sueldo_bruto_mensual);
  const sueldoProporcional = roundMoney((sueldo * diasTrabajados) / 30);
  const valorHora = calcularValorHora(emp, payrollParameters);
  const noveltyImpact = await getApprovedPayrollNoveltyImpacts({
    tenantId,
    empleadoId: emp.id,
    anio,
    mes,
    valorHora,
    dailyMaxHours: payrollParameters.dailyMaxHours,
  });
  const extras50 = (noveltyImpact.minutesByConcept.horas_extra_50 || 0) / 60;
  const extras100 = (noveltyImpact.minutesByConcept.horas_extra_100 || 0) / 60;
  const montoExtras50 = roundMoney(noveltyImpact.amountByConcept.horas_extra_50 || 0);
  const montoExtras100 = roundMoney(noveltyImpact.amountByConcept.horas_extra_100 || 0);
  const bonosDesempeno = roundMoney(noveltyImpact.amountByConcept.bono_desempeno || 0);
  const comisiones = roundMoney(noveltyImpact.amountByConcept.comision || 0);
  const descuentoFaltas = roundMoney(noveltyImpact.amountByConcept.descuento_faltas || 0);

  const ingresosBase = roundMoney(sueldoProporcional + noveltyImpact.totals.incomeAffectsIess);
  const ingresosRenta = roundMoney(sueldoProporcional + noveltyImpact.totals.incomeAffectsIncomeTax);
  const fondoReserva = calcularFondoReserva(emp, ingresosBase, anio, mes, payrollParameters);
  const totalIngresos = roundMoney(ingresosBase + noveltyImpact.totals.incomeNotAffectsIess + fondoReserva.montoPagadoEmpleado);
  const aporteIess = roundMoney(ingresosBase * payrollParameters.personalIessRate);
  const aportePatronal = roundMoney(ingresosBase * payrollParameters.employerIessRate);
  const baseImponible = roundMoney(ingresosRenta - aporteIess);
  const impuestoRenta = calcularIR(
    baseImponible,
    legalParameters,
    Number.parseFloat(emp.gastos_personales_anuales || 0)
  );
  const baseDecimos = roundMoney(sueldoProporcional + noveltyImpact.totals.incomeAffectsDecimos + fondoReserva.montoPagadoEmpleado);
  const baseVacaciones = roundMoney(sueldoProporcional + noveltyImpact.totals.incomeAffectsVacation + fondoReserva.montoPagadoEmpleado);
  const provisionDecimoTercero = roundMoney(baseDecimos * (payrollParameters.thirteenthSalaryProvisionRate ?? (1 / 12)));
  const fourteenthSalaryRegion = resolveFourteenthSalaryRegion(emp.region_decimo_cuarto);
  const provisionDecimoCuarto = roundMoney(payrollParameters.unifiedBaseSalary * (payrollParameters.fourteenthSalaryProvisionRate ?? (1 / 12)));
  const provisionVacaciones = roundMoney(baseVacaciones * payrollParameters.vacationProvisionRate);
  const provisionFondosReserva = fondoReserva.provision;
  const costoEmpleador = roundMoney(
    totalIngresos
    + aportePatronal
    + provisionDecimoTercero
    + provisionDecimoCuarto
    + provisionVacaciones
    + fondoReserva.montoDepositadoIess
  );
  const benefitDeductions = await getApprovedDeductions(tenantId, emp.id, anio, mes);
  const anticipos = benefitDeductions.anticipos;
  const prestamos = benefitDeductions.prestamos;
  const totalDeducciones = roundMoney(aporteIess + impuestoRenta + noveltyImpact.totals.deductions + anticipos + prestamos);
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
    jornadaCodigo: emp.jornada_codigo || '',
    unidadOrganizativaCodigo: emp.unidad_organizativa_codigo || '',
    zonaMarcacionCodigo: emp.zona_marcacion_codigo || '',
    gastosPersonalesAnuales: roundMoney(Number.parseFloat(emp.gastos_personales_anuales || 0)),
    extras50,
    extras100,
    ingresosBase,
    ingresosRenta,
    montoExtras50,
    montoExtras100,
    bonosDesempeno,
    comisiones,
    descuentoFaltas,
    novedadesCalculadas: noveltyImpact.lines,
    novedadesResumen: noveltyImpact.totals,
    aporteIess,
    aportePatronal,
    baseImponible,
    impuestoRenta,
    provisionDecimoTercero,
    provisionDecimoCuarto,
    decimoCuartoRegion: fourteenthSalaryRegion.regionCode,
    decimoCuartoParameterKey: fourteenthSalaryRegion.parameterKey,
    provisionVacaciones,
    provisionFondosReserva,
    fondoReservaModalidad: fondoReserva.modalidad,
    fondoReservaAplica: fondoReserva.aplica,
    fondoReservaPagadoEmpleado: fondoReserva.montoPagadoEmpleado,
    fondoReservaDepositadoIess: fondoReserva.montoDepositadoIess,
    costoEmpleador,
    anticipos,
    prestamos,
    beneficiosDescontados: benefitDeductions.items,
    totalIngresos,
    totalDeducciones,
    netoRecibir,
  };

  const payrollResult = await db.query(`
    INSERT INTO nominas (
      tenant_id, empleado_id, calculation_batch_id, anio, mes, dias_trabajados,
      sueldo_bruto, horas_extras_50, horas_extras_100, total_ingresos,
      aporte_iess_personal, impuesto_renta, anticipos, prestamos,
      total_deducciones, neto_recibir, estado, detalle_calculo
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'borrador',$17)
    ON CONFLICT (tenant_id, empleado_id, anio, mes) DO UPDATE SET
      calculation_batch_id = EXCLUDED.calculation_batch_id,
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
    RETURNING id
  `, [
    tenantId,
    emp.id,
    options.calculationBatchId || null,
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

  if (!payrollResult.rows[0]?.id) {
    throw new AppError('La nomina del empleado no esta editable para recalculo.', {
      code: 'NOMINA_EMPLEADO_NO_EDITABLE',
      statusCode: 409,
    });
  }

  await persistPayrollCalculationLines({
    payrollId: payrollResult.rows[0].id,
    tenantId,
    empleadoId: emp.id,
    calculationBatchId: options.calculationBatchId,
    anio,
    mes,
    employee: emp,
    detalleCalculo,
  });

  return {
    empleadoId: emp.id,
    nombre: `${emp.nombres} ${emp.apellidos}`,
    totalIngresos: toMoneyString(totalIngresos),
    netoRecibir: toMoneyString(netoRecibir),
    detalleCalculo,
  };
}

async function createPayrollCalculationBatch({ tenantId, anio, mes, userId = null, correlationId = '' }) {
  const period = await db.query(`
    WITH inserted AS (
      INSERT INTO payroll_periods (tenant_id, anio, mes, status, opened_by)
      VALUES ($1,$2,$3,'open',$4)
      ON CONFLICT (tenant_id, anio, mes) DO UPDATE SET updated_at = NOW()
      RETURNING id, status
    )
    SELECT id, status FROM inserted
    UNION ALL
    SELECT id, status
    FROM payroll_periods
    WHERE tenant_id = $1 AND anio = $2 AND mes = $3
    LIMIT 1
  `, [tenantId, Number(anio), Number(mes), userId]);

  if (period.rows[0]?.status === 'closed') {
    throw new AppError('No se puede calcular nomina en un periodo cerrado.', {
      code: 'NOMINA_PERIODO_CERRADO',
      statusCode: 422,
    });
  }

  const result = await db.query(`
    INSERT INTO payroll_calculation_batches (
      tenant_id, period_id, anio, mes, status, started_by, correlation_id, metadata
    )
    VALUES ($1,$2,$3,$4,'processing',$5,$6,$7)
    RETURNING *
  `, [
    tenantId,
    period.rows[0]?.id || null,
    Number(anio),
    Number(mes),
    userId,
    correlationId || '',
    JSON.stringify({ source: 'calculo_nomina_mensual' }),
  ]);

  if (!result.rows[0]?.id) {
    throw new AppError('No se pudo crear el lote de calculo de nomina.', {
      code: 'NOMINA_CALCULATION_BATCH_CREATE_FAILED',
      statusCode: 500,
    });
  }

  return result.rows[0];
}

async function finishPayrollCalculationBatch({
  tenantId,
  batchId,
  status,
  totalEmpleados,
  totalCalculadas,
  totalErrores,
  errores,
}) {
  const result = await db.query(`
    UPDATE payroll_calculation_batches
    SET status = $3,
        total_empleados = $4,
        total_calculadas = $5,
        total_errores = $6,
        errores = $7::jsonb,
        completed_at = NOW()
    WHERE tenant_id = $1 AND id = $2
    RETURNING *
  `, [
    tenantId,
    batchId,
    status,
    Number(totalEmpleados || 0),
    Number(totalCalculadas || 0),
    Number(totalErrores || 0),
    JSON.stringify(errores || []),
  ]);

  return result.rows[0] || null;
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

function normalizeReserveFundMode(value) {
  const mode = String(value || 'mensual').trim().toLowerCase();
  return mode === 'iess_directo' ? 'iess_directo' : 'mensual';
}

function calcularFondoReserva(emp = {}, ingresosBase, anio, mes, payrollParameters = {}) {
  const provision = calcularProvisionFondosReserva(emp.fecha_ingreso, ingresosBase, anio, mes, payrollParameters);
  const modalidad = normalizeReserveFundMode(emp.modalidad_fondo_reserva);

  if (provision <= 0) {
    return {
      aplica: false,
      modalidad,
      provision: 0,
      montoPagadoEmpleado: 0,
      montoDepositadoIess: 0,
    };
  }

  if (modalidad === 'iess_directo') {
    return {
      aplica: true,
      modalidad,
      provision,
      montoPagadoEmpleado: 0,
      montoDepositadoIess: provision,
    };
  }

  return {
    aplica: true,
    modalidad,
    provision,
    montoPagadoEmpleado: provision,
    montoDepositadoIess: 0,
  };
}

function calcularProvisionFondosReserva(fechaIngreso, ingresosBase, anio, mes, payrollParameters = {}) {
  const ingreso = new Date(fechaIngreso);
  const finPeriodo = new Date(anio, mes, 0);
  const aniosServicio = (finPeriodo - ingreso) / (365.25 * 86400000);
  const startsAfterMonths = Number(payrollParameters.reserveFundStartsAfterMonths ?? 12);

  if ((aniosServicio * 12) < startsAfterMonths) {
    return 0;
  }

  return roundMoney(ingresosBase * Number(payrollParameters.reserveFundRate ?? (1 / 12)));
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
  const weeklyHours = Number.parseFloat(emp.jornada_weekly_hours || emp.weekly_hours || 0);
  const employeeHours = Number.parseFloat(emp.jornada_horas_mensuales || 0);
  const configuredHours = Number.parseFloat(payrollParameters.monthlyWorkHours || 0);
  const monthlyHours = weeklyHours > 0
    ? roundMoney((weeklyHours * 52) / 12)
    : (employeeHours > 0 ? employeeHours : configuredHours);

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
  calcularFondoReserva,
  normalizeReserveFundMode,
  calcularValorHora,
  getEmployeeMonthlyHours,
  calcularIR,
  resolveFourteenthSalaryRegion,
};
