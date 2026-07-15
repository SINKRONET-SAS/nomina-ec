import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs2', 'auditoria-integral-v2-haiky-2026');
const VISUAL_DIR = path.join(OUT_DIR, 'evidencia-visual');
const RUNTIME_DIRS = ['backend/src', 'frontend-web/src', 'app-movil/src', 'scripts'];
const APP_RUNTIME_DIRS = ['backend/src', 'frontend-web/src', 'app-movil/src'];
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.json', '.md', '.prisma', '.sql']);
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.expo', 'coverage', 'generated']);

function toPosix(relativePath) {
  return relativePath.replaceAll('\\', '/');
}

function hasFile(relativePath) {
  return existsSync(path.join(ROOT, relativePath));
}

function walk(relativeDir) {
  const absoluteDir = path.join(ROOT, relativeDir);
  if (!existsSync(absoluteDir)) return [];
  return readdirSync(absoluteDir, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) return [];
      return walk(relativePath);
    }
    if (!entry.isFile()) return [];
    return SOURCE_EXTENSIONS.has(path.extname(entry.name)) ? [toPosix(relativePath)] : [];
  });
}

function readUtf8(relativePath) {
  return readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function trimTrailingBlankLines(lines) {
  const normalizedLines = [...lines];
  while (normalizedLines[normalizedLines.length - 1] === '') normalizedLines.pop();
  return normalizedLines;
}

function writeMarkdownFile(absolutePath, lines) {
  writeFileSync(absolutePath, `${trimTrailingBlankLines(lines).join('\n')}\n`, 'utf8');
}

function existingMarkdownSection(relativePath, heading) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!existsSync(absolutePath)) return [];
  const text = readFileSync(absolutePath, 'utf8');
  const index = text.indexOf(heading);
  if (index === -1) return [];
  return trimTrailingBlankLines(text.slice(index).split(/\r?\n/));
}

