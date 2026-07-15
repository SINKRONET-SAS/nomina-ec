import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ROOT = process.cwd();
const DIAGNOSTIC_JSON = path.join(ROOT, 'docs2', 'reportes-disponibilidad-clientes-2026', 'DIAGNOSTICO_JSON.json');
const LOCK_PATHS = [
  path.join(ROOT, '.vscode', 'AuditLock.json'),
  path.join(ROOT, '.vscode', 'AudiLock.json'),
  path.join(ROOT, 'AuditLock.json'),
];
const GOVERNANCE_ARTIFACTS = [
  'docs2/PLAN_HAIKY_REPORTES_DISPONIBILIDAD_CLIENTES_2026.md',
  'docs2/reportes-disponibilidad-clientes-2026/DIAGNOSTICO_JSON.json',
  'docs2/reportes-disponibilidad-clientes-2026/INFORME_DIAGNOSTICO.md',
  'docs2/reportes-disponibilidad-clientes-2026/SCRIPTS_JS_SOLUCION.md',
  'docs2/reportes-disponibilidad-clientes-2026/CIERRE_GOBIERNO.md',
];

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
      timeout: options.timeoutMs || 240000,
    });
    return { name, ok: true, output: output.trim().slice(0, 2400) };
  } catch (err) {
    return {
      name,
      ok: false,
      output: `${err.stdout || ''}${err.stderr || err.message || ''}`.trim().slice(0, 4000),
    };
  }
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function readEvidenceHash() {
  if (!existsSync(DIAGNOSTIC_JSON)) return '';
  try {
    return JSON.parse(readFileSync(DIAGNOSTIC_JSON, 'utf8')).evidenceHash || '';
  } catch (err) {
    return '';
  }
}

const checks = [
  runCheck('diagnostico_reportes_disponibilidad_2026', 'node', ['scripts/haiky-reportes-disponibilidad-2026-diagnostic.mjs']),
  runCheck('contratos_sistema_unico', 'node', ['scripts/verify-system-contracts.mjs']),
  runCheck('backend_reportes_focalizados', 'npm.cmd', [
    '--workspace=backend',
    'test',
    '--',
    'payrollReportService.test.js',
    'reporteController.test.js',
    '--runInBand',
  ], { timeoutMs: 240000 }),
  runCheck('prisma_validate', 'npm.cmd', ['run', 'prisma:validate'], { timeoutMs: 120000 }),
  runCheck('mobile_check_stores', 'npm.cmd', ['run', 'check:mobile'], { timeoutMs: 120000 }),
  runCheck('frontend_build_direct_vite', 'node', ['node_modules/vite/bin/vite.js', 'build'], {
    cwd: path.join(ROOT, 'frontend-web'),
    timeoutMs: 600000,
  }),
  runCheck('git_diff_check', 'git', ['diff', '--check']),
];

const failed = checks.filter((check) => !check.ok);
const timestamp = new Date().toISOString();
const previousLock = existsSync(LOCK_PATHS[0]) ? readFileSync(LOCK_PATHS[0], 'utf8') : '';
const filesModified = runCheck('git_status_short', 'git', ['status', '--short']).output
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);
for (const artifact of GOVERNANCE_ARTIFACTS) {
  if (existsSync(path.join(ROOT, artifact)) && !filesModified.some((line) => line.endsWith(artifact))) {
    filesModified.push(`G ${artifact}`);
  }
}

const lock = {
  plan: 'HAIKY-REPORTES-DISPONIBILIDAD-CLIENTES-2026',
  phaseCompleted: failed.length ? 'HRD26-05-bloqueado' : 'HRD26-05-qa-release',
  status: failed.length ? 'blocked' : 'completed-pass',
  timestamp,
  evidenceHash: readEvidenceHash(),
  decisions: [
    'Los reportes internos soportan alcance global e individual sin escritura manual de IDs.',
    'La matriz de novedades del rol usa una fila por empleado y columnas dinamicas solo para novedades calculadas.',
    'El acumulado anual mantiene el mismo contrato de filtros que el exporte mensual.',
    'La disponibilidad para clientes se valida en LANDING, PWA, BACKEND y MOBILE sin prometer XML IESS oficial.',
    'La parametrizacion legal Ecuador 2026 queda versionada y auditada; los cambios legales futuros deben pasar por parametros legales.',
  ],
  runtimeChanges: [
    'Backend agrega PAYROLL_NOVELTY_MATRIX y buildPayrollNoveltyMatrixRows.',
    'PWA agrega selector Matriz de novedades del rol, alcance Global/Individual y busqueda de empleado.',
    'Contratos del sistema bloquean regresion de reporte, alcance y acumulado anual.',
    'Scripts HRD26 generan diagnostico, informe y firma AuditLock.',
  ],
  validationChecks: checks,
  filesModified,
  signature: sha256(`${previousLock}${timestamp}${JSON.stringify(checks)}${filesModified.join('|')}`),
};

for (const lockPath of LOCK_PATHS) {
  mkdirSync(path.dirname(lockPath), { recursive: true });
  writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
}

if (failed.length) {
  console.error(JSON.stringify({
    ok: false,
    failed,
    auditLocks: LOCK_PATHS.map((lockPath) => path.relative(ROOT, lockPath).replaceAll('\\', '/')),
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  auditLocks: LOCK_PATHS.map((lockPath) => path.relative(ROOT, lockPath).replaceAll('\\', '/')),
  signature: lock.signature,
}, null, 2));
