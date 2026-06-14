afterAll(async () => {
  try {
    const db = require('../src/config/database');
    if (!db.pool?.end) {
      console.log('[TEST] Cierre de pool omitido porque la base de datos esta mockeada', {
        correlationId: 'jest-setup',
      });
      return;
    }

    await db.pool.end();
  } catch (err) {
    console.error('[TEST] Error cerrando pool de base de datos', {
      code: err.code || 'TEST_DB_POOL_CLOSE_ERROR',
      statusCode: 500,
      correlationId: 'jest-setup',
      userId: null,
      message: err.message,
    });
  }
});
