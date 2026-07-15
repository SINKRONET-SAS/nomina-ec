import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs2', 'correccion-recalculo-roles-2026');
const DIAGNOSTIC_JSON = path.join(OUTPUT_DIR, 'DIAGNOSTICO_JSON.json');
const LOCK_PATHS = [
  path.join(ROOT, '.vscode', 'AuditLock.json'),
  path.join(ROOT, '.vscode', 'AudiLock.json'),
  path.join(ROOT, 'AuditLock.json'),
];
const GOVERNANCE_ARTIFACTS = [
  'docs2/PLAN_HAIKY_CORRECCION_RECALCULO_ROLES_2026.md',
  'docs2/correccion-recalculo-roles-2026/DIAGNOSTICO_JSON.json',
  'docs2/correccion-recalculo-roles-2026/INFORME_DIAGNOSTICO.md',
  'docs2/correccion-recalculo-roles-2026/SCRIPTS_JS_SOLUCION.md',
  'docs2/correccion-recalculo-roles-2026/CIERRE_GOBIERNO.md',
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
    return { name, ok: true, output: output.trim().slice(0, 3000) };
  } catch (err) {
    return {
      name,
      ok: false,
      output: `${err.stdout || ''}${err.stderr || err.message || ''}`.trim().slice(0, 5000),
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
  } catch {
    return '';
  }
}

function writeUtf8(filePath, content) {
  if (content.includes('\uFFFD')) throw new Error(`Contenido UTF-8 invalido: ${filePath}`);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf8');
}

function changedPaths() {
  const status = runCheck('git_status_utf8', 'git', ['status', '--porcelain=v1', '-uall']);
  if (!status.ok) return [];
  return status.output
    .split(/\r?\n/)
    .map((line) => line.slice(3).trim())
    .map((filePath) => filePath.includes(' -> ') ? filePath.split(' -> ').at(-1) : filePath)
    .filter(Boolean);
}

function checkUtf8() {
  const textExtensions = new Set([
    '.css', '.html', '.js', '.json', '.jsx', '.md', '.mjs', '.sql', '.ts', '.tsx', '.yaml', '.yml',
  ]);
  const issues = [];
  const files = [...new Set([...changedPaths(), ...GOVERNANCE_ARTIFACTS])];

  for (const relativePath of files) {
    const absolutePath = path.join(ROOT, relativePath);
    if (!existsSync(absolutePath) || !textExtensions.has(path.extname(relativePath).toLowerCase())) continue;
    const bytes = readFileSync(absolutePath);
    const text = bytes.toString('utf8');
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      issues.push(`${relativePath}: UTF-8 BOM`);
    }
    if (text.includes('\uFFFD')) issues.push(`${relativePath}: caracter de reemplazo U+FFFD`);
    if (/\u00c3[\u0080-\u00bf]|\u00c2[\u0080-\u00bf]/.test(text)) issues.push(`${relativePath}: posible mojibake`);
  }

  return {
    name: 'utf8_changed_files',
    ok: issues.length === 0,
    output: issues.length ? issues.join('\n') : `${files.length} archivos modificados/gobernados sin BOM ni mojibake.`,
  };
}

function checkIntegralFindings() {
  const diagnosticPath = path.join(
    ROOT,
    'docs2',
    'auditoria-integral-v2-haiky-2026',
    'DIAGNOSTICO_JSON.json',
  );
  if (!existsSync(diagnosticPath)) {
    return { name: 'auditoria_integral_v2_sin_hallazgos', ok: false, output: 'No se genero el diagnostico integral V2.' };
  }
  const diagnostic = JSON.parse(readFileSync(diagnosticPath, 'utf8'));
  const findings = Array.isArray(diagnostic.findings) ? diagnostic.findings : [];
  return {
    name: 'auditoria_integral_v2_sin_hallazgos',
    ok: findings.length === 0,
    output: findings.length
      ? JSON.stringify(findings.slice(0, 20))
      : `${diagnostic.filesScanned || 0} archivos revisados sin hallazgos automatizados abiertos.`,
  };
}

