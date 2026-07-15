// ============================================================
// SKNOMINA - Motor de Cálculo de Nómina Mensual
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
const { getCommittedInitialBalanceEffects } = require('./initialBalanceService');
const {
  ensureDefaultPayrollAccountingMappings,
  persistPayrollCalculationLines,
} = require('./payrollAccountingService');
const { getApprovedPayrollNoveltyImpacts } = require('./payrollNoveltyService');
const { periodEndDate, periodStartDate } = require('./monthlyPeriodService');
const logger = require('../utils/logger');

const FOURTEENTH_REGION_PARAMETERS = {
  costa_galapagos: 'decimo_cuarto_costa_galapagos',
  sierra_amazonia: 'decimo_cuarto_sierra_amazonia',
};
const IESS_RELATION_TYPES = new Set([
  'relacion_dependencia',
  'jornada_parcial_permanente',
  'sin_relacion_dependencia',
  'servicios_profesionales',
  'pasante',
]);
const IESS_APPLICABLE_RELATION_TYPES = new Set([
  'relacion_dependencia',
  'jornada_parcial_permanente',
]);
const CALCULATION_SAVEPOINT = 'payroll_calculation_work';
const EMPLOYEE_SAVEPOINT = 'payroll_employee_work';

function employeeCalculationError(emp, err) {
  const statusCode = Number(err?.statusCode || 500);
  const userCorrectable = statusCode >= 400 && statusCode < 500;
  return {
    empleadoId: emp.id,
    nombre: `${emp.nombres || ''} ${emp.apellidos || ''}`.trim(),
    cedula: emp.cedula || '',
    errorCode: userCorrectable ? (err.code || 'NOMINA_EMPLEADO_ERROR') : 'NOMINA_EMPLEADO_PERSISTENCIA_ERROR',
    error: userCorrectable
      ? err.message
      : 'No pudimos registrar el calculo de este empleado. Revisa su ficha y configuracion contable; si persiste, reporta el codigo de seguimiento.',
  };
}

async function rollbackAndReleaseSavepoint(executor, savepoint, context = {}, originalError = null) {
  try {
    await executor.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    await executor.query(`RELEASE SAVEPOINT ${savepoint}`);
    return true;
  } catch (recoveryError) {
    console.error('[NOMINA] No se pudo recuperar el punto transaccional', {
      code: recoveryError.code || 'NOMINA_SAVEPOINT_RECOVERY_ERROR',
      statusCode: 500,
      correlationId: context.correlationId || process.env.CORRELATION_ID || 'nomina-mensual',
      userId: context.userId || null,
      savepoint,
      originalCode: originalError?.code || 'NOMINA_CALCULO_ERROR',
      message: recoveryError.message,
    });
    return false;
  }
}

function resolveFourteenthSalaryRegion(value) {
  const regionCode = String(value || 'sierra_amazonia').trim().toLowerCase();
  return {
    regionCode: FOURTEENTH_REGION_PARAMETERS[regionCode] ? regionCode : 'sierra_amazonia',
    parameterKey: FOURTEENTH_REGION_PARAMETERS[regionCode] || FOURTEENTH_REGION_PARAMETERS.sierra_amazonia,
  };
}

function normalizeIessRelationType(value) {
  const normalized = String(value || 'relacion_dependencia').trim().toLowerCase();
  return IESS_RELATION_TYPES.has(normalized) ? normalized : 'relacion_dependencia';
}

function resolveIessApplicability(emp = {}, payrollParameters = {}) {
  const affiliated = emp.iess_afiliado !== false && String(emp.iess_afiliado ?? 'true').toLowerCase() !== 'false';
  const relationType = normalizeIessRelationType(emp.iess_tipo_relacion || emp.iessTipoRelacion);
  const applies = affiliated && IESS_APPLICABLE_RELATION_TYPES.has(relationType);

  return {
    affiliated,
    relationType,
    applies,
    personalRate: applies ? Number(payrollParameters.personalIessRate || 0) : 0,
    employerRate: applies ? Number(payrollParameters.employerIessRate || 0) : 0,
  };
}

