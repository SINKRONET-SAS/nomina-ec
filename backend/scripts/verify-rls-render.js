// ============================================================
// PLAN HAIKY - Verificacion RLS Render
// ============================================================
const crypto = require('crypto');
const fs = require('fs');
require('dotenv').config();

const databaseUrl = process.env.RLS_DATABASE_URL || process.env.DATABASE_URL;
if (process.env.RLS_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.RLS_DATABASE_URL;
}
const db = require('../src/config/database');
const tenantA = process.env.RLS_TENANT_A;
const tenantB = process.env.RLS_TENANT_B;
const employeeA = process.env.RLS_EMPLOYEE_A;

function requireEnv(name, value) {
  if (!value) {
    console.error('[RLS] Variable requerida no configurada', {
      code: 'RLS_ENV_REQUIRED',
      statusCode: 500,
      correlationId: process.env.CORRELATION_ID || 'rls-render',
      userId: null,
      variable: name,
    });
    process.exitCode = 1;
    return false;
  }

  return true;
}

async function main() {
  const envReady = [
    requireEnv('RLS_DATABASE_URL o DATABASE_URL', databaseUrl),
    requireEnv('RLS_TENANT_A', tenantA),
    requireEnv('RLS_TENANT_B', tenantB),
    requireEnv('RLS_EMPLOYEE_A', employeeA),
  ].every(Boolean);

  if (!envReady) {
    return;
  }

  const scriptHash = crypto
    .createHash('sha256')
    .update(fs.readFileSync(__filename, 'utf8'), 'utf8')
    .digest('hex');

  try {
    const userResult = await db.pool.query(`
      SELECT current_user AS usuario,
             COALESCE((SELECT usesuper FROM pg_user WHERE usename = current_user), false) AS superusuario
    `);
    const userInfo = userResult.rows[0];

    if (userInfo.superusuario) {
      throw new Error('La prueba RLS debe ejecutarse con usuario no superusuario');
    }

    const withoutContext = await db.query(
      'SELECT COUNT(*)::int AS total FROM empleados WHERE id = $1',
      [employeeA],
    );
    const visibleInTenantA = await db.runWithTenantContext({ tenantId: tenantA }, () => db.query(
      'SELECT COUNT(*)::int AS total FROM empleados WHERE id = $1',
      [employeeA],
    ));
    const visibleInTenantB = await db.runWithTenantContext({ tenantId: tenantB }, () => db.query(
      'SELECT COUNT(*)::int AS total FROM empleados WHERE id = $1',
      [employeeA],
    ));

    if (visibleInTenantA.rows[0].total !== 1) {
      throw new Error('El empleado de tenant A no fue visible bajo contexto tenant A');
    }

    if (visibleInTenantB.rows[0].total !== 0) {
      throw new Error('RLS permitio visibilidad cruzada entre tenants');
    }

    if (withoutContext.rows[0].total !== 0) {
      throw new Error('RLS permitio leer empleados sin contexto tenant de aplicacion');
    }

    console.log('[RLS] Verificacion Render aprobada', {
      usuario: userInfo.usuario,
      superusuario: userInfo.superusuario,
      scriptHash,
      sinContextoVisible: withoutContext.rows[0].total,
      tenantAVisible: visibleInTenantA.rows[0].total,
      tenantBCruzadoVisible: visibleInTenantB.rows[0].total,
      modo: 'app_db_query_tenant_context',
    });
  } catch (err) {
    console.error('[RLS] Verificacion Render fallida', {
      code: err.code || 'RLS_RENDER_CHECK_FAILED',
      statusCode: 500,
      correlationId: process.env.CORRELATION_ID || 'rls-render',
      userId: null,
      message: err.message,
      scriptHash,
    });
    process.exitCode = 1;
  } finally {
    await db.pool.end();
  }
}

main();