const checks = [
  runCheck('diagnostico_roles_2026', 'node', ['scripts/haiky-payroll-correction-2026-diagnostic.mjs']),
  runCheck('auditoria_integral_v2', 'node', ['scripts/haiky-integral-v2-diagnostic.mjs']),
  checkIntegralFindings(),
  runCheck('contratos_sistema_unico', 'node', ['scripts/verify-system-contracts.mjs']),
  runCheck('backend_roles_focalizado', 'npm.cmd', [
    '--workspace=backend',
    'test',
    '--',
    'payrollLifecycleService.test.js',
    'nominaController.test.js',
    'mobileController.test.js',
    'employeeHistoryService.test.js',
    'payrollRolePdfService.test.js',
    'app.routes.test.js',
    '--runInBand',
  ], { timeoutMs: 360000 }),
  runCheck('backend_suite_completa', 'npm.cmd', [
    '--workspace=backend',
    'test',
    '--',
    '--runInBand',
  ], { timeoutMs: 900000 }),
  runCheck('prisma_validate', 'npm.cmd', ['run', 'prisma:validate'], { timeoutMs: 120000 }),
  runCheck('mobile_check_stores', 'npm.cmd', ['run', 'check:mobile'], { timeoutMs: 120000 }),
  runCheck('frontend_build_direct_vite', 'node', ['node_modules/vite/bin/vite.js', 'build'], {
    cwd: path.join(ROOT, 'frontend-web'),
    timeoutMs: 600000,
  }),
  checkUtf8(),
  runCheck('git_diff_check', 'git', ['diff', '--check']),
];

const failed = checks.filter((check) => !check.ok);
const timestamp = new Date().toISOString();
const previousLock = existsSync(LOCK_PATHS[0]) ? readFileSync(LOCK_PATHS[0], 'utf8') : '';
const filesModified = runCheck('git_status_short', 'git', ['status', '--short']).output
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

writeUtf8(path.join(OUTPUT_DIR, 'CIERRE_GOBIERNO.md'), `${[
  '# Cierre de gobierno HRC26',
  '',
  `Generado: ${timestamp}`,
  `Estado: ${failed.length ? 'bloqueado' : 'completed-pass'}`,
  '',
  '## Decisiones ejecutadas',
  '',
  '- Los usuarios `owner` y `admin_rrhh` pueden descartar calculos en borrador con motivo y auditoria.',
  '- La correccion se realiza sobre novedades o datos fuente; los totales derivados se recalculan.',
  '- Los roles `cerrada` y `pagada` son inmutables; una correccion posterior se registra como ajuste en un periodo abierto.',
  '- MOBILE, correo y pagos bancarios consumen unicamente estados finales.',
  '- Los documentos preliminares muestran una marca explicita de borrador.',
  '',
  '## Gates',
  '',
  ...checks.map((check) => `- ${check.name}: ${check.ok ? 'PASS' : 'FAIL'}`),
].join('\n')}\n`);

for (const artifact of GOVERNANCE_ARTIFACTS) {
  if (existsSync(path.join(ROOT, artifact)) && !filesModified.some((line) => line.endsWith(artifact))) {
    filesModified.push(`G ${artifact}`);
  }
}

const lock = {
  plan: 'HAIKY-CORRECCION-RECALCULO-ROLES-2026',
  phaseCompleted: failed.length ? 'HRC26-05-bloqueado' : 'HRC26-05-qa-release',
  status: failed.length ? 'blocked' : 'completed-pass',
  timestamp,
  evidenceHash: readEvidenceHash(),
  decisions: [
    'Los borradores se corrigen desde novedades y datos fuente, nunca editando totales derivados.',
    'El descarte individual o mensual requiere RBAC, usuario fresco, motivo, transaccion y auditoria.',
    'Los roles cerrados o pagados son inmutables; el endpoint heredado de reapertura responde 409.',
    'MOBILE y comunicaciones muestran solo roles finales; los PDF preliminares se marcan como borrador.',
    'La parametrizacion Ecuador 2026 se reconfirma contra fuentes oficiales y permanece versionada.',
  ],
  runtimeChanges: [
    'Backend agrega payrollLifecycleService y endpoints de descarte controlado.',
    'PWA agrega descarte mensual, correccion por empleado y eliminacion confirmada de borradores.',
    'MOBILE e historial excluyen roles en borrador.',
    'Contratos y pruebas bloquean reapertura de cerrados y exposicion de borradores.',
  ],
  validationChecks: checks,
  filesModified,
  signature: sha256(`${previousLock}${timestamp}${JSON.stringify(checks)}${filesModified.join('|')}`),
};

for (const lockPath of LOCK_PATHS) {
  writeUtf8(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
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
