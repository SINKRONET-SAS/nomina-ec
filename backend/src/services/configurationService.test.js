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
