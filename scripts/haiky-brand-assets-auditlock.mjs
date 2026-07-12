import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ROOT = process.cwd();
const LOCK_PATHS = [
  path.join(ROOT, '.vscode', 'AuditLock.json'),
  path.join(ROOT, '.vscode', 'AudiLock.json'),
  path.join(ROOT, 'AuditLock.json'),
];

function runCheck(name, command, args) {
  try {
    const stdout = execFileSync(command, args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { name, ok: true, output: stdout.trim().slice(0, 1600) };
  } catch (err) {
    return {
      name,
      ok: false,
      output: `${err.stdout || ''}${err.stderr || ''}`.trim().slice(0, 1600),
    };
  }
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function runVisualArtifactCheck() {
  const relativePath = 'docs2/auditoria-assets-comercial-haiky-2026/VISUAL_QA_JSON.json';
  const absolutePath = path.join(ROOT, relativePath);
  try {
    const payload = JSON.parse(readFileSync(absolutePath, 'utf8'));
    const resultCount = Array.isArray(payload.results) ? payload.results.length : 0;
    const ok = payload.ok === true && resultCount === 4 && payload.results.every((result) => result.ok === true);
    return {
      name: 'visual_qa_artifact',
      ok,
      output: ok
        ? `${relativePath}: PASS ${resultCount} escenarios`
        : `${relativePath}: FAIL payload visual incompleto o con hallazgos`,
    };
  } catch (err) {
    return {
      name: 'visual_qa_artifact',
      ok: false,
      output: `${relativePath}: ${err.message}`,
    };
  }
}

const previousLock = existsSync(LOCK_PATHS[0]) ? readFileSync(LOCK_PATHS[0], 'utf8') : '';
const checks = [
  runCheck('brand_assets_diagnostic', 'node', ['scripts/haiky-brand-assets-diagnostic.mjs']),
  runCheck('contracts_system', 'node', ['scripts/verify-system-contracts.mjs']),
  runCheck('mobile_store_readiness', 'cmd.exe', ['/d', '/s', '/c', 'npm.cmd run check:mobile']),
  runVisualArtifactCheck(),
];
const failed = checks.filter((check) => !check.ok);
const timestamp = new Date().toISOString();
const lock = {
  plan: 'HAIKY-ASSETS-COMERCIAL-UIUX-2026',
  phaseCompleted: failed.length ? 'HAIKY-ASSETS-COMERCIAL-2026-blocked' : 'HAIKY-ASSETS-COMERCIAL-2026-05-qa-release',
  summary: [
    'Regresion de logo Nomina-Ec / datos ficticios corregida con fuente SKNOMINA entregada por usuario.',
    'Assets PWA, Open Graph, screenshots de manifest, Expo launcher, notification y splash generados por script JS.',
    'Favicon de pestana corregido con PNG oficiales 32/48/64 desde SKNOMINA.',
    'Landing, login, BrandLogo y contratos apuntan a assets comerciales reales.',
    'Banner de cookies y header mobile ajustados; QA visual PASS en landing/login desktop/mobile.',
  ],
  filesModified: [
    'assets/brand/manifest.json',
    'assets/brand/source/SINKRONET.png',
    'assets/brand/source/SINKRONET-LOGO.jpg',
    'assets/brand/source/SKNOMINA_LOGO.png',
    'app-movil/assets/adaptive-icon.png',
    'app-movil/assets/icon.png',
    'app-movil/assets/notification-icon.png',
    'app-movil/assets/splash.png',
    'docs2/PLAN_HAIKY_ASSETS_COMERCIAL_UIUX_2026.md',
    'docs2/auditoria-assets-comercial-haiky-2026/DIAGNOSTICO_AUTOMATIZADO.md',
    'docs2/auditoria-assets-comercial-haiky-2026/DIAGNOSTICO_JSON.json',
    'docs2/auditoria-assets-comercial-haiky-2026/INFORME_DIAGNOSTICO.md',
    'docs2/auditoria-assets-comercial-haiky-2026/VISUAL_QA.md',
    'docs2/auditoria-assets-comercial-haiky-2026/VISUAL_QA_JSON.json',
    'frontend-web/public/favicon-32.png',
    'frontend-web/public/favicon-48.png',
    'frontend-web/public/favicon-64.png',
    'frontend-web/index.html',
    'frontend-web/pwa.config.js',
    'frontend-web/scripts/smoke-pwa-lpa26.mjs',
    'frontend-web/src/components/Brand/BrandLogo.jsx',
    'frontend-web/src/components/Privacy/CookieConsent.jsx',
    'frontend-web/src/pages/Landing.jsx',
    'frontend-web/vite.config.js',
    'scripts/haiky-brand-assets-auditlock.mjs',
    'scripts/haiky-brand-assets-diagnostic.mjs',
    'scripts/haiky-brand-assets-solution.mjs',
    'scripts/haiky-visual-regression-capture.mjs',
    'scripts/verify-system-contracts.mjs',
  ],
  validationChecks: checks,
  timestamp,
  signature: sha256(`${previousLock}${timestamp}${JSON.stringify(checks)}`),
};

for (const lockPath of LOCK_PATHS) {
  mkdirSync(path.dirname(lockPath), { recursive: true });
  writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
}

if (failed.length) {
  console.error(JSON.stringify({ ok: false, failed }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  auditLocks: LOCK_PATHS.map((lockPath) => path.relative(ROOT, lockPath).replaceAll('\\', '/')),
  signature: lock.signature,
}, null, 2));
