import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit3, Save, XCircle } from 'lucide-react';
import { deactivateAdminPlan, fetchAdminPlans, saveAdminPlan } from '../services/beneficiosApi';
import { extractApiError } from '../services/publicApi';

const EMPTY_PLAN = {
  id: '',
  nombre: '',
  descripcion: '',
  precioMensualCentavos: 0,
  empleadosMax: '',
  empresasMax: 1,
  usuariosMax: 3,
  archivosBancarios: false,
  reportesAvanzados: false,
  soporte: 'comunidad',
  publico: true,
  activo: true,
  orden: 0,
};

function normalizeDraft(plan = {}) {
  return {
    ...EMPTY_PLAN,
    id: plan.id || '',
    nombre: plan.nombre || '',
    descripcion: plan.descripcion || '',
    precioMensualCentavos: plan.precioMensualCentavos ?? 0,
    empleadosMax: plan.empleadosMax ?? '',
    empresasMax: plan.empresasMax ?? 1,
    usuariosMax: plan.usuariosMax ?? 3,
    archivosBancarios: Boolean(plan.archivosBancarios),
    reportesAvanzados: Boolean(plan.reportesAvanzados),
    soporte: plan.soporte || 'comunidad',
    publico: plan.publico !== false,
    activo: plan.activo !== false,
    orden: plan.orden ?? 0,
    existing: Boolean(plan.id),
  };
}

function validateDraft(draft) {
  const errors = [];
  if (!/^[A-Z0-9_]{3,40}$/.test(String(draft.id || '').trim().toUpperCase())) {
    errors.push('El ID debe tener 3 a 40 caracteres: letras, numeros o guion bajo.');
  }
  if (!String(draft.nombre || '').trim()) errors.push('El nombre es requerido.');
  if (Number(draft.precioMensualCentavos) < 0) errors.push('El precio no puede ser negativo.');
  if (draft.empleadosMax !== '' && Number(draft.empleadosMax) < 0) errors.push('El limite de empleados no puede ser negativo.');
  if (Number(draft.empresasMax) < 1) errors.push('Debe permitir al menos una empresa.');
  if (Number(draft.usuariosMax) < 1) errors.push('Debe permitir al menos un usuario.');
  return errors;
}

