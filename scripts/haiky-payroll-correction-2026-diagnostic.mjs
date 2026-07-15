import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs2', 'correccion-recalculo-roles-2026');

function read(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, 'utf8') : '';
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function check(code, area, ok, evidence, recommendation, severity = 'alta') {
  return {
    code,
    area,
    status: ok ? 'confirmado' : 'hallazgo',
    severity: ok ? 'informativa' : severity,
    evidence,
    recommendation: ok ? 'Sin accion pendiente.' : recommendation,
  };
}

function writeUtf8(relativePath, content) {
  const normalized = Buffer.from(content, 'utf8').toString('utf8');
  if (normalized !== content || content.includes('\uFFFD')) {
    throw new Error(`Contenido UTF-8 invalido para ${relativePath}`);
  }
  writeFileSync(path.join(OUT_DIR, relativePath), content, 'utf8');
}

const app = read('backend/src/app.js');
const controller = read('backend/src/controllers/nominaController.js');
const lifecycle = read('backend/src/services/payrollLifecycleService.js');
const closePage = read('frontend-web/src/pages/Nomina/CerrarMes.jsx');
const rolesPage = read('frontend-web/src/pages/Nomina/RolesPagos.jsx');
const noveltiesPage = read('frontend-web/src/pages/Asistencia/NovedadesPendientes.jsx');
const mobileController = read('backend/src/controllers/mobileController.js');
const employeeHistory = read('backend/src/services/employeeHistoryService.js');
const rolePdf = read('backend/src/services/payrollRolePdfService.js');
const manualAttendance = read('backend/src/services/manualAttendanceService.js');
const legal = read('backend/src/config/legal-ecuador.js');
const contracts = read('scripts/verify-system-contracts.mjs');
const landing = read('frontend-web/src/pages/Landing.jsx');

const legalSources2026 = [
  {
    topic: 'SBU 2026',
    url: 'https://www.trabajo.gob.ec/wp-content/plugins/download-monitor/download.php?force=1&id=4933',
    evidence: 'Acuerdo ministerial fija USD 482 desde el 1 de enero de 2026.',
  },
  {
    topic: 'Roles, respaldo digital y base mensual',
    url: 'https://www.trabajo.gob.ec/wp-content/uploads/downloads/2024/01/MDT-2023-140-AM-Obligaciones-empleador-y-procedimientos-de-inspeccion-14-11-23-signed.pdf',
    evidence: 'Admite repositorios digitales, exige respaldo documental y establece 30 dias/240 horas para calculos mensuales descritos.',
  },
  {
    topic: 'Impuesto a la Renta 2026',
    url: 'https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/58a7f4f6-ab51-48b6-b9ff-a8e97e1a28ef/Tablas%20de%20c%C3%A1lculo%20de%20Impuesto%20a%20la%20Renta.pdf',
    evidence: 'Tabla 2026 inicia en USD 12.208 y termina con tarifa marginal de 37% desde USD 109.956.',
  },
  {
    topic: 'Aportes IESS',
    url: 'https://iess.gob.ec/es/web/afiliado/servicios-y-prestaciones',
    evidence: '9,45% para afiliado y 11,15% para empleador en relacion de dependencia privada.',
  },
];

