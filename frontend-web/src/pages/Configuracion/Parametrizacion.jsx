import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CheckCircle2,
  Circle,
  CreditCard,
  Download,
  MapPin,
  Network,
  Plus,
  Scale,
  Settings2,
  ShieldCheck,
  TimerReset,
  Trash2,
  UserCog,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  completeOnboardingStep,
  createConfigurationResource,
  fetchConfigurationSummary,
  loadMandatoryLegalParameters,
} from '../../services/configurationApi';
import { extractApiError } from '../../services/publicApi';

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
    title: 'Parametro laboral',
    description: 'Registra SBU, tasas IESS, tabla IR u otro parametro legal aplicable.',
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
      { name: 'notes', label: 'Notas', type: 'textarea', wide: true },
    ],
    initial: {
      parameter_key: '',
      period_year: new Date().getFullYear(),
      amount: '',
      unit: 'USD',
      source_name: '',
      source_url: '',
      notes: '',
    },
    buildPayload: (values) => ({
      country_code: 'EC',
      region_code: 'NACIONAL',
      period_year: Number(values.period_year),
      parameter_key: values.parameter_key.trim(),
      value: { amount: Number(values.amount) },
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
      { name: 'affects_iess', label: 'Afecta IESS', type: 'checkbox' },
      { name: 'affects_income_tax', label: 'Afecta IR', type: 'checkbox' },
      { name: 'requires_evidence', label: 'Requiere respaldo', type: 'checkbox' },
      { name: 'description', label: 'Descripcion', type: 'textarea', wide: true },
    ],
    initial: {
      code: '',
      name: '',
      category: 'ajuste',
      payroll_impact: 'informativo',
      affects_iess: false,
      affects_income_tax: false,
      requires_evidence: true,
      description: '',
    },
    buildPayload: (values) => ({
      code: values.code.trim().toUpperCase(),
      name: values.name.trim(),
      description: values.description.trim(),
      category: values.category,
      payroll_impact: values.payroll_impact,
      affects_iess: Boolean(values.affects_iess),
      affects_income_tax: Boolean(values.affects_income_tax),
      requires_evidence: Boolean(values.requires_evidence),
      approval_flow: { requiredRoles: ['admin_rrhh', 'owner'] },
      status: 'activo',
    }),
    recordLabel: (record) => record.name,
    recordMeta: (record) => `${record.code} · ${record.payroll_impact}`,
  },
  {
    key: 'organizacion',
    title: 'Unidad organizativa',
    description: 'Crea departamentos, areas, sucursales o centros de costo vinculados a una zona de marcacion.',
    icon: Network,
    resource: 'organizationUnits',
    stepCode: 'organizacion',
    fields: [
      { name: 'code', label: 'Codigo', placeholder: 'VENTAS', required: true },
      { name: 'name', label: 'Nombre', placeholder: 'Ventas', required: true },
      { name: 'unit_type', label: 'Tipo', type: 'select', options: ['departamento', 'area', 'sucursal', 'centro_costo'] },
      { name: 'work_zone_id', label: 'Zona de marcacion', type: 'resourceSelect', resource: 'workZones', required: true },
      { name: 'cost_center_code', label: 'Centro de costo' },
      { name: 'description', label: 'Descripcion', type: 'textarea', wide: true },
    ],
    initial: {
      code: '',
      name: '',
      unit_type: 'departamento',
      work_zone_id: '',
      cost_center_code: '',
      description: '',
    },
    buildPayload: (values) => ({
      code: values.code.trim().toUpperCase(),
      name: values.name.trim(),
      unit_type: values.unit_type,
      work_zone_id: values.work_zone_id,
      cost_center_code: values.cost_center_code.trim(),
      description: values.description.trim(),
      status: 'activo',
    }),
    recordLabel: (record) => record.name,
    recordMeta: (record) => `${record.code} · ${record.unit_type}`,
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
    description: 'Configura horarios, tolerancias y horas semanales de trabajo.',
    icon: TimerReset,
    resource: 'workShifts',
    stepCode: 'jornadas',
    fields: [
      { name: 'code', label: 'Codigo', placeholder: 'ORDINARIA_8H', required: true },
      { name: 'name', label: 'Nombre', placeholder: 'Ordinaria 8 horas', required: true },
      { name: 'shift_type', label: 'Tipo', type: 'select', options: ['ordinaria', 'rotativa', 'nocturna', 'parcial'] },
      { name: 'weekly_hours', label: 'Horas semanales', type: 'number', step: '0.5', required: true },
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
      status: 'activo',
    }),
    recordLabel: (record) => record.name,
    recordMeta: (record) => `${record.start_time}-${record.end_time} · ${record.weekly_hours} h/sem`,
  },
  {
    key: 'banco',
    title: 'Banco y archivo plano',
    description: 'Configura el banco y el formato base para generar archivos de pago de nomina.',
    icon: CreditCard,
    resource: 'bankProfiles',
    stepCode: 'bancos',
    fields: [
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
    buildPayload: (values) => ({
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
    }),
    recordLabel: (record) => record.banco_nombre,
    recordMeta: (record) => `${record.banco_codigo} - ${record.encoding || 'utf8'} - ${record.delimiter || ';'}`,
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

function countResources(summary, key) {
  return summary?.resources?.[key]?.length || 0;
}

function countCatalog(summary, catalogType) {
  return (summary?.resources?.catalogs || []).filter((record) => record.catalog_type === catalogType).length;
}

function recordsForDefinition(summary, definition) {
  const records = summary?.resources?.[definition.resource] || [];
  if (definition.key === 'legal') {
    return records.filter((record) => record.parameter_key !== 'income_tax_table');
  }
  if (definition.key === 'ir') {
    return records.filter((record) => record.parameter_key === 'income_tax_table');
  }
  if (!definition.catalogType) return records;
  return records.filter((record) => record.catalog_type === definition.catalogType);
}

function optionsForField(summary, field) {
  if (field.type !== 'resourceSelect') return [];
  return (summary?.resources?.[field.resource] || []).filter((record) => record.status !== 'inactivo');
}

function recordMetaForDefinition(definition, record, summary) {
  if (definition.key === 'organizacion') {
    const zone = (summary?.resources?.workZones || []).find((item) => item.id === record.work_zone_id);
    return `${record.code} - ${record.unit_type} - zona: ${zone?.name || 'sin zona'}`;
  }

  return definition.recordMeta(record, summary);
}

const stepFormMap = {
  empresa: 'empresa',
  legal: 'ir',
  organizacion: 'organizacion',
  jornadas: 'jornada',
  zonas: 'zona',
  novedades: 'novedad',
  bancos: 'banco',
  usuarios: 'usuarios',
};

function configurationLoadMessage(err) {
  return extractApiError(err, 'No pudimos cargar tu configuracion. Actualiza la pagina en unos segundos.');
}

function buildInitialState() {
  return Object.fromEntries(formDefinitions.map((definition) => [definition.key, definition.initial]));
}

function Field({ field, value, onChange, options = [] }) {
  const baseClass = 'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100';

  if (field.type === 'textarea') {
    return (
      <label className={field.wide ? 'md:col-span-2' : ''}>
        <span className="text-sm font-medium text-slate-700">{field.label}</span>
        <textarea
          className={`${baseClass} min-h-20`}
          value={value}
          onChange={(event) => onChange(field.name, event.target.value)}
          placeholder={field.placeholder}
        />
      </label>
    );
  }

  if (field.type === 'select') {
    return (
      <label>
        <span className="text-sm font-medium text-slate-700">{field.label}</span>
        <select className={baseClass} value={value} onChange={(event) => onChange(field.name, event.target.value)}>
          {field.options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === 'resourceSelect') {
    return (
      <label>
        <span className="text-sm font-medium text-slate-700">{field.label}</span>
        <select
          className={baseClass}
          value={value}
          onChange={(event) => onChange(field.name, event.target.value)}
          required={field.required}
          disabled={options.length === 0}
        >
          <option value="">{options.length === 0 ? 'Primero crea una zona de marcacion' : 'Selecciona una zona'}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>{option.name} ({option.code})</option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <label className="flex min-h-[70px] items-center gap-3 rounded-md border border-slate-200 px-3 py-2">
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
    <label>
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

function IncomeTaxTableFields({ values, onFieldChange, onBracketChange, onAddBracket, onRemoveBracket }) {
  const inputClass = 'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100';

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <span className="text-sm font-medium text-slate-700">Anio fiscal</span>
          <input
            className={inputClass}
            type="number"
            value={values.period_year}
            onChange={(event) => onFieldChange('period_year', event.target.value)}
            required
          />
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">Fuente oficial</span>
          <input
            className={inputClass}
            value={values.source_name}
            onChange={(event) => onFieldChange('source_name', event.target.value)}
            placeholder="SRI"
          />
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">URL de respaldo</span>
          <input
            className={inputClass}
            type="url"
            value={values.source_url}
            onChange={(event) => onFieldChange('source_url', event.target.value)}
            placeholder="https://www.sri.gob.ec/..."
          />
        </label>
        <label>
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
          className={`${inputClass} min-h-20`}
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
  const [activeForm, setActiveForm] = useState(formDefinitions[0].key);
  const [forms, setForms] = useState(buildInitialState);
  const [mandatoryYear, setMandatoryYear] = useState(new Date().getFullYear());
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const {
    data: summary,
    error: summaryError,
    isError: summaryHasError,
    isLoading,
  } = useQuery({
    queryKey: ['configuration-summary'],
    queryFn: () => fetchConfigurationSummary(token),
    enabled: Boolean(token),
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: async ({ definition, values }) => {
      const payload = definition.buildPayload(values);
      const record = await createConfigurationResource(token, definition.resource, payload);
      await completeOnboardingStep(token, definition.stepCode, {
        notes: `${definition.title} creado desde parametrizacion.`,
        evidence: { recordId: record.id, resource: definition.resource },
      });
      return { record, definition };
    },
    onSuccess: ({ definition }) => {
      setError('');
      setMessage(`${definition.title} guardado. Puedes ingresar otro registro cuando lo necesites.`);
      setForms((current) => ({ ...current, [definition.key]: definition.initial }));
      queryClient.invalidateQueries({ queryKey: ['configuration-summary'] });
    },
    onError: (err) => {
      setMessage('');
      setError(extractApiError(err, 'No pudimos guardar la parametrizacion. Revisa los datos e intenta nuevamente.'));
    },
  });

  const loadMandatoryMutation = useMutation({
    mutationFn: () => loadMandatoryLegalParameters(token, mandatoryYear),
    onSuccess: (data) => {
      setError('');
      setMessage(`Parametros legales vigentes para ${data.periodYear} actualizados: ${data.count}.`);
      setActiveForm('ir');
      queryClient.invalidateQueries({ queryKey: ['configuration-summary'] });
    },
    onError: (err) => {
      setMessage('');
      setError(extractApiError(err, 'No pudimos cargar los parametros legales obligatorios.'));
    },
  });

  const activeDefinition = formDefinitions.find((definition) => definition.key === activeForm) || formDefinitions[0];
  const activeValues = forms[activeDefinition.key];
  const completion = summary?.onboarding?.completionPercent || 0;
  const records = recordsForDefinition(summary, activeDefinition);
  const legalRecords = summary?.resources?.legalParameters || [];

  const metrics = useMemo(() => ([
    ['Datos de empresa', countCatalog(summary, 'empresa_operativa')],
    ['Parametros legales', countResources(summary, 'legalParameters')],
    ['Novedades', countResources(summary, 'noveltyTypes')],
    ['Organizacion', countResources(summary, 'organizationUnits')],
    ['Zonas', countResources(summary, 'workZones')],
    ['Jornadas', countResources(summary, 'workShifts')],
    ['Bancos', countResources(summary, 'bankProfiles')],
    ['Usuarios y roles', countCatalog(summary, 'usuarios_roles')],
  ]), [summary]);

  function updateField(name, value) {
    setForms((current) => ({
      ...current,
      [activeDefinition.key]: {
        ...current[activeDefinition.key],
        [name]: value,
      },
    }));
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
    createMutation.mutate({ definition: activeDefinition, values: activeValues });
  }

  function openStepForm(stepCode) {
    const formKey = stepFormMap[stepCode];
    if (formKey) setActiveForm(formKey);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map(([label, value]) => (
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={label}>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{isLoading && !summaryHasError ? '...' : value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-lg border border-teal-200 bg-teal-50 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-teal-950">Carga legal obligatoria</h2>
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
              {loadMandatoryMutation.isPending ? 'Cargando...' : 'Cargar parametros obligatorios'}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Settings2 className="h-6 w-6 text-teal-700" />
            <h2 className="text-lg font-semibold text-slate-950">Nuevo parametro</h2>
          </div>
          <p className="text-sm text-slate-500">Selecciona una categoria y completa los campos requeridos.</p>
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
                onClick={() => setActiveForm(definition.key)}
              >
                <Icon className="h-4 w-4" />
                {definition.title}
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <form className="rounded-md border border-slate-200 p-4" onSubmit={submitForm}>
            <div>
              <h3 className="font-semibold text-slate-950">{activeDefinition.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{activeDefinition.description}</p>
            </div>

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
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
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
            )}

            <button
              className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-60"
              disabled={createMutation.isPending}
              type="submit"
            >
              <Plus className="h-4 w-4" />
              {createMutation.isPending ? 'Guardando...' : 'Guardar parametro'}
            </button>
          </form>

          <aside className="rounded-md border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-950">Registros vigentes</h3>
            <div className="mt-4 space-y-3">
              {records.length === 0 && (
                <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  Aun no hay registros en esta categoria.
                </p>
              )}
              {records.slice(0, 6).map((record) => (
                <div className="rounded-md bg-slate-50 px-3 py-2" key={record.id}>
                  <p className="text-sm font-semibold text-slate-900">{activeDefinition.recordLabel(record)}</p>
                  <p className="mt-1 text-xs text-slate-500">{recordMetaForDefinition(activeDefinition, record, summary)}</p>
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

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
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
