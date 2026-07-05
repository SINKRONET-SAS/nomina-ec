// ============================================================
// SKNOMINA - Seed seguro de SUPERADMIN y OWNER demo opcional
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

function hasAllEnv(names) {
  return names.every((name) => Boolean(process.env[name]));
}

function optionalEnv(name) {
  return String(process.env[name] || '').trim();
}

async function upsertTenant(client, tenant) {
  const result = await client.query(`
    INSERT INTO tenants (ruc, razon_social, nombre_comercial, configuracion)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (ruc) DO UPDATE SET
      razon_social = EXCLUDED.razon_social,
      nombre_comercial = EXCLUDED.nombre_comercial,
      configuracion = tenants.configuracion || EXCLUDED.configuracion,
      activo = true,
      updated_at = NOW()
    RETURNING id
  `, [
    tenant.ruc,
    tenant.razonSocial,
    tenant.nombreComercial || tenant.razonSocial,
    JSON.stringify(tenant.configuracion || {}),
  ]);

  return result.rows[0];
}

function assertPasswordComplexity(password, label = 'usuario') {
  if (!password || String(password).length < 10) {
    throw new Error(`La contraseña de ${label} debe tener al menos 10 caracteres.`);
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error(`La contraseña de ${label} debe ser alfanumérica (letras y números).`);
  }
}

async function upsertUser(client, user) {
  assertPasswordComplexity(user.password, user.role || 'usuario');
  const passwordHash = await bcrypt.hash(user.password, 10);
  const email = String(user.email || '').trim().toLowerCase();
  const existing = user.tenantId
    ? await client.query(
      'SELECT id FROM usuarios WHERE tenant_id = $1 AND lower(email) = lower($2) LIMIT 1',
      [user.tenantId, email]
    )
    : await client.query(
      'SELECT id FROM usuarios WHERE tenant_id IS NULL AND lower(email) = lower($1) AND rol = $2 ORDER BY created_at ASC LIMIT 1',
      [email, user.role]
    );

  if (existing.rows[0]) {
    await client.query(`
      UPDATE usuarios
      SET tenant_id = $1,
          email = $2,
          password_hash = $3,
          rol = $4,
          nombres = $5,
          apellidos = $6,
          activo = true,
          updated_at = NOW()
      WHERE id = $7
    `, [user.tenantId, email, passwordHash, user.role, user.names, user.lastNames, existing.rows[0].id]);
    return;
  }

  await client.query(`
    INSERT INTO usuarios (tenant_id, email, password_hash, rol, nombres, apellidos)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [user.tenantId, email, passwordHash, user.role, user.names, user.lastNames]);
}

async function main() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    let founderTenantId = null;
    if (hasAllEnv(['FOUNDER_TENANT_RUC', 'FOUNDER_TENANT_RAZON_SOCIAL'])) {
      const founderTenant = await upsertTenant(client, {
        ruc: requireEnv('FOUNDER_TENANT_RUC'),
        razonSocial: requireEnv('FOUNDER_TENANT_RAZON_SOCIAL'),
        nombreComercial: optionalEnv('FOUNDER_TENANT_NOMBRE_COMERCIAL') || requireEnv('FOUNDER_TENANT_RAZON_SOCIAL'),
        configuracion: {
          founderTenant: true,
          seedSource: 'seed-superadmin-owner',
        },
      });
      founderTenantId = founderTenant.id;
    }

    await upsertUser(client, {
      tenantId: founderTenantId,
      email: requireEnv('SUPERADMIN_EMAIL'),
      password: requireEnv('SUPERADMIN_PASSWORD'),
      role: 'superadmin',
      names: process.env.SUPERADMIN_NAMES || 'Superadmin',
      lastNames: process.env.SUPERADMIN_LAST_NAMES || 'HAIKY',
    });

    const ownerEnvNames = ['OWNER_TENANT_RUC', 'OWNER_TENANT_RAZON_SOCIAL', 'OWNER_EMAIL', 'OWNER_PASSWORD'];
    if (!hasAllEnv(ownerEnvNames)) {
      console.log(founderTenantId
        ? '[SEED] SUPERADMIN fundador verificado con tenant propio. OWNER cliente omitido.'
        : '[SEED] SUPERADMIN tecnico verificado sin tenant fundador. OWNER cliente omitido.'
      );
      return;
    }

    const tenantResult = await upsertTenant(client, {
      ruc: requireEnv('OWNER_TENANT_RUC'),
      razonSocial: requireEnv('OWNER_TENANT_RAZON_SOCIAL'),
      nombreComercial: optionalEnv('OWNER_TENANT_NOMBRE_COMERCIAL') || requireEnv('OWNER_TENANT_RAZON_SOCIAL'),
      configuracion: {
        seedSource: 'seed-superadmin-owner',
      },
    });

    await upsertUser(client, {
      tenantId: tenantResult.id,
      email: requireEnv('OWNER_EMAIL'),
      password: requireEnv('OWNER_PASSWORD'),
      role: 'owner',
      names: process.env.OWNER_NAMES || 'Owner',
      lastNames: process.env.OWNER_LAST_NAMES || 'Tenant',
    });

    console.log('[SEED] SUPERADMIN y OWNER demo verificados correctamente');
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
