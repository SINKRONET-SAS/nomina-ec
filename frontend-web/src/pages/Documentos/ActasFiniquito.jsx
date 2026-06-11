import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { FileText, Download } from 'lucide-react';

function ActasFiniquito() {
  const { data: documentos, isLoading } = useQuery({
    queryKey: ['finiquitos'],
    queryFn: async () => {
      const response = await axios.get('/api/documentos?tipo=acta_finiquito');
      return response.data.documentos;
    }
  });

  const descargar = async (id) => {
    try {
      const response = await axios.get(`/api/documentos/${id}/download`);
      window.open(response.data.url, '_blank');
    } catch (err) {
      alert('Error al descargar documento');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Actas de Finiquito</h1>
      
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cédula</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan="4" className="px-6 py-4 text-center">Cargando...</td></tr>
              ) : !documentos || documentos.length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-4 text-center">No hay actas de finiquito</td></tr>
              ) : (
                documentos.map(doc => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{doc.nombres} {doc.apellidos}</td>
                    <td className="px-6 py-4 text-sm">{doc.cedula}</td>
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

export default ActasFiniquito;

