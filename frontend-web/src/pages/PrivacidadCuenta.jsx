import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, History, LockKeyhole, RefreshCcw, ShieldCheck } from 'lucide-react';
import {
  exportPrivacyData,
  fetchConsentHistory,
  fetchPrivacyStatus,
  updatePrivacyConsents,
  withdrawAllOptionalConsents,
} from '../services/privacyApi';
import { formatDateTimeEC } from '../utils/dateFormat';

function downloadJson(payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `sknomina-lopdp-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function PrivacyScopeRow({ item, onToggle, disabled }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-slate-950">{item.label}</p>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
            {item.active ? 'Activo' : 'Inactivo'}
          </span>
          {!item.withdrawable && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
              <LockKeyhole className="h-3.5 w-3.5" />
              Base legal
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-600">{item.legalBasis}</p>
        {item.updatedAt && <p className="mt-1 text-xs text-slate-500">{formatDateTimeEC(item.updatedAt)}</p>}
      </div>
      {item.withdrawable ? (
        <button
          className={`inline-flex h-9 w-16 shrink-0 items-center rounded-full border px-1 transition ${item.active ? 'border-teal-700 bg-teal-700' : 'border-slate-300 bg-slate-100'}`}
          disabled={disabled}
          onClick={() => onToggle(item.scope, !item.active)}
          type="button"
          title={item.active ? 'Retirar consentimiento' : 'Activar consentimiento'}
        >
          <span className={`h-7 w-7 rounded-full bg-white shadow transition ${item.active ? 'translate-x-7' : 'translate-x-0'}`} />
        </button>
      ) : (
        <span className="text-sm font-medium text-slate-500">No revocable aquí</span>
      )}
    </div>
  );
}

function PrivacidadCuenta() {
  const queryClient = useQueryClient();
  const [statusMessage, setStatusMessage] = useState('');

  const statusQuery = useQuery({
    queryKey: ['privacidad-status'],
    queryFn: fetchPrivacyStatus,
    retry: false,
  });

  const historyQuery = useQuery({
    queryKey: ['privacidad-history'],
    queryFn: fetchConsentHistory,
    retry: false,
  });

  const updateMutation = useMutation({
    mutationFn: updatePrivacyConsents,
    onSuccess: () => {
      setStatusMessage('Consentimiento actualizado.');
      queryClient.invalidateQueries({ queryKey: ['privacidad-status'] });
      queryClient.invalidateQueries({ queryKey: ['privacidad-history'] });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: withdrawAllOptionalConsents,
    onSuccess: () => {
      setStatusMessage('Consentimientos opcionales retirados.');
      queryClient.invalidateQueries({ queryKey: ['privacidad-status'] });
      queryClient.invalidateQueries({ queryKey: ['privacidad-history'] });
    },
  });

  const exportMutation = useMutation({
    mutationFn: exportPrivacyData,
    onSuccess: (payload) => {
      downloadJson(payload);
      setStatusMessage('Exportacion generada.');
      queryClient.invalidateQueries({ queryKey: ['privacidad-history'] });
    },
  });

  const preferences = statusQuery.data?.preferences || [];
  const optionalActive = useMemo(
    () => preferences.filter((item) => item.withdrawable && item.active).length,
    [preferences]
  );
  const mandatoryActive = useMemo(
    () => preferences.filter((item) => !item.withdrawable && item.active).length,
    [preferences]
  );

  const onToggle = (scope, active) => updateMutation.mutate({ [scope]: active });
  const pending = updateMutation.isPending || withdrawMutation.isPending || exportMutation.isPending;
  const error = statusQuery.error || historyQuery.error || updateMutation.error || withdrawMutation.error || exportMutation.error;

  return (
    <div className="space-y-6">
      <section className="soft-panel p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 h-6 w-6 text-teal-700" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">LOPDP</p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-950">Privacidad de cuenta</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-secondary inline-flex items-center gap-2"
              disabled={pending}
              onClick={() => exportMutation.mutate()}
              type="button"
            >
              <Download className="h-4 w-4" />
              Exportar JSON
            </button>
            <button
              className="btn-secondary inline-flex items-center gap-2"
              disabled={pending || optionalActive === 0}
              onClick={() => withdrawMutation.mutate()}
              type="button"
            >
              <RefreshCcw className="h-4 w-4" />
              Retirar opcionales
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="soft-panel p-5">
          <p className="text-sm text-slate-500">Version</p>
          <p className="mt-2 text-xl font-semibold text-slate-950">{statusQuery.data?.version || '-'}</p>
        </div>
        <div className="soft-panel p-5">
          <p className="text-sm text-slate-500">Bases legales activas</p>
          <p className="mt-2 text-xl font-semibold text-slate-950">{statusQuery.isLoading ? '...' : mandatoryActive}</p>
        </div>
        <div className="soft-panel p-5">
          <p className="text-sm text-slate-500">Consentimientos opcionales</p>
          <p className="mt-2 text-xl font-semibold text-slate-950">{statusQuery.isLoading ? '...' : optionalActive}</p>
        </div>
      </section>

      {statusMessage && <div className="status-success">{statusMessage}</div>}
      {error && (
        <div className="status-error">
          {error?.response?.data?.message || error?.message || 'No se pudo procesar privacidad.'}
        </div>
      )}

      <section className="soft-panel overflow-hidden">
        {statusQuery.isLoading ? (
          <div className="p-6 text-sm text-slate-500">Cargando...</div>
        ) : preferences.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">Sin preferencias registradas.</div>
        ) : (
          preferences.map((item) => (
            <PrivacyScopeRow
              disabled={pending}
              item={item}
              key={item.scope}
              onToggle={onToggle}
            />
          ))
        )}
      </section>

      <section className="soft-panel overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <History className="h-4 w-4 text-teal-700" />
          <h2 className="font-semibold text-slate-950">Historial LOPDP</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Accion</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">CorrelationId</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {historyQuery.isLoading ? (
                <tr><td className="px-4 py-6 text-sm text-slate-500" colSpan="3">Cargando...</td></tr>
              ) : (historyQuery.data || []).length === 0 ? (
                <tr><td className="px-4 py-6 text-sm text-slate-500" colSpan="3">Sin eventos LOPDP.</td></tr>
              ) : (
                historyQuery.data.map((item) => (
                  <tr className="hover:bg-slate-50" key={item.id}>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatDateTimeEC(item.created_at || item.createdAt)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-950">{item.accion}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{item.correlation_id || item.correlationId}</td>
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

export default PrivacidadCuenta;
