import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { authenticatedApi } from '../../services/authenticatedApi';
import { downloadUrl } from '../../utils/downloadUrl';
import { ECUADOR_TIME_ZONE, currentPeriodEC } from '../../utils/dateFormat';

function RolesPagos() {
  const initialPeriod = currentPeriodEC();
  const [anio, setAnio] = useState(initialPeriod.anio);
  const [mes, setMes] = useState(initialPeriod.mes);
  const [downloadingId, setDownloadingId] = useState('');
  const [downloadingTransposed, setDownloadingTransposed] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
        throw new Error('El backend no entrego una URL de descarga.');
      }
      downloadUrl(url, response.data.fileName || `rol-pago-${id}.pdf`);
      setMessage(`Rol listo: ${response.data.fileName || 'PDF generado'}`);
    } catch (err) {
      const apiMessage = err.response?.data?.message || err.response?.data?.error || err.message;
      setError(apiMessage || 'No pudimos descargar el rol de pago.');
    } finally {
      setDownloadingId('');
    }
  };

  const descargarPDFTranspuesto = async () => {
    setDownloadingTransposed(true);
    setMessage('');
    setError('');
    try {
      const response = await authenticatedApi.get(`/nomina/${anio}/${mes}/roles-pdf-transpuesto`);
      const url = response.data?.url;
      if (!url) {
        throw new Error('El backend no entrego una URL de descarga.');
      }
      const fileName = response.data.fileName || `roles-pago-transpuesto-${anio}-${String(mes).padStart(2, '0')}.pdf`;
      downloadUrl(url, fileName);
      const total = response.data.totalEmpleados || nominas?.length || 0;
      setMessage(`Rol transpuesto listo: ${fileName} (${total} empleados).`);
    } catch (err) {
      const apiMessage = err.response?.data?.message || err.response?.data?.error || err.message;
      setError(apiMessage || 'No pudimos descargar el rol transpuesto del periodo.');
    } finally {
      setDownloadingTransposed(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Roles de Pago</h1>
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
              <label className="mb-1 block text-sm font-medium">Anio</label>
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
            onClick={descargarPDFTranspuesto}
            disabled={downloadingTransposed || isLoading || !nominas || nominas.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            title="Descargar rol de pago transpuesto del periodo"
          >
            <Download size={16} />
            <span>{downloadingTransposed ? 'Generando PDF' : 'PDF transpuesto'}</span>
          </button>
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-500">Periodo inicial calculado en {ECUADOR_TIME_ZONE}.</p>
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
                <tr><td colSpan="6" className="px-6 py-4 text-center">No hay nominas para este periodo</td></tr>
              ) : (
                nominas.map((nomina) => (
                  <tr key={nomina.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{nomina.nombres} {nomina.apellidos}</td>
                    <td className="px-6 py-4 text-sm">${parseFloat(nomina.total_ingresos).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm">${parseFloat(nomina.total_deducciones).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm font-semibold">${parseFloat(nomina.neto_recibir).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2 py-1 text-xs ${nomina.cerrada ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {nomina.cerrada ? 'Cerrada' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => descargarPDF(nomina.id)}
                        disabled={downloadingId === nomina.id}
                        title="Descargar rol de pago PDF"
                        className="rounded bg-blue-100 p-1 text-blue-600 hover:bg-blue-200 disabled:opacity-50"
                      >
                        <Download size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default RolesPagos;
