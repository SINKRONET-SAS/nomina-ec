import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { authenticatedApi } from '../../services/authenticatedApi';
import { downloadUrl } from '../../utils/downloadUrl';
import { formatDateEC } from '../../utils/dateFormat';

function ContratosGenerados() {
  const [descargandoId, setDescargandoId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const { data: documentos, isLoading } = useQuery({
    queryKey: ['contratos'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/documentos?tipo=contrato');
      return response.data.documentos;
    },
  });

  const descargar = async (id) => {
    setDescargandoId(id);
    setMessage('');
    setError('');
    try {
      const response = await authenticatedApi.get(`/documentos/${id}/download`);
      downloadUrl(response.data.url, response.data.fileName || `contrato-${id}.pdf`);
      setMessage('Contrato listo para descarga.');
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || err.message || 'No pudimos preparar la descarga del contrato.');
    } finally {
      setDescargandoId('');
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Contratos Generados</h1>

      <section className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
        <p className="font-semibold">Registro SUT/MDT pendiente de gestion externa</p>
        <p className="mt-1">
          Los contratos y actas de finiquito deben revisarse frente a la obligacion laboral aplicable y registrarse en el
          Sistema Unico de Trabajo del Ministerio del Trabajo cuando corresponda. Nomina-Ec deja la evidencia lista,
          pero no marca el documento como registrado sin confirmacion externa o credenciales oficiales.
        </p>
      </section>

      {message && <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      <div className="rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Empleado</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan="4" className="px-6 py-4 text-center">Cargando...</td></tr>
              ) : !documentos || documentos.length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-4 text-center">No hay contratos generados</td></tr>
              ) : (
                documentos.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{doc.nombres} {doc.apellidos}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
                        {(doc.metadata?.templateKey || doc.tipo_documento || 'contrato').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">{formatDateEC(doc.created_at)}</td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => descargar(doc.id)}
                        disabled={descargandoId === doc.id}
                        title="Descargar contrato"
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

export default ContratosGenerados;
