jest.mock('../config/database', () => ({
  query: jest.fn(),
  runWithTenantContext: jest.fn((_context, callback) => callback()),
}));

jest.mock('./auditService', () => ({
  recordAudit: jest.fn(),
}));

const db = require('../config/database');
const { recordAudit } = require('./auditService');
const {
  assignOwnerPlan,
  createIncident,
  normalizeDirectPlanPayload,
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

  test('normalizeDirectPlanPayload exige fecha pactada para vigencia personalizada', () => {
    expect(() => normalizeDirectPlanPayload(
      '11111111-1111-4111-8111-111111111111',
      { planId: 'PRO', billingPeriod: 'custom' }
    )).toThrow('fecha pactada');
  });

  test('assignOwnerPlan activa upgrade directo y audita suscripcion anterior', async () => {
    const tenantId = '11111111-1111-4111-8111-111111111111';
    const previousSubscription = {
      id: 'sub-old',
      tenant_id: tenantId,
      plan_id: 'MICRO',
      estado: 'active',
      inicio_en: '2026-07-01T00:00:00.000Z',
      vence_en: '2026-08-01T00:00:00.000Z',
      renovacion_automatica: true,
      metadata: { source: 'payment' },
    };
    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: tenantId,
          ruc: '1799999999001',
          razon_social: 'Cliente Demo',
          activo: true,
          owner_user_id: 'owner-1',
          owner_email: 'owner@example.com',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'PRO',
          nombre: 'Pro',
          activo: true,
          metadata: {},
        }],
      })
      .mockResolvedValueOnce({ rows: [previousSubscription] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'sub-new',
          tenant_id: tenantId,
          plan_id: 'PRO',
          estado: 'active',
          inicio_en: '2026-07-11T00:00:00.000Z',
          vence_en: '2099-12-31T23:59:59.999Z',
          renovacion_automatica: false,
          metadata: {
            source: 'superadmin_direct_plan_assignment',
            billingPeriod: 'custom',
            notes: 'Alcance pactado',
          },
          razon_social: 'Cliente Demo',
          ruc: '1799999999001',
          owner_email: 'owner@example.com',
          plan_nombre: 'Pro',
        }],
      });

    const result = await assignOwnerPlan({
      tenantId,
      payload: {
        planId: 'PRO',
        billingPeriod: 'custom',
        expiresAt: '2099-12-31',
        notes: 'Alcance pactado',
      },
      userId: 'super-1',
      correlationId: 'corr-plan',
      ipAddress: '127.0.0.1',
    });

    expect(result).toMatchObject({
      tenantId,
      planId: 'PRO',
      estado: 'active',
      renovacionAutomatica: false,
      billingPeriod: 'custom',
    });
    expect(db.query.mock.calls[3][0]).toContain('INSERT INTO suscripciones');
    expect(db.query.mock.calls[3][1][0]).toBe(tenantId);
    expect(db.query.mock.calls[3][1][1]).toBe('PRO');
    expect(db.query.mock.calls[3][1][2]).toBeInstanceOf(Date);
    expect(JSON.parse(db.query.mock.calls[3][1][3])).toMatchObject({
      source: 'superadmin_direct_plan_assignment',
      directUpgrade: true,
      agreedScope: true,
      billingPeriod: 'custom',
      previousSubscription: expect.objectContaining({ planId: 'MICRO' }),
    });
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      tenantId,
      userId: 'super-1',
      action: 'superadmin.owner.plan.assign',
      entity: 'suscripciones',
      entityId: 'sub-new',
      previousData: expect.objectContaining({ planId: 'MICRO' }),
      newData: expect.objectContaining({ planId: 'PRO' }),
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
