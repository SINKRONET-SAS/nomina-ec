import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Check, X, Clock } from 'lucide-react';

function NovedadesPendientes() {
  const queryClient = useQueryClient();
  
  const { data: novedades, isLoading } = useQuery({
    queryKey: ['novedades-pendientes'],
    queryFn: async () => {
      const response = await axios.get('/api/novedades/pendientes');
      return response.data.novedades;
    }
  });

  const aprobarMutation = useMutation({
    mutationFn: (id) => axios.put(`/api/novedades/${id}/aprobar`),
    onSuccess: () => queryClient.invalidateQueries(['novedades-pendientes'])
  });

  const rechazarMutation = useMutation({
    mutationFn: (id) => axios.put(`/api/novedades/${id}/rechazar`),
    onSuccess: () => queryClient.invalidateQueries(['novedades-pendientes'])
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Novedades Pendientes</h1>
      
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Minutos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan="5" className="px-6 py-4 text-center">Cargando...</td></tr>
              ) : !novedades || novedades.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-4 text-center">No hay novedades pendientes</td></tr>
              ) : (
                novedades.map(nov => (
                  <tr key={nov.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{nov.nombres} {nov.apellidos}</td>
                    <td className="px-6 py-4 text-sm">{new Date(nov.fecha).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        nov.tipo_novedad === 'tardia' ? 'bg-yellow-100 text-yellow-800' :
                        nov.tipo_novedad === 'hora_extra_50' ? 'bg-blue-100 text-blue-800' :
                        nov.tipo_novedad === 'hora_extra_100' ? 'bg-purple-100 text-purple-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {nov.tipo_novedad.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">{nov.minutos} min</td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button onClick={() => aprobarMutation.mutate(nov.id)}
                          className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200">
                          <Check size={16} />
                        </button>
                        <button onClick={() => rechazarMutation.mutate(nov.id)}
                          className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200">
                          <X size={16} />
                        </button>
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

export default NovedadesPendientes;

