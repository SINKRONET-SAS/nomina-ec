jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('./auditService', () => ({
  recordAudit: jest.fn(),
}));

const db = require('../config/database');
const { recordAudit } = require('./auditService');
const {
  createIncident,
  normalizeIncidentPayload,
  updateIncidentStatus,
} = require('./superadminService');

describe('superadminService', () => {
  beforeEach(() => {
    db.query.mockReset();
    recordAudit.mockReset();
  });

  test('normalizeIncidentPayload valida severidad y estado', () => {
    expect(normalizeIncidentPayload({ title: 'Caso demo', severity: 'alta', status: 'abierta' }))
      .toMatchObject({ title: 'Caso demo', severity: 'alta', status: 'abierta' });
    expect(() => normalizeIncidentPayload({ title: 'Caso demo', severity: 'urgente' })).toThrow('Severidad invalida');
  });

  test('createIncident inserta y audita incidencia', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 'inc-1',
        tenant_id: 'tenant-1',
        title: 'Contrato pendiente',
        description: '',
        severity: 'media',
        status: 'abierta',
        created_at: '2026-06-16T00:00:00.000Z',
        updated_at: '2026-06-16T00:00:00.000Z',
        closed_at: null,
      }],
    });

    const result = await createIncident({
      payload: { tenantId: 'tenant-1', title: 'Contrato pendiente' },
      userId: 'user-1',
      correlationId: 'corr-1',
      ipAddress: '127.0.0.1',
    });

    expect(result.id).toBe('inc-1');
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'superadmin.incident.create',
      entityId: 'inc-1',
    }));
  });

  test('updateIncidentStatus cierra incidencia', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 'inc-1',
        tenant_id: 'tenant-1',
        title: 'Contrato pendiente',
        description: '',
        severity: 'media',
        status: 'cerrada',
        created_at: '2026-06-16T00:00:00.000Z',
        updated_at: '2026-06-16T00:00:00.000Z',
        closed_at: '2026-06-16T00:00:00.000Z',
      }],
    });

    const result = await updateIncidentStatus({
      id: 'inc-1',
      status: 'cerrada',
      userId: 'user-1',
      correlationId: 'corr-1',
      ipAddress: '127.0.0.1',
    });

    expect(result.status).toBe('cerrada');
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'superadmin.incident.status',
    }));
  });
});
