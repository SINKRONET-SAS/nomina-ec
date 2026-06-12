import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authenticatedApi } from '../../services/authenticatedApi';
import { Download } from 'lucide-react';

function RolesPagos() {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);

  const { data: nominas, isLoading } = useQuery({
    queryKey: ['roles-pagos', anio, mes],
    queryFn: async () => {
      const response = await authenticatedApi.get(`/nomina/${anio}/${mes}`);
      return response.data.nominas;
    }
  });

  const descargarPDF = async (id) => {
    try {
      const response = await authenticatedApi.get(`/nomina/${id}/rol-pdf`);
      window.open(response.data.url, '_blank');
    } catch (err) {
      alert('Error al descargar PDF');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Roles de Pago</h1>
      
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex space-x-4">
          <div>
            <label className="block text-sm font-medium mb-1">Mes</label>
            <select value={mes} onChange={(e) => setMes(parseInt(e.target.value))}
              className="px-3 py-2 border rounded-lg">
              {Array.from({length: 12}, (_, i) => (
                <option key={i+1} value={i+1}>{i+1}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Año</label>
            <input type="number" value={anio} onChange={(e) => setAnio(parseInt(e.target.value))}
              className="px-3 py-2 border rounded-lg" />
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ingresos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deducciones</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Neto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan="6" className="px-6 py-4 text-center">Cargando...</td></tr>
              ) : !nominas || nominas.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-4 text-center">No hay nóminas para este período</td></tr>
              ) : (
                nominas.map(n => (
                  <tr key={n.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{n.nombres} {n.apellidos}</td>
                    <td className="px-6 py-4 text-sm">${parseFloat(n.total_ingresos).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm">${parseFloat(n.total_deducciones).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm font-semibold">${parseFloat(n.neto_recibir).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${n.cerrada ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {n.cerrada ? 'Cerrada' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => descargarPDF(n.id)}
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

export default RolesPagos;

