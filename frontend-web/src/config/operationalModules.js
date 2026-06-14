import {
  Banknote,
  Building2,
  CalendarClock,
  FileCode2,
  FileSpreadsheet,
  Gauge,
  KeyRound,
  Landmark,
  MessageSquare,
  Plug,
  Settings2,
  ShieldCheck,
  Upload,
  UserCog,
  Workflow,
} from 'lucide-react';

export const operationalModules = [
  {
    key: 'accounting_mapping',
    title: 'Mapeo contable',
    description: 'Relaciona conceptos de nomina con cuentas contables por tenant.',
    icon: Landmark,
    fields: [
      { name: 'conceptCode', label: 'Concepto de nomina', placeholder: 'SUELDO_BASE', required: true },
      { name: 'accountCode', label: 'Cuenta contable', placeholder: '510101', required: true },
      { name: 'accountName', label: 'Nombre de cuenta', placeholder: 'Sueldos y salarios', required: true },
      { name: 'movementType', label: 'Tipo movimiento', type: 'select', options: ['debito', 'credito'] },
    ],
  },
  {
    key: 'rdep_setup',
    title: 'RDEP SRI',
    description: 'Configura ejercicio fiscal, ficha tecnica, XSD y fuente oficial RDEP.',
    icon: FileCode2,
    fields: [
      { name: 'fiscalYear', label: 'Ejercicio fiscal', type: 'number', required: true },
      { name: 'sourceUrl', label: 'URL fuente SRI', placeholder: 'https://www.sri.gob.ec/formularios-e-instructivos1', required: true },
      { name: 'xsdVersion', label: 'Version XSD', placeholder: 'RDEP 2023 / vigente', required: true },
      { name: 'validationStatus', label: 'Estado validacion', type: 'select', options: ['pendiente_validacion_oficial', 'validado_oficial', 'bloqueado_por_fuente'] },
    ],
  },
  {
    key: 'superadmin_plan',
    title: 'SUPERADMIN planes',
    description: 'Define plan, addon, contrato OWNER o incidencia supervisada.',
    icon: ShieldCheck,
    fields: [
      { name: 'planCode', label: 'Codigo plan/addon', placeholder: 'PYME', required: true },
      { name: 'name', label: 'Nombre', placeholder: 'Plan Pyme', required: true },
      { name: 'employeeLimit', label: 'Limite empleados', type: 'number', required: true },
      { name: 'status', label: 'Estado', type: 'select', options: ['activo', 'borrador', 'suspendido'] },
    ],
  },
  {
    key: 'owner_bank_file',
    title: 'OWNER bancos',
    description: 'Registra ficha tecnica bancaria y control de archivo plano.',
    icon: Banknote,
    fields: [
      { name: 'bankCode', label: 'Banco', placeholder: 'PICHINCHA', required: true },
      { name: 'formatName', label: 'Formato', placeholder: 'Pago nomina CSV', required: true },
      { name: 'delimiter', label: 'Separador', placeholder: ';', required: true },
      { name: 'requiresApproval', label: 'Requiere aprobacion', type: 'checkbox' },
    ],
  },
  {
    key: 'access_matrix',
    title: 'Usuarios y accesos',
    description: 'Configura tipos de usuario, permisos y segregacion de funciones.',
    icon: UserCog,
    fields: [
      { name: 'roleCode', label: 'Rol', placeholder: 'NOMINA_APROBADOR', required: true },
      { name: 'permissions', label: 'Permisos', placeholder: 'payroll.approve, reports.export', required: true },
      { name: 'requiresSecondApprover', label: 'Requiere doble aprobacion', type: 'checkbox' },
      { name: 'notes', label: 'Notas', type: 'textarea' },
    ],
  },
  {
    key: 'integration_api',
    title: 'API de integracion',
    description: 'Registra cliente externo, scopes, rate limit e idempotencia.',
    icon: Plug,
    fields: [
      { name: 'clientName', label: 'Sistema cliente', placeholder: 'ERP externo', required: true },
      { name: 'scopes', label: 'Scopes', placeholder: 'employees.read, attendance.write', required: true },
      { name: 'rateLimit', label: 'Limite por minuto', type: 'number', required: true },
      { name: 'enabled', label: 'Habilitado', type: 'checkbox' },
    ],
  },
  {
    key: 'attendance_policy',
    title: 'Asistencia',
    description: 'Define reglas de marcacion manual, APP, GPS, foto y aprobaciones.',
    icon: CalendarClock,
    fields: [
      { name: 'policyCode', label: 'Codigo politica', placeholder: 'ASISTENCIA_GENERAL', required: true },
      { name: 'gpsRequired', label: 'GPS obligatorio', type: 'checkbox' },
      { name: 'photoRequired', label: 'Foto obligatoria', type: 'checkbox' },
      { name: 'approvalRole', label: 'Rol aprobador', placeholder: 'NOMINA_APROBADOR', required: true },
    ],
  },
  {
    key: 'demo_seed',
    title: 'Empresa DEMO',
    description: 'Solicita o documenta seed DEMO reproducible sin datos reales.',
    icon: Building2,
    fields: [
      { name: 'seedKey', label: 'Seed key', placeholder: 'ONI26-DEMO-2026-01', required: true },
      { name: 'employeeCount', label: 'Empleados DEMO', type: 'number', required: true },
      { name: 'includeBankFiles', label: 'Incluye bancos DEMO', type: 'checkbox' },
      { name: 'includeRdep', label: 'Incluye RDEP DEMO', type: 'checkbox' },
    ],
  },
  {
    key: 'monthly_period',
    title: 'Apertura de mes',
    description: 'Configura periodo, estado, lotes de novedades e idempotencia.',
    icon: Workflow,
    fields: [
      { name: 'period', label: 'Periodo', placeholder: '2026-06', required: true },
      { name: 'state', label: 'Estado', type: 'select', options: ['draft', 'open', 'novelties_loaded', 'calculated', 'approved', 'closed'] },
      { name: 'batchScope', label: 'Alcance lote', type: 'select', options: ['company', 'department', 'costCenter', 'employee'] },
      { name: 'idempotencyKey', label: 'Clave idempotencia', placeholder: 'NOVEDADES-2026-06', required: true },
    ],
  },
  {
    key: 'employee_import',
    title: 'Carga masiva empleados',
    description: 'Registra lote de importacion, plantilla, validacion y rollback.',
    icon: Upload,
    fields: [
      { name: 'batchId', label: 'ID lote', placeholder: 'IMPORT-2026-06-001', required: true },
      { name: 'fileName', label: 'Archivo', placeholder: 'empleados_demo.csv', required: true },
      { name: 'rowCount', label: 'Filas', type: 'number', required: true },
      { name: 'rollbackEnabled', label: 'Rollback habilitado', type: 'checkbox' },
    ],
  },
  {
    key: 'report_profile',
    title: 'Reportes nomina',
    description: 'Configura reporte PDF, Excel tabular, permisos y filtros.',
    icon: FileSpreadsheet,
    fields: [
      { name: 'reportCode', label: 'Codigo reporte', placeholder: 'PAYROLL_SUMMARY', required: true },
      { name: 'formats', label: 'Formatos', placeholder: 'pdf,xlsx,csv', required: true },
      { name: 'permission', label: 'Permiso', placeholder: 'reports.export', required: true },
      { name: 'tabularExcel', label: 'Excel tabular', type: 'checkbox' },
    ],
  },
  {
    key: 'dashboard_metric',
    title: 'Dashboard headcount',
    description: 'Define indicador visible, filtros y privacidad.',
    icon: Gauge,
    fields: [
      { name: 'metricCode', label: 'Metrica', placeholder: 'HEADCOUNT_ACTIVE', required: true },
      { name: 'label', label: 'Etiqueta', placeholder: 'Headcount activo', required: true },
      { name: 'filter', label: 'Filtro principal', placeholder: 'periodId, departmentId', required: true },
      { name: 'aggregateOnly', label: 'Solo agregado', type: 'checkbox' },
    ],
  },
  {
    key: 'user_message',
    title: 'Mensajes tecnicos',
    description: 'Convierte errores tecnicos en mensajes claros con siguiente accion.',
    icon: MessageSquare,
    fields: [
      { name: 'messageCode', label: 'Codigo', placeholder: 'RDEP_SOURCE_OUTDATED', required: true },
      { name: 'userMessage', label: 'Mensaje usuario', type: 'textarea', required: true },
      { name: 'nextAction', label: 'Siguiente accion', placeholder: 'Confirmar ficha tecnica SRI', required: true },
      { name: 'severity', label: 'Severidad', type: 'select', options: ['info', 'warning', 'error'] },
    ],
  },
  {
    key: 'public_site',
    title: 'Sitio publico',
    description: 'Controla link publico, crear cuenta, propuesta de valor y conversion.',
    icon: Settings2,
    fields: [
      { name: 'publicUrl', label: 'URL publica', placeholder: 'https://nomina.example.com', required: true },
      { name: 'ctaLabel', label: 'CTA principal', placeholder: 'Crear cuenta', required: true },
      { name: 'ownerOnboarding', label: 'Onboarding OWNER activo', type: 'checkbox' },
      { name: 'trackingConsent', label: 'Analitica con consentimiento', type: 'checkbox' },
    ],
  },
  {
    key: 'store_readiness',
    title: 'PWA y stores',
    description: 'Controla PWA, Google Play, Apple Store, politicas y bloqueos externos.',
    icon: KeyRound,
    fields: [
      { name: 'channel', label: 'Canal', type: 'select', options: ['pwa', 'google_play', 'apple_store'] },
      { name: 'readiness', label: 'Estado', type: 'select', options: ['pendiente', 'listo', 'bloqueado_externo'] },
      { name: 'policyUrl', label: 'URL politica', placeholder: 'https://...', required: true },
      { name: 'blocker', label: 'Bloqueo', type: 'textarea' },
    ],
  },
];

export function emptyOperationalForm(module) {
  return Object.fromEntries(module.fields.map((field) => {
    if (field.type === 'checkbox') return [field.name, false];
    if (field.type === 'number') return [field.name, ''];
    if (field.type === 'select') return [field.name, field.options[0]];
    return [field.name, ''];
  }));
}
