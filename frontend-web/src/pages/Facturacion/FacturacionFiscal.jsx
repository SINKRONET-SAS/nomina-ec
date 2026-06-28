import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, FileText, RefreshCcw, RotateCcw } from 'lucide-react';
import { authenticatedApi } from '../../services/authenticatedApi';

function extractApiError(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

function statusLabel(status) {
  const labels = {
    blocked: 'Bloqueada',
    invoice_requested: 'Solicitada',
    invoice_authorized: 'Autorizada',
    invoice_rejected: 'Rechazada',
  };
  return labels[status] || status || 'Sin estado';
}

function statusStyle(status) {
  const styles = {
    blocked: 'bg-amber-50 text-amber-800',
    invoice_requested: 'bg-blue-50 text-blue-700',
    invoice_authorized: 'bg-emerald-50 text-emerald-700',
    invoice_rejected: 'bg-red-50 text-red-700',
  };
  return styles[status] || 'bg-slate-100 text-slate-700';
}

export default function FacturacionFiscal() {
  const queryClient = useQueryClient();
  const [paymentTransactionId, setPaymentTransactionId] = useState('');

  const statusQuery = useQuery({
    queryKey: ['fiscal-billing', 'status'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/facturacion/status');
      return response.data.data;
    },
  });

  const docsQuery = useQuery({
    queryKey: ['fiscal-billing', 'documents'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/facturacion/documentos');
      return response.data.data || [];
    },
  });

  const emitMutation = useMutation({
    mutationFn: async () => authenticatedApi.post(`/facturacion/transacciones/${paymentTransactionId.trim()}/emitir`),
    onSuccess: () => {
      setPaymentTransactionId('');
      queryClient.invalidateQueries({ queryKey: ['fiscal-billing'] });
    },
  });

  const readiness = statusQuery.data?.readiness;
  const totals = statusQuery.data?.totals || {};
  const documents = docsQuery.data || [];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-800">Facturación fiscal</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">SINKRONET FACTURADOR</h1>
        <p className="mt-1 text-sm text-slate-600">
          SKNOMINA solicita facturas por API server-to-server y conserva el estado fiscal, referencias y errores visibles.
        </p>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">Estado del facturador</h2>
              <p className="mt-1 text-sm text-slate-600">
          La emisión real queda bloqueada si falta configuración, credencial, certificado o disponibilidad del facturador.
              </p>
            </div>
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${readiness?.ready ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
              {readiness?.ready ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {readiness?.ready ? 'Listo para emitir' : 'Bloqueado'}
            </span>
          </div>
          {!readiness?.ready && (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {(readiness?.blockers || ['No pudimos confirmar la configuracion fiscal.']).map((blocker) => (
                <p key={blocker}>{blocker}</p>
              ))}
            </div>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {[
              ['Solicitadas', totals.invoice_requested || 0],
              ['Autorizadas', totals.invoice_authorized || 0],
              ['Bloqueadas', totals.blocked || 0],
              ['Rechazadas', totals.invoice_rejected || 0],
            ].map(([label, value]) => (
              <div className="rounded-md bg-slate-50 p-3" key={label}>
                <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-slate-900">Reintento manual</h2>
          <p className="mt-1 text-sm text-slate-600">
            Usa el ID interno de una transacción aprobada si necesitas solicitar o reintentar la factura.
          </p>
          <div className="mt-4 space-y-3">
            <input
              className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm"
              onChange={(event) => setPaymentTransactionId(event.target.value)}
              placeholder="ID de transacción de pago"
              value={paymentTransactionId}
            />
            <button
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!paymentTransactionId.trim() || emitMutation.isPending}
              onClick={() => emitMutation.mutate()}
              type="button"
            >
              <RotateCcw className="h-4 w-4" />
              Solicitar factura
            </button>
            {emitMutation.isError && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {extractApiError(emitMutation.error, 'No pudimos solicitar la factura.')}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">Solicitudes fiscales</h2>
            <p className="mt-1 text-sm text-slate-600">Estados devueltos por SINKRONET FACTURADOR y referencias para soporte.</p>
          </div>
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() => {
              statusQuery.refetch();
              docsQuery.refetch();
            }}
            type="button"
          >
            <RefreshCcw className="h-4 w-4" />
            Actualizar
          </button>
        </div>

        {docsQuery.isError && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {extractApiError(docsQuery.error, 'No pudimos cargar las solicitudes fiscales.')}
          </div>
        )}

        <div className="overflow-auto rounded-md border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Referencia</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Estado</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Factura</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Clave de acceso</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">Observación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td className="px-3 py-2">
                    <div className="font-semibold text-slate-900">{doc.externalReference}</div>
                    <div className="text-xs text-slate-500">{doc.paymentTransactionId}</div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusStyle(doc.status)}`}>{statusLabel(doc.status)}</span>
                    <div className="mt-1 text-xs text-slate-500">{doc.attempts} intento(s)</div>
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {doc.invoiceNumber || 'Pendiente'}
                    {doc.rideUrl && (
                      <a className="ml-2 inline-flex items-center gap-1 text-teal-700 hover:underline" href={doc.rideUrl} rel="noreferrer" target="_blank">
                        <FileText className="h-4 w-4" />
                        RIDE
                      </a>
                    )}
                  </td>
                  <td className="max-w-xs truncate px-3 py-2 font-mono text-xs text-slate-600">{doc.accessKey || 'Sin clave'}</td>
                  <td className="max-w-md px-3 py-2 text-slate-600">{doc.lastError || 'Sin observaciones'}</td>
                </tr>
              ))}
              {documents.length === 0 && (
                <tr>
                  <td className="px-3 py-8 text-center text-slate-500" colSpan={5}>
                    Aun no hay solicitudes fiscales registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
