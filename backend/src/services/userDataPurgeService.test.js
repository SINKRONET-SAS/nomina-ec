jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('./auditService', () => ({
  recordAudit: jest.fn(),
}));

const db = require('../config/database');
const { recordAudit } = require('./auditService');
const { anonymizeUserData } = require('./userDataPurgeService');

describe('userDataPurgeService', () => {
  beforeEach(() => {
    db.query.mockReset();
    recordAudit.mockReset();
  });

  test('bloquea anonimizacion del unico owner activo', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'user-1',
          tenant_id: 'tenant-1',
          email: 'owner@example.com',
          rol: 'owner',
          nombres: 'Owner',
          apellidos: 'Demo',
          activo: true,
        }],
      })
      .mockResolvedValueOnce({ rows: [{ total: 1 }] });

    await expect(anonymizeUserData({
      actor: { id: 'super-1', rol: 'superadmin' },
      targetUserId: 'user-1',
      correlationId: 'corr-1',
    })).rejects.toMatchObject({ code: 'LOPDP_OWNER_UNICO_PROTEGIDO' });
  });

  test('anonimiza usuario permitido y audita la accion', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'user-2',
          tenant_id: 'tenant-1',
          email: 'rrhh@example.com',
          rol: 'admin_rrhh',
          nombres: 'Admin',
          apellidos: 'RRHH',
          activo: true,
        }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'user-2',
          tenant_id: 'tenant-1',
          email: 'eliminado+demo@nomina-ec.local',
          rol: 'admin_rrhh',
          nombres: 'ELIMINADO',
          apellidos: 'LOPDP',
          activo: false,
        }],
      });

    const result = await anonymizeUserData({
      actor: { id: 'super-1', rol: 'superadmin' },
      targetUserId: 'user-2',
      correlationId: 'corr-1',
    });

    expect(result.user.activo).toBe(false);
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'lopdp.data.anonymize',
      entityId: 'user-2',
    }));
  });
});