function resolveThirteenthSalaryPeriod(anio, mes, payrollParameters = {}) {
  return resolveAnnualPeriod({
    anio,
    mes,
    startMonth: Number(payrollParameters.thirteenthSalaryPeriodStartMonth || 12),
    endMonth: Number(payrollParameters.thirteenthSalaryPeriodEndMonth || 11),
  });
}

function resolveFourteenthSalaryPeriod(anio, mes, regionCode, payrollParameters = {}) {
  const prefix = regionCode === 'costa_galapagos' ? 'CostaGalapagos' : 'SierraAmazonia';
  return resolveAnnualPeriod({
    anio,
    mes,
    startMonth: Number(payrollParameters[`fourteenthSalary${prefix}PeriodStartMonth`] || (regionCode === 'costa_galapagos' ? 3 : 8)),
    endMonth: Number(payrollParameters[`fourteenthSalary${prefix}PeriodEndMonth`] || (regionCode === 'costa_galapagos' ? 2 : 7)),
  });
}

function resolveAnnualPeriod({ anio, mes, startMonth, endMonth }) {
  const startYear = Number(mes) >= startMonth ? Number(anio) : Number(anio) - 1;
  const endYear = endMonth >= startMonth ? startYear : startYear + 1;
  const endDate = new Date(Date.UTC(endYear, endMonth, 0)).toISOString().slice(0, 10);
  return {
    startDate: `${startYear}-${String(startMonth).padStart(2, '0')}-01`,
    endDate,
    startMonth,
    endMonth,
  };
}

function assertWeeklyOvertimeLimit(weeklyOvertimeMinutes = {}, payrollParameters = {}) {
  const maxWeeklyOvertimeHours = Number(payrollParameters.maxWeeklyOvertimeHours ?? 12);
  const maxWeeklyMinutes = maxWeeklyOvertimeHours * 60;
  const violations = Object.entries(weeklyOvertimeMinutes)
    .filter(([, minutes]) => Number(minutes || 0) > maxWeeklyMinutes)
    .map(([weekStartDate, minutes]) => ({
      weekStartDate,
      minutes: Number(minutes || 0),
      hours: roundMoney(Number(minutes || 0) / 60),
      maxHours: maxWeeklyOvertimeHours,
    }));

  if (violations.length > 0) {
    throw new AppError('Las horas extra aprobadas exceden el limite semanal permitido.', {
      code: 'NOMINA_HORAS_EXTRA_LIMITE_SEMANAL',
      statusCode: 422,
      details: { violations },
    });
  }
}

function resolveOvertimeParameters(payrollParameters = {}) {
  const monthlyWorkHours = Number(payrollParameters.monthlyWorkHours ?? 240);
  const maxWeeklyOvertimeHours = Number(payrollParameters.maxWeeklyOvertimeHours ?? 12);
  const supplementaryMultiplier = Number(payrollParameters.overtimeSupplementMultiplier ?? 1.5);
  const extraordinaryMultiplier = Number(payrollParameters.overtimeExtraordinaryMultiplier ?? 2);

  return {
    monthlyWorkHours,
    maxWeeklyOvertimeHours,
    supplementaryMultiplier,
    extraordinaryMultiplier,
    supplementarySurchargeRate: roundMoney(supplementaryMultiplier - 1),
    extraordinarySurchargeRate: roundMoney(extraordinaryMultiplier - 1),
    legalBasis: 'Codigo del Trabajo Art. 55',
    formula: 'valorHora = sueldo / jornadaHorasMensuales; HE50 = horas * valorHora * multiplicadorSuplementario; HE100 = horas * valorHora * multiplicadorExtraordinario',
  };
}

