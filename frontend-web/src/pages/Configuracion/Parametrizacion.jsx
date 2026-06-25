import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  Building2,
  CheckCircle2,
  Circle,
  CreditCard,
  Download,
  Edit3,
  Landmark,
  MapPin,
  Network,
  Plus,
  Scale,
  Settings2,
  ShieldCheck,
  TimerReset,
  Trash2,
  UserCog,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  completeOnboardingStep,
  createConfigurationResource,
  deleteConfigurationResource,
  fetchConfigurationSummary,
  generateBankPaymentFile,
  loadMandatoryLegalParameters,
  updateConfigurationResource,
} from '../../services/configurationApi';
import { extractApiError } from '../../services/publicApi';
import { downloadUrl } from '../../utils/downloadUrl';

const workDayOptions = [
  { value: 'monday', label: 'Lunes' },
  { value: 'tuesday', label: 'Martes' },
  { value: 'wednesday', label: 'Miercoles' },
  { value: 'thursday', label: 'Jueves' },
  { value: 'friday', label: 'Viernes' },
  { value: 'saturday', label: 'Sabado' },
  { value: 'sunday', label: 'Domingo' },
];

const BANK_TEMPLATE_PREVIEWS = {
  pacifico_interbank_immediate: {
    title: 'Banco Pacifico - transferencias interbancarias inmediatas',
    source: 'docs2/Formato_para_transferencias_interbancarias_inmediatas.pdf',
    fileName: 'PACIFICO_NOMINA_AAAAMM.txt',
    lineEnding: 'CRLF',
    encoding: 'latin1',
    delimiter: ';',
    sections: [
      { label: 'Detalle', value: 'Una linea por trabajador con pago aprobado.' },
      { label: 'Totalizador', value: 'Ultima linea con total pagado y numero de registros.' },
      { label: 'Validacion', value: 'Tipo de cuenta AH/CC, identificacion C/R/P, banco destino y cuenta obligatorios.' },
    ],
    columns: [
      ['1', 'TIPO_REGISTRO', 'Valor fijo D', 'D'],
      ['2', 'TIPO_IDENTIFICACION', 'Cedula/RUC/pasaporte del trabajador', 'C, R o P'],
      ['3', 'IDENTIFICACION', 'empleados.cedula', '10 o 13 digitos'],
      ['4', 'BENEFICIARIO', 'apellidos + nombres', 'Mayusculas, max 60'],
      ['5', 'BANCO_DESTINO', 'perfil bancario del trabajador', 'Codigo numerico'],
      ['6', 'TIPO_CUENTA', 'empleados.tipo_cuenta', 'AH o CC'],
      ['7', 'CUENTA_BENEFICIARIO', 'cuenta cifrada del trabajador', '10 digitos'],
      ['8', 'VALOR', 'nominas.neto_recibir', 'Decimal 2'],
      ['9', 'CONCEPTO', 'Periodo de nomina', 'Texto max 30'],
      ['10', 'REFERENCIA', 'Referencia unica Nomina-Ec', 'Texto max 20'],
    ],
    example: 'D;C;1710034065;MARIA DEMO RUIZ;2013;AH;0012345678;850.00;NOMINA 06/2026;NOM9B230E040001',
  },
  generico: {
    title: 'Generica delimitada',
    source: 'Configuracion manual',
    fileName: 'PAGO_NOMINA_AAAAMM.csv',
    lineEnding: 'LF',
    encoding: 'utf8',
    delimiter: ';',
    sections: [
      { label: 'Cabecera', value: 'Opcional, usa nombres de columnas.' },
      { label: 'Detalle', value: 'Una linea por trabajador.' },
      { label: 'Totalizador', value: 'Opcional, total y numero de pagos.' },
    ],
    columns: [
      ['1', 'TIPO_REGISTRO', 'Valor fijo', '1'],
      ['2', 'CODIGO_BANCO', 'Perfil bancario', '4 digitos'],
      ['3', 'CUENTA', 'Cuenta trabajador', 'Segun banco'],
      ['4', 'IDENTIFICACION', 'Cedula/RUC', 'Digitos'],
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
    banco_nombre: 'Banco Pacifico',
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
      { name: 'telefono', label: 'Telefono' },
      { name: 'ciudad', label: 'Ciudad' },
      { name: 'direccion', label: 'Direccion matriz', type: 'textarea', wide: true },
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
    description: 'Registra SBU, tasas IESS, tabla IR u otro valor legal aplicable para calculos. No contiene cuentas contables.',
    icon: Scale,
    resource: 'legalParameters',
    stepCode: 'legal',
    fields: [
      { name: 'parameter_key', label: 'Codigo', placeholder: 'sbu_2026', required: true },
      { name: 'period_year', label: 'Anio', type: 'number', required: true },
      { name: 'amount', label: 'Valor', type: 'number', step: '0.01', required: true },
      { name: 'unit', label: 'Unidad', placeholder: 'USD, porcentaje, tabla', required: true },
      { name: 'source_name', label: 'Fuente oficial', placeholder: 'SRI, IESS, MDT...' },
      { name: 'source_url', label: 'URL de respaldo', type: 'url' },
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
      validation_status: 'pendiente_validacion_oficial',
      source_name: values.source_name.trim(),
      source_url: values.source_url.trim(),
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
      source_url: 'https://www.sri.gob.ec/formularios-e-instructivos1',
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
      validation_status: 'pendiente_validacion_oficial',
      source_name: values.source_name.trim(),
      source_url: values.source_url.trim(),
      source_date: values.source_date || null,
      notes: values.notes.trim(),
    }),
    recordLabel: (record) => `Tabla IR ${record.period_year}`,
    recordMeta: (record) => `${record.value?.brackets?.length || 0} intervalos - ${record.validation_status}`,
  },
  {
    key: 'novedad',
    title: 'Tipo de novedad',
    description: 'Define permisos, descuentos, horas extras, faltas u otros eventos de nomina.',
    icon: ShieldCheck,
    resource: 'noveltyTypes',
    stepCode: 'novedades',
    fields: [
      { name: 'code', label: 'Codigo', placeholder: 'HORA_EXTRA_50', required: true },
      { name: 'name', label: 'Nombre', placeholder: 'Hora extra 50%', required: true },
      { name: 'category', label: 'Categoria', type: 'select', options: ['ingreso', 'descuento', 'permiso', 'ausencia', 'ajuste'] },
      { name: 'payroll_impact', label: 'Impacto', type: 'select', options: ['ingreso', 'descuento', 'informativo'] },
      { name: 'calculation_mode', label: 'Forma de calculo', type: 'select', options: [
        { value: 'amount', label: 'Monto directo' },
        { value: 'minutes_hourly', label: 'Minutos x valor hora' },
        { value: 'minutes_hourly_1_5', label: 'Minutos x hora 50%' },
        { value: 'minutes_hourly_2', label: 'Minutos x hora 100%' },
        { value: 'absence_day', label: 'Dia de falta' },
        { value: 'informational', label: 'Solo informativo' },
      ] },
      { name: 'affects_iess', label: 'Afecta IESS', type: 'checkbox' },
      { name: 'affects_income_tax', label: 'Afecta IR', type: 'checkbox' },
      { name: 'affects_decimos', label: 'Afecta decimos', type: 'checkbox' },
      { name: 'affects_vacation', label: 'Afecta vacaciones', type: 'checkbox' },
      { name: 'affects_bank_file', label: 'Afecta pago bancario', type: 'checkbox' },
      { name: 'requires_evidence', label: 'Requiere respaldo', type: 'checkbox' },
      { name: 'status', label: 'Estado', type: 'select', options: ['activo', 'inactivo', 'borrador'] },
      { name: 'valid_from', label: 'Vigente desde', type: 'date', required: true },
      { name: 'valid_to', label: 'Vigente hasta', type: 'date' },
      { name: 'description', label: 'Descripcion', type: 'textarea', wide: true },
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
    recordMeta: (record) => `${record.code} · ${record.payroll_impact}`,
  },
  {
    key: 'organizacion',
    title: 'Unidad organizativa',
    description: 'Crea departamentos, areas, sucursales o centros de costo vinculados a zona de marcacion y jornada base.',
    icon: Network,
    resource: 'organizationUnits',
    stepCode: 'organizacion',
    fields: [
      { name: 'code', label: 'Codigo', placeholder: 'VENTAS', required: true },
      { name: 'name', label: 'Nombre', placeholder: 'Ventas', required: true },
      { name: 'unit_type', label: 'Tipo', type: 'select', options: ['departamento', 'area', 'sucursal', 'centro_costo'] },
      { name: 'work_zone_id', label: 'Zona de marcacion', type: 'resourceSelect', resource: 'workZones', required: true, emptyLabel: 'Primero crea una zona de marcacion', selectLabel: 'Selecciona una zona' },
      { name: 'work_shift_id', label: 'Jornada base', type: 'resourceSelect', resource: 'workShifts', required: true, emptyLabel: 'Primero crea una jornada base', selectLabel: 'Selecciona una jornada' },
      { name: 'cost_center_code', label: 'Centro de costo' },
      { name: 'description', label: 'Descripcion', type: 'textarea', wide: true },
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
    recordMeta: (record) => `${record.code} · ${record.unit_type}`,
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
      { name: 'code', label: 'Codigo', placeholder: 'ANALISTA_RRHH', required: true },
      { name: 'name', label: 'Nombre', placeholder: 'Analista RRHH', required: true },
      { name: 'salary_min', label: 'Sueldo minimo', type: 'number', step: '0.01', required: true },
      { name: 'salary_max', label: 'Sueldo maximo', type: 'number', step: '0.01', required: true },
      { name: 'currency', label: 'Moneda', type: 'select', options: ['USD'] },
      { name: 'effective_from', label: 'Vigente desde', type: 'date', required: true },
      { name: 'effective_to', label: 'Vigente hasta', type: 'date' },
      { name: 'status', label: 'Estado', type: 'select', options: ['activo', 'inactivo', 'archivado'] },
      { name: 'description', label: 'Descripcion', type: 'textarea', wide: true },
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
    emptyText: 'Aun no hay cargos registrados. Guarda un cargo para habilitar editar o eliminar.',
  },
  {
    key: 'zona',
    title: 'Zona de marcacion',
    description: 'Parametriza ubicaciones permitidas para asistencia y control de marcaciones.',
    icon: MapPin,
    resource: 'workZones',
    stepCode: 'zonas',
    fields: [
      { name: 'code', label: 'Codigo', placeholder: 'MATRIZ', required: true },
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
    recordMeta: (record) => `${record.code} · ${record.radius_meters} m`,
  },
  {
    key: 'jornada',
    title: 'Jornada base',
    description: 'Configura varias jornadas por empresa: lunes a viernes, martes a sabado u otra distribucion operativa autorizada.',
    icon: TimerReset,
    resource: 'workShifts',
    stepCode: 'jornadas',
    fields: [
      { name: 'code', label: 'Codigo', placeholder: 'ORDINARIA_8H', required: true },
      { name: 'name', label: 'Nombre', placeholder: 'Ordinaria 8 horas', required: true },
      { name: 'shift_type', label: 'Tipo', type: 'select', options: ['ordinaria', 'rotativa', 'nocturna', 'parcial'] },
      { name: 'weekly_hours', label: 'Horas semanales', type: 'number', step: '0.5', required: true },
      { name: 'work_days', label: 'Dias laborables', type: 'multiCheckbox', options: workDayOptions, wide: true },
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
        legalNotice: 'La distribucion de jornada debe revisarse frente a la normativa laboral ecuatoriana y, cuando aplique, contar con autorizacion del Ministerio del Trabajo antes de operar.',
      },
      status: 'activo',
    }),
    recordLabel: (record) => record.name,
    recordMeta: (record) => `${record.start_time}-${record.end_time} · ${record.weekly_hours} h/sem`,
  },
  {
    key: 'contabilidad',
    title: 'Cuentas contables de nomina',
    description: 'Define debe/haber por concepto calculado de nomina. Consume los conceptos operativos y no duplica los valores legales.',
    icon: Landmark,
    resource: 'payrollAccountingMappings',
    stepCode: 'contabilidad',
    fields: [
      { name: 'concept_code', label: 'Concepto de nomina', type: 'payrollConceptSelect', required: true },
      { name: 'entry_type', label: 'Asiento', type: 'select', options: ['DEVENGAMIENTO', 'PROVISION', 'PAGO', 'AJUSTE'] },
      { name: 'debit_account_code', label: 'Cuenta debe', placeholder: '510101', required: true },
      { name: 'debit_account_name', label: 'Nombre cuenta debe', placeholder: 'Sueldos y salarios', required: true },
      { name: 'credit_account_code', label: 'Cuenta haber', placeholder: '210101', required: true },
      { name: 'credit_account_name', label: 'Nombre cuenta haber', placeholder: 'Nomina por pagar', required: true },
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
    emptyText: 'Aun no hay cuentas contables de nomina. Carga defaults editables para todos los conceptos calculados.',
  },
  {
    key: 'banco',
    title: 'Banco y archivo plano',
    description: 'Selecciona una plantilla bancaria real para generar archivos de pago de nomina.',
    icon: CreditCard,
    resource: 'bankProfiles',
    stepCode: 'bancos',
    fields: [
      { name: 'template', label: 'Plantilla bancaria', type: 'select', options: [
        { value: 'generico', label: 'Generica delimitada' },
        { value: 'pacifico_interbank_immediate', label: 'Banco Pacifico - transferencias interbancarias inmediatas' },
      ], wide: true },
      { name: 'banco_codigo', label: 'Codigo banco', placeholder: 'PICHINCHA', required: true },
      { name: 'banco_nombre', label: 'Nombre banco', placeholder: 'Banco Pichincha', required: true },
      { name: 'delimiter', label: 'Separador', placeholder: ';', required: true },
      { name: 'encoding', label: 'Codificacion', type: 'select', options: ['utf8', 'latin1'] },
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
        ? 'Banco Pacifico interbancarias'
        : 'Generico delimitado';
      return `${record.banco_codigo} - ${layout} - ${record.encoding || 'utf8'}`;
    },
  },
  {
    key: 'homologacion_banco',
    title: 'Homologacion bancaria',
    description: 'Genera la estructura completa de campos que consumira el archivo plano del banco.',
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
    description: 'Define la matriz minima de usuarios y permisos para operar nomina con trazabilidad.',
    icon: UserCog,
    resource: 'catalogs',
    stepCode: 'usuarios',
    catalogType: 'usuarios_roles',
    fields: [
      { name: 'code', label: 'Codigo matriz', placeholder: 'MATRIZ_RRHH', required: true },
      { name: 'name', label: 'Nombre', placeholder: 'Matriz de roles RRHH', required: true },
      { name: 'owner_email', label: 'Owner / representante', type: 'email' },
      { name: 'admin_email', label: 'Administrador RRHH', type: 'email' },
      { name: 'supervisor_enabled', label: 'Usa supervisores', type: 'checkbox' },
      { name: 'employee_access', label: 'Acceso empleado', type: 'select', options: ['marcaciones_y_roles', 'solo_marcaciones', 'sin_acceso'] },
      { name: 'notes', label: 'Notas de control', type: 'textarea', wide: true },
    ],
    initial: {
      code: 'MATRIZ_RRHH',
      name: 'Matriz de roles RRHH',
      owner_email: '',
      admin_email: '',
      supervisor_enabled: true,
      employee_access: 'marcaciones_y_roles',
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
        employeeAccess: values.employee_access,
        roles: ['owner', 'admin_rrhh', 'supervisor', 'empleado'],
      },
    }),
    recordLabel: (record) => record.name,
    recordMeta: (record) => `${record.code} - ${record.payload?.employeeAccess || 'sin detalle'}`,
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
      banco_nombre: values.banco_nombre.trim() || 'Banco Pacifico',
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
  if (definition.key === 'novedad') {
    return dedupeNoveltyRecords(records);
  }
  if (definition.key === 'legal') {
    return records.filter((record) => record.parameter_key !== 'income_tax_table');
  }
  if (definition.key === 'ir') {
    return records.filter((record) => record.parameter_key === 'income_tax_table');
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
  return extractApiError(err, 'No pudimos cargar tu configuracion. Actualiza la pagina en unos segundos.');
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
        value_json: jsonText(value),
        notes: record.notes || '',
      };
    case 'ir':
      return {
        period_year: record.period_year || new Date().getFullYear(),
        source_name: record.source_name || 'SRI',
        source_url: record.source_url || '',
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

function Field({ field, value, onChange, options = [] }) {
  const baseClass = 'form-control';
  const fieldClass = field.wide ? 'form-field-full' : 'form-field-third';

  if (field.type === 'textarea') {
    return (
      <label className={fieldClass}>
        <span className="text-sm font-medium text-slate-700">{field.label}</span>
        <textarea
          className="form-textarea"
          value={value}
          onChange={(event) => onChange(field.name, event.target.value)}
          placeholder={field.placeholder}
        />
      </label>
    );
  }

  if (field.type === 'select') {
    return (
      <label className={fieldClass}>
        <span className="text-sm font-medium text-slate-700">{field.label}</span>
        <select className={baseClass} value={value} onChange={(event) => onChange(field.name, event.target.value)}>
          {field.options.map((option) => (
            <option key={option.value || option} value={option.value || option}>{option.label || option}</option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === 'payrollConceptSelect') {
    return (
      <label className={fieldClass}>
        <span className="text-sm font-medium text-slate-700">{field.label}</span>
        <select
          className={baseClass}
          value={value}
          onChange={(event) => onChange(field.name, event.target.value)}
          required={field.required}
          disabled={options.length === 0}
        >
          <option value="">{options.length === 0 ? 'Sin conceptos disponibles' : 'Selecciona un concepto'}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === 'resourceSelect') {
    return (
      <label className={fieldClass}>
        <span className="text-sm font-medium text-slate-700">{field.label}</span>
        <select
          className={baseClass}
          value={value}
          onChange={(event) => onChange(field.name, event.target.value)}
          required={field.required}
          disabled={options.length === 0}
        >
          <option value="">{options.length === 0 ? field.emptyLabel || 'Primero crea un registro' : field.selectLabel || 'Selecciona una opcion'}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>{option.name} ({option.code})</option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === 'multiCheckbox') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <fieldset className={field.wide ? 'form-field-full' : 'form-field-third'}>
        <legend className="text-sm font-medium text-slate-700">{field.label}</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {field.options.map((option) => (
            <label className="flex min-h-10 items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700" key={option.value}>
              <input
                className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={(event) => {
                  const next = event.target.checked
                    ? [...selected, option.value]
                    : selected.filter((item) => item !== option.value);
                  onChange(field.name, next);
                }}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <label className="form-field-third flex h-10 items-center gap-3 self-end rounded-md border border-slate-200 px-3 text-sm">
        <input
          className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(field.name, event.target.checked)}
        />
        <span className="text-sm font-medium text-slate-700">{field.label}</span>
      </label>
    );
  }

  return (
    <label className={fieldClass}>
      <span className="text-sm font-medium text-slate-700">{field.label}</span>
      <input
        className={baseClass}
        type={field.type || 'text'}
        step={field.step}
        value={value}
        onChange={(event) => onChange(field.name, event.target.value)}
        placeholder={field.placeholder}
        required={field.required}
      />
    </label>
  );
}

function BankFlatFileGuide({ values, mappings = [] }) {
  const template = BANK_TEMPLATE_PREVIEWS[values.template] || BANK_TEMPLATE_PREVIEWS.generico;
  const visibleColumns = mappings.length > 0
    ? mappings.map((mapping) => ([
      String(mapping.position),
      mapping.bank_field_name,
      mapping.canonical_field,
      mapping.formatter || (mapping.required ? 'Obligatorio' : 'Opcional'),
    ]))
    : template.columns;

  return (
    <div className="mt-5 space-y-4 rounded-md border border-teal-100 bg-teal-50/70 p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-teal-950">Archivo plano que se generara</p>
          <h4 className="mt-1 text-base font-semibold text-slate-950">{template.title}</h4>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            Fuente: {template.source}. El sistema toma nominas cerradas/pagadas, descifra la cuenta solo en memoria y arma estas columnas.
          </p>
        </div>
        <div className="rounded-md bg-white px-3 py-2 text-xs text-slate-600">
          <p><strong>Archivo:</strong> {template.fileName}</p>
          <p><strong>Encoding:</strong> {template.encoding}</p>
          <p><strong>Separador:</strong> {template.delimiter === ';' ? 'punto y coma (;)' : template.delimiter}</p>
          <p><strong>Lineas:</strong> {template.lineEnding}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {template.sections.map((section) => (
          <div className="rounded-md border border-teal-100 bg-white p-3" key={section.label}>
            <p className="text-xs font-semibold uppercase text-teal-800">{section.label}</p>
            <p className="mt-1 text-sm leading-5 text-slate-700">{section.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-md border border-teal-100 bg-white">
        <table className="min-w-[760px] w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 font-semibold">Pos.</th>
              <th className="px-3 py-2 font-semibold">Campo banco</th>
              <th className="px-3 py-2 font-semibold">Dato usado</th>
              <th className="px-3 py-2 font-semibold">Formato</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleColumns.map(([position, bankField, source, format]) => (
              <tr key={`${position}-${bankField}`}>
                <td className="px-3 py-2 font-mono text-slate-500">{position}</td>
                <td className="px-3 py-2 font-semibold text-slate-900">{bankField}</td>
                <td className="px-3 py-2 text-slate-700">{source}</td>
                <td className="px-3 py-2 text-slate-700">{format}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-md bg-slate-950 px-3 py-2 text-xs text-slate-100">
        <p className="font-semibold text-teal-200">Ejemplo de linea de detalle</p>
        <code className="mt-1 block overflow-x-auto whitespace-nowrap">{template.example}</code>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950">
        {mappings.length > 0
          ? 'Esta vista esta usando la homologacion guardada para el banco. Si cambias la estructura, actualiza la homologacion antes de generar el archivo.'
          : 'Aun no hay homologacion guardada para este banco; se muestra la plantilla base. Genera la estructura completa en Homologacion bancaria.'}
      </div>
    </div>
  );
}

function BankMappingStructureBuilder({
  values,
  summary,
  onFieldChange,
  onApplyProfile,
  onGenerate,
  isGenerating,
}) {
  const profiles = profileOptions(summary);
  const selectedProfile = (summary?.resources?.bankProfiles || []).find(
    (profile) => normalizeBankCode(profile.banco_codigo) === normalizeBankCode(values.banco_codigo)
  );
  const template = values.template || bankTemplateFromProfile(selectedProfile);
  const uploadedStructure = Array.isArray(values.uploadedStructure) ? values.uploadedStructure : [];
  const structure = uploadedStructure.length > 0 ? uploadedStructure : defaultMappingStructure(template);
  const savedMappings = mappingsForBank(summary, values.banco_codigo);

  function updateStructureField(index, name, value) {
    const next = structure.map((field, fieldIndex) => (
      fieldIndex === index ? { ...field, [name]: value } : field
    ));
    onFieldChange('uploadedStructure', next);
  }

  function importStructure(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseUploadedBankStructure(reader.result);
      onFieldChange('uploadedStructure', parsed.length > 0 ? parsed : []);
    };
    reader.readAsText(file);
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <label>
          <span className="text-sm font-medium text-slate-700">Banco configurado</span>
          <select
            className="form-control"
            value={values.banco_codigo}
            onChange={(event) => onApplyProfile(event.target.value)}
          >
            {profiles.length === 0 && <option value="">Primero crea un banco</option>}
            {profiles.map((profile) => (
              <option key={profile.value} value={profile.value}>{profile.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">Estructura base</span>
          <select
            className="form-control"
            value={template}
            onChange={(event) => onFieldChange('template', event.target.value)}
          >
            <option value="generico">Generica delimitada</option>
            <option value="pacifico_interbank_immediate">Banco Pacifico - transferencias interbancarias inmediatas</option>
          </select>
        </label>
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">Homologacion rapida desde archivo plano</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Sube un TXT/CSV modelo. Se lee la primera linea como cabecera o estructura, y puedes ajustar los campos antes de guardar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-teal-300">
              <Download className="h-4 w-4 rotate-180" />
              Subir plano modelo
              <input className="hidden" type="file" accept=".txt,.csv" onChange={importStructure} />
            </label>
            {uploadedStructure.length > 0 && (
              <button
                className="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700"
                type="button"
                onClick={() => onFieldChange('uploadedStructure', [])}
              >
                Volver a plantilla base
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-slate-200">
        <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">Estructura que se guardara para {values.banco_codigo || 'el banco'}</p>
            <p className="mt-1 text-xs text-slate-500">
              Se generan {structure.length} campos ordenados. Existentes para este banco: {savedMappings.length}.
            </p>
          </div>
          <button
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white disabled:opacity-60"
            disabled={!values.banco_codigo || isGenerating}
            type="button"
            onClick={() => onGenerate(structure)}
          >
            <Plus className="h-4 w-4" />
            {isGenerating ? 'Generando...' : 'Generar estructura completa'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-white text-slate-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Pos.</th>
                <th className="px-3 py-2 font-semibold">Campo Nomina-Ec</th>
                <th className="px-3 py-2 font-semibold">Campo banco</th>
                <th className="px-3 py-2 font-semibold">Formato</th>
                <th className="px-3 py-2 font-semibold">Req.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {structure.map((field, index) => {
                const saved = savedMappings.find((mapping) => mapping.canonical_field === field.canonical_field);
                return (
                  <tr className={saved ? 'bg-emerald-50/50' : 'bg-white'} key={field.canonical_field}>
                    <td className="px-3 py-2 font-mono">{field.position}</td>
                    <td className="px-3 py-2">
                      <select
                        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                        value={CANONICAL_BANK_FIELDS.includes(field.canonical_field) ? field.canonical_field : ''}
                        onChange={(event) => updateStructureField(index, 'canonical_field', event.target.value)}
                      >
                        <option value="">Revisar campo</option>
                        {CANONICAL_BANK_FIELDS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                        value={field.bank_field_name}
                        onChange={(event) => updateStructureField(index, 'bank_field_name', event.target.value.toUpperCase())}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                        value={field.formatter || ''}
                        onChange={(event) => updateStructureField(index, 'formatter', event.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                        type="checkbox"
                        checked={Boolean(field.required)}
                        onChange={(event) => updateStructureField(index, 'required', event.target.checked)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950">
        Banco y archivo plano consume esta homologacion guardada. Si no existe, usa la plantilla base; si existe, el generador ordena el archivo por estas posiciones.
      </div>
    </div>
  );
}

function BankFileOperationPanel({
  values,
  period,
  onPeriodChange,
  onGenerate,
  isGenerating,
  generatedFile,
}) {
  const canGenerate = values.banco_codigo && period.anio && period.mes && !isGenerating;

  return (
    <div className="mt-5 rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-950">Generar archivo del periodo</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Primero guarda la estructura bancaria. Luego, con nominas cerradas o pagadas, genera el archivo plano y el Excel de revision.
          </p>
        </div>
        <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Banco operativo: <strong>{values.banco_codigo || 'sin guardar'}</strong>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[120px_120px_minmax(0,1fr)] md:items-end">
        <label>
          <span className="text-sm font-medium text-slate-700">Anio</span>
          <input
            className="form-control"
            type="number"
            value={period.anio}
            onChange={(event) => onPeriodChange('anio', Number(event.target.value))}
          />
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">Mes</span>
          <select
            className="form-control"
            value={period.mes}
            onChange={(event) => onPeriodChange('mes', Number(event.target.value))}
          >
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index + 1} value={index + 1}>{index + 1}</option>
            ))}
          </select>
        </label>
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-60"
          disabled={!canGenerate}
          type="button"
          onClick={onGenerate}
        >
          <Download className="h-4 w-4" />
          {isGenerating ? 'Generando...' : 'Generar archivo bancario'}
        </button>
      </div>

      {generatedFile && (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm font-semibold text-emerald-950">
            Archivo generado: {generatedFile.totalEmpleados} pagos por USD {generatedFile.totalPagos}
          </p>
          <p className="mt-1 break-all text-xs text-emerald-800">Checksum: {generatedFile.checksum}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {generatedFile.csvUrl && (
              <button
                className="inline-flex min-h-9 items-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white"
                type="button"
                onClick={() => downloadUrl(generatedFile.csvUrl, generatedFile.fileName || `archivo-banco-${period.anio}-${String(period.mes).padStart(2, '0')}.csv`)}
              >
                <Download className="h-4 w-4" />
                Descargar plano
              </button>
            )}
            {generatedFile.excelUrl && (
              <button
                className="inline-flex min-h-9 items-center gap-2 rounded-md border border-emerald-300 bg-white px-3 text-sm font-semibold text-emerald-800"
                type="button"
                onClick={() => downloadUrl(generatedFile.excelUrl, `revision-banco-${period.anio}-${String(period.mes).padStart(2, '0')}.xlsx`)}
              >
                <Download className="h-4 w-4" />
                Descargar Excel revision
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BankMappingGroups({ records }) {
  const groups = records.reduce((acc, record) => {
    const code = normalizeBankCode(record.banco_codigo);
    if (!acc.has(code)) acc.set(code, []);
    acc.get(code).push(record);
    return acc;
  }, new Map());

  if (groups.size === 0) {
    return (
      <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
        Aun no hay estructuras bancarias homologadas.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {[...groups.entries()].map(([code, mappings]) => {
        const ordered = [...mappings].sort((a, b) => Number(a.position) - Number(b.position));
        return (
          <div className="rounded-md bg-slate-50 px-3 py-2" key={code}>
            <p className="text-sm font-semibold text-slate-900">{code}</p>
            <p className="mt-1 text-xs text-slate-500">{ordered.length} campos homologados</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {ordered.slice(0, 12).map((mapping) => (
                <span className="rounded bg-white px-2 py-1 text-[11px] text-slate-600" key={mapping.id}>
                  {mapping.position}. {mapping.bank_field_name}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IncomeTaxTableFields({ values, onFieldChange, onBracketChange, onAddBracket, onRemoveBracket }) {
  const inputClass = 'form-control';

  return (
    <div className="space-y-5">
      <div className="form-grid">
        <label className="form-field-third">
          <span className="text-sm font-medium text-slate-700">Anio fiscal</span>
          <input
            className={inputClass}
            type="number"
            value={values.period_year}
            onChange={(event) => onFieldChange('period_year', event.target.value)}
            required
          />
        </label>
        <label className="form-field-third">
          <span className="text-sm font-medium text-slate-700">Fuente oficial</span>
          <input
            className={inputClass}
            value={values.source_name}
            onChange={(event) => onFieldChange('source_name', event.target.value)}
            placeholder="SRI"
          />
        </label>
        <label className="form-field-third">
          <span className="text-sm font-medium text-slate-700">URL de respaldo</span>
          <input
            className={inputClass}
            type="url"
            value={values.source_url}
            onChange={(event) => onFieldChange('source_url', event.target.value)}
            placeholder="https://www.sri.gob.ec/..."
          />
        </label>
        <label className="form-field-third">
          <span className="text-sm font-medium text-slate-700">Fecha de fuente</span>
          <input
            className={inputClass}
            type="date"
            value={values.source_date}
            onChange={(event) => onFieldChange('source_date', event.target.value)}
          />
        </label>
      </div>

      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="min-w-[760px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 font-semibold">Fraccion basica</th>
              <th className="px-3 py-2 font-semibold">Exceso hasta</th>
              <th className="px-3 py-2 font-semibold">Impuesto fraccion basica</th>
              <th className="px-3 py-2 font-semibold">Porcentaje decimal</th>
              <th className="w-14 px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {values.brackets.map((bracket, index) => (
              <tr key={`ir-${index}`}>
                <td className="px-3 py-2">
                  <input
                    className={inputClass}
                    type="number"
                    step="0.01"
                    value={bracket.from}
                    onChange={(event) => onBracketChange(index, 'from', event.target.value)}
                    required
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className={inputClass}
                    type="number"
                    step="0.01"
                    value={bracket.to}
                    onChange={(event) => onBracketChange(index, 'to', event.target.value)}
                    placeholder="Sin limite"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className={inputClass}
                    type="number"
                    step="0.01"
                    value={bracket.baseTax}
                    onChange={(event) => onBracketChange(index, 'baseTax', event.target.value)}
                    required
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className={inputClass}
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={bracket.rate}
                    onChange={(event) => onBracketChange(index, 'rate', event.target.value)}
                    placeholder="0.05"
                    required
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:border-red-200 hover:text-red-700 disabled:opacity-40"
                    type="button"
                    disabled={values.brackets.length === 1}
                    onClick={() => onRemoveBracket(index)}
                    title="Eliminar intervalo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-teal-700 hover:border-teal-300"
        type="button"
        onClick={onAddBracket}
      >
        <Plus className="h-4 w-4" />
        Agregar intervalo
      </button>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Notas de revision</span>
        <textarea
          className="form-textarea"
          value={values.notes}
          onChange={(event) => onFieldChange('notes', event.target.value)}
          placeholder="Resolucion, ejercicio fiscal, observaciones de validacion..."
        />
      </label>
    </div>
  );
}

function formatCurrency(value) {
  if (value === null || typeof value === 'undefined' || value === '') return 'Sin limite';
  return Number(value).toLocaleString('es-EC', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatRate(value) {
  const rate = Number(value || 0);
  return `${(rate * 100).toLocaleString('es-EC', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}

function normalizeIncomeTaxBrackets(record) {
  return Array.isArray(record?.value?.brackets) ? record.value.brackets : [];
}

function legalParameterValue(record) {
  const value = record?.value || {};

  if (record?.parameter_key === 'income_tax_table') {
    return `${normalizeIncomeTaxBrackets(record).length} tramos`;
  }

  if (typeof value.amount !== 'undefined') {
    if (String(record.unit || '').includes('porcentaje')) {
      return formatRate(value.amount);
    }
    return `${formatCurrency(value.amount)} ${record.unit || ''}`.trim();
  }

  if (typeof value.rate !== 'undefined' || typeof value.paymentMonth !== 'undefined' || typeof value.startsAfterMonths !== 'undefined') {
    return [
      typeof value.rate !== 'undefined' ? `tasa ${formatRate(value.rate)}` : '',
      typeof value.amount !== 'undefined' ? `base ${formatCurrency(value.amount)}` : '',
      typeof value.paymentMonth !== 'undefined' ? `mes pago ${value.paymentMonth}` : '',
      typeof value.startsAfterMonths !== 'undefined' ? `desde mes ${value.startsAfterMonths + 1}` : '',
      value.region || '',
      value.calculationBase || '',
    ].filter(Boolean).join(' - ');
  }

  return JSON.stringify(value);
}

function labelLegalParameter(key) {
  const labels = {
    sbu: 'Salario basico unificado',
    iess_aporte_personal: 'IESS personal',
    iess_aporte_patronal: 'IESS patronal',
    jornada_horas_mensuales: 'Horas mensuales valor hora',
    jornada_maxima_semanal: 'Jornada maxima semanal',
    provision_vacaciones: 'Provision vacaciones',
    vacaciones_dias_anuales: 'Vacaciones anuales',
    decimo_tercero: 'Decimo tercero',
    decimo_cuarto_costa_galapagos: 'Decimo cuarto Costa/Galapagos',
    decimo_cuarto_sierra_amazonia: 'Decimo cuarto Sierra/Amazonia',
    fondo_reserva: 'Fondo de reserva',
    income_tax_table: 'Tabla impuesto a la renta',
    tabla_impuesto_renta: 'Tabla impuesto a la renta',
  };

  return labels[key] || key;
}

function latestLegalParameters(records) {
  const byKey = new Map();

  [...records]
    .sort((a, b) => {
      if (Number(b.period_year) !== Number(a.period_year)) return Number(b.period_year) - Number(a.period_year);
      return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
    })
    .forEach((record) => {
      if (!byKey.has(record.parameter_key)) {
        byKey.set(record.parameter_key, record);
      }
    });

  return [...byKey.values()];
}

function LegalParametersPreview({ records }) {
  const parameters = latestLegalParameters(records);

  if (parameters.length === 0) {
    return (
      <div className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
        Carga los parametros obligatorios para ver aqui la matriz legal completa usada por el motor.
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
      <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-sm font-semibold text-slate-900">Parametros legales visibles</p>
        <p className="mt-1 text-xs text-slate-500">Ultima version por codigo, con estado y fuente.</p>
      </div>
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full min-w-[680px] text-left text-xs">
          <thead className="sticky top-0 bg-white text-slate-500 shadow-sm">
            <tr>
              <th className="px-3 py-2 font-semibold">Parametro</th>
              <th className="px-3 py-2 font-semibold">Anio</th>
              <th className="px-3 py-2 font-semibold">Valor usado</th>
              <th className="px-3 py-2 font-semibold">Estado</th>
              <th className="px-3 py-2 font-semibold">Fuente</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {parameters.map((record) => (
              <tr key={record.id}>
                <td className="px-3 py-2 font-semibold text-slate-800">{labelLegalParameter(record.parameter_key)}</td>
                <td className="px-3 py-2 font-mono">{record.period_year}</td>
                <td className="px-3 py-2 font-mono">{legalParameterValue(record)}</td>
                <td className="px-3 py-2">{record.validation_status}</td>
                <td className="px-3 py-2">{record.source_name || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IncomeTaxTablePreview({ records }) {
  const latest = [...records].sort((a, b) => {
    if (Number(b.period_year) !== Number(a.period_year)) return Number(b.period_year) - Number(a.period_year);
    return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
  })[0];
  const brackets = normalizeIncomeTaxBrackets(latest);

  if (!latest || brackets.length === 0) {
    return (
      <div className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
        Carga o registra la tabla IR para verla completa aqui.
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
      <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-sm font-semibold text-slate-900">Tabla IR visible {latest.period_year}</p>
        <p className="mt-1 text-xs text-slate-500">
          {latest.validation_status} - {latest.source_name || 'sin fuente registrada'}
        </p>
      </div>
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead className="sticky top-0 bg-white text-slate-500 shadow-sm">
            <tr>
              <th className="px-3 py-2 font-semibold">Fraccion basica</th>
              <th className="px-3 py-2 font-semibold">Exceso hasta</th>
              <th className="px-3 py-2 font-semibold">Impuesto</th>
              <th className="px-3 py-2 font-semibold">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {brackets.map((bracket, index) => (
              <tr key={`${latest.id}-${index}`}>
                <td className="px-3 py-2 font-mono">{formatCurrency(bracket.from ?? bracket.fraccion_basica)}</td>
                <td className="px-3 py-2 font-mono">{formatCurrency(bracket.to ?? bracket.exceso_hasta)}</td>
                <td className="px-3 py-2 font-mono">{formatCurrency(bracket.baseTax ?? bracket.impuesto_fraccion_basica)}</td>
                <td className="px-3 py-2 font-mono">{formatRate(bracket.rate ?? bracket.porcentaje)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {latest.notes && (
        <p className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
          {latest.notes}
        </p>
      )}
    </div>
  );
}

function Parametrizacion() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const today = new Date();
  const [activeForm, setActiveForm] = useState(formDefinitions[0].key);
  const [forms, setForms] = useState(buildInitialState);
  const [mandatoryYear, setMandatoryYear] = useState(new Date().getFullYear());
  const [bankFilePeriod, setBankFilePeriod] = useState({ anio: today.getFullYear(), mes: today.getMonth() + 1 });
  const [generatedBankFile, setGeneratedBankFile] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const {
    data: summary,
    error: summaryError,
    isError: summaryHasError,
  } = useQuery({
    queryKey: ['configuration-summary'],
    queryFn: () => fetchConfigurationSummary(token),
    enabled: Boolean(token),
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ definition, values, record }) => {
      const payload = definition.buildPayload(values);
      const savedRecord = record
        ? await updateConfigurationResource(token, definition.resource, record.id, payload)
        : await createConfigurationResource(token, definition.resource, payload);
      await completeOnboardingStep(token, definition.stepCode, {
        notes: `${definition.title} ${record ? 'actualizado' : 'creado'} desde parametrizacion.`,
        evidence: { recordId: savedRecord.id, resource: definition.resource },
      });
      return { record: savedRecord, definition, mode: record ? 'actualizado' : 'guardado' };
    },
    onSuccess: ({ definition, mode }) => {
      setError('');
      setMessage(`${definition.title} ${mode}.`);
      setForms((current) => ({ ...current, [definition.key]: cloneFormValues(definition.initial) }));
      setEditingRecord(null);
      setPendingDeleteId('');
      queryClient.invalidateQueries({ queryKey: ['configuration-summary'] });
    },
    onError: (err) => {
      setMessage('');
      setError(extractApiError(err, 'No pudimos guardar la parametrizacion. Revisa los datos e intenta nuevamente.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ definition, record }) => deleteConfigurationResource(token, definition.resource, record.id),
    onSuccess: (_data, { definition, record }) => {
      setError('');
      setMessage(`${definition.title} eliminado.`);
      setPendingDeleteId('');
      if (editingRecord?.id === record.id) {
        setEditingRecord(null);
        setForms((current) => ({ ...current, [definition.key]: cloneFormValues(definition.initial) }));
      }
      queryClient.invalidateQueries({ queryKey: ['configuration-summary'] });
    },
    onError: (err) => {
      setMessage('');
      setError(extractApiError(err, 'No pudimos eliminar el registro. Verifica si ya tiene consumos operativos.'));
    },
  });

  const loadMandatoryMutation = useMutation({
    mutationFn: () => loadMandatoryLegalParameters(token, mandatoryYear),
    onSuccess: (data) => {
      setError('');
      setMessage(`Parametros legales vigentes para ${data.periodYear} actualizados: ${data.count}.`);
      selectForm('ir');
      queryClient.invalidateQueries({ queryKey: ['configuration-summary'] });
    },
    onError: (err) => {
      setMessage('');
      setError(extractApiError(err, 'No pudimos cargar los parametros legales obligatorios.'));
    },
  });

  const generateBankFileMutation = useMutation({
    mutationFn: () => generateBankPaymentFile(token, {
      anio: Number(bankFilePeriod.anio),
      mes: Number(bankFilePeriod.mes),
      banco: activeValues.banco_codigo,
    }),
    onSuccess: (data) => {
      setError('');
      setGeneratedBankFile(data);
      setMessage(`Archivo bancario generado: ${data.totalEmpleados} pagos por USD ${data.totalPagos}.`);
    },
    onError: (err) => {
      setMessage('');
      setGeneratedBankFile(null);
      setError(extractApiError(err, 'No pudimos generar el archivo bancario. Verifica nomina cerrada, cuentas y plan habilitado.'));
    },
  });

  const generateBankMappingStructureMutation = useMutation({
    mutationFn: async (structure) => {
      const bancoCodigo = normalizeBankCode(activeValues.banco_codigo);
      const existingMappings = mappingsForBank(summary, bancoCodigo);
      const validStructure = structure.filter((field) => CANONICAL_BANK_FIELDS.includes(field.canonical_field));
      if (!bancoCodigo) {
        throw new Error('Selecciona un banco antes de generar la homologacion.');
      }
      if (validStructure.length === 0) {
        throw new Error('La estructura no tiene campos canonicos validos para guardar.');
      }

      const savedRows = [];
      for (const field of validStructure) {
        const payload = {
          banco_codigo: bancoCodigo,
          canonical_field: field.canonical_field,
          bank_field_name: String(field.bank_field_name || field.canonical_field).trim().toUpperCase(),
          position: Number(field.position),
          formatter: String(field.formatter || '').trim(),
          required: Boolean(field.required),
          metadata: {
            source: Array.isArray(activeValues.uploadedStructure) && activeValues.uploadedStructure.length > 0
              ? 'archivo_plano_modelo'
              : 'plantilla_nomina_ec',
            template: activeValues.template,
          },
        };
        const existing = existingMappings.find((mapping) => mapping.canonical_field === field.canonical_field);
        const saved = existing
          ? await updateConfigurationResource(token, 'bankFieldMappings', existing.id, payload)
          : await createConfigurationResource(token, 'bankFieldMappings', payload);
        savedRows.push(saved);
      }

      await completeOnboardingStep(token, 'bancos', {
        notes: `Homologacion bancaria ${bancoCodigo} generada como estructura completa.`,
        evidence: { bancoCodigo, totalCampos: savedRows.length },
      });

      return { bancoCodigo, savedRows };
    },
    onSuccess: ({ bancoCodigo, savedRows }) => {
      setError('');
      setMessage(`Homologacion ${bancoCodigo} actualizada: ${savedRows.length} campos guardados.`);
      queryClient.invalidateQueries({ queryKey: ['configuration-summary'] });
    },
    onError: (err) => {
      setMessage('');
      setError(extractApiError(err, 'No pudimos generar la estructura bancaria completa.'));
    },
  });

  const activeDefinition = formDefinitions.find((definition) => definition.key === activeForm) || formDefinitions[0];
  const activeValues = forms[activeDefinition.key];
  const isEditingActiveRecord = editingRecord?.definitionKey === activeDefinition.key;
  const completion = summary?.onboarding?.completionPercent || 0;
  const records = recordsForDefinition(summary, activeDefinition);
  const legalRecords = summary?.resources?.legalParameters || [];

  function updateField(name, value) {
    setForms((current) => {
      const nextValues = {
        ...current[activeDefinition.key],
        ...(activeDefinition.key === 'banco' && name === 'template'
          ? BANK_TEMPLATE_DEFAULTS[value] || {}
          : {}),
        [name]: value,
      };

      if (activeDefinition.key === 'contabilidad' && name === 'concept_code') {
        const concept = payrollConceptByCode(summary, value);
        nextValues.concept_label = concept?.label || '';
        nextValues.category = concept?.category || '';
        nextValues.entry_type = concept?.entryType || nextValues.entry_type || 'DEVENGAMIENTO';
      }

      return {
        ...current,
        [activeDefinition.key]: nextValues,
      };
    });
  }

  function updateBankFilePeriod(name, value) {
    setGeneratedBankFile(null);
    setBankFilePeriod((current) => ({ ...current, [name]: value }));
  }

  function applyBankProfileToMapping(bancoCodigo) {
    const profile = (summary?.resources?.bankProfiles || []).find(
      (item) => normalizeBankCode(item.banco_codigo) === normalizeBankCode(bancoCodigo)
    );
    setGeneratedBankFile(null);
    setForms((current) => ({
      ...current,
      homologacion_banco: {
        ...current.homologacion_banco,
        banco_codigo: bancoCodigo,
        template: bankTemplateFromProfile(profile),
        uploadedStructure: [],
      },
    }));
  }

  function generateBankMappingStructure(structure) {
    generateBankMappingStructureMutation.mutate(structure);
  }

  function generateBankFile() {
    setGeneratedBankFile(null);
    generateBankFileMutation.mutate();
  }

  function updateBracket(index, name, value) {
    setForms((current) => ({
      ...current,
      [activeDefinition.key]: {
        ...current[activeDefinition.key],
        brackets: current[activeDefinition.key].brackets.map((bracket, bracketIndex) => (
          bracketIndex === index ? { ...bracket, [name]: value } : bracket
        )),
      },
    }));
  }

  function addBracket() {
    setForms((current) => ({
      ...current,
      [activeDefinition.key]: {
        ...current[activeDefinition.key],
        brackets: [
          ...current[activeDefinition.key].brackets,
          { from: '', to: '', baseTax: '0', rate: '0' },
        ],
      },
    }));
  }

  function removeBracket(index) {
    setForms((current) => ({
      ...current,
      [activeDefinition.key]: {
        ...current[activeDefinition.key],
        brackets: current[activeDefinition.key].brackets.filter((_, bracketIndex) => bracketIndex !== index),
      },
    }));
  }

  function submitForm(event) {
    event.preventDefault();
    if (activeDefinition.customType === 'bankMappingStructure') {
      return;
    }
    saveMutation.mutate({
      definition: activeDefinition,
      values: activeValues,
      record: isEditingActiveRecord ? editingRecord : null,
    });
  }

  function selectForm(definitionKey) {
    setActiveForm(definitionKey);
    setEditingRecord(null);
    setPendingDeleteId('');
    setGeneratedBankFile(null);
  }

  function startEdit(definition, record) {
    setActiveForm(definition.key);
    setEditingRecord({ ...record, definitionKey: definition.key });
    setPendingDeleteId('');
    setError('');
    setMessage('');
    setGeneratedBankFile(null);
    setForms((current) => ({
      ...current,
      [definition.key]: formValuesFromRecord(definition, record),
    }));
  }

  function cancelEdit() {
    setEditingRecord(null);
    setPendingDeleteId('');
    setGeneratedBankFile(null);
    setForms((current) => ({
      ...current,
      [activeDefinition.key]: cloneFormValues(activeDefinition.initial),
    }));
  }

  function requestDelete(recordId) {
    setPendingDeleteId(recordId);
    setMessage('');
    setError('');
  }

  function confirmDelete(definition, record) {
    deleteMutation.mutate({ definition, record });
  }

  function openStepForm(stepCode) {
    const formKey = stepFormMap[stepCode];
    if (formKey) selectForm(formKey);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">Configuracion de la empresa</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Parametriza la nomina con datos visibles</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Ingresa parametros laborales, novedades, estructura, zonas y jornadas. Cada unidad organizativa debe
              quedar vinculada a una zona de marcacion antes de usarse en asistencia productiva.
            </p>
          </div>
          <div className="rounded-md bg-teal-50 px-5 py-4 text-center">
            <p className="text-sm font-medium text-teal-900">Avance</p>
            <p className="text-3xl font-semibold text-teal-900">{completion}%</p>
          </div>
        </div>
        <div className="mt-5 h-2 rounded-full bg-slate-100">
          <div className="h-2 rounded-full bg-teal-700" style={{ width: `${completion}%` }} />
        </div>
      </div>

      {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</div>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</div>}
      {summaryHasError && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          {configurationLoadMessage(summaryError)}
        </div>
      )}

      <section className="rounded-lg border border-teal-200 bg-teal-50 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-teal-950">Carga de valores legales obligatorios</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-teal-900">
              Carga SBU, aportes IESS, jornada, vacaciones y tabla de impuesto a la renta del anio seleccionado
              como parametros revisables. Incluye decimos tercero/cuarto y fondo de reserva. No reemplaza la validacion
              contra fuente oficial vigente.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label>
              <span className="text-sm font-medium text-teal-950">Anio fiscal</span>
              <input
                className="mt-1 w-32 rounded-md border border-teal-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                type="number"
                value={mandatoryYear}
                onChange={(event) => setMandatoryYear(Number(event.target.value))}
              />
            </label>
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-60"
              disabled={loadMandatoryMutation.isPending}
              type="button"
              onClick={() => loadMandatoryMutation.mutate()}
            >
              <Download className="h-4 w-4" />
              {loadMandatoryMutation.isPending ? 'Cargando...' : 'Cargar valores legales'}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Settings2 className="h-6 w-6 text-teal-700" />
            <h2 className="text-lg font-semibold text-slate-950">Centro de configuracion</h2>
          </div>
          <p className="text-sm text-slate-500">Selecciona un dominio operativo y completa los campos requeridos.</p>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-md border border-teal-100 bg-teal-50 px-4 py-3 text-sm leading-6 text-teal-950">
            <p className="font-semibold">Valores legales</p>
            <p>SBU, IESS, impuesto a la renta, decimos, jornada y reglas que alimentan el calculo.</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
            <p className="font-semibold text-slate-950">Cuentas contables de nomina</p>
            <p>Debe/haber por cada concepto calculado, con vigencia y centro de costo del tenant.</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {formDefinitions.map((definition) => {
            const Icon = definition.icon;
            const isActive = definition.key === activeDefinition.key;
            return (
              <button
                className={`inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-semibold ${
                  isActive
                    ? 'border-teal-700 bg-teal-700 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300'
                }`}
                key={definition.key}
                type="button"
                onClick={() => selectForm(definition.key)}
              >
                <Icon className="h-4 w-4" />
                {definition.title}
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <form className="rounded-md border border-slate-200 p-4" onSubmit={submitForm}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-semibold text-slate-950">
                  {isEditingActiveRecord ? `Editar ${activeDefinition.title}` : activeDefinition.title}
                </h3>
                <p className="mt-1 text-sm text-slate-600">{activeDefinition.description}</p>
              </div>
              {isEditingActiveRecord && (
                <button
                  className="inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:border-teal-300"
                  type="button"
                  onClick={cancelEdit}
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </button>
              )}
            </div>


            {activeDefinition.key === 'jornada' && (
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
                <p className="font-semibold">Revision legal de jornada requerida</p>
                <p className="mt-1">
                  Puedes configurar varias jornadas en la misma empresa y asignarlas luego a cada unidad organizativa: lunes a viernes, martes a sabado u otra distribucion operativa. Antes de aplicarlas, valida que la jornada cumpla limites laborales ecuatorianos y, cuando corresponda por jornada especial, nocturna, rotativa, suplementaria, extraordinaria o distribucion excepcional, obten la autorizacion o registro aplicable ante el Ministerio del Trabajo.
                </p>
              </div>
            )}

            {activeDefinition.customType === 'incomeTaxTable' ? (
              <div className="mt-5">
                <IncomeTaxTableFields
                  values={activeValues}
                  onFieldChange={updateField}
                  onBracketChange={updateBracket}
                  onAddBracket={addBracket}
                  onRemoveBracket={removeBracket}
                />
              </div>
            ) : activeDefinition.customType === 'bankMappingStructure' ? (
              <BankMappingStructureBuilder
                values={activeValues}
                summary={summary}
                onFieldChange={updateField}
                onApplyProfile={applyBankProfileToMapping}
                onGenerate={generateBankMappingStructure}
                isGenerating={generateBankMappingStructureMutation.isPending}
              />
            ) : (
              <>
                <div className="form-grid mt-5">
                  {activeDefinition.fields.map((field) => (
                    <Field
                      key={field.name}
                      field={field}
                      value={activeValues[field.name]}
                      onChange={updateField}
                      options={optionsForField(summary, field)}
                    />
                  ))}
                </div>
                {activeDefinition.key === 'banco' && (
                  <>
                    <BankFlatFileGuide
                      values={activeValues}
                      mappings={mappingsForBank(summary, activeValues.banco_codigo)}
                    />
                    <BankFileOperationPanel
                      values={activeValues}
                      period={bankFilePeriod}
                      onPeriodChange={updateBankFilePeriod}
                      onGenerate={generateBankFile}
                      isGenerating={generateBankFileMutation.isPending}
                      generatedFile={generatedBankFile}
                    />
                  </>
                )}
              </>
            )}

            {activeDefinition.customType !== 'bankMappingStructure' && (
              <button
                className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-60"
                disabled={saveMutation.isPending}
                type="submit"
              >
                {isEditingActiveRecord ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {saveMutation.isPending
                  ? 'Guardando...'
                  : (isEditingActiveRecord
                    ? activeDefinition.updateLabel || (activeDefinition.key === 'banco' ? 'Actualizar estructura bancaria' : 'Actualizar parametro')
                    : activeDefinition.saveLabel || (activeDefinition.key === 'banco' ? 'Guardar estructura bancaria' : 'Guardar parametro'))}
              </button>
            )}
          </form>

          <aside className="rounded-md border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-950">{activeDefinition.recordsTitle || 'Registros vigentes'}</h3>
            <div className="mt-4 space-y-3">
              {activeDefinition.customType === 'bankMappingStructure' ? (
                <BankMappingGroups records={records} />
              ) : records.length === 0 && (
                <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  {activeDefinition.emptyText || 'Aun no hay registros en esta categoria.'}
                </p>
              )}
              {activeDefinition.customType !== 'bankMappingStructure' && records.slice(0, 12).map((record) => (
                <div className="rounded-md bg-slate-50 px-3 py-2" key={record.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{activeDefinition.recordLabel(record, summary)}</p>
                      <p className="mt-1 text-xs text-slate-500">{recordMetaForDefinition(activeDefinition, record, summary)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-teal-700 hover:border-teal-300"
                        type="button"
                        onClick={() => startEdit(activeDefinition, record)}
                        title="Editar registro"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      {pendingDeleteId === record.id ? (
                        <>
                          <button
                            className="inline-flex min-h-8 items-center rounded-md border border-red-200 bg-white px-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                            type="button"
                            disabled={deleteMutation.isPending}
                            onClick={() => confirmDelete(activeDefinition, record)}
                          >
                            Eliminar
                          </button>
                          <button
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                            type="button"
                            onClick={() => setPendingDeleteId('')}
                            title="Cancelar eliminacion"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:border-red-200 hover:text-red-700"
                          type="button"
                          onClick={() => requestDelete(record.id)}
                          title="Eliminar si no tiene consumos"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {activeDefinition.key === 'legal' && (
              <LegalParametersPreview records={legalRecords} />
            )}
            {activeDefinition.customType === 'incomeTaxTable' && (
              <IncomeTaxTablePreview records={records} />
            )}
          </aside>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-950">Avance operativo</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(summary?.onboarding?.steps || []).map((step) => (
            <div className="flex items-center gap-3 rounded-md bg-slate-50 px-4 py-3" key={step.step_code}>
              {step.status === 'completado'
                ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                : <Circle className="h-5 w-5 text-slate-400" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">{step.label}</p>
                <p className="text-xs text-slate-500">{step.status}</p>
              </div>
              {step.status !== 'completado' && stepFormMap[step.step_code] && (
                <button
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-700 hover:border-teal-300"
                  type="button"
                  onClick={() => openStepForm(step.step_code)}
                >
                  Configurar
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Parametrizacion;
