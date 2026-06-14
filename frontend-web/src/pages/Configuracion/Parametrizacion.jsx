import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Circle,
  MapPin,
  Network,
  Plus,
  Scale,
  Settings2,
  ShieldCheck,
  TimerReset,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { completeOnboardingStep, createConfigurationResource, fetchConfigurationSummary } from '../../services/configurationApi';
import { extractApiError } from '../../services/publicApi';

const formDefinitions = [
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
    description: 'Crea departamentos, areas, sucursales o centros de costo.',
    icon: Network,
    resource: 'organizationUnits',
    stepCode: 'organizacion',
    fields: [
      { name: 'code', label: 'Codigo', placeholder: 'VENTAS', required: true },
      { name: 'name', label: 'Nombre', placeholder: 'Ventas', required: true },
      { name: 'unit_type', label: 'Tipo', type: 'select', options: ['departamento', 'area', 'sucursal', 'centro_costo'] },
      { name: 'cost_center_code', label: 'Centro de costo' },
      { name: 'description', label: 'Descripcion', type: 'textarea', wide: true },
    ],
    initial: {
      code: '',
      name: '',
      unit_type: 'departamento',
      cost_center_code: '',
      description: '',
    },
    buildPayload: (values) => ({
      code: values.code.trim().toUpperCase(),
      name: values.name.trim(),
      unit_type: values.unit_type,
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
];

function countResources(summary, key) {
  return summary?.resources?.[key]?.length || 0;
}

function configurationLoadMessage(err) {
  return extractApiError(err, 'No pudimos cargar tu configuracion. Actualiza la pagina en unos segundos.');
}

function buildInitialState() {
  return Object.fromEntries(formDefinitions.map((definition) => [definition.key, definition.initial]));
}

function Field({ field, value, onChange }) {
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

function Parametrizacion() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [activeForm, setActiveForm] = useState(formDefinitions[0].key);
  const [forms, setForms] = useState(buildInitialState);
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

  const activeDefinition = formDefinitions.find((definition) => definition.key === activeForm) || formDefinitions[0];
  const activeValues = forms[activeDefinition.key];
  const completion = summary?.onboarding?.completionPercent || 0;
  const records = summary?.resources?.[activeDefinition.resource] || [];

  const metrics = useMemo(() => ([
    ['Parametros legales', countResources(summary, 'legalParameters')],
    ['Novedades', countResources(summary, 'noveltyTypes')],
    ['Organizacion', countResources(summary, 'organizationUnits')],
    ['Zonas', countResources(summary, 'workZones')],
    ['Jornadas', countResources(summary, 'workShifts')],
    ['Bancos', countResources(summary, 'bankProfiles')],
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

  function submitForm(event) {
    event.preventDefault();
    createMutation.mutate({ definition: activeDefinition, values: activeValues });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">Configuracion de la empresa</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Parametriza la nomina con datos visibles</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Ingresa parametros laborales, novedades, estructura, zonas y jornadas. Cada registro queda guardado
              como configuracion revisable antes de usarlo en calculos productivos.
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

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {activeDefinition.fields.map((field) => (
                <Field
                  key={field.name}
                  field={field}
                  value={activeValues[field.name]}
                  onChange={updateField}
                />
              ))}
            </div>

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
            <h3 className="font-semibold text-slate-950">Registros existentes</h3>
            <div className="mt-4 space-y-3">
              {records.length === 0 && (
                <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  Aun no hay registros en esta categoria.
                </p>
              )}
              {records.slice(0, 6).map((record) => (
                <div className="rounded-md bg-slate-50 px-3 py-2" key={record.id}>
                  <p className="text-sm font-semibold text-slate-900">{activeDefinition.recordLabel(record)}</p>
                  <p className="mt-1 text-xs text-slate-500">{activeDefinition.recordMeta(record)}</p>
                </div>
              ))}
            </div>
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
              <div>
                <p className="text-sm font-medium text-slate-900">{step.label}</p>
                <p className="text-xs text-slate-500">{step.status}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Parametrizacion;
