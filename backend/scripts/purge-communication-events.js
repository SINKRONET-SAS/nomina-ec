const { purgeExpiredCommunicationEvents } = require('../src/services/communicationAuditService');
const db = require('../src/config/database');

async function main() {
  const result = await purgeExpiredCommunicationEvents();
  console.log('[PRIVACIDAD] Eventos de comunicacion vencidos purgados', {
    deleted: result.deleted,
    at: result.at.toISOString(),
  });
}

main()
  .catch((err) => {
    console.error('[PRIVACIDAD] No se pudo purgar eventos de comunicacion', {
      code: err.code || 'COMMUNICATION_EVENTS_PURGE_ERROR',
      statusCode: 500,
      correlationId: process.env.CORRELATION_ID || 'privacy-purge',
      userId: null,
      message: err.message,
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.pool.end();
  });
