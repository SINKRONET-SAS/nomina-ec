jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

const db = require('../config/database');
const { calcularDistanciaHaversine, generarNovedadTardia, validateFotoBase64 } = require('./marcacionValidator');

describe('marcacionValidator', () => {
  beforeEach(() => {
    db.query.mockReset();
  });

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

  test('evalua atraso usando solo marcaciones del tenant actual', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{
          configuracion: {
            horario_laboral: { inicio: '08:00' },
            tolerancia_minutos_tardia: 5,
          },
        }],
      })
      .mockResolvedValueOnce({ rows: [{ timestamp: '2026-06-01T07:55:00.000Z' }] });

    await generarNovedadTardia('emp-1', 'tenant-1', 'corr-1', 'user-1');

    expect(db.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('tenant_id = $2'),
      ['emp-1', 'tenant-1']
    );
  });
});
