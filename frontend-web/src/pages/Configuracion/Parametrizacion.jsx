import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Circle, MapPin, Network, Scale, Settings2, ShieldCheck, TimerReset } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { completeOnboardingStep, createConfigurationResource, fetchConfigurationSummary } from '../../services/configurationApi';
import { extractApiError } from '../../services/publicApi';

const quickForms = [
  {
    key: 'legal',
    title: 'Parámetro laboral',
    icon: Scale,
    resource: 'legalParameters',
    stepCode: 'legal',
    payload: {
      period_year: 2026,
      parameter_key: 'sbu',
      value: { amount: null, pendingInput: true },
      unit: 'USD',
      validation_status: 'pendiente_validacion_oficial',
      source_name: 'Pendiente de aprobación legal y contable',
      notes: 'Plantilla inicial sin monto prellenado. El responsable debe ingresar valor, fuente y evidencia antes de usarla en cálculos productivos.',
    },
  },
  {
    key: 'novedad',
    title: 'Tipo de novedad',
    icon: ShieldCheck,
    resource: 'noveltyTypes',
    stepCode: 'novedades',
    payload: {
      code: 'PERMISO_REMUNERADO',
      name: 'Permiso remunerado',
      category: 'permiso',
      payroll_impact: 'informativo',
      affects_iess: false,
      affects_income_tax: false,
      requires_evidence: true,
      approval_flow: { requiredRoles: ['admin_rrhh', 'owner'] },
      status: 'activo',
    },
  },
  {
    key: 'organizacion',
    title: 'Unidad organizativa',
    icon: Network,
    resource: 'organizationUnits',
    stepCode: 'organizacion',
    payload: {
      unit_type: 'departamento',
      code: 'RRHH',
      name: 'Recursos Humanos',
      cost_center_code: 'CC-RRHH',
      status: 'activo',
    },
  },
  {
    key: 'zona',
    title: 'Zona de marcación',
    icon: MapPin,
    resource: 'workZones',
    stepCode: 'zonas',
    payload: {
      code: 'MATRIZ',
      name: 'Matriz',
      latitude: -0.180653,
      longitude: -78.467834,
      radius_meters: 100,
      min_accuracy_meters: 50,
      requires_photo: true,
      status: 'activo',
    },
  },
  {
    key: 'jornada',
    title: 'Jornada base',
    icon: TimerReset,
    resource: 'workShifts',
    stepCode: 'jornadas',
    payload: {
      code: 'ORDINARIA_8H',
      name: 'Ordinaria 8 horas',
      shift_type: 'ordinaria',
      weekly_hours: 40,
      start_time: '08:00',
      end_time: '17:00',
      break_minutes: 60,
      tolerance_minutes: 10,
      status: 'activo',
    },
  },
];

function countResources(summary, key) {
  return summary?.resources?.[key]?.length || 0;
}

function configurationLoadMessage(err) {
  return extractApiError(err, 'No pudimos cargar tu configuración. Actualiza la página en unos segundos.');
}

function Parametrizacion() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
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
    mutationFn: async ({ resource, payload, stepCode, title }) => {
      const record = await createConfigurationResource(token, resource, payload);
      await completeOnboardingStep(token, stepCode, {
        notes: `${title} creado desde configuración inicial.`,
        evidence: { recordId: record.id, resource },
      });
      return record;
    },
    onSuccess: () => {
      setError('');
      setMessage('Listo. La configuración quedó guardada.');
      queryClient.invalidateQueries({ queryKey: ['configuration-summary'] });
    },
    onError: (err) => {
      setMessage('');
      setError(extractApiError(err, 'No pudimos guardar la configuración. Revisa los datos e intenta nuevamente.'));
    },
  });

  const completion = summary?.onboarding?.completionPercent || 0;
  const metrics = useMemo(() => ([
    ['Parámetros legales', countResources(summary, 'legalParameters')],
    ['Novedades', countResources(summary, 'noveltyTypes')],
    ['Organización', countResources(summary, 'organizationUnits')],
    ['Zonas', countResources(summary, 'workZones')],
    ['Jornadas', countResources(summary, 'workShifts')],
    ['Bancos', countResources(summary, 'bankProfiles')],
  ]), [summary]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">Configuración de la empresa</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Deja lista la nómina para operar</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Configura parámetros laborales, novedades, estructura, zonas, jornadas y bancos antes
              de calcular roles o cerrar un periodo.
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
        <div className="mb-5 flex items-center gap-3">
          <Settings2 className="h-6 w-6 text-teal-700" />
          <h2 className="text-lg font-semibold text-slate-950">Bases para empezar</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {quickForms.map((item) => (
            <article className="rounded-md border border-slate-200 p-4" key={item.key}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">Crea un registro inicial revisable antes de usarlo en producción.</p>
                </div>
                <item.icon className="h-5 w-5 text-teal-700" />
              </div>
              <button
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-60"
                disabled={createMutation.isPending}
                onClick={() => createMutation.mutate(item)}
              >
                {createMutation.isPending ? 'Guardando...' : 'Crear registro inicial'}
              </button>
            </article>
          ))}
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
