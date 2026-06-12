// ============================================================
// Nómina-Ec - Configuración de AWS S3 / DigitalOcean Spaces
// ============================================================
const {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

const BUCKET = process.env.AWS_S3_BUCKET || 'nomina-ec-documents';
const REGION = process.env.AWS_REGION || 'us-east-1';
const ENDPOINT = process.env.AWS_S3_ENDPOINT || undefined;

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

function buildObjectLocation(key) {
  if (ENDPOINT) {
    return `${ENDPOINT.replace(/\/$/, '')}/${BUCKET}/${key}`;
  }

  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
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
  try {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'private',
    }));
    console.log('[S3] Archivo subido', { key });
    return buildObjectLocation(key);
  } catch (err) {
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
  try {
    await s3.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }));
    console.log('[S3] Archivo eliminado', { key });
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
  BUCKET,
};
