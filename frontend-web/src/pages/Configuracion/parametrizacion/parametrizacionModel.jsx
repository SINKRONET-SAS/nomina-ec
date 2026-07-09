import {
  Briefcase,
  Building2,
  CreditCard,
  Landmark,
  MapPin,
  Network,
  Scale,
  ShieldCheck,
  TimerReset,
  UserCog,
} from 'lucide-react';

const workDayOptions = [
  { value: 'monday', label: 'Lunes' },
  { value: 'tuesday', label: 'Martes' },
  { value: 'wednesday', label: 'Miércoles' },
  { value: 'thursday', label: 'Jueves' },
  { value: 'friday', label: 'Viernes' },
  { value: 'saturday', label: 'Sábado' },
  { value: 'sunday', label: 'Domingo' },
];

const BANK_TEMPLATE_PREVIEWS = {
  pacifico_interbank_immediate: {
    title: 'Banco Pacífico - transferencias interbancarias inmediatas',
    source: 'docs2/Formato_para_transferencias_interbancarias_inmediatas.pdf',
    fileName: 'PACIFICO_NOMINA_AAAAMM.txt',
    lineEnding: 'CRLF',
    encoding: 'latin1',
    delimiter: ';',
    sections: [
      { label: 'Detalle', value: 'Una línea por trabajador con pago aprobado.' },
      { label: 'Totalizador', value: 'Última línea con total pagado y número de registros.' },
      { label: 'Validación', value: 'Tipo de cuenta AH/CC, identificación C/R/P, banco destino y cuenta obligatorios.' },
    ],
    columns: [
      ['1', 'TIPO_REGISTRO', 'Valor fijo D', 'D'],
      ['2', 'TIPO_IDENTIFICACION', 'Cédula/RUC/pasaporte del trabajador', 'C, R o P'],
      ['3', 'IDENTIFICACION', 'empleados.cedula', '10 o 13 digitos'],
      ['4', 'BENEFICIARIO', 'apellidos + nombres', 'Mayusculas, max 60'],
      ['5', 'BANCO_DESTINO', 'perfil bancario del trabajador', 'Código numérico'],
      ['6', 'TIPO_CUENTA', 'empleados.tipo_cuenta', 'AH o CC'],
      ['7', 'CUENTA_BENEFICIARIO', 'cuenta cifrada del trabajador', '10 digitos'],
      ['8', 'VALOR', 'nominas.neto_recibir', 'Decimal 2'],
      ['9', 'CONCEPTO', 'Periodo de nómina', 'Texto max 30'],
      ['10', 'REFERENCIA', 'Referencia única SKNOMINA', 'Texto max 20'],
    ],
    example: 'D;C;1710034065;MARIA DEMO RUIZ;2013;AH;0012345678;850.00;NOMINA 06/2026;NOM9B230E040001',
  },
  generico: {
    title: 'Genérica delimitada',
    source: 'Configuración manual',
    fileName: 'PAGO_NOMINA_AAAAMM.csv',
    lineEnding: 'LF',
    encoding: 'utf8',
    delimiter: ';',
    sections: [
      { label: 'Cabecera', value: 'Opcional, usa nombres de columnas.' },
      { label: 'Detalle', value: 'Una línea por trabajador.' },
      { label: 'Totalizador', value: 'Opcional, total y número de pagos.' },
    ],
    columns: [
      ['1', 'TIPO_REGISTRO', 'Valor fijo', '1'],
      ['2', 'CODIGO_BANCO', 'Perfil bancario', '4 dígitos'],
      ['3', 'CUENTA', 'Cuenta trabajador', 'Según banco'],
      ['4', 'IDENTIFICACION', 'Cédula/RUC', 'Dígitos'],
      ['5', 'BENEFICIARIO', 'Nombre trabajador', 'Texto'],
      ['6', 'CONCEPTO', 'Periodo', 'Texto'],
      ['7', 'FECHA_OPERACION', 'Fecha de pago', 'YYYYMMDD'],
      ['8', 'VALOR', 'Neto a recibir', 'Decimal 2'],
      ['9', 'REFERENCIA', 'Referencia interna', 'Texto'],
    ],
    example: '1;2011;0000000001;0102030405;TEST USER;NOMINA 06/2026;20260628;100.00;REF001',
  },
};

const BANK_TEMPLATE_DEFAULTS = {
  pacifico_interbank_immediate: {
    banco_codigo: 'PACIFICO',
    banco_nombre: 'Banco Pacífico',
    delimiter: ';',
    encoding: 'latin1',
    date_format: 'YYYYMMDD',
    include_header: false,
    include_trailer: true,
    account_field: 'cuenta',
    amount_field: 'importe',
  },
  generico: {
    delimiter: ';',
    encoding: 'utf8',
    date_format: 'YYYYMMDD',
    include_header: true,
    include_trailer: true,
    account_field: 'cuentaBancaria',
    amount_field: 'netoRecibir',
  },
};

const BANK_MAPPING_STRUCTURES = {
  pacifico_interbank_immediate: [
    { canonical_field: 'tipoRegistro', bank_field_name: 'TIPO_REGISTRO', position: 1, formatter: 'fixed:D', required: true },
    { canonical_field: 'tipoIdentificacion', bank_field_name: 'TIPO_IDENTIFICACION', position: 2, formatter: 'idType:C/R/P', required: true },
    { canonical_field: 'cedula', bank_field_name: 'IDENTIFICACION', position: 3, formatter: 'digits:10|13', required: true },
    { canonical_field: 'nombre', bank_field_name: 'BENEFICIARIO', position: 4, formatter: 'uppercase:60', required: true },
    { canonical_field: 'bancoCodigo', bank_field_name: 'BANCO_DESTINO', position: 5, formatter: 'numeric', required: true },
    { canonical_field: 'tipoCuenta', bank_field_name: 'TIPO_CUENTA', position: 6, formatter: 'AH|CC', required: true },
    { canonical_field: 'cuenta', bank_field_name: 'CUENTA_BENEFICIARIO', position: 7, formatter: 'leftPad:10', required: true },
    { canonical_field: 'importe', bank_field_name: 'VALOR', position: 8, formatter: 'amount:2', required: true },
    { canonical_field: 'concepto', bank_field_name: 'CONCEPTO', position: 9, formatter: 'text:30', required: true },
    { canonical_field: 'referencia', bank_field_name: 'REFERENCIA', position: 10, formatter: 'text:20', required: true },
  ],
  generico: [
    { canonical_field: 'tipoRegistro', bank_field_name: 'TIPO_REGISTRO', position: 1, formatter: 'fixed:1', required: true },
    { canonical_field: 'bancoCodigo', bank_field_name: 'CODIGO_BANCO', position: 2, formatter: 'leftPad:4', required: true },
    { canonical_field: 'cuenta', bank_field_name: 'CUENTA_BENEFICIARIO', position: 3, formatter: 'leftPad:10', required: true },
    { canonical_field: 'cedula', bank_field_name: 'IDENTIFICACION', position: 4, formatter: 'digits:10', required: true },
    { canonical_field: 'nombre', bank_field_name: 'BENEFICIARIO', position: 5, formatter: 'uppercase:40', required: true },
    { canonical_field: 'concepto', bank_field_name: 'CONCEPTO', position: 6, formatter: 'text:40', required: true },
    { canonical_field: 'fechaOperacion', bank_field_name: 'FECHA_OPERACION', position: 7, formatter: 'date:YYYYMMDD', required: true },
    { canonical_field: 'importe', bank_field_name: 'VALOR', position: 8, formatter: 'amount:2', required: true },
    { canonical_field: 'referencia', bank_field_name: 'REFERENCIA', position: 9, formatter: 'text:20', required: true },
  ],
};

