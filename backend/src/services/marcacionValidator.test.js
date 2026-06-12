const { calcularDistanciaHaversine } = require('./marcacionValidator');

describe('marcacionValidator', () => {
  test('distancia Haversine es cero para el mismo punto', () => {
    expect(calcularDistanciaHaversine(-0.1807, -78.4678, -0.1807, -78.4678)).toBeCloseTo(0, 5);
  });

  test('distancia Haversine calcula metros positivos', () => {
    expect(calcularDistanciaHaversine(-0.1807, -78.4678, -0.1817, -78.4678)).toBeGreaterThan(100);
  });
});
