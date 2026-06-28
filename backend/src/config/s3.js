// ============================================================
// SKNOMINA - Configuración de AWS S3 / DigitalOcean Spaces
// ============================================================
const {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const logger = require('../utils/logger');
require('dotenv').config();

const BUCKET = process.env.AWS_S3_BUCKET || 'sknomina-documents';
const REGION = process.env.AWS_REGION || 'us-east-1';
const ENDPOINT = process.env.AWS_S3_ENDPOINT || undefined;
const LOCAL_STORAGE_DIR = process.env.LOCAL_STORAGE_DIR
  || path.join(__dirname, '..', '..', 'storage', 'local-files');
const LOCAL_URL_TTL_SECONDS = Number(process.env.LOCAL_STORAGE_URL_TTL_SECONDS || 3600);
const PLACEHOLDER_VALUES = new Set([
  'your-access-key',
  'your-secret-key',
  'change-me',
  'changeme',
  'placeholder',
  'mock',
  'test',
]);

const s3 = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  forcePathStyle: Boolean(ENDPOINT),
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined,
});

function cleanEnv(value) {
  return String(value || '').trim();
}

function isPlaceholder(value) {
  const normalized = cleanEnv(value).toLowerCase();
  return !normalized || PLACEHOLDER_VALUES.has(normalized);
}

function hasRealS3Credentials() {
  return !isPlaceholder(process.env.AWS_ACCESS_KEY_ID)
    && !isPlaceholder(process.env.AWS_SECRET_ACCESS_KEY);
}

function isLocalStorageEnabled() {
  const driver = cleanEnv(process.env.STORAGE_DRIVER).toLowerCase();
  if (driver === 'local') return true;
  if (driver === 's3') return false;

  return process.env.NODE_ENV !== 'production' && !hasRealS3Credentials();
}

function canFallbackToLocalStorage() {
  const driver = cleanEnv(process.env.STORAGE_DRIVER).toLowerCase();
  return driver !== 's3' && process.env.NODE_ENV !== 'production';
}

function isLocalStorageAvailable() {
  return isLocalStorageEnabled() || canFallbackToLocalStorage();
}

function buildObjectLocation(key) {
  if (ENDPOINT) {
    return `${ENDPOINT.replace(/\/$/, '')}/${BUCKET}/${key}`;
  }

  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

function localPublicBaseUrl() {
  return cleanEnv(process.env.LOCAL_STORAGE_PUBLIC_BASE_URL)
    || cleanEnv(process.env.BACKEND_PUBLIC_URL)
    || cleanEnv(process.env.API_PUBLIC_URL)
    || `http://localhost:${process.env.PORT || 3000}`;
}

function normalizeStorageKey(key) {
  const raw = String(key || '').replace(/\\/g, '/').trim();
  const normalized = path.posix.normalize(`/${raw}`).replace(/^\/+/, '');

  if (!normalized || normalized === '.' || normalized.startsWith('..') || normalized.includes('/../')) {
    throw new Error('Clave de almacenamiento local invalida.');
  }

  return normalized;
}

function localObjectPath(key) {
  const normalizedKey = normalizeStorageKey(key);
  const root = path.resolve(LOCAL_STORAGE_DIR);
  const target = path.resolve(root, ...normalizedKey.split('/'));

  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new Error('Ruta de almacenamiento local fuera del directorio permitido.');
  }

  return target;
}

function metadataPath(key) {
  return `${localObjectPath(key)}.metadata.json`;
}

function encodeLocalStorageKey(key) {
  return Buffer.from(normalizeStorageKey(key), 'utf8').toString('base64url');
}

function decodeLocalStorageKey(encodedKey) {
  return normalizeStorageKey(Buffer.from(String(encodedKey || ''), 'base64url').toString('utf8'));
}

function localSigningSecret() {
  return cleanEnv(process.env.LOCAL_STORAGE_SIGNING_SECRET)
    || cleanEnv(process.env.JWT_SECRET)
    || 'sknomina-local-storage-development-secret';
}

function signLocalStoragePayload(payload) {
  return crypto
    .createHmac('sha256', localSigningSecret())
    .update(payload)
    .digest('base64url');
}

function timingSafeEqualText(left, right) {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function buildLocalObjectUrl(key, expiresIn = LOCAL_URL_TTL_SECONDS) {
  const normalizedKey = normalizeStorageKey(key);
  const encodedKey = encodeLocalStorageKey(normalizedKey);
  const expiresAt = Math.floor(Date.now() / 1000) + Number(expiresIn || LOCAL_URL_TTL_SECONDS);
  const payload = `${encodedKey}.${expiresAt}`;
  const signature = signLocalStoragePayload(payload);
  const token = `${expiresAt}.${signature}`;

  return `${localPublicBaseUrl().replace(/\/$/, '')}/api/storage/local/${encodedKey}?token=${encodeURIComponent(token)}`;
}

function verifyLocalStorageToken(encodedKey, token) {
  const [expiresAtText, signature] = String(token || '').split('.');
  const expiresAt = Number(expiresAtText);

  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000) || !signature) {
    return false;
  }

  const expected = signLocalStoragePayload(`${encodedKey}.${expiresAt}`);
  return timingSafeEqualText(expected, signature);
}

