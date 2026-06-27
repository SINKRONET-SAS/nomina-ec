import * as SQLite from 'expo-sqlite';

let db = null;

function database() {
  if (!db) db = SQLite.openDatabaseSync('nomina_ec.db');
  return db;
}

export async function initMovilizacionDB() {
  await database().execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS gasto_movilizacion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      origen TEXT NOT NULL DEFAULT '',
      destino TEXT NOT NULL DEFAULT '',
      km REAL,
      valor_usd REAL NOT NULL,
      concepto TEXT NOT NULL DEFAULT 'otro',
      periodo TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'pendiente',
      informe_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_gasto_movilizacion_periodo
      ON gasto_movilizacion(periodo, estado);
  `);
}

export async function insertGasto(gasto) {
  return database().runAsync(
    `INSERT INTO gasto_movilizacion (
      fecha, origen, destino, km, valor_usd, concepto, periodo
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      gasto.fecha,
      gasto.origen || '',
      gasto.destino || '',
      gasto.km === '' || gasto.km === undefined ? null : Number(gasto.km),
      Number(gasto.valor_usd),
      gasto.concepto || 'otro',
      gasto.periodo,
    ]
  );
}

export async function getGastosByPeriodo(periodo) {
  return database().getAllAsync(
    'SELECT * FROM gasto_movilizacion WHERE periodo = ? ORDER BY fecha ASC, id ASC',
    [periodo]
  );
}

export async function deleteGasto(id) {
  return database().runAsync(
    "DELETE FROM gasto_movilizacion WHERE id = ? AND estado = 'pendiente'",
    [id]
  );
}

export async function getTotalesByPeriodo(periodo) {
  return database().getFirstAsync(
    `SELECT COUNT(*) AS registros,
            COUNT(DISTINCT fecha) AS dias,
            COALESCE(SUM(valor_usd), 0) AS total
     FROM gasto_movilizacion
     WHERE periodo = ? AND estado != 'rechazado'`,
    [periodo]
  );
}

export async function marcarGastosEnviados(periodo, informeId) {
  return database().runAsync(
    "UPDATE gasto_movilizacion SET estado = 'enviado', informe_id = ? WHERE periodo = ? AND estado = 'pendiente'",
    [informeId, periodo]
  );
}
