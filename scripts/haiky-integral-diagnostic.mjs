import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs2', 'auditoria-integral-haiky-2026');
const RUNTIME_DIRS = ['backend/src', 'frontend-web/src', 'app-movil/src', 'scripts'];
const APP_RUNTIME_DIRS = ['backend/src', 'frontend-web/src', 'app-movil/src'];
const DOC_DIRS = ['docs2', '.github/prompts'];
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.json', '.md', '.prisma', '.sql']);
const INTENTIONAL_PATTERN_FILES = new Set([
  'scripts/verify-system-contracts.mjs',
  '.github/prompts/DIAGNOSTICO-CIERRE-FUNCIONAL-NOMINA-EC-2026-01-encoding-mensajes-base.md',
]);

function walk(relativeDir) {
  const absoluteDir = path.join(ROOT, relativeDir);
  if (!existsSync(absoluteDir)) return [];
  const entries = readdirSync(absoluteDir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const relativePath = path.join(relativeDir, entry.name);
    const absolutePath = path.join(ROOT, relativePath);
    const normalized = relativePath.replaceAll('\\', '/');
    if (normalized.startsWith('docs2/auditoria-integral-haiky-2026/')) return [];
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'build', '.expo'].includes(entry.name)) return [];
      return walk(relativePath);
    }
    if (!entry.isFile()) return [];
    return SOURCE_EXTENSIONS.has(path.extname(entry.name)) ? [relativePath.replaceAll('\\', '/')] : [];
  });
}

function readUtf8(relativePath) {
  const buffer = readFileSync(path.join(ROOT, relativePath));
  const text = buffer.toString('utf8');
  if (Buffer.from(text, 'utf8').toString('utf8') !== text) {
    throw new Error(`${relativePath} no se pudo redondear como UTF-8 valido`);
  }
  return text;
}

function lineNumber(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function scanPattern(files, pattern, type, severity) {
  const findings = [];
  for (const file of files) {
    const text = readUtf8(file);
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text))) {
      findings.push({
        type,
        severity,
        file,
        line: lineNumber(text, match.index),
        evidence: match[0].slice(0, 180).replace(/\s+/g, ' '),
      });
    }
  }
  return findings;
}

function hasFile(relativePath) {
  return existsSync(path.join(ROOT, relativePath));
}

function isTestFile(relativePath) {
  return /\.(test|spec)\.(js|jsx|mjs)$/.test(relativePath);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

const runtimeFiles = RUNTIME_DIRS.flatMap(walk);
const appRuntimeFiles = APP_RUNTIME_DIRS.flatMap(walk).filter((file) => !isTestFile(file));
const debtScanFiles = runtimeFiles.filter((file) => !file.startsWith('scripts/haiky-integral-'));
const docFiles = DOC_DIRS.flatMap(walk);
const allFiles = [...new Set([...runtimeFiles, ...docFiles])].sort();
const mojibakeScanFiles = allFiles.filter((file) => !INTENTIONAL_PATTERN_FILES.has(file));

const silentCatchFindings = scanPattern(
  runtimeFiles,
  /catch\s*\([^)]*\)\s*=>\s*\{\s*\}|catch\s*\([^)]*\)\s*\{\s*\}/g,
  'zero_silent_failures',
  'alta'
);

const mojibakeFindings = scanPattern(
  mojibakeScanFiles,
  new RegExp(`[${String.fromCharCode(0x00c3)}${String.fromCharCode(0x00c2)}${String.fromCharCode(0xfffd)}]`, 'g'),
  'utf8_mojibake_visible',
  'alta'
);

const todoFindings = scanPattern(
  debtScanFiles,
  /\b(TODO|FIXME|HACK)\b/g,
  'deuda_codigo_runtime',
  'media'
);

const simulatedRuntimeFindings = scanPattern(
  appRuntimeFiles,
  /\b(mock|simulad[oa]|fictici[oa]|coming soon|proximamente|pr[oó]ximamente)\b/gi,
  'funcionalidad_simulada_runtime',
  'media'
);

