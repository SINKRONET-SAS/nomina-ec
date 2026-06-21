const crypto = require('crypto');
const db = require('../config/database');
const AppError = require('../utils/AppError');

const AES_PREFIX = 'aes-256-gcm:v1';
const LOCAL_DEFAULT_KEY = 'change-this-local-bank-key';

function getBankAccountKey() {
  const value = process.env.BANK_ACCOUNT_ENCRYPTION_KEY;
  if (!value || value === LOCAL_DEFAULT_KEY) {
    throw new AppError('Configura BANK_ACCOUNT_ENCRYPTION_KEY antes de guardar o leer cuentas bancarias.', {
      code: 'BANK_ACCOUNT_ENCRYPTION_KEY_REQUIRED',
      statusCode: 500,
    });
  }

  if (/^[a-fA-F0-9]{64}$/.test(value)) {
    return Buffer.from(value, 'hex');
  }

  const utf8 = Buffer.from(value, 'utf8');
  if (utf8.length === 32) return utf8;

  throw new AppError('BANK_ACCOUNT_ENCRYPTION_KEY debe tener 32 bytes o 64 caracteres hexadecimales.', {
    code: 'BANK_ACCOUNT_ENCRYPTION_KEY_INVALID',
    statusCode: 500,
  });
}

function normalizeAccount(value) {
  return String(value || '').replace(/\D/g, '');
}

function toTextPayload(value) {
  if (!value) return '';
  if (Buffer.isBuffer(value)) return value.toString('utf8');
  if (value instanceof Uint8Array) return Buffer.from(value).toString('utf8');
  return String(value);
}

function isAesPayload(value) {
  return toTextPayload(value).startsWith(AES_PREFIX + ':');
}

function encryptBankAccount(account) {
  const normalized = normalizeAccount(account);
  if (!normalized) return null;

  const key = getBankAccountKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(normalized, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.from(`${AES_PREFIX}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`, 'utf8');
}

async function decryptBankAccount(encryptedAccount, queryable = db) {
  if (!encryptedAccount) {
    throw new AppError('Cuenta bancaria cifrada no disponible.', {
      code: 'BANK_ACCOUNT_ENCRYPTED_VALUE_REQUIRED',
      statusCode: 500,
    });
  }

  if (isAesPayload(encryptedAccount)) {
    const [, , ivHex, tagHex, encryptedHex] = toTextPayload(encryptedAccount).split(':');
    if (!ivHex || !tagHex || !encryptedHex) {
      throw new AppError('Formato de cuenta bancaria cifrada invalido.', {
        code: 'BANK_ACCOUNT_ENCRYPTED_FORMAT_INVALID',
        statusCode: 500,
      });
    }
    const decipher = crypto.createDecipheriv('aes-256-gcm', getBankAccountKey(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()]);
    return normalizeAccount(decrypted.toString('utf8'));
  }

  const result = await queryable.query(
    'SELECT pgp_sym_decrypt($1::bytea, $2) as cuenta',
    [encryptedAccount, process.env.BANK_ACCOUNT_ENCRYPTION_KEY]
  );
  const account = result.rows[0]?.cuenta;
  if (!account) {
    throw new AppError('No se pudo descifrar la cuenta bancaria.', {
      code: 'BANK_ACCOUNT_DECRYPT_FAILED',
      statusCode: 500,
    });
  }

  return normalizeAccount(account);
}

module.exports = {
  AES_PREFIX,
  decryptBankAccount,
  encryptBankAccount,
  getBankAccountKey,
  isAesPayload,
  normalizeAccount,
};
