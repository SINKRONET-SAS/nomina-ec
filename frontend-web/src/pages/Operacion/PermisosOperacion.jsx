import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarCheck2, CheckCircle2, Paperclip, RefreshCcw, XCircle } from 'lucide-react';
import { authenticatedApi } from '../../services/authenticatedApi';
import { formatDateEC } from '../../utils/dateFormat';

const PERMISSION_TYPES = ['permiso_con_sueldo', 'permiso_sin_sueldo'];

function formatHours(minutes) {
  const value = Number(minutes || 0);
  return `${(Math.round((value / 60) * 100) / 100).toFixed(2)} h`;
}

function formatPermissionType(type) {
  if (type === 'permiso_con_sueldo') return 'Permiso con sueldo';
  if (type === 'permiso_sin_sueldo') return 'Permiso sin sueldo';
  return String(type || '').replace(/_/g, ' ');
}

function sortByDateDesc(items) {
  return [...items].sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
}

function soporteMedico(permiso) {
  const soporte = permiso?.metadata?.soporteMedico;
  return soporte && typeof soporte === 'object' ? soporte : null;
}

export default function PermisosOperacion() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('pendiente');
  const [drafts, setDrafts] = useState({});

  const permisosQuery = useQuery({
    queryKey: ['operacion', 'permisos', status],
    queryFn: async () => {
      const responses = await Promise.all(
        PERMISSION_TYPES.map((tipo) => authenticatedApi.get('/novedades', {
          params: {
            tipo,
            ...(status ? { estado: status } : {}),
          },
        }))
      );
      return sortByDateDesc(responses.flatMap((response) => response.data.novedades || []));
    },
  });

  const aprobarMutation = useMutation({
    mutationFn: (id) => authenticatedApi.put(`/novedades/${id}/aprobar`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['operacion', 'permisos'] }),
  });

  const rechazarMutation = useMutation({
    mutationFn: ({ id, motivo }) => authenticatedApi.put(`/novedades/${id}/rechazar`, { motivo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['operacion', 'permisos'] }),
  });

  const updateDraft = (id, value) => {
    setDrafts((current) => ({ ...current, [id]: value }));
  };

  const permisos = permisosQuery.data || [];
  const isResolving = aprobarMutation.isPending || rechazarMutation.isPending;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">Operación móvil</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Permisos</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Revisa las solicitudes enviadas desde la app móvil y aprueba o rechaza permisos con sueldo
            o sin sueldo antes del cálculo de nómina.
          </p>
        </div>
        <div className="rounded-md border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-900">
          <div className="flex items-center gap-2 font-semibold">
            <CalendarCheck2 className="h-4 w-4" />
            Solicitudes desde la app
          </div>
          <p className="mt-1 text-xs text-teal-800">La resolución queda como novedad trazable del trabajador.</p>
        </div>
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
            onClick={() => permisosQuery.refetch()}
            type="button"
          >
            <RefreshCcw className="h-4 w-4" />
            Actualizar
          </button>
        </div>
      </div>

      {permisosQuery.isError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          No pudimos cargar las solicitudes de permisos.
        </div>
      )}

      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Trabajador</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Fecha</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Tipo</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Tiempo</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Motivo</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Soporte</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Estado</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {permisos.map((permiso) => {
              const soporte = soporteMedico(permiso);
              return (
              <tr key={permiso.id} className="align-top">
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900">{permiso.apellidos} {permiso.nombres}</div>
                  <div className="text-xs text-slate-500">{permiso.cedula}</div>
                </td>
                <td className="px-4 py-3 text-slate-700">{formatDateEC(permiso.fecha)}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800">
                    {formatPermissionType(permiso.tipo_novedad)}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">{formatHours(permiso.minutos)}</td>
                <td className="max-w-xs px-4 py-3 text-slate-600">{permiso.justificacion || 'Sin detalle registrado.'}</td>
                <td className="px-4 py-3">
                  {soporte?.url ? (
                    <a
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                      href={soporte.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      Revisar
                    </a>
                  ) : (
                    <span className="text-xs text-slate-500">Sin soporte</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{permiso.estado}</span>
                </td>
                <td className="px-4 py-3">
                  {permiso.estado === 'pendiente' ? (
                    <div className="grid min-w-[360px] gap-2 lg:grid-cols-[1fr_auto_auto]">
                      <input
                        className="min-h-10 rounded-md border border-slate-300 px-3 text-sm"
                        onChange={(event) => updateDraft(permiso.id, event.target.value)}
                        placeholder="Motivo si rechazas"
                        value={drafts[permiso.id] || ''}
                      />
                      <button
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
                        disabled={isResolving}
                        onClick={() => aprobarMutation.mutate(permiso.id)}
                        type="button"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Aprobar
                      </button>
                      <button
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-red-200 px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                        disabled={isResolving}
                        onClick={() => rechazarMutation.mutate({ id: permiso.id, motivo: drafts[permiso.id] || 'Rechazado por RRHH' })}
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
            {permisosQuery.isLoading && (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={8}>Cargando permisos...</td>
              </tr>
            )}
            {!permisosQuery.isLoading && permisos.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={8}>
                  No hay solicitudes de permisos para el filtro seleccionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