const confirmedCapabilities = [
  {
    capability: 'SQLite movilizacion local',
    status: hasFile('app-movil/src/db/movilizacion.js') && readUtf8('app-movil/package.json').includes('expo-sqlite') ? 'confirmado' : 'faltante',
    evidence: ['app-movil/package.json', 'app-movil/src/db/movilizacion.js'],
  },
  {
    capability: 'Aprobacion backend/PWA de informes de movilizacion',
    status: hasFile('backend/src/controllers/movilizacionController.js') && hasFile('frontend-web/src/pages/Operacion/MovilizacionAprobacion.jsx') ? 'confirmado' : 'faltante',
    evidence: ['backend/src/controllers/movilizacionController.js', 'frontend-web/src/pages/Operacion/MovilizacionAprobacion.jsx'],
  },
  {
    capability: 'Historial y autoservicio empleado',
    status: hasFile('frontend-web/src/pages/Empleados/HistorialEmpleado.jsx') && hasFile('app-movil/src/screens/AutoservicioScreen.js') ? 'confirmado' : 'parcial',
    evidence: ['frontend-web/src/pages/Empleados/HistorialEmpleado.jsx', 'app-movil/src/screens/AutoservicioScreen.js'],
  },
  {
    capability: 'Permisos con aprobacion operativa',
    status: hasFile('app-movil/src/screens/PermisosScreen.js') && hasFile('frontend-web/src/pages/Operacion/PermisosOperacion.jsx') ? 'confirmado' : 'parcial',
    evidence: ['app-movil/src/screens/PermisosScreen.js', 'frontend-web/src/pages/Operacion/PermisosOperacion.jsx'],
  },
  {
    capability: 'Canal de pagos PayPhone',
    status: hasFile('backend/src/services/payphoneGatewayService.js') && hasFile('frontend-web/src/pages/Planes.jsx') ? 'confirmado_con_gate' : 'parcial',
    evidence: ['backend/src/services/payphoneGatewayService.js', 'frontend-web/src/pages/Planes.jsx'],
  },
  {
    capability: 'Email y auditoria de comunicaciones',
    status: hasFile('backend/src/services/communicationService.js') && hasFile('frontend-web/src/pages/Configuracion/Comunicaciones.jsx') ? 'confirmado' : 'parcial',
    evidence: ['backend/src/services/communicationService.js', 'frontend-web/src/pages/Configuracion/Comunicaciones.jsx'],
  },
];

const findings = [
  ...silentCatchFindings,
  ...mojibakeFindings,
  ...todoFindings,
  ...simulatedRuntimeFindings,
];

const report = {
  generatedAt: new Date().toISOString(),
  repository: 'SINKRONET-SAS/nomina-ec',
  rulesSource: 'RULES.md',
  filesScanned: allFiles.length,
  runtimeFilesScanned: runtimeFiles.length,
  confirmedCapabilities,
  findingSummary: findings.reduce((acc, finding) => {
    acc[finding.type] = (acc[finding.type] || 0) + 1;
    return acc;
  }, {}),
  findings,
  evidenceHash: sha256(JSON.stringify({ confirmedCapabilities, findings })),
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(path.join(OUT_DIR, 'DIAGNOSTICO_JSON.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const markdown = [
  '# Diagnostico integral Haiky 2026',
  '',
  `Generado: ${report.generatedAt}`,
  `Archivos runtime revisados: ${report.runtimeFilesScanned}`,
  `Hash evidencia: ${report.evidenceHash}`,
  '',
  '## Capacidades confirmadas',
  '',
  ...confirmedCapabilities.map((item) => `- ${item.capability}: ${item.status} (${item.evidence.join(', ')})`),
  '',
  '## Hallazgos automatizados',
  '',
  ...Object.entries(report.findingSummary).map(([key, count]) => `- ${key}: ${count}`),
  '',
  findings.length
    ? findings.slice(0, 80).map((finding) => `- ${finding.severity} ${finding.type}: ${finding.file}:${finding.line} ${finding.evidence}`).join('\n')
    : 'No se detectaron hallazgos automatizados en los patrones configurados.',
  '',
].join('\n');

writeFileSync(path.join(OUT_DIR, 'DIAGNOSTICO_AUTOMATIZADO.md'), markdown, 'utf8');
console.log(JSON.stringify({
  ok: true,
  outDir: path.relative(ROOT, OUT_DIR).replaceAll('\\', '/'),
  filesScanned: report.filesScanned,
  findingSummary: report.findingSummary,
}, null, 2));
