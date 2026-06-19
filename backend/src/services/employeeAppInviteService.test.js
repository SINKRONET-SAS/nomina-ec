process.env.EMPLOYEE_INVITE_SECRET = process.env.EMPLOYEE_INVITE_SECRET || 'test-employee-invite-secret-32-chars';

const {
  buildReadiness,
  hashInviteCode,
  normalizeInviteCode,
} = require('./employeeAppInviteService');

describe('employeeAppInviteService', () => {
  test('normaliza codigos de invitacion sin simbolos ni minusculas', () => {
    expect(normalizeInviteCode(' adm-12 ab ')).toBe('ADM12AB');
  });

  test('hashInviteCode ignora formato visual del codigo', () => {
    expect(hashInviteCode('ADM-12AB')).toBe(hashInviteCode(' adm12ab '));
  });

  test('buildReadiness bloquea asistencia sin email, unidad, zona y jornada', () => {
    const readiness = buildReadiness({
      departamento: '',
      email_personal: '',
      jornada_horas_mensuales: null,
      organization_unit_id: null,
      work_zone_id: null,
      work_shift_id: null,
    }, { requireEmail: true });

    expect(readiness.ready).toBe(false);
    expect(readiness.blockers).toEqual(expect.arrayContaining([
      'email_personal_requerido',
      'departamento_requerido',
      'unidad_organizativa_sin_match',
      'jornada_base_no_configurada',
      'jornada_mensual_empleado_requerida',
    ]));
  });

  test('buildReadiness aprueba empleado con unidad, zona y jornada', () => {
    const readiness = buildReadiness({
      departamento: 'ADM',
      email_personal: 'persona@empresa.com',
      jornada_horas_mensuales: 240,
      organization_unit_id: 'ou-1',
      organization_unit_code: 'ADM',
      organization_unit_name: 'Administracion',
      work_zone_id: 'zone-1',
      work_zone_code: 'MATRIZ',
      work_zone_name: 'Matriz',
      radius_meters: 100,
      min_accuracy_meters: 50,
      work_shift_id: 'shift-1',
      work_shift_code: 'J1',
      work_shift_name: 'Jornada base',
      start_time: '08:00',
      end_time: '17:00',
      tolerance_minutes: 10,
    }, { requireEmail: true });

    expect(readiness.ready).toBe(true);
    expect(readiness.workZone.name).toBe('Matriz');
    expect(readiness.workShift.startTime).toBe('08:00');
  });
});
