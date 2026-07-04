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
    description: 'Relaciona conceptos de nómina con cuentas contables de la empresa.',
    icon: Landmark,
    fields: [
      { name: 'conceptCode', label: 'Concepto de nómina', placeholder: 'SUELDO_BASE', required: true },
      { name: 'accountCode', label: 'Cuenta contable', placeholder: '510101', required: true },
      { name: 'accountName', label: 'Nombre de cuenta', placeholder: 'Sueldos y salarios', required: true },
      { name: 'movementType', label: 'Tipo movimiento', type: 'select', options: ['debito', 'credito'] },
    ],
  },
  {
    key: 'reports_setup',
    title: 'Reportes para entidades',
    description: 'Configura ejercicio fiscal, fuente de respaldo y estado de revisión de reportes.',
    icon: FileSpreadsheet,
    fields: [
      { name: 'fiscalYear', label: 'Ejercicio fiscal', type: 'number', required: true },
      { name: 'sourceUrl', label: 'URL de respaldo', placeholder: 'https://...', required: true },
      { name: 'validationStatus', label: 'Estado de revisión', type: 'select', options: ['pendiente', 'revisado', 'bloqueado'] },
    ],
  },
  {
    key: 'plans_support',
    title: 'Planes y soporte',
    description: 'Define plan comercial, límite de empleados e incidencias de soporte.',
    icon: Settings2,
    fields: [
      { name: 'planCode', label: 'Código plan', placeholder: 'PYME', required: true },
      { name: 'name', label: 'Nombre', placeholder: 'Plan Pyme', required: true },
      { name: 'employeeLimit', label: 'Límite empleados', type: 'number', required: true },
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
      { name: 'formatName', label: 'Formato', placeholder: 'Pago nómina CSV', required: true },
      { name: 'delimiter', label: 'Separador', placeholder: ';', required: true },
      { name: 'requiresApproval', label: 'Requiere aprobación', type: 'checkbox' },
    ],
  },
  {
    key: 'access_matrix',
    title: 'Usuarios y accesos',
    description: 'Configura tipos de usuario, permisos y separación de responsabilidades.',
    icon: UserCog,
    fields: [
      { name: 'roleCode', label: 'Rol', placeholder: 'NOMINA_APROBADOR', required: true },
      { name: 'permissions', label: 'Permisos', placeholder: 'payroll.approve, reports.export', required: true },
      { name: 'requiresSecondApprover', label: 'Requiere doble aprobación', type: 'checkbox' },
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
      { name: 'rateLimit', label: 'Límite por minuto', type: 'number', required: true },
      { name: 'enabled', label: 'Habilitado', type: 'checkbox' },
    ],
  },
  {
    key: 'attendance_policy',
    title: 'Asistencia',
    description: 'Define reglas de marcación, ubicación, foto y aprobaciones.',
    icon: CalendarClock,
    fields: [
      { name: 'policyCode', label: 'Código política', placeholder: 'ASISTENCIA_GENERAL', required: true },
      { name: 'gpsRequired', label: 'Ubicación obligatoria', type: 'checkbox' },
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
      { name: 'demoCode', label: 'Código demo', placeholder: 'DEMO-2026-01', required: true },
      { name: 'employeeCount', label: 'Empleados demo', type: 'number', required: true },
      { name: 'includeBankFiles', label: 'Incluye bancos demo', type: 'checkbox' },
      { name: 'includeReports', label: 'Incluye reportes demo', type: 'checkbox' },
    ],
  },
  {
    key: 'monthly_period',
    title: 'Período mensual',
    description: 'Configura período, estado y lotes de novedades.',
    icon: Workflow,
    fields: [
      { name: 'period', label: 'Período', placeholder: '2026-06', required: true },
      { name: 'state', label: 'Estado', type: 'select', options: ['borrador', 'abierto', 'calculado', 'aprobado', 'cerrado'] },
      { name: 'batchScope', label: 'Alcance del lote', type: 'select', options: ['empresa', 'departamento', 'centro_costo', 'empleado'] },
      { name: 'reference', label: 'Referencia', placeholder: 'NOVEDADES-2026-06', required: true },
    ],
  },
  {
    key: 'employee_import',
    title: 'Carga masiva empleados',
    description: 'Registra lote de importación, plantilla, validación y reverso controlado.',
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
    title: 'Reportes de nómina',
    description: 'Configura reporte PDF, Excel, permisos y filtros.',
    icon: FileSpreadsheet,
    fields: [
      { name: 'reportCode', label: 'Código reporte', placeholder: 'PAYROLL_SUMMARY', required: true },
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
      { name: 'metricCode', label: 'Métrica', placeholder: 'HEADCOUNT_ACTIVE', required: true },
      { name: 'label', label: 'Etiqueta', placeholder: 'Empleados activos', required: true },
      { name: 'filter', label: 'Filtro principal', placeholder: 'periodo, departamento', required: true },
      { name: 'aggregateOnly', label: 'Solo agregado', type: 'checkbox' },
    ],
  },
  {
    key: 'user_message',
    title: 'Mensajes al usuario',
    description: 'Convierte errores técnicos en mensajes claros con siguiente acción.',
    icon: MessageSquare,
    fields: [
      { name: 'messageCode', label: 'Código', placeholder: 'PARAMETRO_PENDIENTE', required: true },
      { name: 'userMessage', label: 'Mensaje usuario', type: 'textarea', required: true },
      { name: 'nextAction', label: 'Siguiente acción', placeholder: 'Revisar configuración', required: true },
      { name: 'severity', label: 'Severidad', type: 'select', options: ['info', 'warning', 'error'] },
    ],
  },
  {
    key: 'public_site',
    title: 'Sitio público',
    description: 'Controla link público, crear cuenta, propuesta de valor y conversión.',
    icon: Settings2,
    fields: [
      { name: 'publicUrl', label: 'URL pública', placeholder: 'https://nomina.example.com', required: true },
      { name: 'ctaLabel', label: 'Acción principal', placeholder: 'Crear cuenta', required: true },
      { name: 'companyOnboarding', label: 'Registro de empresa activo', type: 'checkbox' },
      { name: 'trackingConsent', label: 'Analítica con consentimiento', type: 'checkbox' },
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
