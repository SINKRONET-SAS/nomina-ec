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
const comunicacionesWeb = read('frontend-web/src/pages/Configuracion/Comunicaciones.jsx');
const actasEntregaDotacion = read('frontend-web/src/pages/Documentos/ActasEntregaDotacion.jsx');
const contratosGenerados = read('frontend-web/src/pages/Documentos/ContratosGenerados.jsx');
const cerrarMes = read('frontend-web/src/pages/Nomina/CerrarMes.jsx');
const rolesPagos = read('frontend-web/src/pages/Nomina/RolesPagos.jsx');
const beneficios = read('frontend-web/src/pages/Nomina/Beneficios.jsx');
const descargarReportes = read('frontend-web/src/pages/Nomina/DescargarReportes.jsx');
const dateFormatWeb = read('frontend-web/src/utils/dateFormat.js');
const monthlyPeriodService = read('backend/src/services/monthlyPeriodService.js');
const payrollAccountingController = read('backend/src/controllers/payrollAccountingController.js');
const configurationApi = read('frontend-web/src/services/configurationApi.js');
const templateGenerator = read('backend/src/services/templateGenerator.js');
const payrollRolePdfService = read('backend/src/services/payrollRolePdfService.js');
const equipmentDeliveryActService = read('backend/src/services/equipmentDeliveryActService.js');
const paymentController = read('backend/src/controllers/paymentController.js');
const planCapabilityService = read('backend/src/services/planCapabilityService.js');
const payphoneGatewayService = read('backend/src/services/payphoneGatewayService.js');
const paymentReferenceService = read('backend/src/services/paymentReferenceService.js');
const auditService = read('backend/src/services/auditService.js');
const privacyController = read('backend/src/controllers/privacyController.js');
const privacyConsentService = read('backend/src/services/privacyConsentService.js');
const userDataExportService = read('backend/src/services/userDataExportService.js');
const userDataPurgeService = read('backend/src/services/userDataPurgeService.js');
const planesPublicos = read('frontend-web/src/pages/Planes.jsx');
const publicPlansCatalog = read('frontend-web/src/components/PublicPlansCatalog.jsx');
const publicPlanPresentation = read('frontend-web/src/config/publicPlanPresentation.js');
const registroWeb = read('frontend-web/src/pages/Register.jsx');
const planesGestion = read('frontend-web/src/pages/PlanesGestion.jsx');
const rutasCampo = read('frontend-web/src/pages/Asistencia/RutasCampo.jsx');
const mobileApp = read('app-movil/src/App.js');
const mobileApi = read('app-movil/src/services/api.js');
const operacionMovil = read('app-movil/src/screens/OperacionMovilScreen.js');
const privacidadCuenta = read('frontend-web/src/pages/PrivacidadCuenta.jsx');
const privacyApi = read('frontend-web/src/services/privacyApi.js');
const beneficiosApi = read('frontend-web/src/services/beneficiosApi.js');
const renderYaml = read('render.yaml');
const merchandiserTrialTemplate = JSON.parse(read('backend/src/templates/legal/contracts/contrato_indefinido_mercaderista_prueba.json'));
const forbiddenLegacyDbName = ['plan', 'haiky'].join('_');
const forbiddenLegacyDbUser = ['haiky', 'migration'].join('_');

assert(!exists('CODEX_CONTEXT.md'), 'CODEX_CONTEXT.md no debe quedar en raiz publica del repo.');
assert(exists('.github/CODEX_CONTEXT.md'), 'CODEX_CONTEXT.md debe estar ubicado bajo .github/.');
assert(!renderYaml.includes(forbiddenLegacyDbName), 'render.yaml no debe exponer nombre interno legacy de base de datos.');
assert(!renderYaml.includes(forbiddenLegacyDbUser), 'render.yaml no debe exponer usuario interno legacy de base de datos.');
assert(renderYaml.includes('sknomina-api'), 'render.yaml debe nombrar el servicio API como SKNOMINA.');

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

