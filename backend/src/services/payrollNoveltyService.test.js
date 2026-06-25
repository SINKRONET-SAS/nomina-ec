const {
  calculateNoveltyImpacts,
  normalizeConfig,
  weekKeyFromDate,
} = require('./payrollNoveltyService');

describe('payrollNoveltyService', () => {
  test('agrupa horas extra aprobadas por semana de la novedad', () => {
    const configs = [
      normalizeConfig({
        code: 'hora_extra_50',
        name: 'Hora extra 50%',
        payrollImpact: 'ingreso',
        applicability: { calculationMode: 'minutes_hourly_1_5' },
        affects_iess: true,
      }),
      normalizeConfig({
        code: 'hora_extra_100',
        name: 'Hora extra 100%',
        payrollImpact: 'ingreso',
        applicability: { calculationMode: 'minutes_hourly_2' },
        affects_iess: true,
      }),
    ];

    const result = calculateNoveltyImpacts([
      { id: 'n1', tipo_novedad: 'hora_extra_50', fecha: '2026-06-22', minutos: 300 },
      { id: 'n2', tipo_novedad: 'hora_extra_100', fecha: '2026-06-27', minutos: 180 },
      { id: 'n3', tipo_novedad: 'hora_extra_50', fecha: '2026-06-29', minutos: 60 },
    ], configs, { valorHora: 5, dailyMaxHours: 8 });

    expect(weekKeyFromDate('2026-06-27')).toBe('2026-06-22');
    expect(result.weeklyOvertimeMinutes).toEqual({
      '2026-06-22': 480,
      '2026-06-29': 60,
    });
    expect(result.lines[0].metadata.overtimeWeekKey).toBe('2026-06-22');
  });
});
