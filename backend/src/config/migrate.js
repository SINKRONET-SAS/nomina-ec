// ============================================================
// SKNOMINA - Ejecutor de migraciones Prisma
// ============================================================
const { spawn } = require('child_process');
const path = require('path');
const logger = require('../utils/logger');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    logger.error({
      code: 'DATABASE_URL_REQUIRED',
      statusCode: 500,
      correlationId: process.env.CORRELATION_ID || 'db-migrate',
      userId: process.env.USER_ID || null,
    }, 'DATABASE_URL no configurada para ejecutar migraciones');
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
    logger.error({
      code: err.code || 'PRISMA_MIGRATE_SPAWN_ERROR',
      statusCode: 500,
      correlationId: process.env.CORRELATION_ID || 'db-migrate',
      userId: process.env.USER_ID || null,
    }, err.message || 'Error creando proceso de migraciones Prisma');
    process.exit(1);
  }

  child.on('error', (err) => {
    logger.error({
      code: err.code || 'PRISMA_MIGRATE_START_ERROR',
      statusCode: 500,
      correlationId: process.env.CORRELATION_ID || 'db-migrate',
      userId: process.env.USER_ID || null,
    }, err.message || 'Error iniciando migraciones Prisma');
    process.exit(1);
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      logger.error({
        code: 'PRISMA_MIGRATE_FAILED',
        statusCode: 500,
        correlationId: process.env.CORRELATION_ID || 'db-migrate',
        userId: process.env.USER_ID || null,
        exitCode: code,
      }, 'Migraciones Prisma finalizaron con error');
      process.exit(code || 1);
    }

    logger.info({
      code: 'PRISMA_MIGRATE_APPLIED',
      statusCode: 200,
      correlationId: process.env.CORRELATION_ID || 'db-migrate',
      userId: process.env.USER_ID || null,
    }, 'Migraciones Prisma aplicadas correctamente');
  });
}

runMigration();