function price(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function PlanesGestion() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(EMPTY_PLAN);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const plansQuery = useQuery({
    queryKey: ['admin-plans'],
    queryFn: fetchAdminPlans,
  });

  const validation = useMemo(() => validateDraft(draft), [draft]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...draft,
        id: String(draft.id).trim().toUpperCase(),
        precioMensualCentavos: Math.round(Number(draft.precioMensualCentavos || 0)),
        empleadosMax: draft.empleadosMax === '' ? null : Math.round(Number(draft.empleadosMax)),
        empresasMax: Math.round(Number(draft.empresasMax || 1)),
        usuariosMax: Math.round(Number(draft.usuariosMax || 1)),
        orden: Math.round(Number(draft.orden || 0)),
      };
      return saveAdminPlan(payload);
    },
    onSuccess: () => {
      setError('');
      setMessage('Plan guardado y catalogo actualizado.');
      setDraft(EMPTY_PLAN);
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
    },
    onError: (err) => {
      setMessage('');
      setError(extractApiError(err, 'No pudimos guardar el plan.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deactivateAdminPlan,
    onSuccess: () => {
      setError('');
      setMessage('Plan desactivado.');
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
    },
    onError: (err) => {
      setMessage('');
      setError(extractApiError(err, 'No pudimos desactivar el plan.'));
    },
  });

  function updateField(name, value) {
    setDraft((current) => ({ ...current, [name]: value }));
  }

  function submit(event) {
    event.preventDefault();
    if (validation.length > 0) {
      setError(validation.join(' '));
      setMessage('');
      return;
    }
    saveMutation.mutate();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-950">Gestion de planes</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Administra el catalogo comercial con validacion previa. Las capacidades guardadas aqui alimentan el
          enforcement backend de Nomina-Ec: archivos bancarios, reportes avanzados y limites operativos.
        </p>
      </section>

      {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={submit}>
          <h2 className="font-semibold text-slate-950">{draft.existing ? 'Editar plan' : 'Nuevo plan'}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="text-sm font-medium text-slate-700">ID</span>
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase disabled:bg-slate-100" disabled={draft.existing} value={draft.id} onChange={(event) => updateField('id', event.target.value.toUpperCase())} />
            </label>
            <label>
              <span className="text-sm font-medium text-slate-700">Nombre</span>
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={draft.nombre} onChange={(event) => updateField('nombre', event.target.value)} />
            </label>
            <label className="sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Descripcion</span>
              <textarea className="mt-1 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={draft.descripcion} onChange={(event) => updateField('descripcion', event.target.value)} />
            </label>
            <label>
              <span className="text-sm font-medium text-slate-700">Precio mensual centavos</span>
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" min="0" value={draft.precioMensualCentavos} onChange={(event) => updateField('precioMensualCentavos', event.target.value)} />
            </label>
            <label>
              <span className="text-sm font-medium text-slate-700">Orden</span>
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" value={draft.orden} onChange={(event) => updateField('orden', event.target.value)} />
            </label>
            <label>
              <span className="text-sm font-medium text-slate-700">Empleados max.</span>
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" min="0" placeholder="Sin limite" value={draft.empleadosMax} onChange={(event) => updateField('empleadosMax', event.target.value)} />
            </label>
            <label>
              <span className="text-sm font-medium text-slate-700">Empresas max.</span>
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" min="1" value={draft.empresasMax} onChange={(event) => updateField('empresasMax', event.target.value)} />
            </label>
            <label>
              <span className="text-sm font-medium text-slate-700">Usuarios max.</span>
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" min="1" value={draft.usuariosMax} onChange={(event) => updateField('usuariosMax', event.target.value)} />
            </label>
            <label>
              <span className="text-sm font-medium text-slate-700">Soporte</span>
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={draft.soporte} onChange={(event) => updateField('soporte', event.target.value)} />
            </label>
            {[
              ['archivosBancarios', 'Archivos bancarios'],
              ['reportesAvanzados', 'Reportes avanzados'],
              ['publico', 'Visible publico'],
              ['activo', 'Activo'],
            ].map(([name, label]) => (
              <label className="flex min-h-11 items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700" key={name}>
                <input type="checkbox" checked={Boolean(draft[name])} onChange={(event) => updateField(name, event.target.checked)} />
                {label}
              </label>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button className="inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={saveMutation.isPending} type="submit">
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? 'Guardando...' : 'Guardar plan'}
            </button>
            {draft.existing && (
              <button className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700" type="button" onClick={() => setDraft(EMPTY_PLAN)}>
                <XCircle className="h-4 w-4" />
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3 text-right">Precio</th>
                  <th className="px-4 py-3">Limites</th>
                  <th className="px-4 py-3">Capacidades</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plansQuery.isLoading ? (
                  <tr><td className="px-4 py-6 text-center" colSpan="6">Cargando...</td></tr>
                ) : (plansQuery.data || []).map((plan) => (
                  <tr key={plan.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-950">{plan.nombre}</p>
                      <p className="text-xs text-slate-500">{plan.id}</p>
                    </td>
                    <td className="px-4 py-3 text-right">{price(plan.precioMensualCentavos)}</td>
                    <td className="px-4 py-3">Emp. {plan.empleadosMax || 'sin limite'} | Empresas {plan.empresasMax} | Usuarios {plan.usuariosMax}</td>
                    <td className="px-4 py-3">
                      {(plan.archivosBancarios ? 'Bancos' : 'Sin bancos')} | {(plan.reportesAvanzados ? 'Reportes avanzados' : 'Reportes base')}
                    </td>
                    <td className="px-4 py-3">{plan.activo ? 'Activo' : 'Inactivo'} | {plan.publico ? 'Publico' : 'Interno'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-teal-700" type="button" onClick={() => setDraft(normalizeDraft(plan))} title="Editar plan">
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 text-red-700 disabled:opacity-50" disabled={deleteMutation.isPending || plan.id === 'TRIAL'} type="button" onClick={() => deleteMutation.mutate(plan.id)} title="Desactivar plan">
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

export default PlanesGestion;