const CANONICAL_BANK_FIELDS = [
  'tipoRegistro',
  'tipoIdentificacion',
  'bancoCodigo',
  'tipoCuenta',
  'oficina',
  'digitoControl',
  'cuenta',
  'cedula',
  'nombre',
  'concepto',
  'fechaOperacion',
  'importe',
  'referencia',
];

function parseStructuredValue(text, fallback) {
  if (!String(text || '').trim()) return fallback;
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error('El valor estructurado JSON no es valido.');
  }
}

const formDefinitions = [
  {
    key: 'empresa',
    title: 'Datos de empresa',
    description: 'Registra la informacion base del empleador para roles, contratos, anexos y archivos oficiales.',
    icon: Building2,
    resource: 'catalogs',
    stepCode: 'empresa',
    catalogType: 'empresa_operativa',
    fields: [
      { name: 'ruc', label: 'RUC', placeholder: '1790012345001', required: true },
      { name: 'razon_social', label: 'Razon social', placeholder: 'EMPRESA S.A.', required: true },
      { name: 'nombre_comercial', label: 'Nombre comercial' },
      { name: 'representante_legal', label: 'Representante legal' },
      { name: 'email', label: 'Correo administrativo', type: 'email' },
      { name: 'telefono', label: 'Teléfono' },
      { name: 'ciudad', label: 'Ciudad' },
      { name: 'direccion', label: 'Dirección matriz', type: 'textarea', wide: true },
    ],
    initial: {
      ruc: '',
      razon_social: '',
      nombre_comercial: '',
      representante_legal: '',
      email: '',
      telefono: '',
      ciudad: '',
      direccion: '',
    },
    buildPayload: (values) => ({
      catalog_type: 'empresa_operativa',
      code: values.ruc.trim(),
      name: values.razon_social.trim(),
      description: values.nombre_comercial.trim(),
      status: 'activo',
      payload: {
        ruc: values.ruc.trim(),
        razonSocial: values.razon_social.trim(),
        nombreComercial: values.nombre_comercial.trim(),
        representanteLegal: values.representante_legal.trim(),
        email: values.email.trim(),
        telefono: values.telefono.trim(),
        ciudad: values.ciudad.trim(),
        direccion: values.direccion.trim(),
      },
    }),
    recordLabel: (record) => record.name,
    recordMeta: (record) => `${record.code} - ${record.payload?.ciudad || 'sin ciudad'}`,
  },
  {
    key: 'legal',
    title: 'Valores legales',
    description: 'Registra SBU, tasas IESS, tabla IR u otro valor legal aplicable para cálculos. No contiene cuentas contables.',
    icon: Scale,
    resource: 'legalParameters',
    stepCode: 'legal',
    fields: [
      { name: 'parameter_key', label: 'Código', placeholder: 'sbu_2026', required: true },
      { name: 'period_year', label: 'Año', type: 'number', required: true },
      { name: 'amount', label: 'Valor', type: 'number', step: '0.01', required: true },
      { name: 'unit', label: 'Unidad', placeholder: 'USD, porcentaje, tabla', required: true },
      { name: 'source_name', label: 'Referencia revisada', placeholder: 'SRI, IESS, MDT, acuerdo o resolución' },
      { name: 'owner_validated', label: 'Validado por owner', type: 'checkbox' },
      { name: 'value_json', label: 'Valor estructurado JSON (si se llena tiene prioridad)', type: 'textarea', wide: true },
      { name: 'notes', label: 'Notas', type: 'textarea', wide: true },
    ],
    initial: {
      parameter_key: '',
      period_year: new Date().getFullYear(),
      amount: '',
      unit: 'USD',
      source_name: '',
      source_url: '',
      owner_validated: false,
      value_json: '',
      notes: '',
    },
    buildPayload: (values) => ({
      country_code: 'EC',
      region_code: 'NACIONAL',
      period_year: Number(values.period_year),
      parameter_key: values.parameter_key.trim(),
      value: parseStructuredValue(values.value_json, { amount: Number(values.amount) }),
      unit: values.unit.trim(),
      owner_validated: Boolean(values.owner_validated),
      validation_status: values.owner_validated ? 'validado_oficial' : 'pendiente_validacion_oficial',
      source_name: values.source_name.trim(),
      source_url: '',
      notes: values.notes.trim(),
    }),
    recordLabel: (record) => `${record.parameter_key} ${record.period_year}`,
    recordMeta: (record) => `${record.value?.amount ?? '-'} ${record.unit || ''}`,
  },
  {
    key: 'ir',
    title: 'Tabla impuesto a la renta',
    description: 'Registra la tabla anual vigente con fraccion basica, exceso hasta, impuesto y porcentaje.',
    icon: Scale,
    resource: 'legalParameters',
    stepCode: 'legal',
    customType: 'incomeTaxTable',
    initial: {
      period_year: new Date().getFullYear(),
      source_name: 'SRI',
      source_url: '',
      owner_validated: false,
      source_date: '',
      notes: '',
      brackets: [
        { from: '0', to: '', baseTax: '0', rate: '0' },
      ],
    },
    buildPayload: (values) => ({
      country_code: 'EC',
      region_code: 'NACIONAL',
      period_year: Number(values.period_year),
      parameter_key: 'income_tax_table',
      value: {
        brackets: values.brackets.map((bracket) => ({
          from: Number(bracket.from),
          to: bracket.to === '' ? null : Number(bracket.to),
          baseTax: Number(bracket.baseTax),
          rate: Number(bracket.rate),
        })),
      },
      unit: 'tabla_anual',
      owner_validated: Boolean(values.owner_validated),
      validation_status: values.owner_validated ? 'validado_oficial' : 'pendiente_validacion_oficial',
      source_name: values.source_name.trim(),
      source_url: '',
      source_date: values.source_date || null,
      notes: values.notes.trim(),
    }),
    recordLabel: (record) => `Tabla IR ${record.period_year}`,
    recordMeta: (record) => `${record.value?.brackets?.length || 0} intervalos - ${record.validation_status}`,
  },
  {
    key: 'novedad',
    title: 'Tipo de novedad',
    description: 'Define permisos, descuentos, horas extras, faltas u otros eventos de nómina.',
    icon: ShieldCheck,
    resource: 'noveltyTypes',
    stepCode: 'novedades',
    fields: [
      { name: 'code', label: 'Código', placeholder: 'HORA_EXTRA_50', required: true },
      { name: 'name', label: 'Nombre', placeholder: 'Hora extra 50%', required: true },
      { name: 'category', label: 'Categoría', type: 'select', options: ['ingreso', 'descuento', 'permiso', 'ausencia', 'ajuste'] },
      { name: 'payroll_impact', label: 'Impacto', type: 'select', options: ['ingreso', 'descuento', 'informativo'] },
      { name: 'calculation_mode', label: 'Forma de cálculo', type: 'select', options: [
        { value: 'amount', label: 'Monto directo' },
        { value: 'minutes_hourly', label: 'Minutos x valor hora' },
        { value: 'minutes_hourly_1_5', label: 'Minutos x hora 50%' },
        { value: 'minutes_hourly_2', label: 'Minutos x hora 100%' },
        { value: 'absence_day', label: 'Día de falta' },
        { value: 'informational', label: 'Solo informativo' },
      ] },
      { name: 'affects_iess', label: 'Afecta IESS', type: 'checkbox' },
      { name: 'affects_income_tax', label: 'Afecta IR', type: 'checkbox' },
      { name: 'affects_decimos', label: 'Afecta décimos', type: 'checkbox' },
      { name: 'affects_vacation', label: 'Afecta vacaciones', type: 'checkbox' },
      { name: 'affects_bank_file', label: 'Afecta pago bancario', type: 'checkbox' },
      { name: 'requires_evidence', label: 'Requiere respaldo', type: 'checkbox' },
      { name: 'status', label: 'Estado', type: 'select', options: ['activo', 'inactivo', 'borrador'] },
      { name: 'valid_from', label: 'Vigente desde', type: 'date', required: true },
      { name: 'valid_to', label: 'Vigente hasta', type: 'date' },
      { name: 'description', label: 'Descripción', type: 'textarea', wide: true },
    ],
    initial: {
      code: '',
      name: '',
      category: 'ajuste',
      payroll_impact: 'informativo',
      calculation_mode: 'informational',
      affects_iess: false,
      affects_income_tax: false,
      affects_decimos: false,
      affects_vacation: false,
      affects_bank_file: false,
      requires_evidence: true,
      status: 'activo',
      valid_from: `${new Date().getFullYear()}-01-01`,
      valid_to: '',
      description: '',
    },
    buildPayload: (values) => ({
      code: values.code.trim().toUpperCase(),
      name: values.name.trim(),
      description: values.description.trim(),
      category: values.category,
      payroll_impact: values.payroll_impact,
      calculation_mode: values.calculation_mode,
      affects_iess: Boolean(values.affects_iess),
      affects_income_tax: Boolean(values.affects_income_tax),
      affects_decimos: Boolean(values.affects_decimos),
      affects_vacation: Boolean(values.affects_vacation),
      affects_bank_file: Boolean(values.affects_bank_file),
      requires_evidence: Boolean(values.requires_evidence),
      approval_flow: { requiredRoles: ['admin_rrhh', 'owner'] },
      status: values.status,
      valid_from: values.valid_from || null,
      valid_to: values.valid_to || null,
    }),
    recordLabel: (record) => record.name,
    recordMeta: (record) => `${record.code} - ${record.payroll_impact}`,
  },
  {
    key: 'organizacion',
    title: 'Unidad organizativa',
    description: 'Crea departamentos, áreas, sucursales o centros de costo vinculados a zona de marcación y jornada base.',
    icon: Network,
    resource: 'organizationUnits',
    stepCode: 'organizacion',
    fields: [
      { name: 'code', label: 'Código', placeholder: 'VENTAS', required: true },
      { name: 'name', label: 'Nombre', placeholder: 'Ventas', required: true },
      { name: 'unit_type', label: 'Tipo', type: 'select', options: ['departamento', 'area', 'sucursal', 'centro_costo'] },
      { name: 'work_zone_id', label: 'Zona de marcación', type: 'resourceSelect', resource: 'workZones', required: true, emptyLabel: 'Primero crea una zona de marcación', selectLabel: 'Selecciona una zona' },
      { name: 'work_shift_id', label: 'Jornada base', type: 'resourceSelect', resource: 'workShifts', required: true, emptyLabel: 'Primero crea una jornada base', selectLabel: 'Selecciona una jornada' },
      { name: 'cost_center_code', label: 'Centro de costo' },
      { name: 'description', label: 'Descripción', type: 'textarea', wide: true },
    ],
    initial: {
      code: '',
      name: '',
      unit_type: 'departamento',
      work_zone_id: '',
      work_shift_id: '',
      cost_center_code: '',
      description: '',
    },
    buildPayload: (values) => ({
      code: values.code.trim().toUpperCase(),
      name: values.name.trim(),
      unit_type: values.unit_type,
      work_zone_id: values.work_zone_id,
      cost_center_code: values.cost_center_code.trim(),
      metadata: { workShiftId: values.work_shift_id },
      description: values.description.trim(),
      status: 'activo',
    }),
    recordLabel: (record) => record.name,
    recordMeta: (record) => `${record.code} - ${record.unit_type}`,
  },
  {
    key: 'cargo',
    title: 'Cargo o puesto',
    description: 'Crea cargos asociados a una unidad organizativa, con rango salarial, vigencia y estado operativo.',
    icon: Briefcase,
    resource: 'jobPositions',
    stepCode: 'cargos',
    fields: [
      { name: 'organization_unit_id', label: 'Unidad organizativa', type: 'resourceSelect', resource: 'organizationUnits', required: true, emptyLabel: 'Primero crea una unidad organizativa', selectLabel: 'Selecciona una unidad' },
      { name: 'code', label: 'Código', placeholder: 'ANALISTA_RRHH', required: true },
      { name: 'name', label: 'Nombre', placeholder: 'Analista RRHH', required: true },
      { name: 'salary_min', label: 'Sueldo minimo', type: 'number', step: '0.01', required: true },
      { name: 'salary_max', label: 'Sueldo maximo', type: 'number', step: '0.01', required: true },
      { name: 'currency', label: 'Moneda', type: 'select', options: ['USD'] },
      { name: 'effective_from', label: 'Vigente desde', type: 'date', required: true },
      { name: 'effective_to', label: 'Vigente hasta', type: 'date' },
      { name: 'status', label: 'Estado', type: 'select', options: ['activo', 'inactivo', 'archivado'] },
      { name: 'description', label: 'Descripción', type: 'textarea', wide: true },
    ],
    initial: {
      organization_unit_id: '',
      code: '',
      name: '',
      salary_min: '',
      salary_max: '',
      currency: 'USD',
      effective_from: `${new Date().getFullYear()}-01-01`,
      effective_to: '',
      status: 'activo',
      description: '',
    },
    buildPayload: (values) => ({
      organization_unit_id: values.organization_unit_id,
      code: values.code.trim().toUpperCase(),
      name: values.name.trim(),
      description: values.description.trim(),
      salary_min: Number(values.salary_min),
      salary_max: Number(values.salary_max),
      currency: values.currency,
      effective_from: values.effective_from || null,
      effective_to: values.effective_to || null,
      status: values.status,
      metadata: {
        source: 'parametrizacion_operativa',
      },
    }),
    recordLabel: (record) => record.name,
    recordMeta: (record) => `${record.code} - ${record.status}`,
    saveLabel: 'Guardar cargo',
    updateLabel: 'Actualizar cargo',
    recordsTitle: 'Cargos registrados',
    emptyText: 'Aún no hay cargos registrados. Guarda un cargo para habilitar editar o eliminar.',
  },
  {
    key: 'zona',
    title: 'Zona de marcación',
    description: 'Parametriza ubicaciones permitidas para asistencia y control de marcaciones.',
    icon: MapPin,
    resource: 'workZones',
    stepCode: 'zonas',
    fields: [
      { name: 'code', label: 'Código', placeholder: 'MATRIZ', required: true },
      { name: 'name', label: 'Nombre', placeholder: 'Oficina matriz', required: true },
      { name: 'latitude', label: 'Latitud', type: 'number', step: '0.0000001', required: true },
      { name: 'longitude', label: 'Longitud', type: 'number', step: '0.0000001', required: true },
      { name: 'radius_meters', label: 'Radio metros', type: 'number', required: true },
      { name: 'requires_photo', label: 'Foto obligatoria', type: 'checkbox' },
    ],
    initial: {
      code: '',
      name: '',
      latitude: '',
      longitude: '',
      radius_meters: 100,
      requires_photo: true,
    },
    buildPayload: (values) => ({
      code: values.code.trim().toUpperCase(),
      name: values.name.trim(),
      latitude: Number(values.latitude),
      longitude: Number(values.longitude),
      radius_meters: Number(values.radius_meters),
      min_accuracy_meters: 50,
      requires_photo: Boolean(values.requires_photo),
      status: 'activo',
    }),
    recordLabel: (record) => record.name,
    recordMeta: (record) => `${record.code} - ${record.radius_meters} m`,
  },
  {
    key: 'jornada',
    title: 'Jornada base',
    description: 'Configura varias jornadas por empresa: lunes a viernes, martes a sábado u otra distribución operativa autorizada.',
    icon: TimerReset,
    resource: 'workShifts',
    stepCode: 'jornadas',
    fields: [
      { name: 'code', label: 'Código', placeholder: 'ORDINARIA_8H', required: true },
      { name: 'name', label: 'Nombre', placeholder: 'Ordinaria 8 horas', required: true },
      { name: 'shift_type', label: 'Tipo', type: 'select', options: ['ordinaria', 'rotativa', 'nocturna', 'parcial'] },
      { name: 'weekly_hours', label: 'Horas semanales', type: 'number', step: '0.5', required: true },
      { name: 'work_days', label: 'Días laborables', type: 'multiCheckbox', options: workDayOptions, wide: true },
      { name: 'start_time', label: 'Inicio', type: 'time', required: true },
      { name: 'end_time', label: 'Fin', type: 'time', required: true },
      { name: 'break_minutes', label: 'Descanso min.', type: 'number', required: true },
      { name: 'tolerance_minutes', label: 'Tolerancia min.', type: 'number', required: true },
    ],
    initial: {
      code: '',
      name: '',
      shift_type: 'ordinaria',
      weekly_hours: 40,
      work_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      start_time: '08:00',
      end_time: '17:00',
      break_minutes: 60,
      tolerance_minutes: 10,
    },
    buildPayload: (values) => ({
      code: values.code.trim().toUpperCase(),
      name: values.name.trim(),
      shift_type: values.shift_type,
      weekly_hours: Number(values.weekly_hours),
      start_time: values.start_time,
      end_time: values.end_time,
      break_minutes: Number(values.break_minutes),
      tolerance_minutes: Number(values.tolerance_minutes),
      calendar_rules: {
        workDays: values.work_days || [],
        requiresMdtAuthorizationReview: true,
        legalNotice: 'La distribución de jornada debe revisarse frente a la normativa laboral ecuatoriana y, cuando aplique, contar con autorización del Ministerio del Trabajo antes de operar.',
      },
      status: 'activo',
    }),
    recordLabel: (record) => record.name,
    recordMeta: (record) => `${record.start_time}-${record.end_time} - ${record.weekly_hours} h/sem`,
  },
  {
    key: 'contabilidad',
    title: 'Cuentas contables de nómina',
    description: 'Define debe/haber por concepto calculado de nómina. Consume los conceptos operativos y no duplica los valores legales.',
    icon: Landmark,
    resource: 'payrollAccountingMappings',
    stepCode: 'contabilidad',
    fields: [
      { name: 'concept_code', label: 'Concepto de nómina', type: 'payrollConceptSelect', required: true },
      { name: 'entry_type', label: 'Asiento', type: 'select', options: ['DEVENGAMIENTO', 'PROVISION', 'PAGO', 'AJUSTE'] },
      { name: 'debit_account_code', label: 'Cuenta debe', placeholder: '510101', required: true },
      { name: 'debit_account_name', label: 'Nombre cuenta debe', placeholder: 'Sueldos y salarios', required: true },
      { name: 'credit_account_code', label: 'Cuenta haber', placeholder: '210101', required: true },
      { name: 'credit_account_name', label: 'Nombre cuenta haber', placeholder: 'Nómina por pagar', required: true },
      { name: 'cost_center_mode', label: 'Centro de costo', type: 'select', options: ['employee', 'fixed', 'none'] },
      { name: 'fixed_cost_center_code', label: 'Centro fijo' },
      { name: 'requires_employee_breakdown', label: 'Desglosar por empleado', type: 'checkbox' },
      { name: 'status', label: 'Estado', type: 'select', options: ['activo', 'inactivo'] },
      { name: 'valid_from', label: 'Vigente desde', type: 'date', required: true },
      { name: 'valid_to', label: 'Vigente hasta', type: 'date' },
    ],
    initial: {
      concept_code: '',
      concept_label: '',
      category: 'ingreso',
      entry_type: 'DEVENGAMIENTO',
      debit_account_code: '',
      debit_account_name: '',
      credit_account_code: '',
      credit_account_name: '',
      cost_center_mode: 'employee',
      fixed_cost_center_code: '',
      requires_employee_breakdown: true,
      status: 'activo',
      valid_from: `${new Date().getFullYear()}-01-01`,
      valid_to: '',
    },
    buildPayload: (values) => ({
      concept_code: values.concept_code.trim().toLowerCase(),
      entry_type: values.entry_type,
      debit_account_code: values.debit_account_code.trim(),
      debit_account_name: values.debit_account_name.trim(),
      credit_account_code: values.credit_account_code.trim(),
      credit_account_name: values.credit_account_name.trim(),
      cost_center_mode: values.cost_center_mode,
      fixed_cost_center_code: values.fixed_cost_center_code.trim(),
      requires_employee_breakdown: Boolean(values.requires_employee_breakdown),
      status: values.status,
      valid_from: values.valid_from || null,
      valid_to: values.valid_to || null,
      metadata: { source: 'parametrizacion_contable_crn26' },
    }),
    recordLabel: (record, summary) => payrollConceptByCode(summary, record.concept_code)?.label || record.concept_label || record.concept_code,
    recordMeta: (record) => `${record.concept_code} - ${record.entry_type} - debe ${record.debit_account_code} / haber ${record.credit_account_code}`,
    saveLabel: 'Guardar cuenta contable',
    updateLabel: 'Actualizar cuenta contable',
    recordsTitle: 'Cuentas contables vigentes',
    emptyText: 'Aún no hay cuentas contables de nómina. Carga defaults editables para todos los conceptos calculados.',
  },
  {
    key: 'banco',
    title: 'Banco y archivo plano',
    description: 'Selecciona una plantilla bancaria real para generar archivos de pago de nómina.',
    icon: CreditCard,
    resource: 'bankProfiles',
    stepCode: 'bancos',
    fields: [
      { name: 'template', label: 'Plantilla bancaria', type: 'select', options: [
        { value: 'generico', label: 'Genérica delimitada' },
        { value: 'pacifico_interbank_immediate', label: 'Banco Pacífico - transferencias interbancarias inmediatas' },
      ], wide: true },
      { name: 'banco_codigo', label: 'Código banco', placeholder: 'PICHINCHA', required: true },
      { name: 'banco_nombre', label: 'Nombre banco', placeholder: 'Banco Pichincha', required: true },
      { name: 'delimiter', label: 'Separador', placeholder: ';', required: true },
      { name: 'encoding', label: 'Codificación', type: 'select', options: ['utf8', 'latin1'] },
      { name: 'date_format', label: 'Formato fecha', type: 'select', options: ['YYYYMMDD', 'DD/MM/YYYY', 'YYYY-MM-DD'] },
      { name: 'include_header', label: 'Incluye cabecera', type: 'checkbox' },
      { name: 'include_trailer', label: 'Incluye totalizador', type: 'checkbox' },
      { name: 'account_field', label: 'Campo cuenta', placeholder: 'cuentaBancaria' },
      { name: 'amount_field', label: 'Campo valor', placeholder: 'netoRecibir' },
    ],
    initial: {
      template: 'generico',
      banco_codigo: '',
      banco_nombre: '',
      delimiter: ';',
      encoding: 'utf8',
      date_format: 'YYYYMMDD',
      include_header: true,
      include_trailer: true,
      account_field: 'cuentaBancaria',
      amount_field: 'netoRecibir',
    },
    buildPayload: (values) => buildBankProfilePayload(values),
    recordLabel: (record) => record.banco_nombre,
    recordMeta: (record) => {
      const layout = record.field_map?.layout === 'pacifico_interbank_immediate'
        ? 'Banco Pacífico interbancarias'
        : 'Genérico delimitado';
      return `${record.banco_codigo} - ${layout} - ${record.encoding || 'utf8'}`;
    },
  },
  {
    key: 'homologacion_banco',
    title: 'Homologación bancaria',
    description: 'Genera la estructura completa de campos que consumirá el archivo plano del banco.',
    icon: Network,
    resource: 'bankFieldMappings',
    stepCode: 'bancos',
    customType: 'bankMappingStructure',
    fields: [],
    initial: {
      banco_codigo: 'PACIFICO',
      template: 'pacifico_interbank_immediate',
      uploadedStructure: [],
    },
    buildPayload: () => ({}),
    recordLabel: (record) => `${record.banco_codigo} - ${record.canonical_field}`,
    recordMeta: (record) => `${record.position}. ${record.bank_field_name}${record.formatter ? ` - ${record.formatter}` : ''}`,
  },
  {
    key: 'usuarios',
    title: 'Usuarios y roles',
    description: 'Define la matriz mínima de usuarios y permisos para operar nómina con trazabilidad.',
    icon: UserCog,
    resource: 'catalogs',
    stepCode: 'usuarios',
    catalogType: 'usuarios_roles',
    fields: [
      { name: 'code', label: 'Código matriz', placeholder: 'MATRIZ_RRHH', required: true },
      { name: 'name', label: 'Nombre', placeholder: 'Matriz de roles RRHH', required: true },
      { name: 'owner_email', label: 'Owner / representante', type: 'email' },
      { name: 'admin_email', label: 'Administrador RRHH', type: 'email' },
      { name: 'supervisor_enabled', label: 'Usa supervisores', type: 'checkbox' },
      { name: 'module_permissions', label: 'Permisos por módulo', type: 'modulePermissionMatrix', wide: true },
      { name: 'notes', label: 'Notas de control', type: 'textarea', wide: true },
    ],
    initial: {
      code: 'MATRIZ_RRHH',
      name: 'Matriz de roles RRHH',
      owner_email: '',
      admin_email: '',
      supervisor_enabled: true,
      module_permissions: {},
      notes: '',
    },
    buildPayload: (values) => ({
      catalog_type: 'usuarios_roles',
      code: values.code.trim().toUpperCase(),
      name: values.name.trim(),
      description: values.notes.trim(),
      status: 'activo',
      payload: {
        ownerEmail: values.owner_email.trim(),
        adminRrhhEmail: values.admin_email.trim(),
        supervisorEnabled: Boolean(values.supervisor_enabled),
        modulePermissions: values.module_permissions || {},
        roles: ['owner', 'admin_rrhh', 'supervisor', 'empleado'],
      },
    }),
    recordLabel: (record) => record.name,
    recordMeta: (record) => {
      const mp = record.payload?.modulePermissions;
      if (!mp || Object.keys(mp).length === 0) return `${record.code} - permisos por defecto`;
      const customCount = Object.values(mp).reduce((acc, rolePerms) => {
        if (!rolePerms || typeof rolePerms !== 'object') return acc;
        return acc + Object.keys(rolePerms).length;
      }, 0);
      return `${record.code} - ${customCount} permiso(s) personalizado(s)`;
    },
  },
];

