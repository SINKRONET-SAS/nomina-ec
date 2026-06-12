import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { authenticatedApi } from '../../services/authenticatedApi';
import { FileText, Download } from 'lucide-react';

function ContratosGenerados() {
  const { data: documentos, isLoading } = useQuery({
    queryKey: ['contratos'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/documentos?tipo=contrato_indefinido,contrato_ocasional,contrato_obra');
      return response.data.documentos;
    }
  });

  const descargar = async (id) => {
    try {
      const response = await authenticatedApi.get(`/documentos/${id}/download`);
      window.open(response.data.url, '_blank');
    } catch (err) {
      alert('Error al descargar documento');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Contratos Generados</h1>
      
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan="4" className="px-6 py-4 text-center">Cargando...</td></tr>
              ) : !documentos || documentos.length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-4 text-center">No hay contratos generados</td></tr>
              ) : (
                documentos.map(doc => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{doc.nombres} {doc.apellidos}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {doc.tipo_documento.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">{new Date(doc.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => descargar(doc.id)}
                        className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200">
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