async function calcularNominaMensual(tenantId, anio, mes, context = {}) {
  validarPeriodoNomina(anio, mes);
  logger.info({
    code: 'PAYROLL_CALCULATION_STARTED',
    correlationId: context.correlationId || process.env.CORRELATION_ID || 'nomina-mensual',
    userId: context.userId || null,
    tenantId,
    anio,
    mes,
  }, 'Cálculo de nómina iniciado');
  const executor = context.dbClient || db;

  const batch = await createPayrollCalculationBatch({
    tenantId,
    anio,
    mes,
    userId: context.userId || null,
    correlationId: context.correlationId || '',
    dbClient: executor,
  });
  if (!batch?.id) {
    throw new AppError('No se pudo crear el lote de cálculo de nómina.', {
      code: 'NOMINA_CALCULATION_BATCH_CREATE_FAILED',
      statusCode: 500,
    });
  }

  let empleados = { rows: [] };
  const resultados = [];
  const usesTransactionSavepoints = Boolean(context.dbClient);

  if (usesTransactionSavepoints) {
    await executor.query(`SAVEPOINT ${CALCULATION_SAVEPOINT}`);
  }

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
      dbClient: executor,
    });

    empleados = await executor.query(`
      SELECT e.*, ws.weekly_hours AS jornada_weekly_hours
      FROM empleados e
      LEFT JOIN work_shifts ws
        ON ws.tenant_id = e.tenant_id
        AND ws.code = e.jornada_codigo
        AND ws.status = 'activo'
      WHERE e.tenant_id = $1
        AND e.activo = true
        AND e.fecha_ingreso <= $2
    `, [tenantId, periodEndDate(anio, mes)]);

    for (const emp of empleados.rows) {
      if (usesTransactionSavepoints) {
        await executor.query(`SAVEPOINT ${EMPLOYEE_SAVEPOINT}`);
      }
      try {
        const resultado = await calcularEmpleado(emp, tenantId, anio, mes, legalParameters, {
          calculationBatchId: batch.id,
          dbClient: executor,
        });
        if (usesTransactionSavepoints) {
          await executor.query(`RELEASE SAVEPOINT ${EMPLOYEE_SAVEPOINT}`);
        }
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
        if (usesTransactionSavepoints) {
          const recovered = await rollbackAndReleaseSavepoint(executor, EMPLOYEE_SAVEPOINT, context, err);
          if (!recovered) {
            throw new AppError('No pudimos recuperar el calculo despues del error de un empleado.', {
              code: 'NOMINA_EMPLOYEE_SAVEPOINT_RECOVERY_FAILED',
              statusCode: 500,
              details: { empleadoId: emp.id, originalCode: err.code || 'NOMINA_EMPLEADO_ERROR' },
            });
          }
        }
        resultados.push(employeeCalculationError(emp, err));
      }
    }

    const errores = resultados.filter((row) => row.error);
    const completedBatch = await finishPayrollCalculationBatch({
      tenantId,
      batchId: batch.id,
      status: errores.length > 0 && errores.length === resultados.length ? 'failed' : errores.length > 0 ? 'partial_failed' : 'completed',
      totalEmpleados: empleados.rows.length,
      totalCalculadas: resultados.length - errores.length,
      totalErrores: errores.length,
      errores,
      dbClient: executor,
    });

    if (usesTransactionSavepoints) {
      await executor.query(`RELEASE SAVEPOINT ${CALCULATION_SAVEPOINT}`);
    }

    return { success: true, total: empleados.rows.length, batch: completedBatch, resultados };
  } catch (err) {
    const recovered = !usesTransactionSavepoints
      || await rollbackAndReleaseSavepoint(executor, CALCULATION_SAVEPOINT, context, err);

    if (recovered) {
      try {
        await finishPayrollCalculationBatch({
          tenantId,
          batchId: batch.id,
          status: 'failed',
          totalEmpleados: empleados.rows.length,
          totalCalculadas: 0,
          totalErrores: 1,
          errores: [{
            errorCode: err.code || 'NOMINA_CALCULO_ERROR',
            error: Number(err.statusCode || 500) < 500
              ? err.message
              : 'El lote no pudo completarse. Revisa el codigo de seguimiento en el registro de auditoria.',
          }],
          dbClient: executor,
        });
      } catch (batchError) {
        console.error('[NOMINA] No se pudo registrar el fallo del lote de calculo', {
          code: batchError.code || 'NOMINA_CALCULATION_BATCH_FINISH_ERROR',
          statusCode: 500,
          correlationId: context.correlationId || process.env.CORRELATION_ID || 'nomina-mensual',
          userId: context.userId || null,
          batchId: batch.id,
          originalCode: err.code || 'NOMINA_CALCULO_ERROR',
          message: batchError.message,
        });
      }
    }
    throw err;
  }
}