function formatWorkDays(days = []) {
  if (!Array.isArray(days) || days.length === 0) return 'dias no definidos';
  const labels = workDayOptions
    .filter((option) => days.includes(option.value))
    .map((option) => option.label);
  return labels.length > 0 ? labels.join(', ') : 'dias no definidos';
}

function buildBankProfilePayload(values) {
  const template = values.template || 'generico';

  if (template === 'pacifico_interbank_immediate') {
    return {
      banco_codigo: values.banco_codigo.trim().toUpperCase() || 'PACIFICO',
      banco_nombre: values.banco_nombre.trim() || 'Banco Pacífico',
      delimiter: ';',
      encoding: 'latin1',
      date_format: 'YYYYMMDD',
      include_header: false,
      include_trailer: true,
      field_map: {
        profile: 'PACIFICO',
        layout: 'pacifico_interbank_immediate',
        bankCode: '2013',
        fields: [
          'tipoRegistro',
          'tipoIdentificacion',
          'cedula',
          'nombre',
          'bancoCodigo',
          'tipoCuenta',
          'cuenta',
          'importe',
          'concepto',
          'referencia',
        ],
        accountLength: 10,
        amountDecimals: 2,
        decimalSeparator: '.',
        lineEnding: '\r\n',
        sourceDocument: 'docs2/Formato_para_transferencias_interbancarias_inmediatas.pdf',
      },
      activo: true,
    };
  }

  return {
    banco_codigo: values.banco_codigo.trim().toUpperCase(),
    banco_nombre: values.banco_nombre.trim(),
    delimiter: values.delimiter,
    encoding: values.encoding,
    date_format: values.date_format,
    include_header: Boolean(values.include_header),
    include_trailer: Boolean(values.include_trailer),
    field_map: {
      cuenta: values.account_field.trim(),
      valor: values.amount_field.trim(),
      identificacion: 'cedula',
      beneficiario: 'nombreCompleto',
    },
    activo: true,
  };
}

