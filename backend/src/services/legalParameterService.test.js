const { getLegalParameters } = require('../config/legal-ecuador');
const { detectLegalParameterDivergence, mergeVersionedParameters } = require('./legalParameterService');

describe('parametros legales Ecuador AIV50', () => {
  test('mantiene tasas IESS configuradas con fuente pendiente de validacion', () => {
    const legal = getLegalParameters(2026);
    expect(legal.payroll.personalIessRate).toBeCloseTo(0.0945, 4);
    expect(legal.payroll.employerIessRate).toBeCloseTo(0.1115, 4);
    expect(legal.sourceStatus).toBe('pendiente_validacion_oficial');
    expect(legal.validatedFields).toEqual(expect.arrayContaining([
      'incomeTax',
      'payroll.unifiedBaseSalary',
      'payroll.personalIessRate',
      'payroll.employerIessRate',
    ]));
    expect(legal.pendingValidation).toEqual(expect.arrayContaining([
      'payroll.reserveFundStartsAfterMonths',
    ]));
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
});
