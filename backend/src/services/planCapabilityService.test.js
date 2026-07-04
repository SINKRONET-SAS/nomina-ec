jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

const db = require('../config/database');
const { assertCapability, getTenantPlanCapabilities } = require('./planCapabilityService');

describe('planCapabilityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('expone capacidades del plan activo', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 'PRO',
        nombre: 'Pro',
        archivos_bancarios: true,
        reportes_avanzados: false,
        api_access: true,
        app_movil: true,
        rutas_campo: true,
        empleados_max: 50,
        empresas_max: 1,
        usuarios_max: 5,
      }],
    });

    const result = await getTenantPlanCapabilities('tenant-1');

    expect(result.allowed.bankFiles).toBe(true);
    expect(result.allowed.advancedReports).toBe(false);
    expect(result.allowed.apiAccess).toBe(true);
    expect(result.allowed.mobileApp).toBe(true);
    expect(result.allowed.fieldRoutes).toBe(true);
    expect(result.limits.employeesMax).toBe(50);
  });

  test('bloquea capacidad no incluida en el plan', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 'TRIAL',
        nombre: 'Trial',
        archivos_bancarios: false,
        reportes_avanzados: false,
        api_access: false,
        app_movil: false,
        rutas_campo: false,
        empleados_max: 5,
        empresas_max: 1,
        usuarios_max: 2,
      }],
    });

    await expect(assertCapability('tenant-1', 'bankFiles', { userId: 'user-1' }))
      .rejects.toMatchObject({ code: 'PLAN_CAPABILITY_BLOCKED', statusCode: 402 });
  });
});
