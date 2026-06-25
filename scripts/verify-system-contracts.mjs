import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const issues = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function assert(condition, message) {
  if (!condition) issues.push(message);
}

function unique(values) {
  return [...new Set(values)].filter(Boolean).sort();
}

function regexValues(text, regex, group = 1) {
  return [...text.matchAll(regex)].map((match) => match[group]);
}

const rootPackage = JSON.parse(read('package.json'));
const backendPackage = JSON.parse(read('backend/package.json'));
const webPackage = JSON.parse(read('frontend-web/package.json'));
const mobilePackage = JSON.parse(read('app-movil/package.json'));

assert(rootPackage.private === true, 'La raiz debe ser privada para operar como monorepo de producto.');
for (const workspace of ['backend', 'frontend-web', 'app-movil']) {
  assert(rootPackage.workspaces?.includes(workspace), `Falta workspace raiz: ${workspace}.`);
}
assert(Boolean(backendPackage.scripts?.test), 'Backend debe exponer script test.');
assert(Boolean(backendPackage.scripts?.['prisma:validate']), 'Backend debe exponer script prisma:validate.');
assert(Boolean(webPackage.scripts?.build), 'Frontend web debe exponer script build.');
assert(Boolean(mobilePackage.scripts?.check?.stores || mobilePackage.scripts?.['check:stores']), 'App movil debe exponer script check:stores.');

const app = read('backend/src/app.js');
const configurationService = read('backend/src/services/configurationService.js');
const reportService = read('backend/src/services/payrollReportService.js');
const payrollAccountingService = read('backend/src/services/payrollAccountingService.js');
const payrollNoveltyService = read('backend/src/services/payrollNoveltyService.js');
const payrollCalculationService = read('backend/src/services/calculoNominaService.js');
const schema = read('backend/prisma/schema.prisma');
const parametrizacion = read('frontend-web/src/pages/Configuracion/Parametrizacion.jsx');
const appWeb = read('frontend-web/src/App.jsx');
const layoutWeb = read('frontend-web/src/components/Layout/Layout.jsx');
const actasEntregaDotacion = read('frontend-web/src/pages/Documentos/ActasEntregaDotacion.jsx');
const descargarReportes = read('frontend-web/src/pages/Nomina/DescargarReportes.jsx');
const configurationApi = read('frontend-web/src/services/configurationApi.js');

const frontendResources = unique(regexValues(parametrizacion, /resource:\s*'([^']+)'/g));
for (const resource of frontendResources) {
  assert(
    new RegExp(`\\b${resource}\\s*:`).test(configurationService),
    `Frontend configura resource '${resource}' pero backend RESOURCE_CONFIG no lo declara.`
  );
}
assert(app.includes("'/api/configuracion/:resource'"), 'Backend debe exponer ruta generica /api/configuracion/:resource.');
assert(configurationApi.includes('/configuracion/${resource}'), 'Frontend debe consumir configuracion por recurso backend.');

const frontendReportCodes = unique(regexValues(descargarReportes, /<option value="(PAYROLL_[A-Z_]+)">/g));
const backendReportCodes = unique(regexValues(reportService, /^\s{2}(PAYROLL_[A-Z_]+):/gm));
for (const reportCode of frontendReportCodes) {
  assert(
    backendReportCodes.includes(reportCode),
    `Frontend muestra reporte '${reportCode}' pero backend REPORT_TYPES no lo soporta.`
  );
}
assert(!descargarReportes.includes('PAYROLL_ACCOUNTING_ENTRIES'), 'La PWA no debe mostrar el reporte contable legacy.');
assert(descargarReportes.includes('PAYROLL_ACCOUNTING_REPORT'), 'La PWA debe mostrar el reporte contable gobernado.');
assert(app.includes("'/api/reportes/nomina/exportar'"), 'Backend debe exponer /api/reportes/nomina/exportar.');

for (const endpoint of unique(regexValues(descargarReportes, /['"]((?:\/reportes\/)[^'"]+)['"]/g))) {
  assert(app.includes(`'/api${endpoint}'`), `Frontend consume ${endpoint} pero backend no expone /api${endpoint}.`);
}

