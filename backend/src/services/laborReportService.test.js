const {
  buildLaborReportRows,
  getLaborReportColumns,
  isLaborReportCode,
} = require('./laborReportService');

function payrollRow(overrides = {}) {
  return {
    empleado_id: 'employee-1',
    cedula: '0102030405',
    nombres: 'Ana',
    apellidos: 'Demo',
    departamento: 'RRHH',
    cargo: 'Analista',
    cargo_codigo: 'AN-01',
    unidad_nombre: 'Talento Humano',
    centro_costo: 'CC-01',
    cargas_familiares: 2,
    dias_trabajados: 30,
    sueldo_bruto: 1000,
    total_ingresos: 1000,
    detalle_calculo: {
      provisionDecimoTercero: 83.33,
      decimoTerceroMensualizado: 0,
      decimoTerceroModalidad: 'acumulado',
      provisionDecimoCuarto: 40.17,
      decimoCuartoMensualizado: 0,
      decimoCuartoModalidad: 'acumulado',
      provisionFondosReserva: 83.33,
      provisionVacaciones: 41.67,
      fondoReservaPagadoEmpleado: 0,
    },
    ...overrides,
  };
}

describe('laborReportService', () => {
  test('expone los cinco reportes laborales del Ecuador', () => {
    expect(isLaborReportCode('LABORAL_DECIMO_TERCERO')).toBe(true);
    expect(isLaborReportCode('PAYROLL_SUMMARY')).toBe(false);
    expect(getLaborReportColumns('LABORAL_BENEFICIOS_ACUMULADOS')).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'decimoTerceroProvision' }),
      expect.objectContaining({ key: 'decimoTerceroPagoRol' }),
      expect.objectContaining({ key: 'momentoProvision' }),
    ]));
  });

  test('distingue provisión mensual y pago en rol para décimo tercero', () => {
    const rows = buildLaborReportRows([
      payrollRow({ detalle_calculo: {
        provisionDecimoTercero: 83.33,
        decimoTerceroMensualizado: 83.33,
        decimoTerceroModalidad: 'mensual',
      } }),
    ], 'LABORAL_DECIMO_TERCERO', 2026);
    expect(rows[0]).toEqual(expect.objectContaining({
      provisionMensual: 83.33,
      pagadoEnRol: 83.33,
      momentoProvision: 'provision_mensual',
      momentoPago: 'pago_rol',
    }));
  });

  test('distribuye utilidades con 10% por días y 5% por cargas', () => {
    const rows = buildLaborReportRows([
      payrollRow(),
      payrollRow({ empleado_id: 'employee-2', cedula: '0102030406', nombres: 'Luis', cargas_familiares: 0 }),
    ], 'LABORAL_PARTICIPACION_UTILIDADES', 2026, { utilidadLiquida: 10000 });
    expect(rows[0].poolParticipacion).toBe(1500);
    expect(rows[0].participacionTotal).toBeGreaterThan(rows[1].participacionTotal);
    expect(rows[0].participacion10 + rows[1].participacion10).toBe(1000);
    expect(rows[0].participacion5).toBe(500);
    expect(rows[0].participacionTotal + rows[1].participacionTotal).toBe(1500);
  });

  test('exige parámetros para salario digno y prorratea fondo insuficiente', () => {
    expect(() => buildLaborReportRows([payrollRow()], 'LABORAL_SALARIO_DIGNO', 2026, {})).toThrow('salario digno mensual oficial');
    const rows = buildLaborReportRows([payrollRow()], 'LABORAL_SALARIO_DIGNO', 2026, {
      salarioDignoMensual: 2000,
      utilidadCompensacion: 10,
    });
    expect(rows[0].factorProrrateo).toBeLessThan(1);
    expect(rows[0].estadoSalarioDigno).toBe('fondo_insuficiente');
  });
});
