const {
  calcularDiasTrabajados,
  calcularFondoReserva,
  calcularDecimoTerceroMensual,
  calcularDecimoCuartoMensual,
  calcularIR,
  calcularProvisionFondosReserva,
  calcularValorHora,
  assertWeeklyOvertimeLimit,
  assertEmployeeMeetsUnifiedBaseSalary,
  assertPayrollTotalsIntegrity,
  buildPayrollTotalsIntegrity,
  normalizeIessRelationType,
  resolveOvertimeParameters,
  resolveFourteenthSalaryPeriod,
  resolveFourteenthSalaryRegion,
  resolveIessApplicability,
  resolveThirteenthSalaryPeriod,
} = require('./calculoNominaService');
const { getLegalParameters } = require('../config/legal-ecuador');
const {
  assertLegalParametersReadyForProduction,
  VALIDATED_SOURCE_STATUS,
} = require('./legalParameterService');

describe('calculoNominaService', () => {
  test('calcula dias trabajados proporcionales para ingreso a mitad de mes', () => {
    expect(calcularDiasTrabajados('2026-06-16', 2026, 6)).toBe(15);
  });

  test('normaliza febrero completo a 30 dias de nomina', () => {
    expect(calcularDiasTrabajados('2025-01-15', 2026, 2)).toBe(30);
  });

  test('normaliza a 15 dias un ingreso el dia 16 de un mes de 31 dias', () => {
    expect(calcularDiasTrabajados('2026-07-16', 2026, 7)).toBe(15);
  });

  test('trata el dia 31 como el dia 30 para prorrateo mensual', () => {
    expect(calcularDiasTrabajados('2026-07-31', 2026, 7)).toBe(1);
  });

  test('calcula IR mensual en cero para base anual exenta', () => {
    const legal = getLegalParameters(2026);
    expect(calcularIR(900, legal)).toBe(0);
  });

  test('calcula IR mensual para tramo progresivo', () => {
    const legal = getLegalParameters(2026);
    expect(calcularIR(2000, legal)).toBeGreaterThan(0);
  });

  test('deduce gastos personales anuales hasta el limite configurado para IR', () => {
    const legal = getLegalParameters(2026);
    const withoutExpenses = calcularIR(2000, legal, 0);
    const withExpenses = calcularIR(2000, legal, 10000);

    expect(withExpenses).toBeLessThan(withoutExpenses);
  });

  test('calcula valor hora segun jornada mensual del empleado', () => {
    expect(calcularValorHora({
      sueldo_bruto_mensual: 900,
      jornada_horas_mensuales: 180,
      tipo_contrato: 'indefinido',
    }, { monthlyWorkHours: 240 })).toBe(5);
  });

  test('calcula valor hora desde jornada parametrizada cuando existe codigo de jornada', () => {
    expect(calcularValorHora({
      sueldo_bruto_mensual: 866.67,
      jornada_codigo: 'ORDINARIA_40',
      jornada_weekly_hours: 40,
      jornada_horas_mensuales: 240,
      tipo_contrato: 'indefinido',
    }, { monthlyWorkHours: 240 })).toBeCloseTo(5, 2);
  });

  test('contrato por hora usa sueldo como valor hora', () => {
    expect(calcularValorHora({
      sueldo_bruto_mensual: 12.5,
      tipo_contrato: 'hora',
    }, { monthlyWorkHours: 240 })).toBe(12.5);
  });

  test('no provisiona fondos de reserva antes del primer anio laboral', () => {
    expect(calcularProvisionFondosReserva('2026-02-01', 600, 2026, 6)).toBe(0);
  });

  test('provisiona fondos de reserva despues del primer anio laboral', () => {
    expect(calcularProvisionFondosReserva('2024-01-01', 600, 2026, 6)).toBe(50);
  });

  test('paga fondo de reserva en rol cuando la modalidad es mensual', () => {
    expect(calcularFondoReserva({
      fecha_ingreso: '2024-01-01',
      modalidad_fondo_reserva: 'mensual',
    }, 600, 2026, 6)).toEqual({
      aplica: true,
      modalidad: 'mensual',
      provision: 50,
      montoPagadoEmpleado: 50,
      montoDepositadoIess: 0,
    });
  });

  test('separa fondo de reserva para deposito IESS directo', () => {
    expect(calcularFondoReserva({
      fecha_ingreso: '2024-01-01',
      modalidad_fondo_reserva: 'iess_directo',
    }, 600, 2026, 6)).toEqual({
      aplica: true,
      modalidad: 'iess_directo',
      provision: 50,
      montoPagadoEmpleado: 0,
      montoDepositadoIess: 50,
    });
  });

  test('paga decimo tercero mensualizado cuando modalidad es mensual', () => {
    const result = calcularDecimoTerceroMensual({ modalidad_decimo_tercero: 'mensual' }, 50);
    expect(result).toEqual({ modalidad: 'mensual', montoPagadoEmpleado: 50 });
  });

  test('no paga decimo tercero mensualizado cuando modalidad es acumulado', () => {
    const result = calcularDecimoTerceroMensual({ modalidad_decimo_tercero: 'acumulado' }, 50);
    expect(result).toEqual({ modalidad: 'acumulado', montoPagadoEmpleado: 0 });
  });

  test('paga decimo cuarto mensualizado cuando modalidad es mensual', () => {
    const result = calcularDecimoCuartoMensual({ modalidad_decimo_cuarto: 'mensual' }, 40.17);
    expect(result).toEqual({ modalidad: 'mensual', montoPagadoEmpleado: 40.17 });
  });

  test('no paga decimo cuarto mensualizado cuando modalidad es acumulado', () => {
    const result = calcularDecimoCuartoMensual({}, 40.17);
    expect(result).toEqual({ modalidad: 'acumulado', montoPagadoEmpleado: 0 });
  });

  test('resuelve parametro regional de decimo cuarto desde la ficha del empleado', () => {
    expect(resolveFourteenthSalaryRegion('costa_galapagos')).toEqual({
      regionCode: 'costa_galapagos',
      parameterKey: 'decimo_cuarto_costa_galapagos',
    });
    expect(resolveFourteenthSalaryRegion('sierra_amazonia')).toEqual({
      regionCode: 'sierra_amazonia',
      parameterKey: 'decimo_cuarto_sierra_amazonia',
    });
  });

  test('diferencia aporte IESS por afiliacion y tipo de relacion', () => {
    const payroll = getLegalParameters(2026).payroll;

    expect(resolveIessApplicability({
      iess_afiliado: true,
      iess_tipo_relacion: 'relacion_dependencia',
    }, payroll)).toMatchObject({
      applies: true,
      relationType: 'relacion_dependencia',
      personalRate: payroll.personalIessRate,
      employerRate: payroll.employerIessRate,
    });

    expect(resolveIessApplicability({
      iess_afiliado: false,
      iess_tipo_relacion: 'relacion_dependencia',
    }, payroll)).toMatchObject({
      applies: false,
      personalRate: 0,
      employerRate: 0,
    });

    expect(resolveIessApplicability({
      iess_afiliado: true,
      iess_tipo_relacion: 'servicios_profesionales',
    }, payroll)).toMatchObject({
      applies: false,
      relationType: 'servicios_profesionales',
    });
  });

  test('normaliza tipo IESS desconocido a relacion de dependencia', () => {
    expect(normalizeIessRelationType('otro')).toBe('relacion_dependencia');
    expect(normalizeIessRelationType('pasante')).toBe('pasante');
  });

  test('bloquea horas extra por encima del limite semanal', () => {
    expect(() => assertWeeklyOvertimeLimit({
      '2026-06-22': 721,
    }, { maxWeeklyOvertimeHours: 12 })).toThrow('Las horas extra aprobadas exceden');

    expect(() => assertWeeklyOvertimeLimit({
      '2026-06-22': 720,
    }, { maxWeeklyOvertimeHours: 12 })).not.toThrow();
  });

  test('resuelve parametros visibles de horas extra', () => {
    expect(resolveOvertimeParameters({
      monthlyWorkHours: 200,
      maxWeeklyOvertimeHours: 10,
      overtimeSupplementMultiplier: 1.75,
      overtimeExtraordinaryMultiplier: 2.25,
    })).toMatchObject({
      monthlyWorkHours: 200,
      maxWeeklyOvertimeHours: 10,
      supplementaryMultiplier: 1.75,
      extraordinaryMultiplier: 2.25,
      supplementarySurchargeRate: 0.75,
      extraordinarySurchargeRate: 1.25,
      legalBasis: 'Codigo del Trabajo Art. 55',
    });
  });

  test('expone periodos legales de decimos en el detalle', () => {
    const payroll = getLegalParameters(2026).payroll;

    expect(resolveThirteenthSalaryPeriod(2026, 6, payroll)).toEqual({
      startDate: '2025-12-01',
      endDate: '2026-11-30',
      startMonth: 12,
      endMonth: 11,
    });

    expect(resolveFourteenthSalaryPeriod(2026, 6, 'sierra_amazonia', payroll)).toEqual({
      startDate: '2025-08-01',
      endDate: '2026-07-31',
      startMonth: 8,
      endMonth: 7,
    });

    expect(resolveFourteenthSalaryPeriod(2026, 6, 'costa_galapagos', payroll)).toEqual({
      startDate: '2026-03-01',
      endDate: '2027-02-28',
      startMonth: 3,
      endMonth: 2,
    });
  });

  test('bloquea calculos productivos con parametros legales pendientes', () => {
    const previous = process.env.REQUIRE_VALIDATED_LEGAL_PARAMETERS;
    process.env.REQUIRE_VALIDATED_LEGAL_PARAMETERS = 'true';

    expect(() => assertLegalParametersReadyForProduction(getLegalParameters(2026), {
      year: 2026,
      tenantId: 'tenant-prueba',
      operation: 'calculo_nomina',
    })).toThrow('Los parametros legales del periodo no tienen validacion oficial');

    process.env.REQUIRE_VALIDATED_LEGAL_PARAMETERS = previous;
  });

  test('permite calculos productivos cuando la fuente legal esta validada oficialmente', () => {
    const previous = process.env.REQUIRE_VALIDATED_LEGAL_PARAMETERS;
    process.env.REQUIRE_VALIDATED_LEGAL_PARAMETERS = 'true';
    const legal = { ...getLegalParameters(2026), sourceStatus: VALIDATED_SOURCE_STATUS };

    expect(() => assertLegalParametersReadyForProduction(legal, {
      year: 2026,
      tenantId: 'tenant-prueba',
      operation: 'calculo_nomina',
    })).not.toThrow();

    process.env.REQUIRE_VALIDATED_LEGAL_PARAMETERS = previous;
  });

  test('bloquea empleado con sueldo mensual menor al SBU vigente', () => {
    expect(() => assertEmployeeMeetsUnifiedBaseSalary({
      id: 'emp-1',
      sueldo_bruto_mensual: 400,
      tipo_contrato: 'indefinido',
    }, {
      unifiedBaseSalary: 482,
    }, {
      anio: 2026,
      mes: 6,
    })).toThrow('menor al SBU vigente');
  });

  test('expone integridad de totales de nomina balanceada', () => {
    expect(buildPayrollTotalsIntegrity({
      totalIngresos: 1000,
      totalDeducciones: 125.25,
      netoRecibir: 874.75,
    })).toMatchObject({
      netoEsperado: 874.75,
      diferencia: 0,
      balanced: true,
    });
  });

  test('bloquea nomina si el neto no coincide con ingresos menos deducciones', () => {
    expect(() => assertPayrollTotalsIntegrity({
      totalIngresos: 1000,
      totalDeducciones: 100,
      netoRecibir: 850,
    }, {
      empleadoId: 'emp-1',
      anio: 2026,
      mes: 7,
    })).toThrow('no coincide');
  });
});
