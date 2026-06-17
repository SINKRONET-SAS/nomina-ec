const {
  calcularDesahucio,
  calcularDiasDecimoTercero,
  calcularFondoReservaLiquidacion,
  calcularIndemnizacionDespidoIntempestivo,
} = require('./liquidacionService');

describe('liquidacionService formulas', () => {
  test('calcula dias de decimo tercero dentro del periodo diciembre a noviembre', () => {
    const ingreso = new Date('2025-07-01T00:00:00');
    const salida = new Date('2026-03-15T00:00:00');

    expect(calcularDiasDecimoTercero(ingreso, salida)).toBe(105);
  });

  test('aplica minimo de tres meses por despido intempestivo hasta tres anios', () => {
    expect(calcularIndemnizacionDespidoIntempestivo(1000, 1.2, 'despido_intempestivo')).toBe(3000);
  });

  test('aplica tope de veinticinco meses en indemnizacion por despido intempestivo', () => {
    expect(calcularIndemnizacionDespidoIntempestivo(1000, 31, 'despido_intempestivo')).toBe(25000);
  });

  test('calcula desahucio solo para causas aplicables', () => {
    expect(calcularDesahucio(1000, 4.8, 'renuncia_voluntaria')).toBe(1000);
    expect(calcularDesahucio(1000, 4.8, 'mutuo_acuerdo')).toBe(0);
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
});
