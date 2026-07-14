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
const CANONICAL_LOCK_PATH = LOCK_PATHS[0];

function runCheck(name, command, args, options = {}) {
  try {
    const executable = process.platform === 'win32' && command === 'npm.cmd'
      ? process.env.ComSpec || 'cmd.exe'
      : command;
    const executableArgs = process.platform === 'win32' && command === 'npm.cmd'
      ? ['/d', '/s', '/c', 'npm.cmd', ...args]
      : args;
    const output = execFileSync(executable, executableArgs, {
      cwd: options.cwd || ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: options.timeoutMs || 180000,
    });
    return { name, ok: true, output: output.trim().slice(0, 1800) };
  } catch (err) {
    return {
      name,
      ok: false,
      output: `${err.stdout || ''}${err.stderr || err.message || ''}`.trim().slice(0, 3000),
    };
  }
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function readGeneratedReportHash() {
  const diagnosticJson = path.join(ROOT, 'docs2', 'auditoria-integral-v2-haiky-2026', 'DIAGNOSTICO_JSON.json');
  if (!existsSync(diagnosticJson)) return '';
  try {
    return JSON.parse(readFileSync(diagnosticJson, 'utf8')).evidenceHash || '';
  } catch (err) {
    return '';
  }
}

const checks = [
  runCheck('diagnostico_integral_v2_js', 'node', ['scripts/haiky-integral-v2-diagnostic.mjs']),
  runCheck('contratos_sistema', 'node', ['scripts/verify-system-contracts.mjs']),
  runCheck('backend_tests_focalizados', 'npm.cmd', [
    '--workspace=backend',
    'test',
    '--',
    'calculoNominaService.test.js',
    'paymentController.test.js',
    'fiscalInvoiceService.test.js',
    'employeeImportService.test.js',
    '--runInBand',
  ], { timeoutMs: 240000 }),
  runCheck('prisma_validate', 'npm.cmd', ['run', 'prisma:validate'], { timeoutMs: 120000 }),
  runCheck('mobile_check_stores', 'npm.cmd', ['run', 'check:mobile'], { timeoutMs: 120000 }),
  runCheck('frontend_build_direct_vite', 'node', ['node_modules/vite/bin/vite.js', 'build'], {
    cwd: path.join(ROOT, 'frontend-web'),
    timeoutMs: 240000,
  }),
  runCheck('git_diff_check', 'git', ['diff', '--check']),
];

const failed = checks.filter((check) => !check.ok);
const previousLock = existsSync(CANONICAL_LOCK_PATH) ? readFileSync(CANONICAL_LOCK_PATH, 'utf8') : '';
const timestamp = new Date().toISOString();
const changedFiles = runCheck('git_status_short', 'git', ['status', '--short']).output
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

const lock = {
  plan: 'HAIKY-AUDITORIA-INTEGRAL-V2-NOMINA-EC-2026',
  phaseCompleted: failed.length ? 'HAIKY-AUDITORIA-INTEGRAL-V2-2026-blocked' : 'HAIKY-AUDITORIA-INTEGRAL-V2-2026-06-qa-release',
  status: failed.length ? 'blocked' : 'completed-pass',
  timestamp,
  evidenceHash: readGeneratedReportHash(),
  commercialDecisions: [
    'Facturacion electronica se presenta comercialmente como SINKRONET FACTURADOR.',
    'La implementacion tecnica debe consumir la API provista por SINKRONIQ-MOBILE y no duplicar XML/firma SRI en SKNOMINA.',
    'Establecimientos IESS se parametrizan por empresa y se monetizan por plan con iess_establecimientos_max.',
    'El precio publico debe mostrar base, IVA 15%, mensualidad y contado anual; la tasa nominal anual solo explica el calculo cuando aplica.',
  ],
  runtimeChanges: [
    'Lazy routes en frontend-web/src/App.jsx para reducir chunk inicial.',
    'Helper unico de descarga Blob en frontend-web/src/utils/downloadBlob.js.',
    'Integridad de totales en backend/src/services/calculoNominaService.js.',
    'Tarjetas publicas de planes humanizadas con mensualidad/contado anual con IVA.',
  ],
  validationChecks: checks,
  changedFiles,
  signature: sha256(`${previousLock}${timestamp}${JSON.stringify(checks)}${changedFiles.join('|')}`),
};

for (const lockPath of LOCK_PATHS) {
  mkdirSync(path.dirname(lockPath), { recursive: true });
  writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
}

if (failed.length) {
  console.error(JSON.stringify({ ok: false, failed, auditLocks: LOCK_PATHS.map((lockPath) => path.relative(ROOT, lockPath)) }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  auditLocks: LOCK_PATHS.map((lockPath) => path.relative(ROOT, lockPath).replaceAll('\\', '/')),
  signature: lock.signature,
}, null, 2));
