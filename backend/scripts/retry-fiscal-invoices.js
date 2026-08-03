// ============================================================
// SKNOMINA - One-shot fiscal invoice retry (Render cron)
// ============================================================
// This script retries pending fiscal invoices via the facturador.
// It does NOT start the Express app, the general cron worker,
// payroll calculation, or persistent disk.
// ============================================================
require('dotenv').config();

const { retryPendingInvoices } = require('../src/services/fiscalInvoiceService');
const db = require('../src/config/database');

const CORRELATION_ID = 'cron-fiscal-oneshot';

async function main() {
  const result = await retryPendingInvoices(CORRELATION_ID);
  console.log('[FISCAL] Reintento de facturas pendientes completado', {
    code: 'FISCAL_RETRY_COMPLETED',
    correlationId: CORRELATION_ID,
    retried: result.retried,
  });
}

main()
  .catch((err) => {
    console.error('[FISCAL] Error de infraestructura al reintentar facturas', {
      code: err.code || 'FISCAL_RETRY_INFRA_ERROR',
      statusCode: 500,
      correlationId: CORRELATION_ID,
      userId: null,
      message: err.message,
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.pool.end();
  });