async function calcularNominaEmpleado(tenantId, empleadoId, anio, mes, context = {}) {
  validarPeriodoNomina(anio, mes);
  const scopedEmployeeId = String(empleadoId || '').trim();
  if (!scopedEmployeeId) {
    throw new AppError('Selecciona el empleado para recalcular la nomina.', {
      code: 'NOMINA_EMPLEADO_REQUERIDO',
      statusCode: 400,
    });
  }

  logger.info({
    code: 'PAYROLL_EMPLOYEE_RECALCULATION_STARTED',
    correlationId: context.correlationId || process.env.CORRELATION_ID || 'nomina-empleado',
    userId: context.userId || null,
    tenantId,
    empleadoId: scopedEmployeeId,
    anio,
    mes,
  }, 'Recalculo individual de nomina iniciado');

  const executor = context.dbClient || db;
  const batch = await createPayrollCalculationBatch({
    tenantId,
    anio,
    mes,
    userId: context.userId || null,
    correlationId: context.correlationId || '',
    metadata: {
      source: 'calculo_nomina_empleado',
      scope: 'employee',
      empleadoId: scopedEmployeeId,
    },
    dbClient: executor,
  });

  if (!batch?.id) {
    throw new AppError('No se pudo crear el lote de recalculo individual.', {
      code: 'NOMINA_EMPLOYEE_CALCULATION_BATCH_CREATE_FAILED',
      statusCode: 500,
    });
  }

  try {
    const legalParameters = await getLegalParametersForTenant(tenantId, anio);
    assertLegalParametersReadyForProduction(legalParameters, {
      year: anio,
      tenantId,
      operation: 'recalculo_nomina_empleado',
    });
    await ensureDefaultPayrollAccountingMappings(tenantId, {
      userId: context.userId || null,
      anio,
      mes,
      dbClient: executor,
    });

    const employeeResult = await executor.query(`
      SELECT e.*, ws.weekly_hours AS jornada_weekly_hours
      FROM empleados e
      LEFT JOIN work_shifts ws
        ON ws.tenant_id = e.tenant_id
        AND ws.code = e.jornada_codigo
        AND ws.status = 'activo'
      WHERE e.tenant_id = $1
        AND e.id = $2
        AND e.activo = true
        AND e.fecha_ingreso <= $3
      LIMIT 1
    `, [tenantId, scopedEmployeeId, periodEndDate(anio, mes)]);

    if (employeeResult.rows.length === 0) {
      throw new AppError('Empleado no encontrado o sin relacion laboral vigente en el periodo.', {
        code: 'NOMINA_EMPLEADO_NO_ENCONTRADO',
        statusCode: 404,
        details: { empleadoId: scopedEmployeeId, anio, mes },
      });
    }

    const resultado = await calcularEmpleado(employeeResult.rows[0], tenantId, anio, mes, legalParameters, {
      calculationBatchId: batch.id,
      dbClient: executor,
    });

    const completedBatch = await finishPayrollCalculationBatch({
      tenantId,
      batchId: batch.id,
      status: 'completed',
      totalEmpleados: 1,
      totalCalculadas: 1,
      totalErrores: 0,
      errores: [],
      dbClient: executor,
    });

    return { success: true, total: 1, batch: completedBatch, resultados: [resultado] };
  } catch (err) {
    const errorRow = {
      empleadoId: scopedEmployeeId,
      errorCode: err.code || 'NOMINA_EMPLEADO_RECALCULO_ERROR',
      error: Number(err.statusCode || 500) < 500
        ? err.message
        : 'No pudimos recalcular la nomina del empleado. Revisa el codigo de seguimiento.',
    };

    try {
      await finishPayrollCalculationBatch({
        tenantId,
        batchId: batch.id,
        status: 'failed',
        totalEmpleados: 1,
        totalCalculadas: 0,
        totalErrores: 1,
        errores: [errorRow],
        dbClient: executor,
      });
    } catch (batchError) {
      console.error('[NOMINA] No se pudo registrar el fallo del recalculo individual', {
        code: batchError.code || 'NOMINA_EMPLOYEE_CALCULATION_BATCH_FINISH_ERROR',
        statusCode: 500,
        correlationId: context.correlationId || process.env.CORRELATION_ID || 'nomina-empleado',
        userId: context.userId || null,
        batchId: batch.id,
        originalCode: err.code || 'NOMINA_EMPLEADO_RECALCULO_ERROR',
        message: batchError.message,
      });
    }

    if (Number(err.statusCode || 500) >= 500) {
      throw err;
    }

    return {
      success: false,
      total: 1,
      batch: null,
      resultados: [errorRow],
      errores: 1,
      exitosos: 0,
    };
  }
}

