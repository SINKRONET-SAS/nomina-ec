# Crear configuración de base de datos
database_js = """// ============================================================
// PLAN HAIKY - Configuración de Base de Datos PostgreSQL
// ============================================================
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'plan_haiky',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Manejo de eventos del pool
pool.on('connect', (client) => {
  console.log('[DB] Nueva conexión establecida');
});

pool.on('error', (err) => {
  console.error('[DB] Error inesperado en el pool:', err);
  process.exit(-1);
});

/**
 * Ejecuta una query con parámetros
 * @param {string} text - SQL query
 * @param {Array} params - Parámetros
 * @returns {Promise<Object>} Resultado de la query
 */
const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[DB] Query ejecutada', { text: text.substring(0, 100), duration: duration + 'ms', rows: res.rowCount });
  }
  
  return res;
};

/**
 * Obtiene un cliente del pool y configura el contexto de tenant
 * @param {string} tenantId - UUID del tenant
 * @param {string} userId - UUID del usuario
 * @returns {Promise<Object>} Cliente de la base de datos
 */
const getClient = async (tenantId, userId) => {
  const client = await pool.connect();
  
  try {
    // Configurar contexto de sesión para RLS
    await client.query('BEGIN');
    await client.query(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
    if (userId) {
      await client.query(`SET LOCAL app.current_user_id = '${userId}'`);
    }
    return client;
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    throw err;
  }
};

/**
 * Libera el cliente y hace commit
 * @param {Object} client - Cliente de la base de datos
 */
const commit = async (client) => {
  await client.query('COMMIT');
  client.release();
};

/**
 * Libera el cliente y hace rollback
 * @param {Object} client - Cliente de la base de datos
 */
const rollback = async (client) => {
  await client.query('ROLLBACK');
  client.release();
};

/**
 * Ejecuta el esquema SQL inicial
 */
const migrate = async () => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('[DB] Migración completada exitosamente');
  } catch (err) {
    console.error('[DB] Error en migración:', err.message);
    throw err;
  }
};

module.exports = {
  pool,
  query,
  getClient,
  commit,
  rollback,
  migrate,
};
"""

with open('backend/src/config/database.js', 'w') as f:
    f.write(database_js)

# Crear configuración de S3
s3_js = """// ============================================================
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
"""

with open('backend/src/config/s3.js', 'w') as f:
    f.write(s3_js)

print("✓ Configuración de BD y S3 creada")
 # Result 
✓ Configuración de BD y S3 creada
