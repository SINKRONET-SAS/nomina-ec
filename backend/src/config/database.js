// ============================================================
// PLAN HAIKY - Configuracion de Base de Datos PostgreSQL
// ============================================================
const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: Number.parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'plan_haiky',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };

const pool = new Pool({
  ...poolConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[DB] Nueva conexion establecida');
  }
});

pool.on('error', (err) => {
  console.error('[DB] Error inesperado en el pool', {
    code: err.code || 'DB_POOL_ERROR',
    statusCode: 500,
    correlationId: process.env.CORRELATION_ID || 'db-pool',
    userId: null,
    message: err.message,
  });
  process.exit(-1);
});

async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV === 'development') {
    console.log('[DB] Query ejecutada', {
      text: text.substring(0, 100),
      duration: `${duration}ms`,
      rows: result.rowCount,
    });
  }

  return result;
}

async function getClient(tenantId, userId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (tenantId) {
      await client.query('SELECT set_config($1, $2, true)', ['app.current_tenant_id', tenantId]);
    }

    if (userId) {
      await client.query('SELECT set_config($1, $2, true)', ['app.current_user_id', userId]);
    }

    return client;
  } catch (err) {
    await client.query('ROLLBACK');
    client.release();
    throw err;
  }
}

async function commit(client) {
  await client.query('COMMIT');
  client.release();
}

async function rollback(client) {
  await client.query('ROLLBACK');
  client.release();
}

async function migrate() {
  throw new Error('Use npm run db:migrate para ejecutar migraciones Prisma');
}

module.exports = {
  pool,
  query,
  getClient,
  commit,
  rollback,
  migrate,
};
