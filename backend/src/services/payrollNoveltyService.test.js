const {
  calculateNoveltyImpacts,
  defaultConfigForCode,
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
      {
        id: 'n2',
        tipo_novedad: 'hora_extra_100',
        fecha: '2026-06-27',
        minutos: 180,
        metadata: {
          overtimeLimitException: {
            approved: true,
            approvedBy: 'user-1',
            reason: 'Cierre operativo autorizado',
            limitHours: 12,
            approvedVia: 'novedad.individual',
          },
        },
      },
      { id: 'n3', tipo_novedad: 'hora_extra_50', fecha: '2026-06-29', minutos: 60 },
    ], configs, { valorHora: 5, dailyMaxHours: 8 });

    expect(weekKeyFromDate('2026-06-27')).toBe('2026-06-22');
    expect(result.weeklyOvertimeMinutes).toEqual({
      '2026-06-22': 480,
      '2026-06-29': 60,
    });
    expect(result.weeklyOvertimeExceptionMinutes).toEqual({
      '2026-06-22': 180,
    });
    expect(result.lines[0].metadata.overtimeWeekKey).toBe('2026-06-22');
    expect(result.lines[1].metadata.overtimeLimitException).toMatchObject({
      approved: true,
      approvedBy: 'user-1',
      approvedVia: 'novedad.individual',
    });
  });

  test('calcula hora extra nocturna como extraordinaria y la agrupa para limite semanal', () => {
    const result = calculateNoveltyImpacts([
      { id: 'n4', tipo_novedad: 'hora_extra_nocturna', fecha: '2026-06-22', minutos: 120 },
    ], [defaultConfigForCode('hora_extra_nocturna')], {
      valorHora: 2,
      dailyMaxHours: 8,
      overtimeExtraordinaryMultiplier: 2,
    });

    expect(result.amountByConcept.horas_extra_nocturna).toBe(8);
    expect(result.minutesByConcept.horas_extra_nocturna).toBe(120);
    expect(result.weeklyOvertimeMinutes).toEqual({ '2026-06-22': 120 });
    expect(result.lines[0]).toMatchObject({
      code: 'hora_extra_nocturna',
      conceptCode: 'horas_extra_nocturna',
      hours: 2,
    });
  });
});
