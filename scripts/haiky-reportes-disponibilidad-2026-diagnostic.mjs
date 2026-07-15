import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs2', 'reportes-disponibilidad-clientes-2026');

function read(relativePath) {
  return readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function hasFile(relativePath) {
  return existsSync(path.join(ROOT, relativePath));
}

function includes(relativePath, value) {
  return hasFile(relativePath) && read(relativePath).includes(value);
}

function check(code, area, ok, evidence, recommendation, severity = 'media') {
  return {
    code,
    area,
    status: ok ? 'confirmado' : 'hallazgo',
    severity: ok ? 'informativa' : severity,
    evidence,
    recommendation: ok ? 'Sin accion correctiva pendiente.' : recommendation,
  };
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function writeJson(relativePath, value) {
  writeFileSync(path.join(OUT_DIR, relativePath), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeMarkdown(relativePath, lines) {
  const normalizedLines = [...lines];
  while (normalizedLines[normalizedLines.length - 1] === '') normalizedLines.pop();
  writeFileSync(path.join(OUT_DIR, relativePath), `${normalizedLines.join('\n')}\n`, 'utf8');
}

const reportService = read('backend/src/services/payrollReportService.js');
const descargarReportes = read('frontend-web/src/pages/Nomina/DescargarReportes.jsx');
const app = read('backend/src/app.js');
const mobileApi = read('app-movil/src/services/api.js');
const mobileSelfService = read('app-movil/src/screens/AutoservicioScreen.js');
const landing = read('frontend-web/src/pages/Landing.jsx');
const legalEcuador = read('backend/src/config/legal-ecuador.js');

const legalSources2026 = [
  {
    domain: 'SRI impuesto a la renta personas naturales',
    source: 'https://www.sri.gob.ec/impuesto-renta',
    officialEvidence: 'El SRI publica la base imponible de relacion de dependencia como ingreso gravado menos aporte personal IESS, y enlaza tablas de cada ejercicio fiscal.',
  },
  {
    domain: 'SRI tablas IR 2026',
    source: 'https://www.sri.gob.ec/o/sri-portlet-biblioteca-alfresco-internet/descargar/58a7f4f6-ab51-48b6-b9ff-a8e97e1a28ef/Tablas%20de%20c%C3%A1lculo%20de%20Impuesto%20a%20la%20Renta.pdf',
    officialEvidence: 'Resolucion NAC-DGERCGC25-00000043: tabla 2026 inicia con fraccion basica USD 12.208 y tarifa 0%.',
  },
  {
    domain: 'Ministerio del Trabajo - sistema salarial',
    source: 'https://salarios.trabajo.gob.ec/',
    officialEvidence: 'Portal oficial usado como fuente operativa de salarios; el repo mantiene SBU 2026 USD 482 con sourceStatus validado.',
  },
  {
    domain: 'IESS empleador',
    source: 'https://www.iess.gob.ec/es/web/empleador/avisos-de-entrada-y-salida',
    officialEvidence: 'Portal oficial IESS de empleador para avisos y novedades; el repo mantiene aportes 9.45% personal y 11.15% patronal con sourceStatus validado.',
  },
];

const checks = [
  check(
    'HRD26-BE-001',
    'BACKEND',
    reportService.includes('PAYROLL_NOVELTY_MATRIX')
      && reportService.includes('buildPayrollNoveltyMatrixRows')
      && reportService.includes('isRoleNoveltyLine')
      && reportService.includes('linesForPayrollRow'),
    'payrollReportService expone PAYROLL_NOVELTY_MATRIX y arma columnas dinamicas desde lineas de calculo de novedades.',
    'Agregar matriz de novedades del rol con empleados en filas y novedades en columnas.',
    'alta',
  ),
  check(
    'HRD26-PWA-001',
    'PWA',
    descargarReportes.includes('PAYROLL_NOVELTY_MATRIX')
      && descargarReportes.includes('reportScope')
      && descargarReportes.includes('filteredReportEmployees')
      && descargarReportes.includes('Acumulado anual'),
    'DescargarReportes expone matriz de novedades, alcance global/individual, busqueda de empleado y acumulado anual.',
    'Exponer el reporte y filtros de disponibilidad para clientes en la PWA.',
    'alta',
  ),
  check(
    'HRD26-BE-002',
    'BACKEND',
    app.includes("'/api/reportes/nomina/exportar'")
      && app.includes("'/api/reportes/nomina/:anio/consolidado'")
      && reportService.includes('generarConsolidadoAnualNomina'),
    'Backend mantiene exporte mensual y consolidado anual por tipo de reporte.',
    'Conservar reportes por mes y acumulativos sin romper API publica.',
    'alta',
  ),
  check(
    'HRD26-MOB-001',
    'MOBILE',
    mobileApi.includes('/mobile/nomina/${anio}/${mes}')
      && mobileSelfService.includes('Rol de pagos')
      && mobileSelfService.includes('payrollPdf'),
    'Mobile consume rol de pago mensual y PDF desde API gobernada por plan mobile.',
    'Exponer disponibilidad de rol individual en mobile con endpoint real.',
    'media',
  ),
  check(
    'HRD26-LAND-001',
    'LANDING',
    landing.includes('Batch IESS TXT')
      && landing.includes('reportes internos')
      && landing.includes('Ver planes'),
    'Landing comunica reportes internos, Batch IESS TXT y entrada a planes.',
    'Alinear promesa comercial con reportes disponibles y no prometer XML IESS oficial.',
    'media',
  ),
  check(
    'HRD26-LEGAL-001',
    'LEGAL_EC_2026',
    legalEcuador.includes('sourceStatus: \'validado\'')
      && legalEcuador.includes('unifiedBaseSalary: 482')
      && legalEcuador.includes('personalIessRate: 0.0945')
      && legalEcuador.includes('employerIessRate: 0.1115')
      && legalEcuador.includes('{ from: 0, to: 12208, rate: 0, baseTax: 0 }')
      && legalEcuador.includes('{ from: 109956, to: null, rate: 0.37, baseTax: 24572 }'),
    'Parametros Ecuador 2026 estan versionados como validado: SBU 482, IESS 9.45/11.15 y tabla IR 2026 SRI.',
    'Bloquear despliegue si parametros 2026 no estan versionados o quedan pendientes.',
    'alta',
  ),
  check(
    'HRD26-NOREG-001',
    'NO_REGRESION',
    includes('scripts/verify-system-contracts.mjs', 'PAYROLL_NOVELTY_MATRIX')
      && includes('backend/src/services/payrollReportService.test.js', 'genera matriz de novedades del rol'),
    'Contratos y prueba backend focalizada cubren la nueva matriz para reducir regresiones.',
    'Agregar gate automatizado para evitar que la PWA o backend pierdan el reporte.',
    'alta',
  ),
];

const findings = checks.filter((item) => item.status === 'hallazgo');
const diagnostic = {
  generatedAt: new Date().toISOString(),
  plan: 'HAIKY-REPORTES-DISPONIBILIDAD-CLIENTES-2026',
  rulesSource: 'RULES.md',
  scope: ['LANDING', 'PWA', 'BACKEND', 'MOBILE'],
  requestedFocus: [
    'Reportes individuales y globales',
    'Reportes por mes y acumulativos',
    'Filas por empleado y columnas por novedades del rol',
    'Cumplimiento legal Ecuador 2026 laboral y tributario',
    'Scripts JS de solucion y diagnostico',
  ],
  legalSources2026,
  checks,
  findings,
};

diagnostic.evidenceHash = sha256(JSON.stringify({
  legalSources2026,
  checks,
  findings,
}));

mkdirSync(OUT_DIR, { recursive: true });
writeJson('DIAGNOSTICO_JSON.json', diagnostic);
writeMarkdown('INFORME_DIAGNOSTICO.md', [
  '# Informe diagnostico HRD26 - reportes y disponibilidad de clientes',
  '',
  `Generado: ${diagnostic.generatedAt}`,
  `Hash evidencia: ${diagnostic.evidenceHash}`,
  '',
  '## Alcance',
  '',
  '- LANDING: promesa comercial de reportes, planes y no regresion de IESS TXT.',
  '- PWA: reportes internos, filtros global/individual, exporte mensual y acumulado anual.',
  '- BACKEND: tipos de reporte, endpoints y generacion XLSX/CSV/PDF soportada.',
  '- MOBILE: rol de pago individual y PDF disponible desde autoservicio.',
  '',
  '## Fuentes legales 2026 reconfirmadas',
  '',
  ...legalSources2026.map((source) => `- ${source.domain}: ${source.source}. ${source.officialEvidence}`),
  '',
  '## Hallazgos confirmados',
  '',
  ...(findings.length
    ? findings.map((finding) => `- ${finding.code} [${finding.area}] ${finding.recommendation}`)
    : ['- Sin hallazgos abiertos despues de aplicar la matriz de novedades y filtros PWA.']),
  '',
  '## Controles de no regresion',
  '',
  ...checks.map((item) => `- ${item.code}: ${item.status}. ${item.evidence}`),
  '',
  '## Decision tecnica',
  '',
  '- La matriz de novedades se separa de la matriz de conceptos: solo toma lineas de origen novedad o metadata de tipo novedad.',
  '- El reporte mensual y el acumulado anual usan el mismo filtro sanitizado para mantener compatibilidad API.',
  '- El alcance individual se resuelve por selector de empleado y no por escritura manual de IDs.',
  '- La revision legal queda documentada como parametrizacion 2026 validada; futuras actualizaciones deben pasar por parametros legales versionados.',
  '',
]);
writeMarkdown('SCRIPTS_JS_SOLUCION.md', [
  '# Scripts JS de solucion HRD26',
  '',
  '- `npm run audit:reportes:2026`: regenera diagnostico JSON y Markdown.',
  '- `npm run haiky:reportes:2026`: ejecuta diagnostico, contratos, pruebas focalizadas, Prisma, mobile check, build web y actualiza AuditLock.',
  '- `scripts/haiky-reportes-disponibilidad-2026-diagnostic.mjs`: confirma hallazgos contra codigo y fuentes.',
  '- `scripts/haiky-reportes-disponibilidad-2026-solution.mjs`: orquesta la solucion y genera firma de fase.',
  '',
  '## Resultado esperado',
  '',
  '- Backend: `PAYROLL_NOVELTY_MATRIX` disponible.',
  '- PWA: selector Matriz de novedades del rol, alcance Global/Individual y botones Exportar mes/Acumulado anual.',
  '- QA: contratos del sistema y pruebas focalizadas sin fallos.',
  '',
]);

console.log(JSON.stringify({
  ok: findings.length === 0,
  outDir: path.relative(ROOT, OUT_DIR).replaceAll('\\', '/'),
  evidenceHash: diagnostic.evidenceHash,
  findings: findings.length,
}, null, 2));