const checks = [
  check(
    'HRC26-LAND-001',
    'LANDING',
    landing.includes('Cierre controlado')
      && landing.includes('respaldo para auditoría')
      && landing.includes('Ver planes'),
    'La promesa publica presenta cierre controlado, respaldo y planes sin afirmar que un borrador sea un comprobante final.',
    'Alinear la promesa publica con el ciclo gobernado de borrador y cierre.',
    'media',
  ),
  check(
    'HRC26-BE-001',
    'BACKEND',
    lifecycle.includes('discardPayrollPeriodCalculation')
      && lifecycle.includes('discardPayrollDraft')
      && lifecycle.includes("estado !== 'borrador'")
      && lifecycle.includes('recordAudit'),
    'Debe existir un ciclo transaccional de descarte para borradores.',
    'Implementar descarte individual y por periodo con bloqueo de estados finales y auditoria.',
  ),
  check(
    'HRC26-API-001',
    'BACKEND',
    app.includes("'/api/nomina/descartar-calculo'")
      && app.includes("app.delete('/api/nomina/:id'")
      && controller.includes('descartarCalculoPeriodo')
      && controller.includes('eliminarBorrador'),
    'La API debe exponer acciones gobernadas por RBAC y usuario fresco.',
    'Agregar endpoints de descarte sin modificar contratos existentes.',
  ),
  check(
    'HRC26-API-002',
    'BACKEND',
    controller.includes("error: 'NOMINA_CERRADA_INMUTABLE'")
      && controller.includes("nextAction: 'registrar_ajuste_periodo_abierto'")
      && !controller.includes("action: 'reabrir_nomina'"),
    'El endpoint heredado de reapertura conserva compatibilidad HTTP, pero no muta roles cerrados.',
    'Bloquear la reapertura destructiva y orientar las correcciones posteriores al cierre como ajustes en un periodo abierto.',
  ),
  check(
    'HRC26-PWA-001',
    'PWA',
    closePage.includes('Descartar cálculo')
      && rolesPage.includes('Corregir novedades')
      && rolesPage.includes('Eliminar borrador')
      && noveltiesPage.includes('useSearchParams'),
    'La PWA debe ofrecer una salida visible desde el calculo y cada rol borrador.',
    'Exponer acciones con confirmacion y navegacion a las fuentes del calculo.',
  ),
  check(
    'HRC26-PWA-002',
    'PWA',
    rolesPage.includes("nomina.estado === 'cerrada'")
      && !rolesPage.includes('nomina.cerrada ?'),
    'La etiqueta visual debe usar el campo persistido `estado`.',
    'Corregir la etiqueta que consulta un booleano inexistente.',
    'media',
  ),
  check(
    'HRC26-ATT-001',
    'BACKEND',
    manualAttendance.includes('function databaseDateOnly')
      && manualAttendance.includes('e.fecha_ingreso::text AS fecha_ingreso')
      && manualAttendance.includes('databaseDateOnly(employee.fecha_ingreso)'),
    'La correccion de novedades por mes debe interpretar las fechas laborales con el mismo formato que PostgreSQL.',
    'Normalizar fecha de ingreso/salida antes de filtrar dias laborables y cubrir objetos Date en pruebas.',
  ),
  check(
    'HRC26-MOB-001',
    'MOBILE',
    mobileController.includes("estado IN ('cerrada', 'pagada')")
      && employeeHistory.includes('closedPayrollOnly'),
    'Autoservicio debe ocultar resultados que RRHH aun puede corregir.',
    'Filtrar roles mobile e historial a estados finales.',
  ),
  check(
    'HRC26-DOC-001',
    'DOCUMENTOS',
    rolePdf.includes('BORRADOR') && rolePdf.includes('NO CONSTITUYE COMPROBANTE DE PAGO'),
    'Un PDF preliminar debe diferenciarse del rol cerrado.',
    'Agregar aviso visible solo para roles no cerrados/pagados.',
    'media',
  ),
  check(
    'HRC26-LEGAL-001',
    'LEGAL_EC_2026',
    legal.includes('unifiedBaseSalary: 482')
      && legal.includes('personalIessRate: 0.0945')
      && legal.includes('employerIessRate: 0.1115')
      && legal.includes('monthlyWorkHours: 240')
      && legal.includes('{ from: 0, to: 12208, rate: 0, baseTax: 0 }')
      && legal.includes('{ from: 109956, to: null, rate: 0.37, baseTax: 24572 }'),
    'Parametros laborales y tributarios 2026 versionados en el repositorio.',
    'Bloquear liberacion si divergen de las fuentes oficiales.',
  ),
  check(
    'HRC26-NOREG-001',
    'NO_REGRESION',
    contracts.includes('descartar-calculo')
      && contracts.includes('Corregir novedades')
      && contracts.includes("estado IN ('cerrada', 'pagada')"),
    'Los contratos del sistema deben bloquear regresiones del nuevo ciclo.',
    'Agregar gates para API, PWA y mobile.',
  ),
];

const findings = checks.filter((item) => item.status === 'hallazgo');
const diagnostic = {
  generatedAt: new Date().toISOString(),
  plan: 'HAIKY-CORRECCION-RECALCULO-ROLES-2026',
  rulesSource: 'RULES.md',
  scope: ['LANDING', 'PWA', 'BACKEND', 'MOBILE'],
  legalSources2026,
  checks,
  findings,
};
diagnostic.evidenceHash = sha256(JSON.stringify({ legalSources2026, checks, findings }));

mkdirSync(OUT_DIR, { recursive: true });
writeUtf8('DIAGNOSTICO_JSON.json', `${JSON.stringify(diagnostic, null, 2)}\n`);
writeUtf8('INFORME_DIAGNOSTICO.md', `${[
  '# Informe diagnostico HRC26 - correccion y recalculo de roles',
  '',
  `Generado: ${diagnostic.generatedAt}`,
  `Hash de evidencia: ${diagnostic.evidenceHash}`,
  '',
  '## Resultado por superficie',
  '',
  ...checks.map((item) => `- ${item.code} [${item.area}]: ${item.status}. ${item.evidence}`),
  '',
  '## Hallazgos abiertos',
  '',
  ...(findings.length
    ? findings.map((item) => `- ${item.code}: ${item.recommendation}`)
    : ['- Sin hallazgos abiertos despues de ejecutar HRC26.']),
  '',
  '## Fuentes oficiales reconfirmadas',
  '',
  ...legalSources2026.map((source) => `- ${source.topic}: ${source.url}. ${source.evidence}`),
  '',
  '## Criterio de cumplimiento',
  '',
  '- Los borradores pueden corregirse con trazabilidad; los estados finales permanecen inmutables.',
  '- La edicion opera sobre novedades y datos fuente, no sobre totales tributarios calculados.',
  '- Este diagnostico es un control tecnico de producto y no reemplaza asesoria legal o tributaria.',
].join('\n')}\n`);
writeUtf8('SCRIPTS_JS_SOLUCION.md', `${[
  '# Scripts JS de solucion HRC26',
  '',
  '- Diagnostico repetible: `node scripts/haiky-payroll-correction-2026-diagnostic.mjs`.',
  '- Solucion y cierre: `node scripts/haiky-payroll-correction-2026-solution.mjs`.',
  '- Contratos cruzados: `node scripts/verify-system-contracts.mjs`.',
  '- Suite completa: `npm run haiky:roles:2026`.',
  '',
  'El script de solucion ejecuta diagnostico, contratos, pruebas backend, Prisma, homologacion mobile, build PWA/LANDING, UTF-8 y `git diff --check`; solo firma AuditLock cuando todos los gates terminan correctamente.',
].join('\n')}\n`);

console.log(JSON.stringify({
  ok: findings.length === 0,
  findings: findings.length,
  outDir: path.relative(ROOT, OUT_DIR).replaceAll('\\', '/'),
  evidenceHash: diagnostic.evidenceHash,
}, null, 2));
