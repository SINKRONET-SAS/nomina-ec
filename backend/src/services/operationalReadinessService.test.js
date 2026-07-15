const { buildEmployeeOperationalBlockers } = require('./operationalReadinessService');

describe('operationalReadinessService employee blockers', () => {
  test('no exige configuracion de asistencia cuando el control esta desactivado', () => {
    const blockers = buildEmployeeOperationalBlockers({
      controla_asistencia: false,
      sueldo_bruto_mensual: 900,
      fecha_ingreso: '2026-01-01',
      departamento: '',
      organization_unit_id: null,
      work_zone_id: null,
      work_shift_id: null,
    });

    expect(blockers).toEqual([]);
  });

  test('mantiene validaciones laborales aunque no controle asistencia', () => {
    const blockers = buildEmployeeOperationalBlockers({
      controla_asistencia: false,
      sueldo_bruto_mensual: 0,
      fecha_ingreso: null,
    });

    expect(blockers).toEqual(expect.arrayContaining([
      'sueldo_bruto_requerido',
      'fecha_ingreso_requerida',
    ]));
  });

  test('exige jornada y zona cuando el empleado si controla asistencia', () => {
    const blockers = buildEmployeeOperationalBlockers({
      controla_asistencia: true,
      sueldo_bruto_mensual: 900,
      fecha_ingreso: '2026-01-01',
      departamento: 'Operaciones',
      organization_unit_id: 'ou-1',
      work_zone_id: null,
      work_shift_id: null,
    });

    expect(blockers).toEqual(expect.arrayContaining([
      'unidad_organizativa_sin_zona',
      'jornada_base_no_configurada',
    ]));
  });
});
