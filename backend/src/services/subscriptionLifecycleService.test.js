jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('./communicationService', () => ({
  sendEmail: jest.fn(async () => ({ status: 'sent' })),
}));

jest.mock('./planTrialService', () => ({
  normalizePlanMetadata: jest.fn((m) => (m && typeof m === 'object' ? { ...m } : {})),
}));

const db = require('../config/database');
const { sendEmail } = require('./communicationService');
const {
  addBillingPeriod,
  processAutoRenewals,
  notifyExpiringSubscriptions,
  resolveBillingPeriod,
} = require('./subscriptionLifecycleService');

describe('subscriptionLifecycleService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addBillingPeriod', () => {
    test('agrega 1 mes para periodo monthly', () => {
      const base = new Date('2026-07-15T12:00:00Z');
      const next = addBillingPeriod(base, 'monthly');
      expect(next.getUTCMonth()).toBe(7); // agosto (0-based)
      expect(next.getUTCDate()).toBe(15);
    });

    test('agrega 1 anio para periodo annual', () => {
      const base = new Date('2026-07-15T12:00:00Z');
      const next = addBillingPeriod(base, 'annual');
      expect(next.getUTCFullYear()).toBe(2027);
      expect(next.getUTCMonth()).toBe(6); // julio
    });
  });

  describe('resolveBillingPeriod', () => {
    test('retorna monthly por defecto', () => {
      expect(resolveBillingPeriod({ metadata: {} })).toBe('monthly');
    });

    test('retorna billing period de metadata', () => {
      expect(resolveBillingPeriod({ metadata: { billingPeriod: 'annual' } })).toBe('annual');
    });
  });

  describe('processAutoRenewals', () => {
    test('renueva suscripciones con renovacion_automatica proximas a vencer', async () => {
      const venceEn = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(); // 12h desde ahora
      db.query
        .mockResolvedValueOnce({
          rows: [{
            tenant_id: 'tenant-1',
            plan_id: 'PRO',
            plan_nombre: 'Plan Pro',
            vence_en: venceEn,
            estado: 'active',
            renovacion_automatica: true,
            metadata: { billingPeriod: 'monthly' },
          }],
        })
        .mockResolvedValueOnce({ rows: [{ tenant_id: 'tenant-1' }] });

      const result = await processAutoRenewals();

      expect(result.renewed).toBe(1);
      expect(result.details[0].tenantId).toBe('tenant-1');
      expect(db.query).toHaveBeenCalledTimes(2);

      const updateCall = db.query.mock.calls[1];
      expect(updateCall[0]).toContain('UPDATE suscripciones');
      expect(updateCall[1][0]).toBe('tenant-1');
    });

    test('no renueva si no hay suscripciones proximas a vencer', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const result = await processAutoRenewals();

      expect(result.renewed).toBe(0);
      expect(db.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('notifyExpiringSubscriptions', () => {
    test('envia notificacion de vencimiento al owner', async () => {
      const venceEn = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 dias
      db.query
        .mockResolvedValueOnce({
          rows: [{
            tenant_id: 'tenant-1',
            plan_id: 'PRO',
            plan_nombre: 'Plan Pro',
            vence_en: venceEn,
            estado: 'active',
            renovacion_automatica: false,
            metadata: {},
            owner_email: 'owner@test.com',
            owner_user_id: 'user-1',
          }],
        })
        .mockResolvedValueOnce({ rows: [{}] });

      const result = await notifyExpiringSubscriptions();

      expect(result.notified).toBe(1);
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'owner@test.com',
          purpose: 'subscription_expiry_notice',
          flow: 'billing',
        })
      );
    });

    test('no notifica si ya se envio aviso reciente', async () => {
      const venceEn = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      db.query.mockResolvedValueOnce({
        rows: [{
          tenant_id: 'tenant-1',
          plan_id: 'PRO',
          plan_nombre: 'Plan Pro',
          vence_en: venceEn,
          estado: 'active',
          renovacion_automatica: false,
          metadata: { lastExpiryNoticeAt: new Date().toISOString() },
          owner_email: 'owner@test.com',
          owner_user_id: 'user-1',
        }],
      });

      const result = await notifyExpiringSubscriptions();

      expect(result.notified).toBe(0);
      expect(sendEmail).not.toHaveBeenCalled();
    });

    test('no notifica si no hay owner email', async () => {
      const venceEn = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      db.query.mockResolvedValueOnce({
        rows: [{
          tenant_id: 'tenant-1',
          plan_id: 'PRO',
          plan_nombre: 'Plan Pro',
          vence_en: venceEn,
          estado: 'active',
          renovacion_automatica: false,
          metadata: {},
          owner_email: null,
          owner_user_id: null,
        }],
      });

      const result = await notifyExpiringSubscriptions();

      expect(result.notified).toBe(0);
      expect(sendEmail).not.toHaveBeenCalled();
    });
  });
});