for (const [screenName, screenText] of [
  ['CerrarMes.jsx', cerrarMes],
  ['DescargarReportes.jsx', descargarReportes],
  ['RolesPagos.jsx', rolesPagos],
  ['Beneficios.jsx', beneficios],
]) {
  assert(screenText.includes('currentPeriodEC'), `${screenName} debe inicializar periodo con America/Guayaquil.`);
  assert(!screenText.includes('new Date()'), `${screenName} no debe usar new Date() directo para default de periodo.`);
  assert(!screenText.includes('getMonth() + 1'), `${screenName} no debe derivar mes operativo del timezone local.`);
}
assert(dateFormatWeb.includes("const ECUADOR_TIME_ZONE = 'America/Guayaquil'"), 'Helper web debe fijar America/Guayaquil.');
assert(dateFormatWeb.includes('function datePartsEC'), 'Helper web debe centralizar partes de fecha Ecuador.');
assert(dateFormatWeb.includes('export function currentPeriodEC'), 'Helper web debe exponer currentPeriodEC.');
assert(monthlyPeriodService.includes('function currentPeriodInEcuador'), 'Backend debe exponer periodo actual en America/Guayaquil.');
assert(payrollAccountingController.includes('currentPeriodInEcuador'), 'API contable no debe caer a new Date local para periodo default.');

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
assert(parametrizacion.includes('Cuentas contables de nómina'), 'La PWA debe exponer cuentas contables de nómina sin duplicar parámetros legales.');

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

assert(!templateGenerator.includes('Ver documento HTML original'), 'El generador de contratos no debe emitir PDF placeholder.');
assert(templateGenerator.includes('listContractTemplates'), 'Backend debe cargar catalogo de plantillas de contrato desde archivos.');
assert(templateGenerator.includes('legalRepresentativeId'), 'Contratos deben incluir identificacion del representante legal.');
assert(
  exists('backend/src/templates/legal/contracts/contrato_indefinido_general.json'),
  'Debe existir plantilla ejecutable de contrato indefinido general.'
);
assert(
  exists('backend/src/templates/legal/contracts/contrato_indefinido_mercaderista_prueba.json'),
  'Debe existir plantilla ejecutable de contrato de mercaderista con periodo de prueba.'
);
assert(
  exists('docs2/plantillas-legales/contratos/README.md'),
  'Debe existir carpeta documental para revision de plantillas legales de contratos.'
);
assert(
  merchandiserTrialTemplate.probation?.enabled === true && Number(merchandiserTrialTemplate.probation?.days) === 90,
  'La plantilla de mercaderista debe parametrizar periodo de prueba de 90 dias.'
);
assert(
  JSON.stringify(merchandiserTrialTemplate).includes('rutas') && JSON.stringify(merchandiserTrialTemplate).includes('dotacion'),
  'La plantilla de mercaderista debe cubrir rutas/evidencia y dotacion/equipos.'
);
assert(app.includes("'/api/documentos/contrato/plantillas'"), 'Backend debe exponer catalogo de plantillas de contrato.');
assert(contratosGenerados.includes('/documentos/contrato/plantillas'), 'La PWA debe consumir plantillas de contrato desde backend.');
assert(contratosGenerados.includes('/documentos/contrato'), 'La PWA debe generar contratos contra backend real.');
assert(payrollRolePdfService.includes('Recepcion y conformidad'), 'Roles de pago deben incluir bloque de recepcion y conformidad.');
assert(payrollRolePdfService.includes('Representante legal / delegado del empleador'), 'Roles de pago deben firmarse por representante/delegado del empleador.');
assert(payrollRolePdfService.includes('tenant_configuracion'), 'Roles de pago deben leer configuracion del tenant para representante legal.');
assert(payrollRolePdfService.includes('buildPayrollRoleTransposedDocDefinition'), 'Backend debe generar rol de pago consolidado transpuesto.');
assert(app.includes("'/api/nomina/:anio/:mes/roles-pdf-transpuesto'"), 'Backend debe exponer descarga de rol transpuesto por periodo.');
assert(rolesPagos.includes('roles-pdf-transpuesto'), 'PWA debe consumir descarga real del rol transpuesto por periodo.');
assert(equipmentDeliveryActService.includes('representante_legal_identificacion'), 'Actas de dotacion deben incluir identificacion del representante legal/delegado.');