function extractLocalStorageKey(storedUrl, storageKey) {
  if (storageKey) return normalizeStorageKey(storageKey);

  const text = String(storedUrl || '');
  if (text.startsWith('local://')) {
    return decodeLocalStorageKey(text.replace(/^local:\/\//, '').split(/[?#]/)[0]);
  }

  const match = text.match(/\/api\/storage\/local\/([^/?#]+)/);
  if (match) {
    return decodeLocalStorageKey(match[1]);
  }

  return null;
}

function resolveStorageUrl(storedUrl, storageKey, expiresIn = LOCAL_URL_TTL_SECONDS) {
  const key = extractLocalStorageKey(storedUrl, storageKey);
  if (!key) return storedUrl;
  return buildLocalObjectUrl(key, expiresIn);
}

async function localUpload(buffer, key, contentType) {
  const filePath = localObjectPath(key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
  await fs.writeFile(metadataPath(key), JSON.stringify({
    key: normalizeStorageKey(key),
    contentType,
    size: Buffer.byteLength(buffer),
    createdAt: new Date().toISOString(),
  }, null, 2));
  logger.info({
    code: 'LOCAL_STORAGE_FILE_SAVED',
    key: normalizeStorageKey(key),
  }, 'Archivo guardado en almacenamiento local');
  return buildLocalObjectUrl(key);
}

async function localGet(key) {
  return fs.readFile(localObjectPath(key));
}

async function getLocalObject(key) {
  return localGet(key);
}

async function getLocalObjectMetadata(key) {
  try {
    const raw = await fs.readFile(metadataPath(key), 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    throw err;
  }
}

async function localDelete(key) {
  const filePath = localObjectPath(key);
  await fs.rm(filePath, { force: true });
  await fs.rm(metadataPath(key), { force: true });
}

function logS3Error(action, key, err) {
  console.error(`[S3] Error al ${action}`, {
    code: err.code || err.name || 'S3_ERROR',
    statusCode: err.$metadata?.httpStatusCode || 500,
    correlationId: process.env.CORRELATION_ID || 's3-storage',
    userId: null,
    key,
    message: err.message,
  });
}

/**
 * Sube un archivo a S3.
 * @param {Buffer} buffer Contenido del archivo.
 * @param {string} key Ruta del archivo en S3.
 * @param {string} contentType Tipo MIME.
 * @returns {Promise<string>} URL del archivo.
 */
const s3Upload = async (buffer, key, contentType = 'application/octet-stream') => {
  if (isLocalStorageEnabled()) {
    return localUpload(buffer, key, contentType);
  }

  try {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'private',
    }));
    logger.info({ code: 'S3_FILE_UPLOADED', key }, 'Archivo subido a almacenamiento S3');
    return buildObjectLocation(key);
  } catch (err) {
    if (canFallbackToLocalStorage()) {
      console.warn('[S3] Fallo en entorno no productivo; se usa almacenamiento local', {
        code: err.code || err.name || 'S3_ERROR',
        key,
      });
      return localUpload(buffer, key, contentType);
    }

    logS3Error('subir archivo', key, err);
    throw new Error(`Error al subir archivo a S3: ${err.message}`);
  }
};

/**
 * Obtiene un archivo de S3.
 * @param {string} key Ruta del archivo.
 * @returns {Promise<Buffer>} Contenido del archivo.
 */
const s3Get = async (key) => {
  if (isLocalStorageEnabled()) {
    return localGet(key);
  }

  try {
    const result = await s3.send(new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }));
    const chunks = [];

    for await (const chunk of result.Body) {
      chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  } catch (err) {
    logS3Error('obtener archivo', key, err);
    throw new Error(`Error al obtener archivo de S3: ${err.message}`);
  }
};

/**
 * Genera una URL firmada para acceso temporal.
 * @param {string} key Ruta del archivo.
 * @param {number} expiresIn Segundos de validez.
 * @returns {Promise<string>} URL firmada.
 */
const s3SignedUrl = async (key, expiresIn = 3600) => {
  if (isLocalStorageEnabled()) {
    return buildLocalObjectUrl(key, expiresIn);
  }

  try {
    return await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
      }),
      { expiresIn },
    );
  } catch (err) {
    logS3Error('generar URL firmada', key, err);
    throw new Error(`Error al generar URL firmada de S3: ${err.message}`);
  }
};

/**
 * Elimina un archivo de S3.
 * @param {string} key Ruta del archivo.
 * @returns {Promise<void>}
 */
const s3Delete = async (key) => {
  if (isLocalStorageEnabled()) {
    await localDelete(key);
    logger.info({
      code: 'LOCAL_STORAGE_FILE_DELETED',
      key: normalizeStorageKey(key),
    }, 'Archivo eliminado de almacenamiento local');
    return;
  }

  try {
    await s3.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }));
    logger.info({ code: 'S3_FILE_DELETED', key }, 'Archivo eliminado de almacenamiento S3');
  } catch (err) {
    logS3Error('eliminar archivo', key, err);
    throw new Error(`Error al eliminar archivo de S3: ${err.message}`);
  }
};

module.exports = {
  s3,
  s3Upload,
  s3Get,
  s3SignedUrl,
  s3Delete,
  buildLocalObjectUrl,
  decodeLocalStorageKey,
  getLocalObject,
  getLocalObjectMetadata,
  isLocalStorageAvailable,
  isLocalStorageEnabled,
  resolveStorageUrl,
  verifyLocalStorageToken,
  BUCKET,
};
