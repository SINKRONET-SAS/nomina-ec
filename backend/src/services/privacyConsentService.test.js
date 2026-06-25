jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('./auditService', () => ({
  recordAudit: jest.fn(),
}));

const db = require('../config/database');
const { recordAudit } = require('./auditService');
const {
  getConsentStatus,
  updateConsentPreferences,
  withdrawAllOptionalConsents,
} = require('./privacyConsentService');

describe('privacyConsentService', () => {
  beforeEach(() => {
    db.query.mockReset();
    recordAudit.mockReset();
  });

  test('getConsentStatus mezcla defaults con preferencias persistidas', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        scope: 'payphone_billing',
        active: true,
        given_at: '2026-06-25T00:00:00.000Z',
        withdrawn_at: null,
        source: 'dashboard',
        version: 'LOPDP-2026-06',
        metadata: {},
      }],
    });

    const status = await getConsentStatus({ tenantId: 'tenant-1', userId: 'user-1' });

    expect(status.preferences.find((item) => item.scope === 'payroll_labor_processing').active).toBe(true);
    expect(status.preferences.find((item) => item.scope === 'payphone_billing').active).toBe(true);
  });

  test('no permite retirar bases legales no revocables', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{
          scope: 'payroll_labor_processing',
          active: true,
          given_at: '2026-06-25T00:00:00.000Z',
          withdrawn_at: null,
          source: 'dashboard',
          version: 'LOPDP-2026-06',
          metadata: {},
        }],
      })
      .mockResolvedValueOnce({ rows: [] });

    await updateConsentPreferences({
      tenantId: 'tenant-1',
      userId: 'user-1',
      actorId: 'user-1',
      correlationId: 'corr-1',
      preferences: { payroll_labor_processing: false },
    });

    expect(db.query.mock.calls[0][1][3]).toBe(true);
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'lopdp.consent.update',
    }));
  });

  test('withdrawAllOptionalConsents desactiva solo alcances retirables', async () => {
    db.query.mockImplementation((sql, params = []) => {
      if (String(sql).includes('INSERT INTO consent_preferences')) {
        return Promise.resolve({
          rows: [{
            scope: params[2],
            active: params[3],
            given_at: params[4],
            withdrawn_at: params[5],
            source: params[6],
            version: params[7],
            metadata: {},
          }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    await withdrawAllOptionalConsents({
      tenantId: 'tenant-1',
      userId: 'user-1',
      actorId: 'user-1',
      correlationId: 'corr-1',
    });

    const upsertCalls = db.query.mock.calls.filter((call) => String(call[0]).includes('INSERT INTO consent_preferences'));
    expect(upsertCalls).toHaveLength(3);
    expect(upsertCalls.every((call) => call[1][3] === false)).toBe(true);
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'lopdp.consent.withdraw_all',
    }));
  });
});
