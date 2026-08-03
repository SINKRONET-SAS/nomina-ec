// ============================================================
// Tests for seed-superadmin-owner.js
// Phase AIV75-26-03: idempotency, env guards, password rules,
//   no credentials in output, email-verification policy.
// ============================================================

const fs = require('fs');
const path = require('path');

const SEED_PATH = path.join(__dirname, 'seed-superadmin-owner.js');
const seedSource = fs.readFileSync(SEED_PATH, 'utf8');

// ---------------------------------------------------------------------------
// Helpers: mock factories
// ---------------------------------------------------------------------------
function buildMockClient() {
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue({ rows: [] }),
    end: jest.fn().mockResolvedValue(undefined),
  };
}

function setRequiredEnv() {
  process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/testdb';
  process.env.SUPERADMIN_EMAIL = 'admin@test.com';
  process.env.SUPERADMIN_PASSWORD = 'Secure1234x';
}

function setOwnerEnv() {
  process.env.OWNER_TENANT_RUC = '1790000000001';
  process.env.OWNER_TENANT_RAZON_SOCIAL = 'Empresa Demo S.A.';
  process.env.OWNER_EMAIL = 'owner@demo.com';
  process.env.OWNER_PASSWORD = 'Owner12345x';
}

// ---------------------------------------------------------------------------
// Section 1 - Static source analysis (no execution required)
// ---------------------------------------------------------------------------
describe('seed-superadmin-owner (static source guarantees)', () => {
  test('never prints passwords or password_hash values to stdout', () => {
    // The seed should only log structured status messages.
    // It should never console.log the password or the hash directly.
    const lines = seedSource.split('\n');
    const logLines = lines.filter((l) => /console\.(log|info|warn|error)/.test(l));
    for (const line of logLines) {
      expect(line).not.toMatch(/password\b/i);
      expect(line).not.toMatch(/password_hash/i);
      expect(line).not.toMatch(/SUPERADMIN_PASSWORD/);
      expect(line).not.toMatch(/OWNER_PASSWORD/);
    }
  });

  test('uses ON CONFLICT for tenant upsert (idempotent)', () => {
    expect(seedSource).toMatch(/ON CONFLICT\s*\(ruc\)\s*DO UPDATE/i);
  });

  test('checks existing user before INSERT (idempotent upsert)', () => {
    expect(seedSource).toMatch(/SELECT id FROM usuarios WHERE/);
    expect(seedSource).toMatch(/UPDATE usuarios/);
    expect(seedSource).toMatch(/INSERT INTO usuarios/);
  });

  test('does NOT set email_verificado_en for any user', () => {
    expect(seedSource).not.toMatch(/email_verificado/);
  });

  test('exits with code 1 when DATABASE_URL is missing', () => {
    expect(seedSource).toMatch(/process\.exit\(1\)/);
    // The guard is at the top before main()
    expect(seedSource).toMatch(/if\s*\(\s*!databaseUrl\s*\)/);
  });

  test('enforces password complexity with assertPasswordComplexity', () => {
    expect(seedSource).toMatch(/function assertPasswordComplexity/);
    expect(seedSource).toMatch(/assertPasswordComplexity\(user\.password/);
  });

  test('hashes password with bcrypt before storing', () => {
    expect(seedSource).toMatch(/bcrypt\.hash\(user\.password/);
    expect(seedSource).toMatch(/password_hash/);
  });
});

// ---------------------------------------------------------------------------
// Section 2 - Behavioral tests via module isolation
// ---------------------------------------------------------------------------
describe('seed-superadmin-owner (behavioral)', () => {
  let mockClient;
  let mockBcrypt;
  let exitSpy;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    mockClient = buildMockClient();
    // Default: SELECT returns no rows (new user), INSERT succeeds
    mockClient.query.mockResolvedValue({ rows: [] });

    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

    jest.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    exitSpy.mockRestore();
    jest.restoreAllMocks();
  });

  function runSeed() {
    return new Promise((resolve) => {
      jest.isolateModules(() => {
        jest.mock('pg', () => ({ Client: jest.fn(() => mockClient) }));
        jest.mock('bcryptjs', () => ({ hash: jest.fn().mockResolvedValue('$2a$10$HASHED') }));
        jest.mock('dotenv', () => ({ config: jest.fn() }));

        require('./seed-superadmin-owner');
        // main() is async; give it time to resolve/reject
        setTimeout(() => resolve({ exited: exitSpy.mock.calls.length > 0 }), 200);
      });
    });
  }

  test('exits with code 1 when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_URL;
    delete process.env.SUPERADMIN_EMAIL;
    delete process.env.SUPERADMIN_PASSWORD;

    await runSeed();

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test('throws when SUPERADMIN_EMAIL is missing', async () => {
    process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/testdb';
    delete process.env.SUPERADMIN_EMAIL;
    process.env.SUPERADMIN_PASSWORD = 'Secure1234x';

    await runSeed();

    // main() catches the error and calls process.exit(1)
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test('throws when SUPERADMIN_PASSWORD is missing', async () => {
    process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/testdb';
    process.env.SUPERADMIN_EMAIL = 'admin@test.com';
    delete process.env.SUPERADMIN_PASSWORD;

    await runSeed();

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test('connects, upserts superadmin, and disconnects on success (no owner)', async () => {
    setRequiredEnv();
    // Remove owner vars so the owner path is skipped
    delete process.env.OWNER_TENANT_RUC;
    delete process.env.OWNER_TENANT_RAZON_SOCIAL;
    delete process.env.OWNER_EMAIL;
    delete process.env.OWNER_PASSWORD;

    await runSeed();

    expect(mockClient.connect).toHaveBeenCalledTimes(1);
    expect(mockClient.end).toHaveBeenCalledTimes(1);

    // Should have queried for existing user and then inserted
    const queryCalls = mockClient.query.mock.calls;
    const selectCall = queryCalls.find((c) => typeof c[0] === 'string' && c[0].includes('SELECT id FROM usuarios'));
    expect(selectCall).toBeDefined();

    const insertCall = queryCalls.find((c) => typeof c[0] === 'string' && c[0].includes('INSERT INTO usuarios'));
    expect(insertCall).toBeDefined();

    // Verify password was hashed, not stored raw
    const insertParams = insertCall[1];
    expect(insertParams).toContain('$2a$10$HASHED');
    expect(insertParams).not.toContain('Secure1234x');
  });

  test('idempotency: updates existing user instead of inserting duplicate', async () => {
    setRequiredEnv();
    delete process.env.OWNER_TENANT_RUC;
    delete process.env.OWNER_TENANT_RAZON_SOCIAL;
    delete process.env.OWNER_EMAIL;
    delete process.env.OWNER_PASSWORD;

    // Simulate existing user found
    mockClient.query.mockImplementation((sql) => {
      if (typeof sql === 'string' && sql.includes('SELECT id FROM usuarios')) {
        return Promise.resolve({ rows: [{ id: 'existing-user-id' }] });
      }
      return Promise.resolve({ rows: [] });
    });

    await runSeed();

    const queryCalls = mockClient.query.mock.calls;
    const updateCall = queryCalls.find((c) => typeof c[0] === 'string' && c[0].includes('UPDATE usuarios'));
    expect(updateCall).toBeDefined();

    // Should NOT have an INSERT INTO usuarios call
    const insertCall = queryCalls.find((c) => typeof c[0] === 'string' && c[0].includes('INSERT INTO usuarios'));
    expect(insertCall).toBeUndefined();
  });

  test('creates owner tenant and owner user when all OWNER env vars are set', async () => {
    setRequiredEnv();
    setOwnerEnv();

    // Tenant upsert returns an id
    mockClient.query.mockImplementation((sql) => {
      if (typeof sql === 'string' && sql.includes('INSERT INTO tenants')) {
        return Promise.resolve({ rows: [{ id: 'tenant-1' }] });
      }
      return Promise.resolve({ rows: [] });
    });

    await runSeed();

    const queryCalls = mockClient.query.mock.calls;

    // Should have two INSERT INTO tenants (owner tenant) - one for tenant upsert
    const tenantInserts = queryCalls.filter((c) => typeof c[0] === 'string' && c[0].includes('INSERT INTO tenants'));
    expect(tenantInserts.length).toBeGreaterThanOrEqual(1);

    // Should have at least two usuario operations (superadmin + owner)
    const userQueries = queryCalls.filter((c) => typeof c[0] === 'string' && c[0].includes('usuarios'));
    expect(userQueries.length).toBeGreaterThanOrEqual(2);
  });

  test('password too short triggers exit(1)', async () => {
    process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/testdb';
    process.env.SUPERADMIN_EMAIL = 'admin@test.com';
    process.env.SUPERADMIN_PASSWORD = 'Short1';

    await runSeed();

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test('password without digits triggers exit(1)', async () => {
    process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/testdb';
    process.env.SUPERADMIN_EMAIL = 'admin@test.com';
    process.env.SUPERADMIN_PASSWORD = 'OnlyLettersNoDigits';

    await runSeed();

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test('password without letters triggers exit(1)', async () => {
    process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/testdb';
    process.env.SUPERADMIN_EMAIL = 'admin@test.com';
    process.env.SUPERADMIN_PASSWORD = '1234567890';

    await runSeed();

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test('normalizes email to lowercase', async () => {
    setRequiredEnv();
    process.env.SUPERADMIN_EMAIL = 'Admin@TEST.Com';
    delete process.env.OWNER_TENANT_RUC;
    delete process.env.OWNER_TENANT_RAZON_SOCIAL;
    delete process.env.OWNER_EMAIL;
    delete process.env.OWNER_PASSWORD;

    await runSeed();

    const queryCalls = mockClient.query.mock.calls;
    const insertOrUpdate = queryCalls.find(
      (c) => typeof c[0] === 'string' && (c[0].includes('INSERT INTO usuarios') || c[0].includes('UPDATE usuarios'))
    );
    expect(insertOrUpdate).toBeDefined();
    // The email parameter should be lowercase
    const emailParam = insertOrUpdate[1].find((p) => typeof p === 'string' && p.includes('@'));
    expect(emailParam).toBe('admin@test.com');
  });
});

// ---------------------------------------------------------------------------
// Section 3 - assertPasswordComplexity logic (unit-level)
// ---------------------------------------------------------------------------
describe('assertPasswordComplexity (extracted logic)', () => {
  // Re-implement the same rules from the source to verify understanding
  function assertPasswordComplexity(password, label = 'usuario') {
    if (!password || String(password).length < 10) {
      throw new Error(`La contraseña de ${label} debe tener al menos 10 caracteres.`);
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      throw new Error(`La contraseña de ${label} debe ser alfanumérica (letras y números).`);
    }
  }

  test('accepts valid alphanumeric password >= 10 chars', () => {
    expect(() => assertPasswordComplexity('Abcdef1234')).not.toThrow();
    expect(() => assertPasswordComplexity('x1x2x3x4x5')).not.toThrow();
  });

  test('rejects undefined / null / empty', () => {
    expect(() => assertPasswordComplexity(undefined)).toThrow('al menos 10 caracteres');
    expect(() => assertPasswordComplexity(null)).toThrow('al menos 10 caracteres');
    expect(() => assertPasswordComplexity('')).toThrow('al menos 10 caracteres');
  });

  test('rejects passwords shorter than 10 characters', () => {
    expect(() => assertPasswordComplexity('Ab1234567')).toThrow('al menos 10 caracteres');
    expect(() => assertPasswordComplexity('A1')).toThrow('al menos 10 caracteres');
  });

  test('rejects passwords without digits', () => {
    expect(() => assertPasswordComplexity('abcdefghijklm')).toThrow('alfanumérica');
  });

  test('rejects passwords without letters', () => {
    expect(() => assertPasswordComplexity('1234567890')).toThrow('alfanumérica');
  });

  test('exactly 10 alphanumeric characters is accepted', () => {
    expect(() => assertPasswordComplexity('Abcdefghi1')).not.toThrow();
  });

  test('uses custom label in error message', () => {
    expect(() => assertPasswordComplexity('short', 'superadmin')).toThrow('superadmin');
  });
});
