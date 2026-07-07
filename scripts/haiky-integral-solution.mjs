import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ROOT = process.cwd();
const LOCK_PATH = path.join(ROOT, 'AuditLock.json');

function runCheck(name, command, args) {
  try {
    const stdout = execFileSync(command, args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { name, ok: true, output: stdout.trim().slice(0, 1200) };
  } catch (err) {
    return {
      name,
      ok: false,
      output: `${err.stdout || ''}${err.stderr || ''}`.trim().slice(0, 1200),
    };
  }
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

const previousLock = existsSync(LOCK_PATH) ? readFileSync(LOCK_PATH, 'utf8') : '';
const checks = [
  runCheck('diagnostico_integral_js', 'node', ['scripts/haiky-integral-diagnostic.mjs']),
  runCheck('contratos_sistema', 'node', ['scripts/verify-system-contracts.mjs']),
  runCheck('mobile_store_readiness', 'cmd.exe', ['/d', '/s', '/c', 'npm.cmd run check:mobile']),
  runCheck('sin_catch_silencioso_runtime', 'node', ['-e', "const {execFileSync}=require('child_process'); try { execFileSync('rg',['-n','catch\\\\s*\\\\(.*\\\\)\\\\s*=>\\\\s*\\\\{\\\\s*\\\\}|catch\\\\s*\\\\([^)]*\\\\)\\\\s*\\\\{\\\\s*\\\\}','backend/src','frontend-web/src','app-movil/src','scripts'],{stdio:'pipe'}); process.exit(1); } catch (err) { process.exit(err.status===1 ? 0 : err.status || 1); }"]),
  runCheck('utf8_runtime', 'node', ['-e', "const fs=require('fs'),path=require('path'); const roots=['backend/src','frontend-web/src','app-movil/src','scripts']; const exts=new Set(['.js','.jsx','.mjs','.json','.md']); const ignored=new Set([path.normalize('scripts/verify-system-contracts.mjs')]); const bad=new RegExp('['+String.fromCharCode(0x00c3)+String.fromCharCode(0x00c2)+String.fromCharCode(0xfffd)+']'); function walk(d){ if(!fs.existsSync(d))return []; return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{ const p=path.join(d,e.name); if(e.isDirectory()) return ['node_modules','dist','build','.expo'].includes(e.name)?[]:walk(p); return e.isFile()&&exts.has(path.extname(e.name))?[p]:[];}); } for(const f of roots.flatMap(walk)){ if(ignored.has(path.normalize(f))) continue; const s=fs.readFileSync(f,'utf8'); if(Buffer.from(s,'utf8').toString('utf8')!==s || bad.test(s)){ console.error(f); process.exit(1); }}"]),
];

const failed = checks.filter((check) => !check.ok);
const timestamp = new Date().toISOString();
const lock = {
  phaseCompleted: failed.length ? 'AISK26-integral-blocked' : 'AISK26-integral-runtime-remediation',
  filesModified: [
    '.github/CODEX_CONTEXT.md',
    '.github/prompts/HAIKY-AUDITORIA-INTEGRAL-2026-00-baseline.md',
    '.github/prompts/HAIKY-AUDITORIA-INTEGRAL-2026-01-zero-silent-failures.md',
    '.github/prompts/HAIKY-AUDITORIA-INTEGRAL-2026-02-movilizacion-sqlite-cierre.md',
    '.github/prompts/HAIKY-AUDITORIA-INTEGRAL-2026-03-lopdp-legal-pagos-email.md',
    '.github/prompts/HAIKY-AUDITORIA-INTEGRAL-2026-04-reportes-uiux-humanizacion.md',
    '.github/prompts/HAIKY-AUDITORIA-INTEGRAL-2026-05-qa-release.md',
    'app-movil/app.json',
    'backend/src/app.js',
    'app-movil/src/screens/GastosMovilizacionScreen.js',
    'app-movil/src/screens/RutaHoyScreen.js',
    'docs2/PLAN_HAIKY_AUDITORIA_INTEGRAL_NOMINA_EC_2026.md',
    'docs2/auditoria-integral-haiky-2026/INFORME_DIAGNOSTICO.md',
    'docs2/auditoria-integral-haiky-2026/DIAGNOSTICO_JSON.json',
    'docs2/auditoria-integral-haiky-2026/DIAGNOSTICO_AUTOMATIZADO.md',
    'scripts/haiky-integral-diagnostic.mjs',
    'scripts/haiky-integral-solution.mjs',
    'scripts/verify-system-contracts.mjs',
  ],
  validationChecks: checks,
  timestamp,
  signature: sha256(`${previousLock}${timestamp}${JSON.stringify(checks)}`),
};

writeFileSync(LOCK_PATH, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');

if (failed.length) {
  console.error(JSON.stringify({ ok: false, failed }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, auditLock: 'AuditLock.json', signature: lock.signature }, null, 2));
