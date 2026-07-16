import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, FileText, Save, Settings2 } from 'lucide-react';
import CompactNotice from '../../components/UI/CompactNotice';
import { authenticatedApi } from '../../services/authenticatedApi';

const PARAMETER_LABELS = {
  'contract.serviceDescription': 'Descripción del servicio',
  'contract.estimatedDuration': 'Duración estimada',
  'contract.workCity': 'Ciudad de prestación',
  'contract.workProvince': 'Provincia de prestación',
  'contract.workAddress': 'Dirección de prestación',
};

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback;
}

function buildDrafts(templates) {
  return Object.fromEntries((templates || []).map((template) => [template.templateKey, {
    enabled: template.enabled !== false,
    isDefault: Boolean(template.isDefault),
    sortOrder: template.sortOrder || 999,
    parameterValues: { ...(template.parameterValues || {}) },
  }]));
}

function PlantillasContrato() {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const templatesQuery = useQuery({
    queryKey: ['contrato-templates', 'configuracion'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/documentos/contrato/plantillas/configuracion');
      return response.data.templates || [];
    },
    retry: false,
  });

  useEffect(() => {
    if (templatesQuery.data) setDrafts(buildDrafts(templatesQuery.data));
  }, [templatesQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async ({ template, draft }) => {
      const response = await authenticatedApi.put(`/documentos/contrato/plantillas/${template.templateKey}`, {
        enabled: draft.enabled,
        isDefault: draft.isDefault,
        sortOrder: Number(draft.sortOrder || 999),
        parameterValues: draft.parameterValues,
      });
      return response.data.template;
    },
    onSuccess: (saved) => {
      setMessage(`Configuración guardada para ${saved.displayName || saved.templateKey}.`);
      setError('');
      queryClient.invalidateQueries({ queryKey: ['contrato-templates'] });
      queryClient.invalidateQueries({ queryKey: ['contrato-templates', 'configuracion'] });
    },
    onError: (requestError) => {
      setError(getErrorMessage(requestError, 'No pudimos guardar la configuración de la plantilla.'));
      setMessage('');
    },
  });

  const updateDraft = (templateKey, changes) => {
    setDrafts((current) => ({
      ...current,
      [templateKey]: { ...current[templateKey], ...changes },
    }));
  };

  const updateParameter = (templateKey, path, value) => {
    const draft = drafts[templateKey] || {};
    updateDraft(templateKey, {
      parameterValues: { ...(draft.parameterValues || {}), [path]: value },
    });
  };

  const moveTemplate = (template, direction) => {
    const draft = drafts[template.templateKey] || {};
    updateDraft(template.templateKey, {
      sortOrder: Math.max(1, Number(draft.sortOrder || template.sortOrder || 999) + direction),
    });
  };

  if (templatesQuery.isLoading) {
    return <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600">Cargando plantillas de contrato...</div>;
  }

  if (templatesQuery.isError) {
    return (
      <CompactNotice tone="red" title="No se pudo cargar la configuración">
        {getErrorMessage(templatesQuery.error, 'Revisa permisos y conexión con el servidor.')}
      </CompactNotice>
    );
  }

  const templates = templatesQuery.data || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">Parametrización</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Plantillas de contrato</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Activa solo los modelos requeridos por la empresa. Las definiciones se comparten y los contratos emitidos conservan su evidencia histórica.</p>
        </div>
        <Link className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:border-teal-300" to="/dashboard/documentos/contratos"><FileText className="h-4 w-4" /> Ver contratos</Link>
      </div>

      <CompactNotice tone="amber" title="Control legal">Los parámetros con impacto laboral requieren revisión antes de firmar. Desactivar una fuente no elimina contratos históricos ni sus archivos.</CompactNotice>
      {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      {templates.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600">No existen fuentes de contrato disponibles.</div>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => {
            const draft = drafts[template.templateKey] || buildDrafts([template])[template.templateKey];
            const parameterSchema = template.parameterSchema || [];
            return (
              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={template.templateKey}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-teal-700" /><h2 className="font-semibold text-slate-950">{template.displayName || template.templateKey}</h2><span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">v{template.version}</span></div>
                    <p className="mt-1 text-sm text-slate-600">{template.description || 'Plantilla legal versionada.'}</p>
                    <p className="mt-1 text-xs text-slate-500">Clave: {template.templateKey} · Tipo: {template.contractType}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="rounded border border-slate-200 p-2 text-slate-600 hover:border-teal-300" onClick={() => moveTemplate(template, -1)} title="Subir orden" type="button"><ArrowUp className="h-4 w-4" /></button>
                    <button className="rounded border border-slate-200 p-2 text-slate-600 hover:border-teal-300" onClick={() => moveTemplate(template, 1)} title="Bajar orden" type="button"><ArrowDown className="h-4 w-4" /></button>
                    <button className="inline-flex min-h-9 items-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-300" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate({ template, draft })} type="button"><Save className="h-4 w-4" /> Guardar</button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"><input checked={draft.enabled} onChange={(event) => updateDraft(template.templateKey, { enabled: event.target.checked, isDefault: event.target.checked ? draft.isDefault : false })} type="checkbox" /> Disponible para nuevos contratos</label>
                  <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"><input checked={draft.isDefault} onChange={(event) => updateDraft(template.templateKey, { isDefault: event.target.checked, enabled: event.target.checked ? true : draft.enabled })} type="checkbox" /> Plantilla predeterminada</label>
                  <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">Orden <input className="w-20 rounded border border-slate-300 px-2 py-1" min="1" onChange={(event) => updateDraft(template.templateKey, { sortOrder: event.target.value })} type="number" value={draft.sortOrder} /></label>
                </div>

                {parameterSchema.length > 0 && (
                  <div className="mt-4 rounded-md border border-slate-100 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-800">Parámetros de esta plantilla</p>
                    <p className="mt-1 text-xs text-slate-500">Solo se aceptan campos declarados por el backend; se guardan como referencia para nuevas emisiones.</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {parameterSchema.map((parameter) => (
                        <label className="block text-sm text-slate-700" key={parameter.path}>{PARAMETER_LABELS[parameter.path] || parameter.label || parameter.path}<input className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" maxLength={parameter.maxLength} onChange={(event) => updateParameter(template.templateKey, parameter.path, event.target.value)} value={draft.parameterValues?.[parameter.path] || ''} /></label>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PlantillasContrato;
