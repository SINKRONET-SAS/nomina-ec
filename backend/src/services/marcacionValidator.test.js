const { calcularDistanciaHaversine, validateFotoBase64 } = require('./marcacionValidator');

describe('marcacionValidator', () => {
  test('distancia Haversine es cero para el mismo punto', () => {
    expect(calcularDistanciaHaversine(-0.1807, -78.4678, -0.1807, -78.4678)).toBeCloseTo(0, 5);
  });

  test('distancia Haversine calcula metros positivos', () => {
    expect(calcularDistanciaHaversine(-0.1807, -78.4678, -0.1817, -78.4678)).toBeGreaterThan(100);
  });
  test('acepta foto JPG base64 valida y detecta tipo', () => {
    const tinyJpeg = '/9gA/9k=';
    const result = validateFotoBase64(`data:image/jpeg;base64,${tinyJpeg}`);
    expect(result.contentType).toBe('image/jpeg');
    expect(result.extension).toBe('jpg');
  });

  test('rechaza foto base64 invalida antes de subir a S3', () => {
    expect(() => validateFotoBase64('no-es-base64')).toThrow('formato base64 valido');
  });
});
