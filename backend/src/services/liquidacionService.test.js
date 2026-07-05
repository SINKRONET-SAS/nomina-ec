const {
  calcularDesahucio,
  calcularDiasDecimoTercero,
  calcularFondoReservaLiquidacion,
  calcularDiasVacacionesPendientes,
  calcularDiasPendientesMes,
  calcularIndemnizacionDespidoIntempestivo,
} = require('./liquidacionService');

describe('liquidacionService formulas', () => {
  test('calcula dias de decimo tercero dentro del periodo diciembre a noviembre', () => {
    const ingreso = new Date('2025-07-01T00:00:00');
    const salida = new Date('2026-03-15T00:00:00');

    expect(calcularDiasDecimoTercero(ingreso, salida)).toBe(105);
  });

  test('aplica mínimo de tres meses por despido intempestivo hasta tres años', () => {
    expect(calcularIndemnizacionDespidoIntempestivo(1000, 1.2, 'despido_intempestivo')).toBe(3000);
  });

  test('aplica tope de veinticinco meses en indemnizacion por despido intempestivo', () => {
    expect(calcularIndemnizacionDespidoIntempestivo(1000, 31, 'despido_intempestivo')).toBe(25000);
  });

  test('calcula desahucio solo para causas aplicables', () => {
    expect(calcularDesahucio(1000, 4.8, 'renuncia_voluntaria')).toBe(1000);
    expect(calcularDesahucio(1000, 4.8, 'mutuo_acuerdo')).toBe(0);
  });

  test('calcula vacaciones base sin adicional hasta cinco años completos', () => {
    const result = calcularDiasVacacionesPendientes(
      new Date('2021-01-01T00:00:00'),
      new Date('2025-12-31T00:00:00'),
      { vacationDaysPerYear: 15, vacationAdditionalAfterYears: 5, vacationAdditionalDaysPerYear: 1 }
    );

    expect(result.additionalDays).toBe(0);
    expect(Math.round(result.totalDays)).toBe(75);
  });

  test('aplica un dia adicional de vacaciones desde el sexto anio', () => {
    const result = calcularDiasVacacionesPendientes(
      new Date('2020-01-01T00:00:00'),
      new Date('2025-12-31T00:00:00'),
      { vacationDaysPerYear: 15, vacationAdditionalAfterYears: 5, vacationAdditionalDaysPerYear: 1 }
    );

    expect(result.additionalDays).toBe(1);
    expect(Math.round(result.totalDays)).toBe(91);
  });

  test('acumula dias adicionales de vacaciones despues del quinto anio', () => {
    const result = calcularDiasVacacionesPendientes(
      new Date('2016-01-01T00:00:00'),
      new Date('2025-12-31T00:00:00'),
      { vacationDaysPerYear: 15, vacationAdditionalAfterYears: 5, vacationAdditionalDaysPerYear: 1 }
    );

    expect(result.additionalDays).toBe(5);
    expect(Math.round(result.totalDays)).toBe(155);
  });

  test('calcula fondo de reserva proporcional luego del primer anio', () => {
    const value = calcularFondoReservaLiquidacion(
      new Date('2024-01-01T00:00:00'),
      new Date('2026-06-30T00:00:00'),
      1200,
      { reserveFundStartsAfterMonths: 12, reserveFundRate: 1 / 12 }
    );

    expect(value).toBeGreaterThan(0);
  });

  test('limita sueldo pendiente a maximo treinta dias en meses de treinta y un dias', () => {
    expect(calcularDiasPendientesMes(new Date('2026-01-31T00:00:00'))).toBe(30);
    expect(calcularDiasPendientesMes(new Date('2026-01-30T00:00:00'))).toBe(30);
    expect(calcularDiasPendientesMes(new Date('2026-02-28T00:00:00'))).toBe(28);
  });
});
