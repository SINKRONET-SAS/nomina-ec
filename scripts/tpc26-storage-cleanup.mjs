import fs from 'node:fs';
import path from 'node:path';
import { inspectStorage } from './tpc26-storage-inventory.mjs';

const root = path.resolve(process.env.LOCAL_STORAGE_DIR || 'backend/storage/local-files');
const report = inspectStorage(root);
const candidates = report.filesDetail.filter((file) => file.category === 'temporal_candidato');
const isDryRun = !process.argv.includes('--apply');

if (isDryRun) {
  console.log(JSON.stringify({ mode: 'dry-run', root, candidates, message: 'No se modificaron archivos.' }, null, 2));
  process.exit(0);
}

if (process.env.TPC26_STORAGE_APPLY !== 'CONFIRMADO') {
  console.error(JSON.stringify({
    code: 'TPC26_STORAGE_CONFIRMATION_REQUIRED',
    statusCode: 412,
    message: 'La limpieza requiere TPC26_STORAGE_APPLY=CONFIRMADO y conserva un manifiesto reversible.',
  }));
  process.exit(1);
}

const quarantine = path.join(root, 'quarantine', `tpc26-${Date.now()}`);
const moved = [];
for (const candidate of candidates) {
  const source = path.join(root, candidate.relativePath);
  const target = path.join(quarantine, candidate.relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.renameSync(source, target);
  moved.push({ ...candidate, quarantinePath: path.relative(root, target).replace(/\\/g, '/') });
}

const manifest = {
  generatedAt: new Date().toISOString(),
  root,
  mode: 'quarantine-reversible',
  moved,
  restoration: moved.map((file) => ({
    from: file.quarantinePath,
    to: file.relativePath,
  })),
};
fs.writeFileSync(path.join(quarantine, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(manifest, null, 2));
