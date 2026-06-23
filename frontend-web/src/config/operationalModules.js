import {
  Banknote,
  Building2,
  CalendarClock,
  FileSpreadsheet,
  Gauge,
  KeyRound,
  Landmark,
  MessageSquare,
  Settings2,
  Upload,
  UserCog,
  Workflow,
} from 'lucide-react';

export const operationalModules = [
  {
    key: 'accounting_mapping',
    title: 'Mapeo contable',
    description: 'Relaciona conceptos de nomina con cuentas contables de la empresa.',
    icon: Landmark,
    fields: [
      { name: 'conceptCode', label: 'Concepto de nomina', placeholder: 'SUELDO_BASE', required: true },
      { name: 'accountCode', label: 'Cuenta contable', placeholder: '510101', required: true },
      { name: 'accountName', label: 'Nombre de cuenta', placeholder: 'Sueldos y salarios', required: true },
      { name: 'movementType', label: 'Tipo movimiento', type: 'select', options: ['debito', 'credito'] },
    ],
  },
  {
    key: 'reports_setup',
    title: 'Reportes para entidades',
    description: 'Configura ejercicio fiscal, fuente de respaldo y estado de revision de reportes.',
    icon: FileSpreadsheet,
    fields: [
      { name: 'fiscalYear', label: 'Ejercicio fiscal', type: 'number', required: true },
      { name: 'sourceUrl', label: 'URL de respaldo', placeholder: 'https://...', required: true },
      { name: 'validationStatus', label: 'Estado de revision', type: 'select', options: ['pendiente', 'revisado', 'bloqueado'] },
    ],
  },
  {
    key: 'plans_support',
    title: 'Planes y soporte',
    description: 'Define plan comercial, limite de empleados e incidencias de soporte.',
    icon: Settings2,
    fields: [
      { name: 'planCode', label: 'Codigo plan', placeholder: 'PYME', required: true },
      { name: 'name', label: 'Nombre', placeholder: 'Plan Pyme', required: true },
      { name: 'employeeLimit', label: 'Limite empleados', type: 'number', required: true },
      { name: 'status', label: 'Estado', type: 'select', options: ['activo', 'borrador', 'suspendido'] },
    ],
  },
  {
    key: 'bank_file',
    title: 'Bancos y pagos',
    description: 'Registra ficha bancaria y reglas para preparar archivos de pago.',
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
    description: 'Configura tipos de usuario, permisos y separacion de responsabilidades.',
    icon: UserCog,
    fields: [
      { name: 'roleCode', label: 'Rol', placeholder: 'NOMINA_APROBADOR', required: true },
      { name: 'permissions', label: 'Permisos', placeholder: 'payroll.approve, reports.export', required: true },
      { name: 'requiresSecondApprover', label: 'Requiere doble aprobacion', type: 'checkbox' },
      { name: 'notes', label: 'Notas', type: 'textarea' },
    ],
  },
  {
    key: 'integration',
    title: 'Integraciones',
    description: 'Registra credenciales y permisos para sistemas externos autorizados.',
    icon: KeyRound,
    fields: [
      { name: 'clientName', label: 'Sistema cliente', placeholder: 'ERP externo', required: true },
      { name: 'permissions', label: 'Permisos', placeholder: 'empleados, asistencia', required: true },
      { name: 'rateLimit', label: 'Limite por minuto', type: 'number', required: true },
      { name: 'enabled', label: 'Habilitado', type: 'checkbox' },
    ],
  },
  {
    key: 'attendance_policy',
    title: 'Asistencia',
    description: 'Define reglas de marcacion, ubicacion, foto y aprobaciones.',
    icon: CalendarClock,
    fields: [
      { name: 'policyCode', label: 'Codigo politica', placeholder: 'ASISTENCIA_GENERAL', required: true },
      { name: 'gpsRequired', label: 'Ubicacion obligatoria', type: 'checkbox' },
      { name: 'photoRequired', label: 'Foto obligatoria', type: 'checkbox' },
      { name: 'approvalRole', label: 'Rol aprobador', placeholder: 'NOMINA_APROBADOR', required: true },
    ],
  },
  {
    key: 'demo_company',
    title: 'Empresa demo',
    description: 'Administra datos ficticios para demostraciones comerciales.',
    icon: Building2,
    fields: [
      { name: 'demoCode', label: 'Codigo demo', placeholder: 'DEMO-2026-01', required: true },
      { name: 'employeeCount', label: 'Empleados demo', type: 'number', required: true },
      { name: 'includeBankFiles', label: 'Incluye bancos demo', type: 'checkbox' },
      { name: 'includeReports', label: 'Incluye reportes demo', type: 'checkbox' },
    ],
  },
  {
    key: 'monthly_period',
    title: 'Periodo mensual',
    description: 'Configura periodo, estado y lotes de novedades.',
    icon: Workflow,
    fields: [
      { name: 'period', label: 'Periodo', placeholder: '2026-06', required: true },
      { name: 'state', label: 'Estado', type: 'select', options: ['borrador', 'abierto', 'calculado', 'aprobado', 'cerrado'] },
      { name: 'batchScope', label: 'Alcance del lote', type: 'select', options: ['empresa', 'departamento', 'centro_costo', 'empleado'] },
      { name: 'reference', label: 'Referencia', placeholder: 'NOVEDADES-2026-06', required: true },
    ],
  },
  {
    key: 'employee_import',
    title: 'Carga masiva empleados',
    description: 'Registra lote de importacion, plantilla, validacion y reverso controlado.',
    icon: Upload,
    fields: [
      { name: 'batchId', label: 'ID lote', placeholder: 'IMPORT-2026-06-001', required: true },
      { name: 'fileName', label: 'Archivo', placeholder: 'empleados_demo.csv', required: true },
      { name: 'rowCount', label: 'Filas', type: 'number', required: true },
      { name: 'reversalEnabled', label: 'Reverso habilitado', type: 'checkbox' },
    ],
  },
  {
    key: 'report_profile',
    title: 'Reportes de nomina',
    description: 'Configura reporte PDF, Excel, permisos y filtros.',
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
    title: 'Indicadores',
    description: 'Define indicador visible, filtros y privacidad.',
    icon: Gauge,
    fields: [
      { name: 'metricCode', label: 'Metrica', placeholder: 'HEADCOUNT_ACTIVE', required: true },
      { name: 'label', label: 'Etiqueta', placeholder: 'Empleados activos', required: true },
      { name: 'filter', label: 'Filtro principal', placeholder: 'periodo, departamento', required: true },
      { name: 'aggregateOnly', label: 'Solo agregado', type: 'checkbox' },
    ],
  },
  {
    key: 'user_message',
    title: 'Mensajes al usuario',
    description: 'Convierte errores tecnicos en mensajes claros con siguiente accion.',
    icon: MessageSquare,
    fields: [
      { name: 'messageCode', label: 'Codigo', placeholder: 'PARAMETRO_PENDIENTE', required: true },
      { name: 'userMessage', label: 'Mensaje usuario', type: 'textarea', required: true },
      { name: 'nextAction', label: 'Siguiente accion', placeholder: 'Revisar configuracion', required: true },
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
      { name: 'ctaLabel', label: 'Accion principal', placeholder: 'Crear cuenta', required: true },
      { name: 'companyOnboarding', label: 'Registro de empresa activo', type: 'checkbox' },
      { name: 'trackingConsent', label: 'Analitica con consentimiento', type: 'checkbox' },
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
