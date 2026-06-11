// ============================================================
// PLAN HAIKY - Seed seguro de SUPERADMIN y OWNER
// ============================================================
const bcrypt = require('bcryptjs');
const { Client } = require('pg');
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('[SEED] DATABASE_URL no configurada', {
    code: 'DATABASE_URL_REQUIRED',
    statusCode: 500,
    correlationId: process.env.CORRELATION_ID || 'fase-08-seed',
    userId: null,
  });
  process.exit(1);
}

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Variable requerida no configurada: ${name}`);
  }

  return value;
}

async function upsertUser(client, user) {
  const passwordHash = await bcrypt.hash(user.password, 10);
  await client.query(`
    INSERT INTO usuarios (tenant_id, email, password_hash, rol, nombres, apellidos)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (tenant_id, email) DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      rol = EXCLUDED.rol,
      nombres = EXCLUDED.nombres,
      apellidos = EXCLUDED.apellidos,
      activo = true,
      updated_at = NOW()
  `, [user.tenantId, user.email, passwordHash, user.role, user.names, user.lastNames]);
}

async function main() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await upsertUser(client, {
      tenantId: null,
      email: requireEnv('SUPERADMIN_EMAIL'),
      password: requireEnv('SUPERADMIN_PASSWORD'),
      role: 'superadmin',
      names: process.env.SUPERADMIN_NAMES || 'Superadmin',
      lastNames: process.env.SUPERADMIN_LAST_NAMES || 'HAIKY',
    });

    const tenantResult = await client.query(`
      INSERT INTO tenants (ruc, razon_social, nombre_comercial)
      VALUES ($1, $2, $3)
      ON CONFLICT (ruc) DO UPDATE SET
        razon_social = EXCLUDED.razon_social,
        nombre_comercial = EXCLUDED.nombre_comercial,
        activo = true,
        updated_at = NOW()
      RETURNING id
    `, [
      requireEnv('OWNER_TENANT_RUC'),
      requireEnv('OWNER_TENANT_RAZON_SOCIAL'),
      process.env.OWNER_TENANT_NOMBRE_COMERCIAL || requireEnv('OWNER_TENANT_RAZON_SOCIAL'),
    ]);

    await upsertUser(client, {
      tenantId: tenantResult.rows[0].id,
      email: requireEnv('OWNER_EMAIL'),
      password: requireEnv('OWNER_PASSWORD'),
      role: 'owner',
      names: process.env.OWNER_NAMES || 'Owner',
      lastNames: process.env.OWNER_LAST_NAMES || 'Tenant',
    });

    console.log('[SEED] SUPERADMIN y OWNER verificados correctamente');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[SEED] Error creando SUPERADMIN y OWNER', {
    code: err.code || 'SEED_SUPERADMIN_OWNER_ERROR',
    statusCode: 500,
    correlationId: process.env.CORRELATION_ID || 'fase-08-seed',
    userId: null,
    message: err.message,
  });
  process.exit(1);
});
