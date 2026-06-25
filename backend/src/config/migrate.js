// ============================================================
// Nomina-Ec - Ejecutor de migraciones Prisma
// ============================================================
const { spawn } = require('child_process');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('[DB] DATABASE_URL no configurada para ejecutar migraciones', {
      code: 'DATABASE_URL_REQUIRED',
      statusCode: 500,
      correlationId: process.env.CORRELATION_ID || 'db-migrate',
      userId: process.env.USER_ID || null,
    });
    process.exit(1);
  }

  const isWindows = process.platform === 'win32';
  const command = isWindows ? 'npx.cmd prisma migrate deploy' : 'npx';
  const args = isWindows ? [] : ['prisma', 'migrate', 'deploy'];
  let child;

  try {
    child = spawn(command, args, {
      cwd: path.join(__dirname, '../..'),
      env: process.env,
      shell: isWindows,
      stdio: 'inherit',
    });
  } catch (err) {
    console.error('[DB] Error creando proceso de migraciones Prisma', {
      code: err.code || 'PRISMA_MIGRATE_SPAWN_ERROR',
      statusCode: 500,
      correlationId: process.env.CORRELATION_ID || 'db-migrate',
      userId: process.env.USER_ID || null,
      message: err.message,
    });
    process.exit(1);
  }

  child.on('error', (err) => {
    console.error('[DB] Error iniciando migraciones Prisma', {
      code: err.code || 'PRISMA_MIGRATE_START_ERROR',
      statusCode: 500,
      correlationId: process.env.CORRELATION_ID || 'db-migrate',
      userId: process.env.USER_ID || null,
      message: err.message,
    });
    process.exit(1);
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      console.error('[DB] Migraciones Prisma finalizaron con error', {
        code: 'PRISMA_MIGRATE_FAILED',
        statusCode: 500,
        correlationId: process.env.CORRELATION_ID || 'db-migrate',
        userId: process.env.USER_ID || null,
        exitCode: code,
      });
      process.exit(code || 1);
    }

    console.log('[DB] Migraciones Prisma aplicadas correctamente');
  });
}

runMigration();
