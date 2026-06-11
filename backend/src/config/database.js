// ============================================================
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

