jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../services/marcacionValidator', () => ({
  validarMarcacion: jest.fn(),
}));

jest.mock('../services/routeVisitService', () => ({
  listRouteSites: jest.fn(),
  listRouteDays: jest.fn(),
  createRouteSite: jest.fn(),
  createRouteDay: jest.fn(),
}));

jest.mock('../services/configurationService', () => ({
  listResource: jest.fn(),
  createResource: jest.fn(),
}));

jest.mock('../config/s3', () => ({
  s3Upload: jest.fn(),
  resolveStorageUrl: jest.fn((url) => url),
}));

jest.mock('../services/employeeAppInviteService', () => ({
  resolveAttendanceReadiness: jest.fn(),
  resolveLinkedEmployee: jest.fn(),
}));

jest.mock('../services/auditService', () => ({
  recordAudit: jest.fn(),
}));

jest.mock('../services/employeeHistoryService', () => ({
  getEmployeeHistory: jest.fn(),
}));

jest.mock('../services/monthlyPeriodService', () => ({
  ensurePayrollPeriodForDate: jest.fn(),
}));

jest.mock('../services/payrollNoveltyService', () => ({
  ensureNoveltyTypeAllowed: jest.fn(),
}));

const db = require('../config/database');
const { validarMarcacion } = require('../services/marcacionValidator');
const routeVisitService = require('../services/routeVisitService');
const configurationService = require('../services/configurationService');
const { s3Upload } = require('../config/s3');
const { recordAudit } = require('../services/auditService');
const {
  resolveAttendanceReadiness,
  resolveLinkedEmployee,
} = require('../services/employeeAppInviteService');
const { ensurePayrollPeriodForDate } = require('../services/monthlyPeriodService');
const { ensureNoveltyTypeAllowed } = require('../services/payrollNoveltyService');
const {
  adminRutasResumen,
  asignarRutaMovil,
  crearZonaMarcacionMovil,
  registrarMarcacionMovil,
  resolveEmployee,
  solicitarPermiso,
} = require('./mobileController');

function mockResponse() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

const reqBase = {
  tenantId: 'tenant-1',
  usuario: { email: 'empleado.demo@sknomina.local', rol: 'empleado' },
  usuarioId: 'user-1',
  correlationId: 'corr-1',
  ip: '127.0.0.1',
};

