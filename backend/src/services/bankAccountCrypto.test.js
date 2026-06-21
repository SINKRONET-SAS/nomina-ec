const {
  decryptBankAccount,
  encryptBankAccount,
  getBankAccountKey,
  isAesPayload,
} = require('./bankAccountCrypto');

describe('bankAccountCrypto', () => {
  const originalKey = process.env.BANK_ACCOUNT_ENCRYPTION_KEY;

  afterEach(() => {
    process.env.BANK_ACCOUNT_ENCRYPTION_KEY = originalKey;
  });

  test('falla cerrado si falta clave de cifrado bancaria', () => {
    delete process.env.BANK_ACCOUNT_ENCRYPTION_KEY;
    expect(() => getBankAccountKey()).toThrow(/BANK_ACCOUNT_ENCRYPTION_KEY/);
  });

  test('cifra y descifra cuenta bancaria con AES-256-GCM', async () => {
    process.env.BANK_ACCOUNT_ENCRYPTION_KEY = 'a'.repeat(64);
    const encrypted = encryptBankAccount('2200-123-456');

    expect(Buffer.isBuffer(encrypted)).toBe(true);
    expect(isAesPayload(encrypted)).toBe(true);
    await expect(decryptBankAccount(encrypted)).resolves.toBe('2200123456');
  });

  test('mantiene compatibilidad de lectura con pgcrypto legado', async () => {
    process.env.BANK_ACCOUNT_ENCRYPTION_KEY = 'b'.repeat(64);
    const queryable = {
      query: jest.fn().mockResolvedValue({ rows: [{ cuenta: '001-002-003' }] }),
    };

    await expect(decryptBankAccount(Buffer.from('legacy-pgcrypto'), queryable)).resolves.toBe('001002003');
    expect(queryable.query).toHaveBeenCalledWith(
      'SELECT pgp_sym_decrypt($1::bytea, $2) as cuenta',
      [Buffer.from('legacy-pgcrypto'), 'b'.repeat(64)]
    );
  });
});
