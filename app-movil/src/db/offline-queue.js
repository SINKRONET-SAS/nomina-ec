import * as SQLite from 'expo-sqlite';

let db = null;

function database() {
  if (!db) db = SQLite.openDatabaseSync('sknomina.db');
  return db;
}

export async function initOfflineQueue() {
  await database().execAsync(`
    CREATE TABLE IF NOT EXISTS offline_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      intentos INTEGER NOT NULL DEFAULT 0,
      estado TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_attempt TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_offline_queue_estado
      ON offline_queue(estado);
  `);
}

export async function insertPending(tipo, payload) {
  return database().runAsync(
    'INSERT INTO offline_queue (tipo, payload_json) VALUES (?, ?)',
    [tipo, JSON.stringify(payload)]
  );
}

export async function getPendingItems() {
  return database().getAllAsync(
    "SELECT * FROM offline_queue WHERE estado = 'pending' ORDER BY created_at ASC"
  );
}

export async function markCompleted(id) {
  return database().runAsync(
    "UPDATE offline_queue SET estado = 'completed', last_attempt = datetime('now') WHERE id = ?",
    [id]
  );
}

export async function markFailed(id) {
  return database().runAsync(
    "UPDATE offline_queue SET estado = CASE WHEN intentos >= 5 THEN 'failed' ELSE 'pending' END, intentos = intentos + 1, last_attempt = datetime('now') WHERE id = ?",
    [id]
  );
}

export async function processQueue(apiInstance) {
  const items = await getPendingItems();
  const results = { sent: 0, failed: 0 };

  for (const item of items) {
    try {
      const payload = JSON.parse(item.payload_json);
      if (item.tipo === 'mobilization_report') {
        await apiInstance.sendMobilizationReport(payload);
      } else if (item.tipo === 'permission_request') {
        await apiInstance.requestPermission(payload);
      } else if (item.tipo === 'mark') {
        await apiInstance.registerMark(payload);
      }
      await markCompleted(item.id);
      results.sent += 1;
    } catch (err) {
      await markFailed(item.id);
      results.failed += 1;
    }
  }

  return results;
}

export async function getQueueCount() {
  const row = await database().getFirstAsync(
    "SELECT COUNT(*) AS count FROM offline_queue WHERE estado = 'pending'"
  );
  return row?.count || 0;
}
