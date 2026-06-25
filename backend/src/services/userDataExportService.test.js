jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('./auditService', () => ({
  recordAudit: jest.fn(),
}));

const db = require('../config/database');
const { recordAudit } = require('./auditService');
const { exportUserData } = require('./userDataExportService');

describe('userDataExportService', () => {
  beforeEach(() => {
    db.query.mockReset();
    recordAudit.mockReset();
  });

  test('exporta datos del propio usuario y registra auditoria LOPDP', async () => {
    db.query.mockImplementation((sql) => {
      const text = String(sql);
      if (text.includes('FROM usuarios')) {
        return Promise.resolve({
          rows: [{
            id: 'user-1',
            tenant_id: 'tenant-1',
            email: 'persona@example.com',
            rol: 'owner',
            nombres: 'Persona',
            apellidos: 'Demo',
            activo: true,
            email_verificado_en: null,
            ultimo_acceso: null,
            created_at: '2026-06-25T00:00:00.000Z',
            updated_at: '2026-06-25T00:00:00.000Z',
          }],
        });
      }
      if (text.includes('FROM tenants')) {
        return Promise.resolve({ rows: [{ id: 'tenant-1', razon_social: 'Demo' }] });
      }
      return Promise.resolve({ rows: [] });
    });

    const payload = await exportUserData({
      actor: { id: 'user-1', tenantId: 'tenant-1', rol: 'owner' },
      targetUserId: 'user-1',
      correlationId: 'corr-1',
    });

    expect(payload.usuario.email).toBe('persona@example.com');
    expect(payload.consentimientos.some((item) => item.scope === 'payroll_labor_processing')).toBe(true);
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'lopdp.data.export',
      entityId: 'user-1',
    }));
  });
});