describe('mobileController', () => {
  beforeEach(() => {
    db.query.mockReset();
    validarMarcacion.mockReset();
    routeVisitService.listRouteSites.mockReset();
    routeVisitService.listRouteDays.mockReset();
    routeVisitService.createRouteSite.mockReset();
    routeVisitService.createRouteDay.mockReset();
    configurationService.listResource.mockReset();
    configurationService.createResource.mockReset();
    s3Upload.mockReset();
    resolveAttendanceReadiness.mockReset();
    resolveLinkedEmployee.mockReset();
    recordAudit.mockReset();
    ensurePayrollPeriodForDate.mockReset();
    ensureNoveltyTypeAllowed.mockReset();
  });

  test('resolveEmployee vincula usuario por employee_app_links', async () => {
    resolveLinkedEmployee.mockResolvedValueOnce({
      employee: { id: 'emp-1', email_personal: 'empleado.demo@sknomina.local' },
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
      employee: { id: 'emp-1', email_personal: 'empleado.demo@sknomina.local' },
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

  test('adminRutasResumen devuelve acciones permitidas para ocultar secciones por perfil', async () => {
    configurationService.listResource.mockResolvedValueOnce([{
      id: 'zone-1',
      code: 'MATRIZ',
      name: 'Oficina matriz',
      latitude: -0.18,
      longitude: -78.48,
      radius_meters: 100,
      min_accuracy_meters: 50,
      requires_photo: true,
      allows_offline: false,
      status: 'activo',
    }]);
    routeVisitService.listRouteSites.mockResolvedValueOnce([{ id: 'site-1', code: 'TIA', name: 'Tienda' }]);
    routeVisitService.listRouteDays.mockResolvedValueOnce([{ id: 'route-1', empleadoId: 'emp-1', status: 'planned' }]);
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 'emp-1',
        cedula: '0102030405',
        nombres: 'Ana',
        apellidos: 'Vera',
        cargo: 'Supervisor',
        unidad_organizativa_codigo: 'OPS',
        zona_marcacion_codigo: 'MATRIZ',
      }],
    });
    const req = {
      ...reqBase,
      usuario: { id: 'user-2', email: 'supervisor@sknomina.local', rol: 'supervisor', tenantId: 'tenant-1' },
      query: { fecha: '2026-07-04' },
    };
    const res = mockResponse();

    await adminRutasResumen(req, res);

    expect(configurationService.listResource).toHaveBeenCalledWith('workZones', req.usuario);
    expect(routeVisitService.listRouteSites).toHaveBeenCalledWith({ tenantId: 'tenant-1', status: 'activo' });
    expect(routeVisitService.listRouteDays).toHaveBeenCalledWith({ tenantId: 'tenant-1', fecha: '2026-07-04' });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      allowedActions: {
        createWorkZones: false,
        createRouteSites: false,
        assignRoutes: true,
      },
      employees: [expect.objectContaining({ id: 'emp-1', workZoneCode: 'MATRIZ' })],
      routeSites: [expect.objectContaining({ id: 'site-1' })],
    }));
  });

  test('crearZonaMarcacionMovil reutiliza configuracion workZones y normaliza codigo', async () => {
    configurationService.createResource.mockResolvedValueOnce({
      id: 'zone-1',
      code: 'ZONA_NORTE',
      name: 'Zona norte',
      latitude: -0.18,
      longitude: -78.48,
      radius_meters: 150,
      min_accuracy_meters: 50,
      requires_photo: true,
      allows_offline: false,
      status: 'activo',
    });
    const req = {
      ...reqBase,
      usuario: { id: 'owner-1', email: 'owner@sknomina.local', rol: 'owner', tenantId: 'tenant-1' },
      body: {
        code: 'zona norte',
        name: 'Zona norte',
        latitude: -0.18,
        longitude: -78.48,
        radiusMeters: 150,
      },
    };
    const res = mockResponse();

    await crearZonaMarcacionMovil(req, res);

    expect(configurationService.createResource).toHaveBeenCalledWith(
      'workZones',
      expect.objectContaining({
        code: 'ZONA_NORTE',
        radius_meters: 150,
        rules: expect.objectContaining({ source: 'mobile_admin', createdByRole: 'owner' }),
      }),
      req.usuario,
      expect.objectContaining({ correlationId: 'corr-1' })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      workZone: expect.objectContaining({ id: 'zone-1', radiusMeters: 150 }),
    }));
  });

  test('asignarRutaMovil crea ruta diaria con source mobile y una parada', async () => {
    routeVisitService.createRouteDay.mockResolvedValueOnce({
      id: 'route-1',
      empleadoId: 'emp-1',
      source: 'mobile',
      stops: [{ id: 'stop-1', siteId: 'site-1' }],
    });
    const req = {
      ...reqBase,
      usuario: { id: 'supervisor-1', email: 'supervisor@sknomina.local', rol: 'supervisor', tenantId: 'tenant-1' },
      body: {
        employeeId: 'emp-1',
        siteId: 'site-1',
        fecha: '2026-07-04',
        plannedStartTime: '09:00',
      },
    };
    const res = mockResponse();

    await asignarRutaMovil(req, res);

    expect(routeVisitService.createRouteDay).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      payload: expect.objectContaining({
        empleadoId: 'emp-1',
        fecha: '2026-07-04',
        source: 'mobile',
        stops: [expect.objectContaining({ siteId: 'site-1', plannedStartTime: '09:00' })],
      }),
      context: expect.objectContaining({ source: 'mobile', correlationId: 'corr-1' }),
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('solicitarPermiso crea novedad pendiente sin sueldo desde mobile', async () => {
    resolveLinkedEmployee.mockResolvedValueOnce({
      employee: { id: 'emp-1', email_personal: 'empleado.demo@sknomina.local' },
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
    ensurePayrollPeriodForDate.mockResolvedValueOnce({
      id: 'period-1',
      periodoNomina: '2026-06',
      status: 'open',
    });
    ensureNoveltyTypeAllowed.mockResolvedValueOnce({
      code: 'permiso_sin_sueldo',
      payrollImpact: 'descuento',
    });
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 'nov-1',
        empleado_id: 'emp-1',
        fecha: '2026-06-20',
        tipo_novedad: 'permiso_sin_sueldo',
        minutos: 240,
        estado: 'pendiente',
      }],
    });
    recordAudit.mockResolvedValueOnce(undefined);
    const req = {
      ...reqBase,
      body: {
        fechaInicio: '2026-06-20',
        fechaFin: '2026-06-20',
        remunerado: false,
        minutos: 240,
        motivo: 'Cita medica',
      },
    };
    const res = mockResponse();

    await solicitarPermiso(req, res);

    expect(ensureNoveltyTypeAllowed).toHaveBeenCalledWith(expect.objectContaining({
      tipoNovedad: 'permiso_sin_sueldo',
      anio: 2026,
      mes: 6,
    }));
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO novedades_asistencia'), expect.arrayContaining([
      'emp-1',
      'tenant-1',
      'period-1',
      '2026-06',
      '2026-06-20',
      'permiso_sin_sueldo',
      240,
      '[Solicitud mobile] Cita medica',
    ]));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('solicitarPermiso sube soporte medico y guarda solo metadata documental', async () => {
    resolveLinkedEmployee.mockResolvedValueOnce({
      employee: { id: 'emp-1', email_personal: 'empleado.demo@sknomina.local' },
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
    ensurePayrollPeriodForDate.mockResolvedValueOnce({
      id: 'period-1',
      periodoNomina: '2026-06',
      status: 'open',
    });
    ensureNoveltyTypeAllowed.mockResolvedValueOnce({
      code: 'permiso_con_sueldo',
      payrollImpact: 'informativo',
    });
    s3Upload.mockResolvedValueOnce('https://storage.local/permisos/soporte.jpg');
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 'nov-1',
        empleado_id: 'emp-1',
        fecha: '2026-06-20',
        tipo_novedad: 'permiso_con_sueldo',
        minutos: 480,
        estado: 'pendiente',
        metadata: {
          source: 'mobile_permission_request',
          soporteMedico: {
            fileName: 'soporte.jpg',
            contentType: 'image/jpeg',
            sizeBytes: 7,
            url: 'https://storage.local/permisos/soporte.jpg',
          },
        },
      }],
    });
    recordAudit.mockResolvedValueOnce(undefined);
    const req = {
      ...reqBase,
      body: {
        fechaInicio: '2026-06-20',
        fechaFin: '2026-06-20',
        remunerado: true,
        minutos: 480,
        motivo: 'Cita medica con respaldo',
        soporteMedico: {
          fileName: 'soporte.jpg',
          contentType: 'image/jpeg',
          base64: Buffer.from('archivo').toString('base64'),
        },
      },
    };
    const res = mockResponse();

    await solicitarPermiso(req, res);

    expect(s3Upload).toHaveBeenCalledWith(
      Buffer.from('archivo'),
      expect.stringContaining('permisos/tenant-1/emp-1/2026-06-20/'),
      'image/jpeg'
    );
    const metadata = JSON.parse(db.query.mock.calls[0][1][8]);
    expect(metadata).toMatchObject({
      source: 'mobile_permission_request',
      soporteMedico: {
        fileName: 'soporte.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 7,
        url: 'https://storage.local/permisos/soporte.jpg',
        source: 'mobile',
      },
    });
    expect(JSON.stringify(metadata)).not.toContain(Buffer.from('archivo').toString('base64'));
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      newData: expect.objectContaining({ soporteMedico: true }),
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
