jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('./auditService', () => ({
  recordAudit: jest.fn(),
}));

const db = require('../config/database');
const { recordAudit } = require('./auditService');
const {
  ONBOARDING_STEPS,
  RESOURCE_CONFIG,
  createResource,
  deleteResource,
} = require('./configurationService');

const ownerUser = {
  id: 'user-1',
  tenantId: '11111111-1111-1111-1111-111111111111',
  rol: 'owner',
};

describe('configurationService metadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('define recursos obligatorios de parametrizacion', () => {
    expect(Object.keys(RESOURCE_CONFIG)).toEqual(expect.arrayContaining([
      'legalParameters',
      'noveltyTypes',
      'organizationUnits',
      'jobPositions',
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
      'cargos',
      'jornadas',
      'zonas',
      'novedades',
      'bancos',
      'usuarios',
    ]);
  });

  test('deleteResource elimina parametros legales sin consumo operativo', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: '22222222-2222-2222-2222-222222222222',
          tenant_id: ownerUser.tenantId,
          period_year: 2026,
          parameter_key: 'sbu',
        }],
      })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] })
      .mockResolvedValueOnce({ rows: [] });
    recordAudit.mockResolvedValueOnce();

    const result = await deleteResource('legalParameters', '22222222-2222-2222-2222-222222222222', ownerUser, {
      correlationId: 'test-corr',
    });

    expect(result).toEqual({
      deleted: true,
      resource: 'legalParameters',
      id: '22222222-2222-2222-2222-222222222222',
    });
    expect(db.query.mock.calls[2][0]).toContain('DELETE FROM legal_parameter_versions');
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'configuracion.eliminar',
      entity: 'legal_parameter_versions',
    }));
  });

  test('createResource crea cargo con rango salarial y unidad activa', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: '44444444-4444-4444-4444-444444444444',
          code: 'RRHH',
          status: 'activo',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: '55555555-5555-5555-5555-555555555555',
          tenant_id: ownerUser.tenantId,
          organization_unit_id: '44444444-4444-4444-4444-444444444444',
          code: 'ANALISTA_RRHH',
          name: 'Analista RRHH',
          salary_min: '700.00',
          salary_max: '1200.00',
          status: 'activo',
        }],
      });
    recordAudit.mockResolvedValueOnce();

    const result = await createResource('jobPositions', {
      organizationUnitCode: 'rrhh',
      code: 'analista_rrhh',
      name: 'Analista RRHH',
      salaryMin: '700',
      salaryMax: '1200',
    }, ownerUser);

    expect(result).toMatchObject({
      id: '55555555-5555-5555-5555-555555555555',
      code: 'ANALISTA_RRHH',
      organization_unit_id: '44444444-4444-4444-4444-444444444444',
    });
    expect(db.query.mock.calls[1][0]).toContain('INSERT INTO job_positions');
    expect(db.query.mock.calls[1][1]).toEqual(expect.arrayContaining([
      '44444444-4444-4444-4444-444444444444',
      'ANALISTA_RRHH',
      700,
      1200,
      ownerUser.tenantId,
    ]));
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'configuracion.crear',
      entity: 'job_positions',
    }));
  });

  test('deleteResource bloquea cargo con empleados asociados', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: '55555555-5555-5555-5555-555555555555',
          tenant_id: ownerUser.tenantId,
          code: 'ANALISTA_RRHH',
          name: 'Analista RRHH',
        }],
      })
      .mockResolvedValueOnce({ rows: [{ count: 2 }] })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] });

    await expect(
      deleteResource('jobPositions', '55555555-5555-5555-5555-555555555555', ownerUser)
    ).rejects.toMatchObject({
      code: 'CONFIG_RESOURCE_IN_USE',
      statusCode: 409,
      details: {
        table: 'job_positions',
        usages: [{ label: 'empleados', count: 2 }],
      },
    });
    expect(recordAudit).not.toHaveBeenCalled();
  });

  test('deleteResource bloquea zona de marcacion con consumos', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: '33333333-3333-3333-3333-333333333333',
          tenant_id: ownerUser.tenantId,
          code: 'MATRIZ',
        }],
      })
      .mockResolvedValueOnce({ rows: [{ count: 1 }] })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] });

    await expect(
      deleteResource('workZones', '33333333-3333-3333-3333-333333333333', ownerUser)
    ).rejects.toMatchObject({
      code: 'CONFIG_RESOURCE_IN_USE',
      statusCode: 409,
      details: {
        table: 'work_zones',
        usages: [{ label: 'organization_units', count: 1 }],
      },
    });
    expect(recordAudit).not.toHaveBeenCalled();
  });
});
