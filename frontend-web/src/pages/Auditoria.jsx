import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { authenticatedApi } from '../services/authenticatedApi';

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('es-EC');
}

function Auditoria() {
  const [entidad, setEntidad] = useState('');
  const [accion, setAccion] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['auditoria', entidad, accion],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100' });
      if (entidad) params.set('entidad', entidad);
      if (accion) params.set('accion', accion);
      const response = await authenticatedApi.get(`/auditoria?${params.toString()}`);
      return response.data?.auditLogs || [];
    },
    retry: false,
  });

  const logs = data || [];

  return (
    <div className="space-y-6">
      <section className="soft-panel p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-6 w-6 text-teal-700" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">Historial de actividad</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Auditoría de la cuenta</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Consulta acciones importantes, cambios de configuración y movimientos
              registrados para tu empresa.
            </p>
          </div>
        </div>
      </section>

      <section className="soft-panel p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm font-medium text-slate-700">
            Entidad
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              onChange={(event) => setEntidad(event.target.value)}
              placeholder="Ej: empleados"
              value={entidad}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Accion
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              onChange={(event) => setAccion(event.target.value)}
              placeholder="Ej: configuracion.crear"
              value={accion}
            />
          </label>
          <div className="rounded-md bg-slate-50 px-4 py-3">
            <p className="text-sm text-slate-500">Eventos visibles</p>
            <p className="text-2xl font-semibold text-slate-950">{isLoading ? '...' : logs.length}</p>
          </div>
        </div>
      </section>

      {isError && (
        <div className="status-error">
          {error?.response?.data?.message || error?.message || 'No se pudo cargar auditoria.'}
        </div>
      )}

      <section className="soft-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Accion</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Entidad</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">CorrelationId</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr><td className="px-4 py-6 text-center text-sm text-slate-500" colSpan="5">Cargando...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td className="px-4 py-6 text-center text-sm text-slate-500" colSpan="5">No hay eventos de auditoria.</td></tr>
              ) : (
                logs.map((log) => (
                  <tr className="hover:bg-slate-50" key={log.id}>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatDate(log.created_at || log.createdAt)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-950">{log.accion || log.action || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{log.entidad || log.entity || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{log.usuario_id || log.user_id || '-'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{log.correlation_id || log.correlationId || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default Auditoria;
