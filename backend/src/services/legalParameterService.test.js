const { getLegalParameters } = require('../config/legal-ecuador');
jest.mock('../config/database', () => ({ query: jest.fn() }));
const db = require('../config/database');
const {
  detectLegalParameterDivergence,
  getLegalParametersForTenant,
  mergeVersionedParameters,
} = require('./legalParameterService');

describe('parametros legales Ecuador AIV50', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('mantiene tasas IESS configuradas con validacion parcial documentada', () => {
    const legal = getLegalParameters(2026);
    expect(legal.payroll.personalIessRate).toBeCloseTo(0.0945, 4);
    expect(legal.payroll.employerIessRate).toBeCloseTo(0.1215, 4);
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
        value: { amount: 0.13 },
        validation_status: 'validado_oficial',
      },
    });

    expect(detectLegalParameterDivergence(base, merged, {
      iess_aporte_patronal: { value: { amount: 0.13 } },
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

  test('usa los parámetros versionados validados como fuente de verdad aunque la tabla histórica conserve valores anteriores', async () => {
    const previousRequirement = process.env.REQUIRE_VALIDATED_LEGAL_PARAMETERS;
    process.env.REQUIRE_VALIDATED_LEGAL_PARAMETERS = 'true';
    db.query
      .mockResolvedValueOnce({
        rows: [
          { parameter_key: 'sbu', value: { amount: 482 }, validation_status: 'validado_oficial' },
          { parameter_key: 'iess_aporte_personal', value: { amount: 0.0945 }, validation_status: 'validado_oficial' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{
          fuente: 'pendiente_validacion_oficial',
          salario_basico: 460,
          aporte_personal_pct: 0.0945,
          aporte_patronal_pct: 0.1115,
          gastos_personales_limite: 16302,
          decimo_cuarto_costa_mes: 3,
          decimo_cuarto_sierra_mes: 8,
          jornada_maxima_semanal: 40,
          tabla_impuesto_renta: [],
        }],
      });

    try {
      const result = await getLegalParametersForTenant('11111111-1111-1111-1111-111111111111', 2026);

      expect(result.payroll.unifiedBaseSalary).toBe(482);
      expect(result.sourceStatus).toBe('validado_oficial');
      expect(db.query.mock.calls[0][0]).toContain('tenant_id = $2::uuid');
      expect(db.query.mock.calls[0][0]).toContain('valid_to IS NULL');
      expect(db.query.mock.calls[1][0]).toContain('tenant_id = $2::uuid');
    } finally {
      if (previousRequirement === undefined) delete process.env.REQUIRE_VALIDATED_LEGAL_PARAMETERS;
      else process.env.REQUIRE_VALIDATED_LEGAL_PARAMETERS = previousRequirement;
    }
  });

  test('explica dónde corregir una divergencia cuando los parámetros versionados aún no están validados', async () => {
    const previousRequirement = process.env.REQUIRE_VALIDATED_LEGAL_PARAMETERS;
    process.env.REQUIRE_VALIDATED_LEGAL_PARAMETERS = 'true';
    db.query
      .mockResolvedValueOnce({
        rows: [{ parameter_key: 'sbu', value: { amount: 482 }, validation_status: 'pendiente_validacion_oficial' }],
      })
      .mockResolvedValueOnce({
        rows: [{
          fuente: 'pendiente_validacion_oficial',
          salario_basico: 460,
          aporte_personal_pct: 0.0945,
          aporte_patronal_pct: 0.1115,
          gastos_personales_limite: 16302,
          decimo_cuarto_costa_mes: 3,
          decimo_cuarto_sierra_mes: 8,
          jornada_maxima_semanal: 40,
          tabla_impuesto_renta: [],
        }],
      });

    try {
      await expect(getLegalParametersForTenant('11111111-1111-1111-1111-111111111111', 2026))
        .rejects.toMatchObject({
          code: 'LEGAL_PARAMETERS_DIVERGENCE',
          details: {
            reviewRoute: '/dashboard/configuracion/parametrizacion?seccion=legal',
            reviewSection: 'Valores legales',
          },
          message: expect.stringContaining('Parametrización > Valores legales del año 2026'),
        });
    } finally {
      if (previousRequirement === undefined) delete process.env.REQUIRE_VALIDATED_LEGAL_PARAMETERS;
      else process.env.REQUIRE_VALIDATED_LEGAL_PARAMETERS = previousRequirement;
    }
  });
});