function rankScopedRecord(record = {}) {
  return [
    record.tenant_id ? 0 : 1,
    String(record.status || '').toLowerCase() === 'activo' ? 0 : 1,
    record.valid_to ? 1 : 0,
    -new Date(record.valid_from || record.updated_at || record.created_at || 0).getTime(),
    -new Date(record.updated_at || record.created_at || 0).getTime(),
  ];
}

function compareScopedRecords(a, b) {
  const rankA = rankScopedRecord(a);
  const rankB = rankScopedRecord(b);
  for (let index = 0; index < rankA.length; index += 1) {
    if (rankA[index] !== rankB[index]) return rankA[index] - rankB[index];
  }
  return String(a.id || '').localeCompare(String(b.id || ''));
}

function dedupeNoveltyRecords(records = []) {
  const byCode = new Map();
  for (const record of records) {
    const code = normalizeNoveltyCode(record.code);
    if (!code) continue;
    const current = byCode.get(code);
    if (!current || compareScopedRecords(record, current) < 0) {
      byCode.set(code, record);
    }
  }
  return [...byCode.values()].sort((a, b) => String(a.name || a.code).localeCompare(String(b.name || b.code)));
}

function recordsForDefinition(summary, definition) {
  const records = summary?.resources?.[definition.resource] || [];
  const incomeTaxKeys = ['income_tax_table', 'tabla_impuesto_renta'];
  if (definition.key === 'novedad') {
    return dedupeNoveltyRecords(records);
  }
  if (definition.key === 'legal') {
    return records.filter((record) => !incomeTaxKeys.includes(record.parameter_key));
  }
  if (definition.key === 'ir') {
    return records.filter((record) => incomeTaxKeys.includes(record.parameter_key));
  }
  if (!definition.catalogType) return records;
  return records.filter((record) => record.catalog_type === definition.catalogType);
}

