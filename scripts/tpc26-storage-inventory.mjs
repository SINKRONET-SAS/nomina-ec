import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_ROOT = path.resolve(process.env.LOCAL_STORAGE_DIR || 'backend/storage/local-files');

function hashFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function classify(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/').toLowerCase();
  const segments = normalized.split('/');
  if (segments[0] === 'documentos') return 'evidencia_legal';
  if (normalized.endsWith('.metadata.json')) return 'metadata_companion';
  if (/(^|\/)(tmp|temp|preview|previews|cache|test|tests|smoke)(\/|$)/.test(normalized)) return 'temporal_candidato';
  return 'operativo_no_legal';
}

function collectFiles(root) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else if (entry.isFile()) {
        const relativePath = path.relative(root, fullPath).replace(/\\/g, '/');
        const stat = fs.statSync(fullPath);
        files.push({
          relativePath,
          bytes: stat.size,
          extension: path.extname(entry.name).toLowerCase() || '(sin extension)',
          category: classify(relativePath),
          sha256: hashFile(fullPath),
        });
      }
    }
  };
  visit(root);
  return files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

export function inspectStorage(root = DEFAULT_ROOT) {
  const files = collectFiles(root);
  const byCategory = Object.fromEntries([...new Set(files.map((file) => file.category))].sort().map((category) => {
    const values = files.filter((file) => file.category === category);
    return [category, { files: values.length, bytes: values.reduce((total, file) => total + file.bytes, 0) }];
  }));
  const duplicateGroups = Object.values(files.reduce((groups, file) => {
    const key = `${file.bytes}:${file.sha256}`;
    groups[key] = groups[key] || [];
    groups[key].push(file.relativePath);
    return groups;
  }, {})).filter((group) => group.length > 1);

  return {
    generatedAt: new Date().toISOString(),
    root,
    access: fs.existsSync(root) ? 'local_disponible' : 'local_no_disponible',
    files: files.length,
    bytes: files.reduce((total, file) => total + file.bytes, 0),
    byCategory,
    duplicateGroups,
    legalEvidenceExcluded: files.filter((file) => file.category === 'evidencia_legal').length,
    externalDatabase: process.env.DATABASE_URL ? 'configurada_no_consultada_por_inventario_local' : 'no_disponible_en_entorno',
    externalObjectStorage: process.env.AWS_S3_BUCKET ? 'configurado_no_consultado_por_inventario_local' : 'no_disponible_en_entorno',
    filesDetail: files,
  };
}

function markdownReport(report) {
  const categories = Object.entries(report.byCategory).map(([category, summary]) => `| ${category} | ${summary.files} | ${summary.bytes} |`).join('\n');
  const duplicates = report.duplicateGroups.length === 0
    ? 'No se encontraron grupos duplicados por SHA-256 y tamaño.'
    : report.duplicateGroups.map((group) => `- ${group.join(', ')}`).join('\n');
  return `# TPC26-05 - Inventario de almacenamiento\n\nGenerado: ${report.generatedAt}\n\n- Raíz: \`${report.root}\`\n- Archivos: ${report.files}\n- Bytes: ${report.bytes}\n- Evidencias legales excluidas de limpieza: ${report.legalEvidenceExcluded}\n- PostgreSQL: ${report.externalDatabase}\n- S3/objeto externo: ${report.externalObjectStorage}\n\n## Resumen\n\n| Categoría | Archivos | Bytes |\n|---|---:|---:|\n${categories}\n\n## Duplicados\n\n${duplicates}\n\n## Decisión dry-run\n\nNo se eliminan, renombran ni mueven archivos en este inventario. Las rutas bajo \`documentos/\` se consideran evidencia legal y quedan excluidas de cualquier limpieza automática. La limpieza posterior solo puede actuar sobre candidatos temporales no legales con manifiesto reversible.\n`;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tpc26-storage-inventory.mjs')) {
  const report = inspectStorage();
  const reportJson = path.resolve('docs2/TPC26-05-storage-inventory.json');
  const reportMd = path.resolve('docs2/TPC26-05-storage-inventory.md');
  fs.writeFileSync(reportJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(reportMd, markdownReport(report), 'utf8');
  console.log(JSON.stringify({ reportJson, reportMd, files: report.files, bytes: report.bytes, byCategory: report.byCategory }, null, 2));
}
