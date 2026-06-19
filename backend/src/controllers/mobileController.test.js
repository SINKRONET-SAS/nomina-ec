jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../services/marcacionValidator', () => ({
  validarMarcacion: jest.fn(),
}));

jest.mock('../services/employeeAppInviteService', () => ({
  resolveAttendanceReadiness: jest.fn(),
  resolveLinkedEmployee: jest.fn(),
}));

const db = require('../config/database');
const { validarMarcacion } = require('../services/marcacionValidator');
const {
  resolveAttendanceReadiness,
  resolveLinkedEmployee,
} = require('../services/employeeAppInviteService');
const { registrarMarcacionMovil, resolveEmployee } = require('./mobileController');

function mockResponse() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

const reqBase = {
  tenantId: 'tenant-1',
  usuario: { email: 'empleado.demo@nomina-ec.local', rol: 'empleado' },
  usuarioId: 'user-1',
  correlationId: 'corr-1',
  ip: '127.0.0.1',
};

describe('mobileController', () => {
  beforeEach(() => {
    db.query.mockReset();
    validarMarcacion.mockReset();
    resolveAttendanceReadiness.mockReset();
    resolveLinkedEmployee.mockReset();
  });

  test('resolveEmployee vincula usuario por employee_app_links', async () => {
    resolveLinkedEmployee.mockResolvedValueOnce({
      employee: { id: 'emp-1', email_personal: 'empleado.demo@nomina-ec.local' },
      linkSource: 'employee_app_link',
    });
    resolveAttendanceReadiness.mockResolvedValueOnce({
      readiness: {
        ready: true,
        blockers: [],
        workZone: {
          id: 'zone-1',
          code: 'MATRIZ',
          name: 'Oficina matriz',
          radiusMeters: 100,
          minAccuracyMeters: 50,
        },
        organizationUnit: {
          id: 'ou-1',
          code: 'ADM',
          name: 'Administracion',
          type: 'departamento',
        },
        workShift: {
          id: 'shift-1',
          code: 'JORNADA',
          name: 'Jornada base',
          startTime: '08:00',
          endTime: '17:00',
          toleranceMinutes: 10,
        },
      },
    });

    const employee = await resolveEmployee(reqBase);

    expect(employee.id).toBe('emp-1');
    expect(employee.app_link_source).toBe('employee_app_link');
    expect(employee.zona_marcacion).toEqual({
      id: 'zone-1',
      codigo: 'MATRIZ',
      nombre: 'Oficina matriz',
      radio_metros: 100,
      precision_minima_metros: 50,
    });
    expect(resolveLinkedEmployee).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      userId: 'user-1',
      requireExplicitLink: true,
    }));
  });

  test('registrarMarcacionMovil usa empleado resuelto, no userId', async () => {
    resolveLinkedEmployee.mockResolvedValueOnce({
      employee: { id: 'emp-1', email_personal: 'empleado.demo@nomina-ec.local' },
      linkSource: 'employee_app_link',
    });
    resolveAttendanceReadiness.mockResolvedValueOnce({
      readiness: {
        ready: true,
        blockers: [],
        workZone: null,
        organizationUnit: null,
        workShift: null,
      },
    });
    validarMarcacion.mockResolvedValueOnce({ id: 'mark-1', empleado_id: 'emp-1' });
    const req = {
      ...reqBase,
      body: { tipo: 'inicio_jornada', lat: -0.18, lng: -78.48, accuracy: 15 },
    };
    const res = mockResponse();

    await registrarMarcacionMovil(req, res);

    expect(validarMarcacion).toHaveBeenCalledWith(expect.objectContaining({
      empleadoId: 'emp-1',
      userId: 'user-1',
      accuracy: 15,
      source: 'mobile',
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
