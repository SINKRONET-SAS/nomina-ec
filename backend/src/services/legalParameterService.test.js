const { getLegalParameters } = require('../config/legal-ecuador');
const { detectLegalParameterDivergence, mergeVersionedParameters } = require('./legalParameterService');

describe('parametros legales Ecuador AIV50', () => {
  test('mantiene tasas IESS configuradas con validacion parcial documentada', () => {
    const legal = getLegalParameters(2026);
    expect(legal.payroll.personalIessRate).toBeCloseTo(0.0945, 4);
    expect(legal.payroll.employerIessRate).toBeCloseTo(0.1115, 4);
    expect(legal.sourceStatus).toBe('validado');
    expect(legal.validatedFields).toEqual(expect.arrayContaining([
      'incomeTax',
      'payroll.unifiedBaseSalary',
      'payroll.personalIessRate',
      'payroll.employerIessRate',
      'payroll.reserveFundStartsAfterMonths',
    ]));
    expect(legal.pendingValidation).toEqual([]);
  });

  test('detecta divergencia entre tabla legado y parametros versionados', () => {
    const base = getLegalParameters(2026);
    const merged = mergeVersionedParameters(base, {
      iess_aporte_patronal: {
        parameter_key: 'iess_aporte_patronal',
        value: { amount: 0.1215 },
        validation_status: 'validado_oficial',
      },
    });

    expect(detectLegalParameterDivergence(base, merged, {
      iess_aporte_patronal: { value: { amount: 0.1215 } },
    })).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'iess_aporte_patronal' }),
    ]));
  });

  test('corrige jornada mensual versionada desde promedio semanal anualizado', () => {
    const base = getLegalParameters(2026);
    const merged = mergeVersionedParameters(base, {
      jornada_horas_mensuales: {
        parameter_key: 'jornada_horas_mensuales',
        value: { amount: 173.33 },
        validation_status: 'validado_oficial',
      },
    });

    expect(merged.payroll.monthlyWorkHours).toBe(240);
  });
});