async function calcularEmpleado(emp, tenantId, anio, mes, preloadedLegalParameters = null, options = {}) {
  if (!options.calculationBatchId) {
    throw new AppError('Cada cálculo de nómina debe estar asociado a un lote.', {
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
  const overtimeParameters = resolveOvertimeParameters(payrollParameters);
  assertEmployeeMeetsUnifiedBaseSalary(emp, payrollParameters, { anio, mes });

  const diasTrabajados = calcularDiasTrabajados(emp.fecha_ingreso, anio, mes);
  if (diasTrabajados <= 0) {
    throw new AppError('Empleado sin relacion laboral vigente en el periodo de calculo.', {
      code: 'NOMINA_EMPLOYEE_NOT_APPLICABLE',
      statusCode: 422,
      details: { empleadoId: emp.id, fechaIngreso: emp.fecha_ingreso, anio, mes },
    });
  }
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
    overtimeSupplementMultiplier: overtimeParameters.supplementaryMultiplier,
    overtimeExtraordinaryMultiplier: overtimeParameters.extraordinaryMultiplier,
    dbClient: options.dbClient || null,
  });
  assertWeeklyOvertimeLimit(noveltyImpact.weeklyOvertimeMinutes, payrollParameters);
  const extras50 = roundMoney((noveltyImpact.minutesByConcept.horas_extra_50 || 0) / 60);
  const extras100 = roundMoney((noveltyImpact.minutesByConcept.horas_extra_100 || 0) / 60);
  const montoExtras50 = roundMoney(noveltyImpact.amountByConcept.horas_extra_50 || 0);
  const montoExtras100 = roundMoney(noveltyImpact.amountByConcept.horas_extra_100 || 0);
  const bonosDesempeno = roundMoney(noveltyImpact.amountByConcept.bono_desempeno || 0);
  const comisiones = roundMoney(noveltyImpact.amountByConcept.comision || 0);
  const descuentoFaltas = roundMoney(noveltyImpact.amountByConcept.descuento_faltas || 0);
  const initialBalanceEffects = await getCommittedInitialBalanceEffects({
    tenantId,
    empleadoId: emp.id,
    anio,
    mes,
    dbClient: options.dbClient || null,
  });

  const ingresosBase = roundMoney(sueldoProporcional + noveltyImpact.totals.incomeAffectsIess);
  const ingresosRenta = roundMoney(sueldoProporcional + noveltyImpact.totals.incomeAffectsIncomeTax);
  const fondoReserva = calcularFondoReserva(emp, ingresosBase, anio, mes, payrollParameters);
  // totalIngresos base sin decimos mensualizados (se recalcula despues de resolver modalidad)
  const totalIngresosBase = roundMoney(
    ingresosBase
    + noveltyImpact.totals.incomeNotAffectsIess
    + fondoReserva.montoPagadoEmpleado
    + initialBalanceEffects.beneficioRecurrente
  );
  const iessApplicability = resolveIessApplicability(emp, payrollParameters);
  const aporteIess = roundMoney(ingresosBase * iessApplicability.personalRate);
  const aportePatronal = roundMoney(ingresosBase * iessApplicability.employerRate);
  const baseImponible = roundMoney(ingresosRenta - aporteIess);
  const impuestoRenta = calcularIR(
    baseImponible,
    legalParameters,
    Number.parseFloat(emp.gastos_personales_anuales || 0)
  );
  const baseDecimos = roundMoney(sueldoProporcional + noveltyImpact.totals.incomeAffectsDecimos + fondoReserva.montoPagadoEmpleado);
  const baseVacaciones = roundMoney(sueldoProporcional + noveltyImpact.totals.incomeAffectsVacation + fondoReserva.montoPagadoEmpleado);
  const provisionDecimoTercero = roundMoney(baseDecimos * (payrollParameters.thirteenthSalaryProvisionRate ?? (1 / 12)));
  const thirteenthSalaryPeriod = resolveThirteenthSalaryPeriod(anio, mes, payrollParameters);
  const fourteenthSalaryRegion = resolveFourteenthSalaryRegion(emp.region_decimo_cuarto);
  const fourteenthSalaryPeriod = resolveFourteenthSalaryPeriod(anio, mes, fourteenthSalaryRegion.regionCode, payrollParameters);
  const provisionDecimoCuarto = roundMoney(payrollParameters.unifiedBaseSalary * (payrollParameters.fourteenthSalaryProvisionRate ?? (1 / 12)));
  const decimoTerceroMensual = calcularDecimoTerceroMensual(emp, provisionDecimoTercero);
  const decimoCuartoMensual = calcularDecimoCuartoMensual(emp, provisionDecimoCuarto);
  const totalIngresos = roundMoney(
    totalIngresosBase
    + decimoTerceroMensual.montoPagadoEmpleado
    + decimoCuartoMensual.montoPagadoEmpleado
  );
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
  const benefitDeductions = await getApprovedDeductions(tenantId, emp.id, anio, mes, {
    dbClient: options.dbClient || null,
  });
  const anticipos = roundMoney(benefitDeductions.anticipos + initialBalanceEffects.anticipos);
  const prestamos = roundMoney(benefitDeductions.prestamos + initialBalanceEffects.prestamos);
  const totalDeducciones = roundMoney(
    aporteIess
    + impuestoRenta
    + noveltyImpact.totals.deductions
    + initialBalanceEffects.descuentoRecurrente
    + anticipos
    + prestamos
  );
  const netoRecibir = roundMoney(totalIngresos - totalDeducciones);
  const integridadTotales = assertPayrollTotalsIntegrity({
    totalIngresos,
    totalDeducciones,
    netoRecibir,
  }, {
    empleadoId: emp.id,
    anio,
    mes,
  });

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
    horasExtraPorSemana: noveltyImpact.weeklyOvertimeMinutes || {},
    horasExtraPorSemanaHoras: Object.fromEntries(Object.entries(noveltyImpact.weeklyOvertimeMinutes || {}).map(([week, minutes]) => [
      week,
      roundMoney(Number(minutes || 0) / 60),
    ])),
    horasExtraLimiteSemanal: Number(payrollParameters.maxWeeklyOvertimeHours ?? 12),
    horasExtraParametros: {
      ...overtimeParameters,
      valorHora: roundMoney(valorHora),
      jornadaHorasMensuales: getEmployeeMonthlyHours(emp, payrollParameters),
    },
    bonosDesempeno,
    comisiones,
    descuentoFaltas,
    novedadesCalculadas: noveltyImpact.lines,
    novedadesResumen: noveltyImpact.totals,
    iessAfiliado: iessApplicability.affiliated,
    iessTipoRelacion: iessApplicability.relationType,
    iessAplica: iessApplicability.applies,
    iessAportePersonalRate: iessApplicability.personalRate,
    iessAportePatronalRate: iessApplicability.employerRate,
    aporteIess,
    aportePatronal,
    baseImponible,
    impuestoRenta,
    provisionDecimoTercero,
    decimoTerceroPeriodo: thirteenthSalaryPeriod,
    decimoTerceroModalidad: decimoTerceroMensual.modalidad,
    decimoTerceroMensualizado: decimoTerceroMensual.montoPagadoEmpleado,
    provisionDecimoCuarto,
    decimoCuartoRegion: fourteenthSalaryRegion.regionCode,
    decimoCuartoParameterKey: fourteenthSalaryRegion.parameterKey,
    decimoCuartoPeriodo: fourteenthSalaryPeriod,
    decimoCuartoModalidad: decimoCuartoMensual.modalidad,
    decimoCuartoMensualizado: decimoCuartoMensual.montoPagadoEmpleado,
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
    saldosIniciales: initialBalanceEffects,
    totalIngresos,
    totalDeducciones,
    netoRecibir,
    integridadTotales,
  };

  const executor = options.dbClient || db;
  const payrollResult = await executor.query(`
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
    throw new AppError('La nómina del empleado no está editable para recálculo.', {
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
    dbClient: options.dbClient || null,
  });

  return {
    empleadoId: emp.id,
    nombre: `${emp.nombres} ${emp.apellidos}`,
    cedula: emp.cedula || '',
    totalIngresos: toMoneyString(totalIngresos),
    netoRecibir: toMoneyString(netoRecibir),
    detalleCalculo,
  };
}

async function createPayrollCalculationBatch({
  tenantId,
  anio,
  mes,
  userId = null,
  correlationId = '',
  metadata = null,
  dbClient = null,
}) {
  const executor = dbClient || db;
  const period = await executor.query(`
    WITH inserted AS (
      INSERT INTO payroll_periods (tenant_id, anio, mes, fecha_desde, fecha_hasta, status, opened_by)
      VALUES ($1,$2,$3,$4,$5,'open',$6)
      ON CONFLICT (tenant_id, anio, mes) DO UPDATE SET updated_at = NOW()
      RETURNING id, status
    )
    SELECT id, status FROM inserted
    UNION ALL
    SELECT id, status
    FROM payroll_periods
    WHERE tenant_id = $1 AND anio = $2 AND mes = $3
    LIMIT 1
  `, [tenantId, Number(anio), Number(mes), periodStartDate(anio, mes), periodEndDate(anio, mes), userId]);

  if (period.rows[0]?.status === 'closed') {
    throw new AppError('No se puede calcular nómina en un periodo cerrado.', {
      code: 'NOMINA_PERIODO_CERRADO',
      statusCode: 422,
    });
  }

  const result = await executor.query(`
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
    JSON.stringify(metadata || { source: 'calculo_nomina_mensual' }),
  ]);

  if (!result.rows[0]?.id) {
    throw new AppError('No se pudo crear el lote de cálculo de nómina.', {
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
  dbClient = null,
}) {
  const executor = dbClient || db;
  const result = await executor.query(`
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
  const inicioMes = new Date(Date.UTC(anio, mes - 1, 1));
  const finMes = new Date(Date.UTC(anio, mes, 0));
  const ingreso = new Date(fechaIngreso);

  if (Number.isNaN(ingreso.getTime()) || ingreso > finMes) return 0;
  if (ingreso <= inicioMes) return 30;

  // Nómina ecuatoriana mensual: todos los meses se prorratean sobre una base de 30 días.
  const diaNormalizado = Math.min(30, ingreso.getUTCDate());
  return Math.max(0, 30 - diaNormalizado + 1);
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

function metadataAllowsSbuException(metadata = {}) {
  const source = typeof metadata === 'object' && metadata !== null ? metadata : {};
  return source.sbuExceptionApproved === true
    || source.excepcionSbuAprobada === true
    || source.legalMinimumWageException === true;
}

function assertEmployeeMeetsUnifiedBaseSalary(emp = {}, payrollParameters = {}, context = {}) {
  const tipoContrato = String(emp.tipo_contrato || '').trim().toLowerCase();
  if (tipoContrato === 'hora') return true;

  const salary = Number.parseFloat(emp.sueldo_bruto_mensual || 0);
  const unifiedBaseSalary = Number.parseFloat(payrollParameters.unifiedBaseSalary || 0);
  const metadata = typeof emp.metadata === 'string' ? safeJson(emp.metadata) : (emp.metadata || {});

  if (!Number.isFinite(unifiedBaseSalary) || unifiedBaseSalary <= 0) {
    throw new AppError('El SBU vigente no está configurado para calcular nómina.', {
      code: 'NOMINA_SBU_NO_CONFIGURADO',
      statusCode: 422,
      details: { anio: context.anio, mes: context.mes },
    });
  }

  if (Number.isFinite(salary) && salary >= unifiedBaseSalary) return true;
  if (metadataAllowsSbuException(metadata)) return true;

  throw new AppError('El sueldo base del empleado es menor al SBU vigente configurado.', {
    code: 'NOMINA_SUELDO_MENOR_SBU',
    statusCode: 422,
    details: {
      empleadoId: emp.id || null,
      sueldo: Number.isFinite(salary) ? salary : 0,
      sbuVigente: unifiedBaseSalary,
      anio: context.anio,
      mes: context.mes,
    },
  });
}

function safeJson(value) {
  try {
    return JSON.parse(value);
  } catch (err) {
    return {};
  }
}

function buildPayrollTotalsIntegrity({ totalIngresos = 0, totalDeducciones = 0, netoRecibir = 0 } = {}) {
  const ingresos = roundMoney(Number(totalIngresos || 0));
  const deducciones = roundMoney(Number(totalDeducciones || 0));
  const neto = roundMoney(Number(netoRecibir || 0));
  const netoEsperado = roundMoney(ingresos - deducciones);
  const diferencia = roundMoney(neto - netoEsperado);

  return {
    totalIngresos: ingresos,
    totalDeducciones: deducciones,
    netoRecibir: neto,
    netoEsperado,
    diferencia,
    balanced: Math.abs(diferencia) <= 0.01,
  };
}

function assertPayrollTotalsIntegrity(totals = {}, context = {}) {
  const integrity = buildPayrollTotalsIntegrity(totals);
  if (!integrity.balanced) {
    throw new AppError('El neto calculado no coincide con ingresos menos deducciones.', {
      code: 'NOMINA_TOTALES_DESCUADRADOS',
      statusCode: 422,
      details: {
        ...integrity,
        empleadoId: context.empleadoId || null,
        anio: context.anio,
        mes: context.mes,
      },
    });
  }
  return integrity;
}

function normalizeBenefitModality(value) {
  const mode = String(value || 'acumulado').trim().toLowerCase();
  return mode === 'mensual' ? 'mensual' : 'acumulado';
}

function calcularDecimoTerceroMensual(emp = {}, provisionDecimoTercero) {
  const modalidad = normalizeBenefitModality(emp.modalidad_decimo_tercero);
  if (modalidad === 'mensual' && provisionDecimoTercero > 0) {
    return { modalidad, montoPagadoEmpleado: provisionDecimoTercero };
  }
  return { modalidad, montoPagadoEmpleado: 0 };
}

function calcularDecimoCuartoMensual(emp = {}, provisionDecimoCuarto) {
  const modalidad = normalizeBenefitModality(emp.modalidad_decimo_cuarto);
  if (modalidad === 'mensual' && provisionDecimoCuarto > 0) {
    return { modalidad, montoPagadoEmpleado: provisionDecimoCuarto };
  }
  return { modalidad, montoPagadoEmpleado: 0 };
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
  calcularNominaEmpleado,
  calcularEmpleado,
  calcularDiasTrabajados,
  calcularProvisionFondosReserva,
  calcularFondoReserva,
  calcularDecimoTerceroMensual,
  calcularDecimoCuartoMensual,
  normalizeBenefitModality,
  normalizeReserveFundMode,
  calcularValorHora,
  resolveOvertimeParameters,
  getEmployeeMonthlyHours,
  calcularIR,
  resolveFourteenthSalaryRegion,
  normalizeIessRelationType,
  resolveIessApplicability,
  resolveThirteenthSalaryPeriod,
  resolveFourteenthSalaryPeriod,
  assertWeeklyOvertimeLimit,
  assertEmployeeMeetsUnifiedBaseSalary,
  buildPayrollTotalsIntegrity,
  assertPayrollTotalsIntegrity,
};