function normalizeBankCode(value) {
  return String(value || '').trim().toUpperCase();
}

function mappingsForBank(summary, bancoCodigo) {
  const code = normalizeBankCode(bancoCodigo);
  return (summary?.resources?.bankFieldMappings || [])
    .filter((mapping) => normalizeBankCode(mapping.banco_codigo) === code)
    .sort((a, b) => Number(a.position) - Number(b.position));
}

function defaultMappingStructure(template) {
  return BANK_MAPPING_STRUCTURES[template] || BANK_MAPPING_STRUCTURES.generico;
}

function guessCanonicalField(rawName, index) {
  const normalized = String(rawName || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const rules = [
    [/TIPOREG|REGISTRO/, 'tipoRegistro'],
    [/TIPOIDENT|TIPOID/, 'tipoIdentificacion'],
    [/IDENT|CEDULA|RUC|DOCUMENTO/, 'cedula'],
    [/BENEF|NOMBRE|CLIENTE|EMPLEADO/, 'nombre'],
    [/BANCO|CODIGOBANCO|BANCODESTINO/, 'bancoCodigo'],
    [/TIPOCUENTA|CUENTATIPO/, 'tipoCuenta'],
    [/CUENTA|CTA/, 'cuenta'],
    [/VALOR|MONTO|IMPORTE|NETO/, 'importe'],
    [/CONCEPTO|DETALLE|DESCRIPCION/, 'concepto'],
    [/REFERENCIA|REF/, 'referencia'],
    [/FECHA/, 'fechaOperacion'],
  ];
  const match = rules.find(([pattern]) => pattern.test(normalized));
  return match ? match[1] : `campo${index + 1}`;
}

function detectDelimiter(line) {
  const candidates = [';', ',', '|', '\t'];
  return candidates
    .map((delimiter) => ({ delimiter, count: line.split(delimiter).length }))
    .sort((a, b) => b.count - a.count)[0].delimiter;
}

function parseUploadedBankStructure(text) {
  const firstLine = String(text || '').split(/\r?\n/).find((line) => line.trim());
  if (!firstLine) return [];
  const delimiter = detectDelimiter(firstLine);
  return firstLine
    .split(delimiter)
    .map((column, index) => column.trim())
    .filter(Boolean)
    .map((column, index) => ({
      canonical_field: guessCanonicalField(column, index),
      bank_field_name: column.toUpperCase().replace(/\s+/g, '_'),
      position: index + 1,
      formatter: '',
      required: true,
    }));
}

function bankTemplateFromProfile(profile) {
  return profile?.field_map?.layout === 'pacifico_interbank_immediate'
    ? 'pacifico_interbank_immediate'
    : 'generico';
}

function profileOptions(summary) {
  const profiles = summary?.resources?.bankProfiles || [];
  return profiles.map((profile) => ({
    value: profile.banco_codigo,
    label: `${profile.banco_nombre} (${profile.banco_codigo})`,
    template: bankTemplateFromProfile(profile),
  }));
}

function payrollConceptOptions(summary) {
  const configuredConcepts = (summary?.resources?.payrollConcepts || []).map((concept) => ({
    value: concept.code,
    label: `${concept.label} (${concept.code})`,
    category: concept.category,
    entryType: concept.entryType,
  }));

  if (configuredConcepts.length > 0) return configuredConcepts;

  const fallback = new Map();
  for (const mapping of summary?.resources?.payrollAccountingMappings || []) {
    if (!mapping.concept_code || fallback.has(mapping.concept_code)) continue;
    fallback.set(mapping.concept_code, {
      value: mapping.concept_code,
      label: `${mapping.concept_label || mapping.concept_code} (${mapping.concept_code})`,
      category: mapping.category || 'nomina',
      entryType: mapping.entry_type || 'DEVENGAMIENTO',
    });
  }
  return [...fallback.values()];
}

function payrollConceptByCode(summary, code) {
  return payrollConceptOptions(summary).find((concept) => concept.value === code || concept.code === code);
}

const defaultNoveltyConceptCodes = {
  hora_extra_50: 'horas_extra_50',
  hora_extra_100: 'horas_extra_100',
  bono_desempeno: 'bono_desempeno',
  comision: 'comision',
  falta: 'descuento_faltas',
};

function normalizeNoveltyCode(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function conceptCodeForNoveltyRecord(record = {}) {
  const code = normalizeNoveltyCode(record.code);
  if (!code) return '';
  return defaultNoveltyConceptCodes[code] || `novedad_${code}`;
}

function accountingMappingByConcept(summary, conceptCode) {
  return (summary?.resources?.payrollAccountingMappings || [])
    .find((mapping) => mapping.concept_code === conceptCode && mapping.status !== 'inactivo');
}

function optionsForField(summary, field) {
  if (field.type === 'payrollConceptSelect') return payrollConceptOptions(summary);
  if (field.type !== 'resourceSelect') return [];
  return (summary?.resources?.[field.resource] || []).filter((record) => record.status !== 'inactivo');
}

function recordMetaForDefinition(definition, record, summary) {
  if (definition.key === 'organizacion') {
    const zone = (summary?.resources?.workZones || []).find((item) => item.id === record.work_zone_id);
    const shift = (summary?.resources?.workShifts || []).find((item) => item.id === record.metadata?.workShiftId);
    return `${record.code} - ${record.unit_type} - zona: ${zone?.name || 'sin zona'} - jornada: ${shift?.name || 'sin jornada'}`;
  }
  if (definition.key === 'cargo') {
    const unit = (summary?.resources?.organizationUnits || []).find((item) => item.id === record.organization_unit_id);
    const min = Number(record.salary_min || 0).toFixed(2);
    const max = Number(record.salary_max || 0).toFixed(2);
    return `${record.code} - ${unit?.name || 'sin unidad'} - ${record.currency || 'USD'} ${min} a ${max}`;
  }
  if (definition.key === 'novedad') {
    const conceptCode = conceptCodeForNoveltyRecord(record);
    const mapping = accountingMappingByConcept(summary, conceptCode);
    if (String(record.payroll_impact || '').toLowerCase() === 'informativo') {
      return `${record.code} - informativo - sin asiento contable`;
    }
    return mapping
      ? `${record.code} - ${record.payroll_impact} - ${conceptCode} - debe ${mapping.debit_account_code} / haber ${mapping.credit_account_code}`
      : `${record.code} - ${record.payroll_impact} - ${conceptCode} sin cuenta configurada`;
  }

  return definition.recordMeta(record, summary);
}

const stepFormMap = {
  empresa: 'empresa',
  legal: 'ir',
  organizacion: 'organizacion',
  cargos: 'cargo',
  jornadas: 'jornada',
  zonas: 'zona',
  novedades: 'novedad',
  contabilidad: 'contabilidad',
  bancos: 'banco',
  usuarios: 'usuarios',
};

function configurationLoadMessage(err) {
  return extractApiError(err, 'No pudimos cargar tu configuración. Actualiza la página en unos segundos.');
}

function buildInitialState() {
  return Object.fromEntries(formDefinitions.map((definition) => [definition.key, cloneFormValues(definition.initial)]));
}

function cloneFormValues(values) {
  return JSON.parse(JSON.stringify(values));
}

function dateInputValue(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function jsonText(value) {
  if (!value || typeof value !== 'object') return '';
  return JSON.stringify(value, null, 2);
}

function formValuesFromRecord(definition, record) {
  const payload = record.payload || {};
  const fieldMap = record.field_map || {};
  const metadata = record.metadata || {};
  const value = record.value || {};

  switch (definition.key) {
    case 'empresa':
      return {
        ruc: payload.ruc || record.code || '',
        razon_social: payload.razonSocial || record.name || '',
        nombre_comercial: payload.nombreComercial || record.description || '',
        representante_legal: payload.representanteLegal || '',
        email: payload.email || '',
        telefono: payload.telefono || '',
        ciudad: payload.ciudad || '',
        direccion: payload.direccion || '',
      };
    case 'legal':
      return {
        parameter_key: record.parameter_key || '',
        period_year: record.period_year || new Date().getFullYear(),
        amount: String(value.amount ?? value.rate ?? 0),
        unit: record.unit || 'USD',
        source_name: record.source_name || '',
        source_url: record.source_url || '',
        owner_validated: record.validation_status === 'validado_oficial',
        value_json: jsonText(value),
        notes: record.notes || '',
      };
    case 'ir':
      return {
        period_year: record.period_year || new Date().getFullYear(),
        source_name: record.source_name || 'SRI',
        source_url: record.source_url || '',
        owner_validated: record.validation_status === 'validado_oficial',
        source_date: dateInputValue(record.source_date),
        notes: record.notes || '',
        brackets: normalizeIncomeTaxBrackets(record).map((bracket) => ({
          from: String(bracket.from ?? bracket.fraccion_basica ?? 0),
          to: bracket.to === null || typeof bracket.to === 'undefined'
            ? ''
            : String(bracket.to ?? bracket.exceso_hasta ?? ''),
          baseTax: String(bracket.baseTax ?? bracket.impuesto_fraccion_basica ?? 0),
          rate: String(bracket.rate ?? bracket.porcentaje ?? 0),
        })),
      };
    case 'novedad':
      return {
        code: record.code || '',
        name: record.name || '',
        category: record.category || 'ajuste',
        payroll_impact: record.payroll_impact || 'informativo',
        calculation_mode: record.applicability?.calculationMode || 'informational',
        affects_iess: Boolean(record.affects_iess),
        affects_income_tax: Boolean(record.affects_income_tax),
        affects_decimos: Boolean(record.affects_decimos),
        affects_vacation: Boolean(record.affects_vacation),
        affects_bank_file: Boolean(record.affects_bank_file),
        requires_evidence: Boolean(record.requires_evidence),
        status: record.status || 'activo',
        valid_from: dateInputValue(record.valid_from) || `${new Date().getFullYear()}-01-01`,
        valid_to: dateInputValue(record.valid_to),
        description: record.description || '',
      };
    case 'organizacion':
      return {
        code: record.code || '',
        name: record.name || '',
        unit_type: record.unit_type || 'departamento',
        work_zone_id: record.work_zone_id || '',
        work_shift_id: metadata.workShiftId || '',
        cost_center_code: record.cost_center_code || '',
        description: record.description || '',
      };
    case 'cargo':
      return {
        organization_unit_id: record.organization_unit_id || '',
        code: record.code || '',
        name: record.name || '',
        salary_min: String(record.salary_min ?? ''),
        salary_max: String(record.salary_max ?? ''),
        currency: record.currency || 'USD',
        effective_from: dateInputValue(record.effective_from) || `${new Date().getFullYear()}-01-01`,
        effective_to: dateInputValue(record.effective_to),
        status: record.status || 'activo',
        description: record.description || '',
      };
    case 'zona':
      return {
        code: record.code || '',
        name: record.name || '',
        latitude: String(record.latitude ?? ''),
        longitude: String(record.longitude ?? ''),
        radius_meters: record.radius_meters ?? 100,
        requires_photo: Boolean(record.requires_photo),
      };
    case 'jornada':
      return {
        code: record.code || '',
        name: record.name || '',
        shift_type: record.shift_type || 'ordinaria',
        weekly_hours: record.weekly_hours ?? 40,
        work_days: Array.isArray(record.calendar_rules?.workDays) ? record.calendar_rules.workDays : [],
        start_time: record.start_time || '08:00',
        end_time: record.end_time || '17:00',
        break_minutes: record.break_minutes ?? 60,
        tolerance_minutes: record.tolerance_minutes ?? 10,
      };
    case 'contabilidad':
      return {
        concept_code: record.concept_code || '',
        concept_label: record.concept_label || '',
        category: record.category || 'ingreso',
        entry_type: record.entry_type || 'DEVENGAMIENTO',
        debit_account_code: record.debit_account_code || '',
        debit_account_name: record.debit_account_name || '',
        credit_account_code: record.credit_account_code || '',
        credit_account_name: record.credit_account_name || '',
        cost_center_mode: record.cost_center_mode || 'employee',
        fixed_cost_center_code: record.fixed_cost_center_code || '',
        requires_employee_breakdown: Boolean(record.requires_employee_breakdown ?? true),
        status: record.status || 'activo',
        valid_from: dateInputValue(record.valid_from) || `${new Date().getFullYear()}-01-01`,
        valid_to: dateInputValue(record.valid_to),
      };
    case 'banco':
      return {
        template: fieldMap.layout === 'pacifico_interbank_immediate' ? 'pacifico_interbank_immediate' : 'generico',
        banco_codigo: record.banco_codigo || '',
        banco_nombre: record.banco_nombre || '',
        delimiter: record.delimiter || ';',
        encoding: record.encoding || 'utf8',
        date_format: record.date_format || 'YYYYMMDD',
        include_header: Boolean(record.include_header),
        include_trailer: Boolean(record.include_trailer),
        account_field: fieldMap.cuenta || 'cuentaBancaria',
        amount_field: fieldMap.valor || 'netoRecibir',
      };
    case 'homologacion_banco':
      return {
        banco_codigo: record.banco_codigo || '',
        canonical_field: record.canonical_field || 'cuenta',
        bank_field_name: record.bank_field_name || '',
        position: record.position || 1,
        formatter: record.formatter || '',
        required: Boolean(record.required),
      };
    case 'usuarios':
      return {
        code: record.code || 'MATRIZ_RRHH',
        name: record.name || 'Matriz de roles RRHH',
        owner_email: payload.ownerEmail || '',
        admin_email: payload.adminRrhhEmail || '',
        supervisor_enabled: Boolean(payload.supervisorEnabled),
        employee_access: payload.employeeAccess || 'marcaciones_y_roles',
        notes: record.description || '',
      };
    default:
      return cloneFormValues(definition.initial);
  }
}


export {
  BANK_MAPPING_STRUCTURES,
  BANK_TEMPLATE_DEFAULTS,
  BANK_TEMPLATE_PREVIEWS,
  CANONICAL_BANK_FIELDS,
  accountingMappingByConcept,
  bankTemplateFromProfile,
  buildBankProfilePayload,
  buildInitialState,
  cloneFormValues,
  configurationLoadMessage,
  defaultMappingStructure,
  formDefinitions,
  formValuesFromRecord,
  mappingsForBank,
  normalizeBankCode,
  optionsForField,
  parseUploadedBankStructure,
  payrollConceptByCode,
  payrollConceptOptions,
  profileOptions,
  recordMetaForDefinition,
  recordsForDefinition,
  stepFormMap,
};
