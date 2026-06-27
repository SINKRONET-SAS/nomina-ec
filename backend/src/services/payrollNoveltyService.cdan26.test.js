const {
  calculateNoveltyImpacts,
  defaultConfigForCode,
} = require('./payrollNoveltyService');

describe('payrollNoveltyService CDAN26', () => {
  test('expresa novedades por tiempo en horas redondeadas a dos decimales', () => {
    const result = calculateNoveltyImpacts([{
      id: 'nov-1',
      tipo_novedad: 'hora_extra_50',
      fecha: '2026-06-30',
      minutos: 125,
      monto: 0,
    }], [defaultConfigForCode('hora_extra_50')], {
      valorHora: 10,
      dailyMaxHours: 8,
    });

    expect(result.lines[0].minutes).toBe(125);
    expect(result.lines[0].hours).toBe(2.08);
    expect(result.minutesByConcept.horas_extra_50).toBe(125);
  });
});