assert(payphoneGatewayService.includes('/api/button/Prepare'), 'PayPhone debe preparar checkout contra API real Prepare.');
assert(payphoneGatewayService.includes('/api/button/V2/Confirm'), 'PayPhone debe confirmar pago contra API real Confirm.');
assert(payphoneGatewayService.includes('Content-Length'), 'Gateway PayPhone debe enviar Content-Length para evitar chunked.');
assert(payphoneGatewayService.includes('BACKEND_PUBLIC_URL'), 'PayPhone debe exigir callback backend publico HTTPS.');
assert(paymentReferenceService.includes('sknomina-'), 'Pagos deben usar referencia única SKNOMINA parseable.');
assert(paymentController.includes('createPayPhonePayment'), 'Checkout debe llamar gateway PayPhone real.');
assert(paymentController.includes('confirmPayPhonePayment'), 'Confirmacion debe consultar PayPhone antes de activar plan.');
assert(paymentController.includes('PAYMENT_AMOUNT_MISMATCH'), 'Confirmacion debe bloquear monto PayPhone distinto al checkout.');
assert(paymentController.includes('versionedFromActiveSubscriptions'), 'Gestion de planes debe versionar cuando existen suscripciones activas.');
assert(schema.includes('appMovil') && schema.includes('@map("app_movil")'), 'Prisma debe declarar app movil como canal monetizable de plan.');
assert(schema.includes('rutasCampo') && schema.includes('@map("rutas_campo")'), 'Prisma debe declarar rutas de campo como canal monetizable de plan.');
assert(
  exists('backend/prisma/migrations/20260703090000_mra26_plan_routes_mobile_channels/migration.sql'),
  'Debe existir migracion MRA26 para monetizar app movil y rutas de campo.'
);
assert(planCapabilityService.includes("mobileApp: 'app_movil'"), 'PlanCapabilityService debe exponer mobileApp.');
assert(planCapabilityService.includes("fieldRoutes: 'rutas_campo'"), 'PlanCapabilityService debe exponer fieldRoutes.');
assert(paymentController.includes('app_movil') && paymentController.includes('rutas_campo'), 'Gestion de planes backend debe persistir app movil y rutas de campo.');
assert(app.includes("const requireMobileAppPlan = requirePlanCapability('mobileApp')"), 'Backend debe definir gate de plan para app movil.');
assert(app.includes("const requireFieldRoutesPlan = requirePlanCapability('fieldRoutes')"), 'Backend debe definir gate de plan para rutas de campo.');
assert(app.includes("'/api/rutas/sitios', requireRole('owner', 'admin_rrhh', 'supervisor'), requireFieldRoutesPlan"), 'Rutas PWA deben bloquearse por plan.');
assert(app.includes("'/api/mobile/me', requireRole('empleado', 'owner', 'admin_rrhh', 'supervisor'), requireMobileAppPlan"), 'App movil debe bloquear perfil por plan e incluir supervisor.');
assert(app.includes("'/api/mobile/ruta/hoy', requireRole('empleado', 'owner', 'admin_rrhh', 'supervisor'), requireMobileAppPlan, requireFieldRoutesPlan"), 'Rutas dentro de app movil deben exigir app, rutas y supervisor.');
assert(app.includes("'/api/mobile/admin/rutas/resumen', requireRole('owner', 'admin_rrhh', 'supervisor'), requireMobileAppPlan, requireFieldRoutesPlan"), 'App movil debe exponer resumen administrativo de rutas con gates de plan.');
assert(app.includes("'/api/mobile/admin/zonas', requireRole('owner', 'admin_rrhh'), requireMobileAppPlan, requireFieldRoutesPlan"), 'Creacion movil de zonas debe limitarse a owner/RRHH y exigir plan.');
assert(app.includes("'/api/mobile/admin/rutas/sitios', requireRole('owner', 'admin_rrhh'), requireMobileAppPlan, requireFieldRoutesPlan"), 'Creacion movil de sitios debe limitarse a owner/RRHH y exigir plan.');
assert(app.includes("'/api/mobile/admin/rutas/dias', requireRole('owner', 'admin_rrhh', 'supervisor'), requireMobileAppPlan, requireFieldRoutesPlan"), 'Asignacion movil de rutas debe permitir supervisor con gates de plan.');
assert(mobileApi.includes('/mobile/admin/rutas/resumen'), 'API movil debe consumir resumen administrativo de rutas.');
assert(mobileApi.includes('/mobile/admin/zonas'), 'API movil debe crear zonas desde endpoint gobernado.');
assert(mobileApi.includes('/mobile/admin/rutas/sitios'), 'API movil debe crear sitios desde endpoint gobernado.');
assert(mobileApi.includes('/mobile/admin/rutas/dias'), 'API movil debe asignar rutas desde endpoint gobernado.');
assert(mobileApp.includes("const operationalAdminRoles = ['owner', 'admin_rrhh', 'supervisor']"), 'App movil debe reconocer supervisor como perfil operativo administrativo.');
assert(operacionMovil.includes('canCreateWorkZones && renderWorkZoneSection'), 'La app movil debe ocultar zonas cuando el perfil no puede crearlas.');
assert(operacionMovil.includes('canCreateRouteSites && renderRouteSiteSection'), 'La app movil debe ocultar sitios cuando el perfil no puede crearlos.');
assert(operacionMovil.includes('canAssignRoutes && renderAssignRouteSection'), 'La app movil debe ocultar asignacion cuando el perfil no puede ejecutarla.');
assert(planesGestion.includes('appMovil') && planesGestion.includes('rutasCampo'), 'Gestion de planes debe mostrar canales app movil y rutas de campo.');
assert(publicPlanPresentation.includes('App móvil de asistencia') && publicPlanPresentation.includes('Rutas de campo'), 'Catálogo público debe comunicar app móvil y rutas cuando el plan las ofrece.');
assert(publicPlanPresentation.includes('getPlanFunctionality'), 'Catalogo publico debe exponer matriz de funcionalidades por plan.');
assert(publicPlansCatalog.includes('PlanFunctionalityList'), 'Sitio publico debe mostrar funcionalidades ofrecidas por cada plan.');
assert(publicPlansCatalog.includes('Resumen de checkout') && publicPlansCatalog.includes('Continuar a PayPhone'), 'Checkout publico debe mostrar resumen antes de redirigir a PayPhone.');
assert(registroWeb.includes('PlanFunctionalityList') && registroWeb.includes('Resumen de checkout'), 'Registro/checkout debe mostrar funcionalidades del plan seleccionado.');
assert(rutasCampo.includes('fetchPlanCapabilities') && rutasCampo.includes('Canal bloqueado por plan'), 'Pantalla de rutas debe mostrar bloqueo comercial del plan.');
assert(app.includes("'/api/pagos/cancelado'"), 'Backend debe exponer cancelacion PayPhone.');
assert(
  `${planesPublicos}\n${publicPlansCatalog}`.includes('checkoutAvailable === false'),
  'PWA debe bloquear CTA cuando PayPhone no esta configurado.'
);
assert(beneficiosApi.includes('return response.data;'), 'Gestion de planes debe recibir meta de versionado desde backend.');
assert(planesGestion.includes('Plan versionado como'), 'Superadmin debe informar versionado de planes con suscriptores.');

