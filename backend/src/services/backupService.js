'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { spawn } = require('child_process');
const { pipeline } = require('stream/promises');
const { uploadEncryptedBackup } = require('./googleDriveBackupService');

const RETENTION_DAYS = Math.max(
  1,
  parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10)
);

function resolveBackupDir() {
  return path.resolve(process.cwd(), process.env.BACKUP_DIR || './backups');
}

function ensureBackupDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function parseDatabaseConfig() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no esta configurado');
  const url = new URL(process.env.DATABASE_URL);
  return {
    host: url.hostname,
    port: url.port || '5432',
    database: url.pathname.replace(/^\//, ''),
    username: decodeURIComponent(url.username || ''),
    password: decodeURIComponent(url.password || ''),
  };
}

function parseEncryptionKey() {
  const value = String(process.env.BACKUP_ENCRYPTION_KEY || '').trim();
  const key = /^[a-fA-F0-9]{64}$/.test(value)
    ? Buffer.from(value, 'hex')
    : Buffer.from(value, 'base64');
  if (key.length !== 32) {
    throw new Error('BACKUP_ENCRYPTION_KEY debe contener exactamente 32 bytes en base64 o hex');
  }
  return key;
}

function getBackupFilename(now = new Date()) {
  const prefix = String(process.env.BACKUP_FILENAME_PREFIX || 'nuevo_nomina').replace(
    /[^a-zA-Z0-9_-]/g,
    '_'
  );
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  return `${prefix}_${timestamp}.sql`;
}

async function encryptAndCompressBackup(inputPath, outputPath) {
  const key = parseEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  await fs.promises.writeFile(outputPath, Buffer.concat([Buffer.from('SNKBAK01'), iv]));
  await pipeline(
    fs.createReadStream(inputPath),
    zlib.createGzip({ level: 9 }),
    cipher,
    fs.createWriteStream(outputPath, { flags: 'a' })
  );
  await fs.promises.appendFile(outputPath, cipher.getAuthTag());
}

async function removeIfExists(filePath) {
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function runPgDump(outputPath) {
  const db = parseDatabaseConfig();
  const args = [
    '-h',
    db.host,
    '-p',
    db.port,
    '-U',
    db.username,
    '-d',
    db.database,
    '-f',
    outputPath,
  ];

  await new Promise((resolve, reject) => {
    const child = spawn(process.env.PG_DUMP_PATH || 'pg_dump', args, {
      env: { ...process.env, PGPASSWORD: db.password },
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `pg_dump finalizo con codigo ${code}`));
    });
  });
}

async function runDatabaseBackup() {
  const dir = resolveBackupDir();
  ensureBackupDir(dir);
  const filename = getBackupFilename();
  const rawPath = path.join(dir, filename);
  const encryptedFilename = `${filename}.gz.enc`;
  const encryptedPath = path.join(dir, encryptedFilename);

  try {
    await runPgDump(rawPath);
    await encryptAndCompressBackup(rawPath, encryptedPath);
    const remote = await uploadEncryptedBackup({
      filePath: encryptedPath,
      folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
      driveId: process.env.GOOGLE_DRIVE_ID,
      filename: encryptedFilename,
      filenamePrefix: process.env.BACKUP_FILENAME_PREFIX || 'nuevo_nomina',
      retentionDays: RETENTION_DAYS,
    });
    console.log('[BACKUP] Backup cifrado cargado en Google Drive', {
      filename: encryptedFilename,
      driveFileId: remote.uploaded.id,
      bytes: remote.uploaded.size,
      deletedExpiredBackups: remote.deletedCount,
    });
    return remote;
  } finally {
    await Promise.allSettled([removeIfExists(rawPath), removeIfExists(encryptedPath)]);
  }
}

module.exports = {
  encryptAndCompressBackup,
  parseEncryptionKey,
  runDatabaseBackup,
};
