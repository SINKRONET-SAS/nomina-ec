import * as SQLite from 'expo-sqlite';

let db = null;

function database() {
  if (!db) db = SQLite.openDatabaseSync('sknomina.db');
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

// --- Cierre mensual movilización ---

export async function initPeriodoCierreTable() {
  await database().execAsync(`
    CREATE TABLE IF NOT EXISTS movilizacion_periodo_cierre (
      periodo TEXT PRIMARY KEY,
      estado TEXT NOT NULL DEFAULT 'abierto',
      fecha_envio TEXT
    );
  `);
}

export async function getPeriodoCierre(periodo) {
  return database().getFirstAsync(
    'SELECT * FROM movilizacion_periodo_cierre WHERE periodo = ?',
    [periodo]
  );
}

export async function cerrarPeriodo(periodo) {
  const now = new Date().toISOString();
  await database().runAsync(
    `INSERT INTO movilizacion_periodo_cierre (periodo, estado, fecha_envio)
     VALUES (?, 'enviado', ?)
     ON CONFLICT(periodo) DO UPDATE SET estado = 'enviado', fecha_envio = ?`,
    [periodo, now, now]
  );
}

export async function isPeriodoBloqueado(periodo) {
  const row = await getPeriodoCierre(periodo);
  return row?.estado === 'enviado' || row?.estado === 'bloqueado';
}

export async function getResumenPorDia(periodo) {
  return database().getAllAsync(
    `SELECT fecha, COUNT(*) AS registros, SUM(valor_usd) AS total
     FROM gasto_movilizacion
     WHERE periodo = ? AND estado != 'rechazado'
     GROUP BY fecha
     ORDER BY fecha ASC`,
    [periodo]
  );
}
