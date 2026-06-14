import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Plus } from 'lucide-react';
import { operationalModules, emptyOperationalForm } from '../../config/operationalModules';
import { useAuth } from '../../context/AuthContext';
import { createConfigurationResource, fetchConfigurationSummary } from '../../services/configurationApi';
import { extractApiError } from '../../services/publicApi';

function Field({ field, value, onChange }) {
  const className = 'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100';

  if (field.type === 'textarea') {
    return (
      <label className="md:col-span-2">
        <span className="text-sm font-medium text-slate-700">{field.label}</span>
        <textarea className={`${className} min-h-20`} value={value} onChange={(event) => onChange(field.name, event.target.value)} placeholder={field.placeholder} />
      </label>
    );
  }

  if (field.type === 'select') {
    return (
      <label>
        <span className="text-sm font-medium text-slate-700">{field.label}</span>
        <select className={className} value={value} onChange={(event) => onChange(field.name, event.target.value)}>
          {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <label className="flex min-h-[70px] items-center gap-3 rounded-md border border-slate-200 px-3 py-2">
        <input className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700" type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(field.name, event.target.checked)} />
        <span className="text-sm font-medium text-slate-700">{field.label}</span>
      </label>
    );
  }

  return (
    <label>
      <span className="text-sm font-medium text-slate-700">{field.label}</span>
      <input className={className} type={field.type || 'text'} value={value} onChange={(event) => onChange(field.name, event.target.value)} placeholder={field.placeholder} required={field.required} />
    </label>
  );
}

function buildInitialForms() {
  return Object.fromEntries(operationalModules.map((module) => [module.key, emptyOperationalForm(module)]));
}

function recordsForModule(summary, moduleKey) {
  return (summary?.resources?.catalogs || []).filter((record) => record.catalog_type === moduleKey);
}

function OperacionIntegral() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [activeKey, setActiveKey] = useState(operationalModules[0].key);
  const [forms, setForms] = useState(buildInitialForms);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const activeModule = operationalModules.find((module) => module.key === activeKey) || operationalModules[0];

  const { data: summary, isLoading } = useQuery({
    queryKey: ['configuration-summary'],
    queryFn: () => fetchConfigurationSummary(token),
    enabled: Boolean(token),
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: async ({ module, values }) => createConfigurationResource(token, 'catalogs', {
      catalog_type: module.key,
      code: (values[module.fields[0].name] || module.key).toString().trim().toUpperCase().replace(/\s+/g, '_'),
      name: (values[module.fields[1]?.name] || module.title).toString().trim(),
      description: module.description,
      status: 'activo',
      payload: values,
    }),
    onSuccess: (_, { module }) => {
      setMessage(`${module.title} guardado y visible para operacion.`);
      setError('');
      setForms((current) => ({ ...current, [module.key]: emptyOperationalForm(module) }));
      queryClient.invalidateQueries({ queryKey: ['configuration-summary'] });
    },
    onError: (err) => {
      setMessage('');
      setError(extractApiError(err, 'No pudimos guardar esta configuracion operativa.'));
    },
  });

  const moduleStats = useMemo(() => operationalModules.map((module) => ({
    ...module,
    count: recordsForModule(summary, module.key).length,
  })), [summary]);

  const records = recordsForModule(summary, activeModule.key);

  function updateField(name, value) {
    setForms((current) => ({
      ...current,
      [activeModule.key]: {
        ...current[activeModule.key],
        [name]: value,
      },
    }));
  }

  function submit(event) {
    event.preventDefault();
    createMutation.mutate({ module: activeModule, values: forms[activeModule.key] });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">ONI26 funcional</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Centro de operacion integral</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
          Cada modulo del plan tiene una accion persistente. Los registros quedan por tenant en configuracion,
          visibles para operar, revisar o completar implementacion runtime.
        </p>
      </section>

      {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</div>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</div>}

      <section className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-slate-950">Modulos del plan</h2>
          <div className="mt-4 space-y-2">
            {moduleStats.map((module) => {
              const Icon = module.icon;
              const active = module.key === activeModule.key;
              return (
                <button
                  className={`flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm ${active ? 'border-teal-700 bg-teal-50 text-teal-900' : 'border-slate-200 text-slate-700 hover:border-teal-300'}`}
                  key={module.key}
                  type="button"
                  onClick={() => setActiveKey(module.key)}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate font-medium">{module.title}</span>
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">{isLoading ? '...' : module.count}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="rounded-md bg-teal-50 p-2 text-teal-700">
                <activeModule.icon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-950">{activeModule.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{activeModule.description}</p>
              </div>
            </div>

            <form className="mt-6" onSubmit={submit}>
              <div className="grid gap-4 md:grid-cols-2">
                {activeModule.fields.map((field) => (
                  <Field key={field.name} field={field} value={forms[activeModule.key][field.name]} onChange={updateField} />
                ))}
              </div>
              <button className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-60" type="submit" disabled={createMutation.isPending}>
                <Plus className="h-4 w-4" />
                {createMutation.isPending ? 'Guardando...' : 'Guardar configuracion'}
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-teal-700" />
              <h2 className="text-lg font-semibold text-slate-950">Registros guardados</h2>
            </div>
            {records.length === 0 ? (
              <p className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-600">Aun no hay registros para este modulo.</p>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {records.map((record) => (
                  <article className="rounded-md border border-slate-200 p-4" key={record.id}>
                    <p className="font-semibold text-slate-950">{record.name}</p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{record.code}</p>
                    <pre className="mt-3 max-h-40 overflow-auto rounded-md bg-slate-50 p-3 text-xs text-slate-700">{JSON.stringify(record.payload || {}, null, 2)}</pre>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

export default OperacionIntegral;
