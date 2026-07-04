import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, RefreshCcw, XCircle } from 'lucide-react';
import { authenticatedApi } from '../../services/authenticatedApi';
import { money } from '../../utils/money';

export default function MovilizacionAprobacion() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('pendiente');
  const [drafts, setDrafts] = useState({});

  const informesQuery = useQuery({
    queryKey: ['movilizacion', 'informes', status],
    queryFn: async () => {
      const response = await authenticatedApi.get('/movilizacion/informes', { params: status ? { estado: status } : {} });
      return response.data.informes || [];
    },
  });

  const resolverMutation = useMutation({
    mutationFn: async ({ id, payload }) => authenticatedApi.patch(`/movilizacion/informes/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['movilizacion', 'informes'] }),
  });

  const updateDraft = (id, patch) => {
    setDrafts((current) => ({ ...current, [id]: { ...(current[id] || {}), ...patch } }));
  };

  const resolver = (informe, accion) => {
    const draft = drafts[informe.id] || {};
    resolverMutation.mutate({
      id: informe.id,
      payload: {
        accion,
        anticipo_usd: accion === 'aprobado' ? Number(draft.anticipo_usd ?? informe.total_usd ?? 0) : 0,
        motivo: draft.motivo || '',
      },
    });
  };

  const informes = informesQuery.data || [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Movilización</h1>
        <p className="mt-1 text-sm text-slate-600">
          Revisa los informes enviados desde la app móvil y define el anticipo aprobado para nómina.
        </p>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Estado</span>
            <select
              className="min-h-11 rounded-md border border-slate-300 px-3 text-sm"
              onChange={(event) => setStatus(event.target.value)}
              value={status}
            >
              <option value="pendiente">Pendientes</option>
              <option value="aprobado">Aprobados</option>
              <option value="rechazado">Rechazados</option>
              <option value="">Todos</option>
            </select>
          </label>
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() => informesQuery.refetch()}
            type="button"
          >
            <RefreshCcw className="h-4 w-4" />
            Actualizar
          </button>
        </div>
      </div>

      {informesQuery.isError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          No pudimos cargar los informes de movilización.
        </div>
      )}

      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Trabajador</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Periodo</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Total</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Estado</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Accion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {informes.map((informe) => {
              const draft = drafts[informe.id] || {};
              const detalle = Array.isArray(informe.detalle_json) ? informe.detalle_json : [];
              return (
                <tr key={informe.id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{informe.apellidos} {informe.nombres}</div>
                    <div className="text-xs text-slate-500">{informe.cedula}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{informe.periodo}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{money(informe.total_usd)}</div>
                    <div className="text-xs text-slate-500">{informe.dias} dias · {detalle.length} registros</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{informe.estado}</span>
                  </td>
                  <td className="px-4 py-3">
                    {informe.estado === 'pendiente' ? (
                      <div className="grid gap-2 sm:grid-cols-[120px_1fr_auto_auto]">
                        <input
                          className="min-h-10 rounded-md border border-slate-300 px-3 text-sm"
                          onChange={(event) => updateDraft(informe.id, { anticipo_usd: event.target.value })}
                          placeholder="Anticipo"
                          type="number"
                          value={draft.anticipo_usd ?? informe.total_usd ?? ''}
                        />
                        <input
                          className="min-h-10 rounded-md border border-slate-300 px-3 text-sm"
                          onChange={(event) => updateDraft(informe.id, { motivo: event.target.value })}
                          placeholder="Motivo si rechazas"
                          value={draft.motivo || ''}
                        />
                        <button
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800"
                          disabled={resolverMutation.isPending}
                          onClick={() => resolver(informe, 'aprobado')}
                          type="button"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Aprobar
                        </button>
                        <button
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-red-200 px-3 text-sm font-semibold text-red-700 hover:bg-red-50"
                          disabled={resolverMutation.isPending}
                          onClick={() => resolver(informe, 'rechazado')}
                          type="button"
                        >
                          <XCircle className="h-4 w-4" />
                          Rechazar
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">Resuelto</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {informes.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                  No hay informes para el filtro seleccionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
