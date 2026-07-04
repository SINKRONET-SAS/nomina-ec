import * as SQLite from 'expo-sqlite';

let db = null;

function database() {
  if (!db) db = SQLite.openDatabaseSync('sknomina.db');
  return db;
}

export async function initRouteCache() {
  await database().execAsync(`
    CREATE TABLE IF NOT EXISTS ruta_hoy_cache (
      fecha TEXT PRIMARY KEY,
      ruta_json TEXT NOT NULL,
      synced_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS perfil_cache (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      nombre TEXT,
      cargo TEXT,
      empresa TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export async function saveRouteToCache(fecha, rutaData) {
  return database().runAsync(
    `INSERT INTO ruta_hoy_cache (fecha, ruta_json, synced_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(fecha) DO UPDATE SET ruta_json = ?, synced_at = datetime('now')`,
    [fecha, JSON.stringify(rutaData), JSON.stringify(rutaData)]
  );
}

export async function getRouteFromCache(fecha) {
  const row = await database().getFirstAsync(
    'SELECT * FROM ruta_hoy_cache WHERE fecha = ?',
    [fecha]
  );
  if (!row) return null;
  try {
    return JSON.parse(row.ruta_json);
  } catch {
    return null;
  }
}

export async function cleanOldCache() {
  return database().runAsync(
    "DELETE FROM ruta_hoy_cache WHERE synced_at < datetime('now', '-7 days')"
  );
}

export async function saveProfileToCache(profile) {
  return database().runAsync(
    `INSERT INTO perfil_cache (id, nombre, cargo, empresa, updated_at)
     VALUES (1, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET nombre = ?, cargo = ?, empresa = ?, updated_at = datetime('now')`,
    [
      profile.nombre || '',
      profile.cargo || '',
      profile.empresa || '',
      profile.nombre || '',
      profile.cargo || '',
      profile.empresa || '',
    ]
  );
}

export async function getProfileFromCache() {
  return database().getFirstAsync('SELECT * FROM perfil_cache WHERE id = 1');
}