assert(schema.includes('model PayrollAccountingMapping'), 'Prisma debe declarar PayrollAccountingMapping.');
assert(schema.includes('model PayrollCalculationLine'), 'Prisma debe declarar PayrollCalculationLine.');
assert(schema.includes('model PayrollCalculationBatch'), 'Prisma debe declarar PayrollCalculationBatch.');
assert(
  exists('backend/prisma/migrations/20260624210000_crn26_payroll_accounting_reports/migration.sql'),
  'Debe existir migracion CRN26 de matriz contable y lineas normalizadas.'
);
assert(
  exists('backend/prisma/migrations/20260624224500_crn26_payroll_calculation_batches/migration.sql'),
  'Debe existir migracion CRN26 de lotes de calculo.'
);
assert(payrollCalculationService.includes('NOMINA_CALCULATION_BATCH_REQUIRED'), 'El motor debe bloquear calculos sin lote.');
assert(payrollAccountingService.includes('PAYROLL_CALCULATION_LINE_BATCH_REQUIRED'), 'Las lineas de calculo deben bloquear persistencia sin lote.');
assert(reportService.includes('loteCalculo'), 'Los reportes de nomina deben exponer loteCalculo.');

assert(payrollNoveltyService.includes('calculateNoveltyImpacts'), 'Debe existir motor de impacto de novedades.');
assert(payrollNoveltyService.includes('NOVELTY_APPROVED_TYPE_NOT_CONFIGURED'), 'Novedades aprobadas sin tipo activo deben fallar visible.');
assert(payrollCalculationService.includes('getApprovedPayrollNoveltyImpacts'), 'Calculo de nomina debe consumir novedades aprobadas.');
assert(payrollAccountingService.includes('ensurePayrollAccountingMappingForNoveltyConfig'), 'Las novedades deben sincronizarse con la matriz contable unica.');
assert(
  exists('backend/prisma/migrations/20260624233500_crn26_novelty_type_unique_index/migration.sql'),
  'Debe existir migracion CRN26 para indice unico de tipos de novedad.'
);
assert(
  read('backend/prisma/migrations/20260624233500_crn26_novelty_type_unique_index/migration.sql').includes('novelty_type_configs_active_code_norm_idx'),
  'La migracion de novedades debe crear indice unico normalizado para activos vigentes.'
);
assert(configurationService.includes('DISTINCT ON (LOWER(BTRIM(code)))'), 'Backend debe deduplicar tipos de novedad por codigo normalizado.');
assert(parametrizacion.includes('dedupeNoveltyRecords'), 'La PWA debe defender la lista de tipos de novedad contra duplicados.');
assert(parametrizacion.includes('Valores legales'), 'La PWA debe separar valores legales de cuentas contables.');
assert(parametrizacion.includes('Cuentas contables de nomina'), 'La PWA debe exponer cuentas contables de nomina sin duplicar parametros legales.');

assert(schema.includes('acta_entrega_dotacion'), 'Prisma debe declarar el tipo documental acta_entrega_dotacion.');
assert(schema.includes('model EquipmentDeliveryAct'), 'Prisma debe declarar EquipmentDeliveryAct.');
assert(schema.includes('items         Json'), 'EquipmentDeliveryAct debe almacenar items estructurados.');
assert(
  exists('backend/prisma/migrations/20260624231500_doc26_equipment_delivery_acts/migration.sql'),
  'Debe existir migracion DOC26 para actas de entrega de dotacion.'
);
assert(app.includes("'/api/documentos/acta-entrega-dotacion'"), 'Backend debe exponer generacion de acta de entrega de dotacion.');
assert(appWeb.includes('ActasEntregaDotacion'), 'La PWA debe registrar la ruta de actas de entrega de dotacion.');
assert(layoutWeb.includes('Entrega de dotacion'), 'La navegacion debe exponer entrega de dotacion.');
assert(actasEntregaDotacion.includes('/documentos/acta-entrega-dotacion'), 'La pantalla debe consumir la ruta backend de acta de entrega.');
assert(actasEntregaDotacion.includes('acta_entrega_dotacion'), 'La pantalla debe listar documentos del tipo acta_entrega_dotacion.');

if (issues.length > 0) {
  console.error('[CONTRACTS] Fallaron contratos de sistema unico:');
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('[CONTRACTS] OK: frontend, backend, Prisma y reportes mantienen contrato de sistema unico.');