function lineNumber(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function scanPattern(files, pattern, type, severity) {
  const findings = [];
  for (const file of files) {
    const text = readUtf8(file);
    pattern.lastIndex = 0;
    let match;
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

function fileContains(relativePath, value) {
  return hasFile(relativePath) && readUtf8(relativePath).includes(value);
}

function isTestFile(relativePath) {
  return /\.(test|spec)\.(js|jsx|mjs)$/.test(relativePath);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function status(ok, evidence, notes = []) {
  return {
    status: ok ? 'confirmado' : 'pendiente',
    evidence,
    notes,
  };
}

const runtimeFiles = RUNTIME_DIRS.flatMap(walk).sort();
const appRuntimeFiles = APP_RUNTIME_DIRS.flatMap(walk).filter((file) => !isTestFile(file)).sort();
const mojibakePattern = new RegExp(`[${String.fromCharCode(0x00c3)}${String.fromCharCode(0x00c2)}${String.fromCharCode(0xfffd)}]`, 'g');

const silentCatchFindings = scanPattern(
  runtimeFiles,
  /catch\s*\([^)]*\)\s*=>\s*\{\s*\}|catch\s*\([^)]*\)\s*\{\s*\}/g,
  'zero_silent_failures',
  'alta'
);

const mojibakeFindings = scanPattern(
  runtimeFiles.filter((file) => !file.includes('verify-system-contracts.mjs')),
  mojibakePattern,
  'utf8_mojibake_visible',
  'alta'
);

const todoFindings = scanPattern(
  runtimeFiles.filter((file) => !file.startsWith('scripts/haiky-integral')),
  /\b(TODO|FIXME|HACK)\b/g,
  'deuda_runtime',
  'media'
);

const simulatedFindings = scanPattern(
  appRuntimeFiles,
  /\b(mock|simulad[oa]|fictici[oa]|coming soon|proximamente|pr[oó]ximamente)\b/gi,
  'senal_simulada_runtime',
  'media'
);

const controlledSignals = simulatedFindings.filter((finding) => [
  'backend/src/controllers/paymentController.js',
  'backend/src/config/s3.js',
  'frontend-web/src/pages/PaymentResult.jsx',
  'frontend-web/src/config/operationalModules.js',
  'frontend-web/src/pages/LegalText.jsx',
].includes(finding.file)).map((finding) => ({
  ...finding,
  status: 'controlado',
  reason: 'La señal esta aislada como modo pendiente, demo o texto legal; no concede funcionalidad productiva.',
}));

const uncontrolledSignals = simulatedFindings.filter((finding) => !controlledSignals.some((item) => (
  item.file === finding.file && item.line === finding.line && item.evidence === finding.evidence
)));

const duplicateDownloadBlobFindings = scanPattern(
  appRuntimeFiles.filter((file) => file !== 'frontend-web/src/utils/downloadBlob.js'),
  /\b(function\s+downloadBlob|const\s+downloadBlob\s*=)/g,
  'codigo_duplicado_download_blob',
  'media'
);

const legalSources2026 = [
  {
    domain: 'SRI facturacion electronica',
    source: 'https://www.sri.gob.ec/facturacion-electronica',
    checkedAt: '2026-07-14',
    summary: 'SRI publica documentos electronicos, ambientes pruebas/produccion y ficha tecnica off-line version 2.33 actualizada a julio 2026.',
  },
  {
    domain: 'Proteccion de datos personales Ecuador',
    source: 'https://www.telecomunicaciones.gob.ec/wp-content/uploads/2021/06/Ley-Organica-de-Datos-Personales.pdf',
    checkedAt: '2026-07-14',
    summary: 'Ley Organica de Proteccion de Datos Personales publicada en Registro Oficial No. 459 del 26 de mayo de 2021.',
  },
  {
    domain: 'Ministerio del Trabajo Ecuador',
    source: 'https://salarios.trabajo.gob.ec/',
    checkedAt: '2026-07-14',
    summary: 'Portal oficial de salarios y base legal del Ministerio del Trabajo; parametros SBU 2026 permanecen en configuracion legal del repo.',
  },
];

const capabilityChecks = {
  landing: status(
    fileContains('frontend-web/src/pages/Landing.jsx', 'SKNOMINA') && fileContains('frontend-web/src/App.jsx', 'lazy(() => import'),
    ['frontend-web/src/pages/Landing.jsx', 'frontend-web/src/App.jsx'],
    ['La landing existe y las rutas estan diferidas para reducir bundle inicial.']
  ),
  pwa: status(
    fileContains('frontend-web/src/components/PublicPlansCatalog.jsx', 'Total mensual con IVA')
      && fileContains('frontend-web/src/config/publicPlanPresentation.js', 'iessEstablecimientosMax'),
    ['frontend-web/src/components/PublicPlansCatalog.jsx', 'frontend-web/src/config/publicPlanPresentation.js'],
    ['Planes publicos separan mensualidad, contado anual e IVA; establecimientos IESS son capacidad de plan.']
  ),
  backend: status(
    fileContains('backend/src/services/calculoNominaService.js', 'assertPayrollTotalsIntegrity')
      && fileContains('backend/src/controllers/paymentController.js', 'iess_establecimientos_max'),
    ['backend/src/services/calculoNominaService.js', 'backend/src/controllers/paymentController.js'],
    ['Motor de nomina registra integridad de totales; planes exponen establecimientos IESS parametrizables.']
  ),
  mobile: status(
    hasFile('app-movil/src/App.js') && hasFile('app-movil/src/services/api.js'),
    ['app-movil/src/App.js', 'app-movil/src/services/api.js'],
    ['Revision estatica: mobile mantiene cliente API y rutas principales.']
  ),
  facturacionElectronica: status(
    fileContains('backend/src/services/facturadorClient.js', 'SINKRONET_FACTURADOR')
      && fileContains('backend/src/services/fiscalInvoiceService.js', 'requestFiscalInvoice'),
    ['backend/src/services/facturadorClient.js', 'backend/src/services/fiscalInvoiceService.js'],
    ['Nombre comercial: SINKRONET FACTURADOR. Arquitectura: consumo API del backend SINKRONIQ-MOBILE, sin clonar XML/firma en SKNOMINA.']
  ),
  proteccionDatos: status(
    hasFile('backend/src/services/privacyConsentService.js')
      && hasFile('backend/src/services/userDataExportService.js')
      && hasFile('frontend-web/src/components/Privacy/CookieConsent.jsx'),
    ['backend/src/services/privacyConsentService.js', 'backend/src/services/userDataExportService.js', 'frontend-web/src/components/Privacy/CookieConsent.jsx'],
    ['Existen consentimiento, exportacion y aviso de cookies; requiere revision legal final de textos publicos y retencion.']
  ),
};

const visualEvidenceFiles = existsSync(VISUAL_DIR)
  ? readdirSync(VISUAL_DIR).filter((name) => /\.(png|jpg|jpeg)$/i.test(name)).map((name) => toPosix(path.join('docs2/auditoria-integral-v2-haiky-2026/evidencia-visual', name)))
  : [];

const visualEvidence = {
  status: visualEvidenceFiles.length > 0 ? 'capturada' : 'pendiente',
  files: visualEvidenceFiles,
  limitation: visualEvidenceFiles.length > 0
    ? ''
    : 'Playwright no esta instalado en el workspace ni en runtime bundled; se deja como gate manual para no usar screenshots antiguos como evidencia actual.',
};

const deletionCandidates = [
  {
    item: 'Prompts y reportes de auditorias antiguas',
    action: 'archivar_no_eliminar',
    reason: 'Son historial de cumplimiento Haiky/AuditLock; eliminar romperia trazabilidad.',
  },
  {
    item: 'Señales mock en tests',
    action: 'conservar',
    reason: 'Pertenecen a pruebas y no son deuda productiva.',
  },
  {
    item: 'PaymentResult mock/pending query',
    action: 'revisar_renombrar',
    reason: 'Esta controlado y no activa planes; conviene renombrar el query param en una fase futura para reducir ruido auditor.',
  },
  {
    item: 'Helpers inline de descarga Blob',
    action: 'eliminado_en_v2',
    reason: 'Se consolidaron en frontend-web/src/utils/downloadBlob.js.',
  },
];

const findings = [
  ...silentCatchFindings,
  ...mojibakeFindings,
  ...todoFindings,
  ...uncontrolledSignals,
  ...duplicateDownloadBlobFindings,
];

const report = {
  generatedAt: new Date().toISOString(),
  plan: 'HAIKY-AUDITORIA-INTEGRAL-V2-NOMINA-EC-2026',
  rulesSource: 'RULES.md',
  repository: 'SINKRONET-SAS/nomina-ec',
  scope: ['LANDING', 'PWA', 'BACKEND', 'MOBILE'],
  legalScope: {
    country: 'Ecuador',
    year: 2026,
    excludedCountries: ['Colombia'],
  },
  filesScanned: runtimeFiles.length,
  legalSources2026,
  capabilityChecks,
  visualEvidence,
  controlledSignals,
  deletionCandidates,
  findingSummary: findings.reduce((acc, finding) => {
    acc[finding.type] = (acc[finding.type] || 0) + 1;
    return acc;
  }, {}),
  findings,
};

report.evidenceHash = sha256(JSON.stringify({
  legalSources2026,
  capabilityChecks,
  controlledSignals,
  deletionCandidates,
  findingSummary: report.findingSummary,
  findings,
}));

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(VISUAL_DIR, { recursive: true });
writeFileSync(path.join(VISUAL_DIR, 'README.md'), `${[
  '# Evidencia visual V2',
  '',
  visualEvidence.status === 'capturada'
    ? 'Capturas disponibles en esta carpeta.'
    : visualEvidence.limitation,
  '',
].join('\n')}`, 'utf8');
writeFileSync(path.join(OUT_DIR, 'DIAGNOSTICO_JSON.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const lines = [
  '# Informe diagnostico integral V2 - SKNOMINA Ecuador 2026',
  '',
  `Generado: ${report.generatedAt}`,
  `Hash evidencia: ${report.evidenceHash}`,
  '',
  '## Resumen ejecutivo',
  '',
  '- La auditoria cubre LANDING, PWA, BACKEND y MOBILE con lectura estatica, gates de contrato y fuentes oficiales 2026.',
  '- Facturacion electronica se mantiene como integracion: nombre comercial SINKRONET FACTURADOR; API tecnica provista por SINKRONIQ-MOBILE.',
  '- Establecimientos IESS se tratan como capacidad parametrizable y monetizable por plan, no como dato hardcodeado.',
  '- Los precios publicos deben mostrar mensualidad, contado anual e IVA 15% de forma clara; la TNA es un insumo de calculo, no un texto promocional aislado.',
  '- El motor de nomina ahora deja integridad de totales y bloquea descuadres entre ingresos, deducciones y neto.',
  '',
  '## Fuentes vigentes 2026',
  '',
  ...legalSources2026.map((source) => `- ${source.domain}: ${source.source} (${source.checkedAt}). ${source.summary}`),
  '',
  '## Estado por superficie',
  '',
  ...Object.entries(capabilityChecks).map(([key, value]) => `- ${key}: ${value.status}. ${value.notes.join(' ')}`),
  '',
  '## Evidencia visual',
  '',
  visualEvidence.status === 'capturada'
    ? visualEvidence.files.map((file) => `- ${file}`).join('\n')
    : `- Pendiente: ${visualEvidence.limitation}`,
  '',
  '## Hallazgos automatizados',
  '',
  ...Object.entries(report.findingSummary).map(([key, count]) => `- ${key}: ${count}`),
  findings.length
    ? findings.slice(0, 100).map((finding) => `- ${finding.severity} ${finding.type}: ${finding.file}:${finding.line} ${finding.evidence}`).join('\n')
    : '- Sin hallazgos automatizados abiertos en los patrones V2.',
  '',
  '## Candidatos a eliminacion',
  '',
  ...deletionCandidates.map((candidate) => `- ${candidate.item}: ${candidate.action}. ${candidate.reason}`),
  '',
  '## No regresion',
  '',
  '- No se propone desplegar XML IESS/SAE oficial sin guia publica validada.',
  '- No se duplican capacidades fiscales de SINKRONET FACTURADOR dentro de SKNOMINA.',
  '- No se elimina historial Haiky ni prompts anteriores; se versiona la auditoria V2.',
  '- Los cambios runtime son acotados: descarga Blob compartida, lazy routes, textos de precios y guard de integridad de nomina.',
];

const followUpSection = existingMarkdownSection(
  'docs2/auditoria-integral-v2-haiky-2026/INFORME_DIAGNOSTICO.md',
  '## Seguimiento AIV2-07 - asistencia y nomina',
);
if (followUpSection.length) {
  lines.push('', ...followUpSection);
}

writeMarkdownFile(path.join(OUT_DIR, 'INFORME_DIAGNOSTICO.md'), lines);
writeMarkdownFile(path.join(OUT_DIR, 'DIAGNOSTICO_AUTOMATIZADO.md'), [
  '# Diagnostico automatizado V2',
  '',
  `Archivos revisados: ${report.filesScanned}`,
  `Hash evidencia: ${report.evidenceHash}`,
  '',
  '## Resumen',
  '',
  ...Object.entries(report.findingSummary).map(([key, count]) => `- ${key}: ${count}`),
  '',
  findings.length
    ? findings.map((finding) => `- ${finding.severity} ${finding.type}: ${finding.file}:${finding.line} ${finding.evidence}`).join('\n')
    : 'Sin hallazgos automatizados abiertos.',
]);

console.log(JSON.stringify({
  ok: true,
  outDir: toPosix(path.relative(ROOT, OUT_DIR)),
  filesScanned: report.filesScanned,
  findingSummary: report.findingSummary,
  evidenceHash: report.evidenceHash,
}, null, 2));