assert(schema.includes('model ConsentPreference'), 'Prisma debe declarar ConsentPreference para LOPDP.');
assert(
  exists('backend/prisma/migrations/20260625021500_anv1_lopdp_consent_preferences/migration.sql'),
  'Debe existir migracion ANV1 de consentimientos LOPDP.'
);
assert(
  read('backend/prisma/migrations/20260625021500_anv1_lopdp_consent_preferences/migration.sql').includes('consent_preferences_user_scope_key'),
  'Consentimientos LOPDP deben tener indice unico por usuario y alcance.'
);
assert(app.includes("'/api/privacidad/consentimientos'"), 'Backend debe exponer estado de consentimientos LOPDP.');
assert(app.includes("'/api/privacidad/exportar'"), 'Backend debe exponer exportacion LOPDP.');
assert(app.includes("'/api/privacidad/anonimizar/:userId'"), 'Backend debe exponer anonimizacion LOPDP controlada.');
assert(privacyController.includes('withdrawAllOptionalConsents'), 'Controlador LOPDP debe retirar consentimientos opcionales.');
assert(privacyConsentService.includes('withdrawable: false'), 'LOPDP debe separar bases legales no revocables de consentimientos opcionales.');
assert(privacyConsentService.includes('lopdp.consent.withdraw_all'), 'Retiro masivo LOPDP debe auditarse.');
assert(userDataExportService.includes('lopdp.data.export'), 'Exportacion de datos personales debe auditarse.');
assert(userDataExportService.includes('retentionNotice'), 'Exportacion LOPDP debe informar conservacion legal.');
assert(userDataPurgeService.includes('LOPDP_OWNER_UNICO_PROTEGIDO'), 'Anonimizacion debe proteger el unico owner activo.');
assert(userDataPurgeService.includes('lopdp.data.anonymize'), 'Anonimizacion LOPDP debe auditarse.');
assert(auditService.includes('sanitizeAuditPayload'), 'Auditoria debe exponer sanitizador LOPDP.');
assert(auditService.includes('/cedula/i') && auditService.includes('/sueldo/i'), 'Auditoria debe redactar cedula y sueldo.');
assert(appWeb.includes('PrivacidadCuenta'), 'PWA debe registrar pantalla autenticada de privacidad.');
assert(layoutWeb.includes('/dashboard/privacidad'), 'Navegacion debe exponer privacidad para usuarios autenticados.');
assert(privacyApi.includes('/privacidad/consentimientos'), 'PWA debe consumir API real de consentimientos.');
assert(privacidadCuenta.includes('Retirar opcionales'), 'Pantalla LOPDP debe permitir retirar consentimientos opcionales.');
assert(privacidadCuenta.includes('Exportar JSON'), 'Pantalla LOPDP debe permitir exportar datos personales.');

assert(comunicacionesWeb.includes('deliveryMode'), 'PWA de comunicaciones debe mostrar modo de entrega real/dev/bloqueado.');
assert(comunicacionesWeb.includes('productionBlocked'), 'PWA de comunicaciones debe mostrar bloqueo productivo sin proveedor real.');
assert(comunicacionesWeb.includes('Enviar prueba'), 'PWA de comunicaciones debe conservar accion de prueba controlada.');
assert(contratosGenerados.includes('signatureStatus'), 'Pantalla de contratos debe mostrar estado de firmas/representante.');
assert(actasEntregaDotacion.includes('signatureStatus'), 'Pantalla de actas de dotacion debe mostrar estado de firmas/representante.');

if (issues.length > 0) {
  console.error('[CONTRACTS] Fallaron contratos de sistema unico:');
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('[CONTRACTS] OK: frontend, backend, Prisma y reportes mantienen contrato de sistema unico.');
