process.env.EMPLOYEE_INVITE_SECRET = process.env.EMPLOYEE_INVITE_SECRET || 'test-employee-invite-secret-32-chars';

jest.mock('../config/database', () => ({
  query: jest.fn(),
  pool: {
    connect: jest.fn(),
  },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('../middleware/auth', () => ({
  generateToken: jest.fn().mockReturnValue('token-test'),
}));

jest.mock('./communicationService', () => ({
  sendEmployeeInvite: jest.fn(),
}));

jest.mock('./privacyConsentService', () => ({
  LOPDP_VERSION: 'LOPDP-2026-06',
  CONSENT_SCOPES: [
    {
      scope: 'privacy_notice',
      defaultActive: true,
      legalBasis: 'consent',
      required: true,
      withdrawable: false,
    },
  ],
}));

const db = require('../config/database');
const bcrypt = require('bcryptjs');

const {
  acceptEmployeeInvitation,
  buildReadiness,
  employeeReadinessSelect,
  hashInviteCode,
  normalizeInviteCode,
} = require('./employeeAppInviteService');

describe('employeeAppInviteService', () => {
  beforeEach(() => {
    db.query.mockReset();
    db.pool.connect.mockReset();
    bcrypt.hash.mockReset();
    bcrypt.compare.mockReset();
  });

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

  test('buildReadiness respeta el control de asistencia definido en la ficha', () => {
    const readiness = buildReadiness({
      controla_asistencia: false,
      departamento: 'OPS',
      email_personal: 'persona@empresa.com',
      organization_unit_id: 'ou-1',
      work_zone_id: 'zone-1',
      work_shift_id: 'shift-1',
      work_shift_weekly_hours: 40,
    }, { requireEmail: true });

    expect(readiness.ready).toBe(false);
    expect(readiness.blockers).toContain('control_asistencia_desactivado');
  });

  test('employeeReadinessSelect resuelve jornada por unidad y evita ambiguedad multi-jornada', () => {
    const sql = employeeReadinessSelect('WHERE e.id = $1');

    expect(sql).toContain("ws.id::text = ou.metadata->>'workShiftId'");
    expect(sql).toContain('ws.weekly_hours AS work_shift_weekly_hours');
    expect(sql).toContain('SELECT COUNT(*)');
    expect(sql).toContain(') = 1');
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
      calendar_rules: {
        workDays: ['monday', 'tuesday'],
        legalNotice: 'Validar autorizacion MDT cuando aplique.',
      },
    }, { requireEmail: true });

    expect(readiness.ready).toBe(true);
    expect(readiness.workZone.name).toBe('Matriz');
    expect(readiness.workShift.startTime).toBe('08:00');
    expect(readiness.workShift.workDays).toEqual(['monday', 'tuesday']);
    expect(readiness.workShift.legalNotice).toContain('MDT');
  });

  test('buildReadiness acepta horas mensuales derivadas de jornada semanal configurada', () => {
    const readiness = buildReadiness({
      departamento: 'OPS',
      email_personal: 'ops@empresa.com',
      jornada_horas_mensuales: null,
      organization_unit_id: 'ou-1',
      work_zone_id: 'zone-1',
      work_shift_id: 'shift-1',
      work_shift_weekly_hours: 40,
    }, { requireEmail: true });

    expect(readiness.ready).toBe(true);
    expect(readiness.blockers).not.toContain('jornada_mensual_empleado_requerida');
  });

  test('acceptEmployeeInvitation reutiliza owner existente y preserva su rol', async () => {
    const client = {
      query: jest.fn(),
      release: jest.fn(),
    };
    db.pool.connect.mockResolvedValue(client);
    bcrypt.compare.mockResolvedValue(true);
    client.query.mockImplementation(async (sql) => {
      const text = String(sql);

      if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') {
        return { rows: [] };
      }

      if (text.includes('FROM employee_app_invites i')) {
        return {
          rows: [{
            id: 'invite-1',
            tenant_id: 'tenant-1',
            empleado_id: 'emp-1',
            cedula: '1712345678',
            nombres: 'Marco',
            apellidos: 'Proano',
            email: 'marco@example.com',
            email_personal: 'marco@example.com',
            activo: true,
          }],
        };
      }

      if (text.includes('FROM empleados e')) {
        return {
          rows: [{
            id: 'emp-1',
            tenant_id: 'tenant-1',
            departamento: 'ADM',
            email_personal: 'marco@example.com',
            organization_unit_id: 'ou-1',
            work_zone_id: 'zone-1',
            work_shift_id: 'shift-1',
            work_shift_weekly_hours: 40,
          }],
        };
      }

      if (text.includes('SELECT * FROM usuarios')) {
        return {
          rows: [{
            id: 'user-owner',
            tenant_id: 'tenant-1',
            email: 'marco@example.com',
            rol: 'owner',
            nombres: 'Marco',
            apellidos: 'Proano',
            password_hash: 'hash-owner',
          }],
        };
      }

      if (text.includes('UPDATE employee_app_links')) {
        return { rows: [] };
      }

      if (text.includes('INSERT INTO employee_app_links')) {
        return {
          rows: [{
            id: 'link-1',
            status: 'ACTIVE',
          }],
        };
      }

      if (
        text.includes('INSERT INTO consent_preferences')
        || text.includes('UPDATE employee_app_invites')
        || text.includes('INSERT INTO audit_logs')
      ) {
        return { rows: [] };
      }

      throw new Error(`Unexpected query in test: ${text}`);
    });

    const result = await acceptEmployeeInvitation({
      inviteCode: 'ADM-12AB',
      email: 'marco@example.com',
      password: 'secreto123',
      acceptedPrivacy: true,
      lopdpConsent: true,
      geolocationConsent: true,
    }, {
      correlationId: 'corr-1',
      ipAddress: '127.0.0.1',
    });

    expect(result.usuario).toMatchObject({
      id: 'user-owner',
      rol: 'owner',
      email: 'marco@example.com',
    });
    expect(result.link).toMatchObject({
      id: 'link-1',
      status: 'ACTIVE',
    });
    expect(bcrypt.compare).toHaveBeenCalledWith('secreto123', 'hash-owner');
    expect(client.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO usuarios'))).toBe(false);
    expect(client.release).toHaveBeenCalled();
  });
});
