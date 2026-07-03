#!/usr/bin/env node
require('dotenv').config();

const { syncLegalParametersFromGlobal } = require('../src/services/configurationService');
const db = require('../src/config/database');

function arg(name, fallback = null) {
  const prefix = `--${name}=`;
  const found = process.argv.find((item) => item.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

async function main() {
  const year = Number(arg('year', new Date().getFullYear()));
  const tenantId = arg('tenant-id');
  const allTenants = process.argv.includes('--all-tenants') || !tenantId;
  const userId = process.env.LEGAL_PARAMETERS_SYNC_USER_ID || null;

  const result = await syncLegalParametersFromGlobal(
    year,
    { id: userId, rol: 'superadmin', tenantId: null },
    { correlationId: `sync-legal-parameters-${year}`, ipAddress: 'script' },
    { allTenants, tenantId }
  );

  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
}

main()
  .catch((err) => {
    console.error(JSON.stringify({
      ok: false,
      code: err.code || 'LEGAL_PARAMETERS_SYNC_ERROR',
      message: err.message,
    }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    if (typeof db.pool?.end === 'function') {
      await db.pool.end();
    }
  });
