// ============================================================
// PLAN HAIKY - Configuración de AWS S3 / DigitalOcean Spaces
// ============================================================
const AWS = require('aws-sdk');
require('dotenv').config();

// Configurar S3 (compatible con DigitalOcean Spaces)
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  endpoint: process.env.AWS_S3_ENDPOINT || undefined,
  region: process.env.AWS_REGION || 'us-east-1',
  s3ForcePathStyle: process.env.AWS_S3_ENDPOINT ? true : false,
});

const BUCKET = process.env.AWS_S3_BUCKET || 'plan-haiky-documents';

/**
 * Sube un archivo a S3
 * @param {Buffer} buffer - Contenido del archivo
 * @param {string} key - Ruta/nombre del archivo en S3
 * @param {string} contentType - Tipo MIME
 * @returns {Promise<string>} URL pública del archivo
 */
const s3Upload = async (buffer, key, contentType = 'application/octet-stream') => {
  const params = {
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'private',
  };

  try {
    const result = await s3.upload(params).promise();
    console.log('[S3] Archivo subido:', key);
    return result.Location;
  } catch (err) {
    console.error('[S3] Error al subir archivo:', err.message);
    throw new Error('Error al subir archivo a S3: ' + err.message);
  }
};

/**
 * Obtiene un archivo de S3
 * @param {string} key - Ruta/nombre del archivo
 * @returns {Promise<Buffer>} Contenido del archivo
 */
const s3Get = async (key) => {
  const params = {
    Bucket: BUCKET,
    Key: key,
  };

  try {
    const result = await s3.getObject(params).promise();
    return result.Body;
  } catch (err) {
    console.error('[S3] Error al obtener archivo:', err.message);
    throw new Error('Error al obtener archivo de S3: ' + err.message);
  }
};

/**
 * Genera una URL firmada para acceso temporal
 * @param {string} key - Ruta/nombre del archivo
 * @param {number} expiresIn - Segundos de validez (default: 1 hora)
 * @returns {string} URL firmada
 */
const s3SignedUrl = (key, expiresIn = 3600) => {
  const params = {
    Bucket: BUCKET,
    Key: key,
    Expires: expiresIn,
  };
  return s3.getSignedUrl('getObject', params);
};

/**
 * Elimina un archivo de S3
 * @param {string} key - Ruta/nombre del archivo
 * @returns {Promise<void>}
 */
const s3Delete = async (key) => {
  const params = {
    Bucket: BUCKET,
    Key: key,
  };

  try {
    await s3.deleteObject(params).promise();
    console.log('[S3] Archivo eliminado:', key);
  } catch (err) {
    console.error('[S3] Error al eliminar archivo:', err.message);
    throw new Error('Error al eliminar archivo de S3: ' + err.message);
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

