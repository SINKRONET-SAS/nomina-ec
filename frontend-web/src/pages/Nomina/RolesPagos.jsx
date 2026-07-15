import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Download, Pencil, Send, Trash2, X } from 'lucide-react';
import { authenticatedApi } from '../../services/authenticatedApi';
import { extractApiError } from '../../services/publicApi';
import { downloadUrl } from '../../utils/downloadUrl';
import { currentPeriodEC } from '../../utils/dateFormat';

function RolesPagos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const initialPeriod = currentPeriodEC();
  const [anio, setAnio] = useState(initialPeriod.anio);
  const [mes, setMes] = useState(initialPeriod.mes);
  const [downloadingId, setDownloadingId] = useState('');
  const [sendingId, setSendingId] = useState('');
  const [downloadingTransposed, setDownloadingTransposed] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [discardReason, setDiscardReason] = useState('');

  const { data: nominas, isLoading } = useQuery({
    queryKey: ['roles-pagos', anio, mes],
    queryFn: async () => {
      const response = await authenticatedApi.get(`/nomina/${anio}/${mes}`);
      return response.data.nominas;
    },
  });

  const descargarPDF = async (id) => {
    setDownloadingId(id);
    setMessage('');
    setError('');
    try {
      const response = await authenticatedApi.get(`/nomina/${id}/rol-pdf`);
      const url = response.data?.url;
      if (!url) {
        throw new Error('No recibimos el archivo de descarga.');
      }
      downloadUrl(url, response.data.fileName || `rol-pago-${id}.pdf`);
      setMessage(`Rol listo: ${response.data.fileName || 'PDF generado'}`);
    } catch (err) {
      setError(extractApiError(err, 'No pudimos descargar el rol de pago.'));
    } finally {
      setDownloadingId('');
    }
  };

  const enviarRolEmail = async (id, employeeName) => {
    setSendingId(id);
    setMessage('');
    setError('');
    try {
      const response = await authenticatedApi.post(`/nomina/${id}/rol-email`);
      const status = response.data?.delivery?.status || 'sent';
      setMessage(`Rol enviado por email a ${employeeName}. Estado: ${status}.`);
    } catch (err) {
      setError(extractApiError(err, 'No pudimos enviar el rol de pago por email.'));
    } finally {
      setSendingId('');
    }
  };

  const descargarPDFGeneral = async () => {
    setDownloadingTransposed(true);
    setMessage('');
    setError('');
    try {
      const response = await authenticatedApi.get(`/nomina/${anio}/${mes}/roles-pdf-transpuesto`);
      const url = response.data?.url;
      if (!url) {
        throw new Error('No recibimos el archivo de descarga.');
      }
      const fileName = response.data.fileName || `roles-pago-general-${anio}-${String(mes).padStart(2, '0')}.pdf`;
      downloadUrl(url, fileName);
      const total = response.data.totalEmpleados || nominas?.length || 0;
      setMessage(`PDF general listo: ${fileName} (${total} empleados).`);
    } catch (err) {
      setError(extractApiError(err, 'No pudimos descargar el PDF general del periodo.'));
    } finally {
      setDownloadingTransposed(false);
    }
  };

  const discardDraftMutation = useMutation({
    mutationFn: async ({ payrollId, intent }) => authenticatedApi.delete(`/nomina/${payrollId}`, {
      data: {
        motivo: discardReason.trim(),
        intencion: intent,
      },
    }),
    onSuccess: async (_response, variables) => {
      const action = pendingAction;
      setPendingAction(null);
      setDiscardReason('');
      await queryClient.invalidateQueries({ queryKey: ['roles-pagos', anio, mes] });
      await queryClient.invalidateQueries({ queryKey: ['nomina-periodo', anio, mes] });
      if (variables.intent === 'correction' && action?.nomina?.empleado_id) {
        const params = new URLSearchParams({
          empleadoId: action.nomina.empleado_id,
          anio: String(anio),
          mes: String(mes),
          origen: 'rol-corregido',
        });
        navigate(`/dashboard/asistencia/novedades?${params.toString()}`);
        return;
      }
      setMessage('Borrador eliminado. El periodo quedó listo para volver a calcular.');
      setError('');
    },
    onError: (err) => {
      setMessage('');
      setError(extractApiError(err, 'No pudimos descartar el rol en borrador.'));
    },
  });

  const openDraftAction = (nomina, intent) => {
    setMessage('');
    setError('');
    setDiscardReason('');
    setPendingAction({ nomina, intent });
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Roles de pago</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Revisa los borradores antes del cierre. Para corregir un valor, vuelve a sus novedades y genera nuevamente el cálculo; los roles cerrados no se alteran.
        </p>
      </div>
      {message && <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      <div className="mb-6 rounded-lg bg-white p-4 shadow">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Mes</label>
              <select
                value={mes}
                onChange={(event) => setMes(parseInt(event.target.value, 10))}
                className="rounded-lg border px-3 py-2"
              >
                {Array.from({ length: 12 }, (_, index) => (
                  <option key={index + 1} value={index + 1}>{index + 1}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Año</label>
              <input
                type="number"
                value={anio}
                onChange={(event) => setAnio(parseInt(event.target.value, 10))}
                className="rounded-lg border px-3 py-2"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={descargarPDFGeneral}
            disabled={downloadingTransposed || isLoading || !nominas || nominas.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            title="Descargar PDF general del periodo"
          >
            <Download size={16} />
            <span>{downloadingTransposed ? 'Generando PDF' : 'PDF general'}</span>
          </button>
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-500">Período sugerido según la hora de Ecuador.</p>
      </div>

      <div className="rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Empleado</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Ingresos</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Deducciones</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Neto</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan="6" className="px-6 py-4 text-center">Cargando...</td></tr>
              ) : !nominas || nominas.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-4 text-center">No hay nóminas para este período</td></tr>
              ) : (
                nominas.map((nomina) => {
                  const employeeName = `${nomina.nombres || ''} ${nomina.apellidos || ''}`.trim() || 'empleado';
                  const roleClosed = nomina.estado === 'cerrada' || nomina.estado === 'pagada';
                  const roleDraft = nomina.estado === 'borrador';
                  const statusLabel = nomina.estado === 'pagada'
                    ? 'Pagado'
                    : roleClosed
                      ? 'Cerrado'
                      : 'Borrador';
                  return (
                  <tr key={nomina.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{employeeName}</td>
                    <td className="px-6 py-4 text-sm">${parseFloat(nomina.total_ingresos).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm">${parseFloat(nomina.total_deducciones).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm font-semibold">${parseFloat(nomina.neto_recibir).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${roleClosed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => descargarPDF(nomina.id)}
                        disabled={downloadingId === nomina.id}
                        title={roleClosed ? 'Descargar rol individual' : 'Descargar vista previa del borrador'}
                        aria-label={`Descargar ${roleClosed ? 'rol individual' : 'vista previa'} de ${nomina.nombres} ${nomina.apellidos}`}
                        className="rounded bg-blue-100 p-1 text-blue-600 hover:bg-blue-200 disabled:opacity-50"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => enviarRolEmail(nomina.id, employeeName)}
                        disabled={!roleClosed || sendingId === nomina.id}
                        title={roleClosed ? 'Enviar rol individual por email' : 'Cierra la nómina antes de enviar el rol por email'}
                        aria-label={`Enviar rol individual por email a ${employeeName}`}
                        className="rounded bg-teal-100 p-1 text-teal-700 hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Send size={16} />
                      </button>
                      {roleDraft && (
                        <>
                          <button
                            type="button"
                            onClick={() => openDraftAction(nomina, 'correction')}
                            title="Corregir novedades"
                            aria-label={`Corregir novedades de ${employeeName}`}
                            className="rounded bg-amber-100 p-1 text-amber-800 hover:bg-amber-200"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDraftAction(nomina, 'delete')}
                            title="Eliminar borrador"
                            aria-label={`Eliminar borrador de ${employeeName}`}
                            className="rounded bg-red-100 p-1 text-red-700 hover:bg-red-200"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation">
          <div
            aria-labelledby="discard-role-title"
            aria-modal="true"
            className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950" id="discard-role-title">
                  {pendingAction.intent === 'correction' ? 'Corregir novedades del rol' : 'Eliminar rol en borrador'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Se descartará el cálculo de {pendingAction.nomina.nombres} {pendingAction.nomina.apellidos}. Las novedades y la auditoría se conservan; después podrás recalcular el periodo.
                </p>
              </div>
              <button
                aria-label="Cerrar confirmación"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500"
                disabled={discardDraftMutation.isPending}
                onClick={() => setPendingAction(null)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Motivo
              <textarea
                className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
                maxLength={500}
                onChange={(event) => setDiscardReason(event.target.value)}
                placeholder="Describe qué dato debe corregirse"
                value={discardReason}
              />
            </label>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                className="inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700"
                disabled={discardDraftMutation.isPending}
                onClick={() => setPendingAction(null)}
                type="button"
              >
                Conservar borrador
              </button>
              <button
                className="inline-flex min-h-10 items-center gap-2 rounded-md bg-red-700 px-4 text-sm font-semibold text-white disabled:bg-slate-300"
                disabled={discardReason.trim().length < 10 || discardDraftMutation.isPending}
                onClick={() => discardDraftMutation.mutate({
                  payrollId: pendingAction.nomina.id,
                  intent: pendingAction.intent,
                })}
                type="button"
              >
                {pendingAction.intent === 'correction' ? <Pencil className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                {discardDraftMutation.isPending
                  ? 'Procesando'
                  : pendingAction.intent === 'correction'
                    ? 'Descartar y corregir'
                    : 'Eliminar borrador'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RolesPagos;
