import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Trash2 } from 'lucide-react';
import CompactNotice from '../../components/UI/CompactNotice';
import { authenticatedApi } from '../../services/authenticatedApi';
import { downloadUrl } from '../../utils/downloadUrl';
import { formatDateEC } from '../../utils/dateFormat';

function ActasFiniquito() {
  const queryClient = useQueryClient();
  const [descargandoId, setDescargandoId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const { data: documentos, isLoading } = useQuery({
    queryKey: ['finiquitos'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/documentos?tipo=acta_finiquito');
      return response.data.documentos;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId) => {
      const response = await authenticatedApi.delete(`/documentos/${documentId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finiquitos'] });
      setMessage('Acta de finiquito eliminada. Puedes volver a generarla con el formato correcto.');
      setError('');
    },
    onError: (err) => {
      setError(err.response?.data?.message || err.response?.data?.error || err.message || 'No pudimos eliminar el acta de finiquito.');
      setMessage('');
    },
  });

  const descargar = async (id) => {
    setDescargandoId(id);
    setMessage('');
    setError('');
    try {
      const response = await authenticatedApi.get(`/documentos/${id}/download`);
      downloadUrl(response.data.url, response.data.fileName || `acta-finiquito-${id}.pdf`);
      setMessage('Acta de finiquito lista para descarga.');
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || err.message || 'No pudimos preparar la descarga del acta.');
    } finally {
      setDescargandoId('');
    }
  };

  const eliminarGenerado = (documento) => {
    if (documento.firmado) {
      setError('Las actas firmadas no se pueden eliminar desde esta pantalla.');
      return;
    }
    if (!window.confirm('¿Eliminar esta acta de finiquito generada? Podrás volver a generarla con el formato correcto.')) return;
    deleteMutation.mutate(documento.id);
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Actas de Finiquito</h1>

      <CompactNotice className="mb-4" tone="amber" title="Antes de cerrar">
        Revisa el acta y registra el trámite externo cuando aplique. SKNOMINA deja la evidencia lista para el expediente.
      </CompactNotice>

      {message && <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      <div className="rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Empleado</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Cédula</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan="4" className="px-6 py-4 text-center">Cargando...</td></tr>
              ) : !documentos || documentos.length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-4 text-center">No hay actas de finiquito</td></tr>
              ) : (
                documentos.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{doc.nombres} {doc.apellidos}</td>
                    <td className="px-6 py-4 text-sm">{doc.cedula}</td>
                    <td className="px-6 py-4 text-sm">{formatDateEC(doc.created_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => descargar(doc.id)}
                          disabled={descargandoId === doc.id}
                          title="Descargar acta de finiquito"
                          className="rounded bg-blue-100 p-1 text-blue-600 hover:bg-blue-200 disabled:opacity-50"
                        >
                          <Download size={16} />
                        </button>
                        {!doc.firmado && (
                          <button
                            type="button"
                            onClick={() => eliminarGenerado(doc)}
                            disabled={deleteMutation.isPending}
                            title="Eliminar acta generada para regenerar"
                            className="rounded bg-red-100 p-1 text-red-600 hover:bg-red-200 disabled:opacity-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
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

export default ActasFiniquito;
