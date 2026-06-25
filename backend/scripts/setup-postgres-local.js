// ============================================================
// Nomina-Ec - Preparacion local de PostgreSQL
// ============================================================
const { Client } = require('pg');

const adminConfig = {
  host: process.env.PGADMIN_HOST || '127.0.0.1',
  port: Number.parseInt(process.env.PGADMIN_PORT || '5432', 10),
  database: process.env.PGADMIN_DATABASE || 'postgres',
  user: process.env.PGADMIN_USER || 'postgres',
  password: process.env.PGADMIN_PASSWORD || 'postgres',
  connectionTimeoutMillis: 5000,
};

const roles = [
  { name: 'nomina_ec_app', password: 'nomina_ec_app_local' },
  { name: 'nomina_ec_migration', password: 'nomina_ec_migration_local' },
  { name: 'nomina_ec_readonly', password: 'nomina_ec_readonly_local' },
];

async function ensureRole(client, role) {
  const result = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [role.name]);

  if (result.rowCount > 0) {
    console.log(`[DB] Rol local verificado: ${role.name}`);
    return;
  }

  await client.query(`CREATE ROLE ${role.name} LOGIN PASSWORD '${role.password}'`);
  console.log(`[DB] Rol local creado: ${role.name}`);
}

async function ensureDatabase(client) {
  const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', ['nomina_ec']);

  if (result.rowCount > 0) {
    console.log('[DB] Base local verificada: nomina_ec');
    return;
  }

  await client.query('CREATE DATABASE nomina_ec OWNER nomina_ec_migration');
  console.log('[DB] Base local creada: nomina_ec');
}

async function configureDatabase() {
  const client = new Client({ ...adminConfig, database: 'nomina_ec' });
  await client.connect();

  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await client.query('GRANT CONNECT ON DATABASE nomina_ec TO nomina_ec_app, nomina_ec_readonly');
    await client.query('GRANT USAGE ON SCHEMA public TO nomina_ec_app, nomina_ec_readonly');
    await client.query('GRANT CREATE ON SCHEMA public TO nomina_ec_migration');
    console.log('[DB] Extensiones y privilegios locales verificados');
  } finally {
    await client.end();
  }
}

async function main() {
  const client = new Client(adminConfig);
  await client.connect();

  try {
    for (const role of roles) {
      await ensureRole(client, role);
    }

    await ensureDatabase(client);
  } finally {
    await client.end();
  }

  await configureDatabase();
}

main().catch((err) => {
  console.error('[DB] Error preparando PostgreSQL local', {
    code: err.code || 'DB_SETUP_ERROR',
    statusCode: 500,
    correlationId: process.env.CORRELATION_ID || 'fase-03-postgresql',
    userId: process.env.USER_ID || null,
    message: err.message,
  });
  process.exit(1);
});
