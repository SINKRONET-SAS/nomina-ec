const {
  ONBOARDING_STEPS,
  RESOURCE_CONFIG,
} = require('./configurationService');

describe('configurationService metadata', () => {
  test('define recursos obligatorios de parametrizacion', () => {
    expect(Object.keys(RESOURCE_CONFIG)).toEqual(expect.arrayContaining([
      'legalParameters',
      'noveltyTypes',
      'organizationUnits',
      'workZones',
      'workShifts',
      'bankProfiles',
    ]));
  });

  test('define checklist operativo minimo para OWNER', () => {
    expect(ONBOARDING_STEPS.map((step) => step.code)).toEqual([
      'empresa',
      'legal',
      'organizacion',
      'jornadas',
      'zonas',
      'novedades',
      'bancos',
      'usuarios',
    ]);
  });
});
