import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, UserX } from 'lucide-react';

function ListaEmpleados() {
  const [busqueda, setBusqueda] = useState('');
  
  const { data, isLoading } = useQuery({
    queryKey: ['empleados'],
    queryFn: async () => {
      const response = await axios.get('/api/empleados');
      return response.data.empleados;
    }
  });

  const empleados = data || [];
  const filtrados = empleados.filter(e => 
    `${e.nombres} ${e.apellidos} ${e.cedula}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Empleados</h1>
        <Link to="/empleados/nuevo" className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center">
          <Plus size={20} className="mr-2" /> Nuevo Empleado
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre o cédula..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cédula</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cargo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sueldo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan="5" className="px-6 py-4 text-center">Cargando...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-4 text-center">No hay empleados</td></tr>
              ) : (
                filtrados.map(emp => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{emp.cedula}</td>
                    <td className="px-6 py-4 text-sm font-medium">{emp.nombres} {emp.apellidos}</td>
                    <td className="px-6 py-4 text-sm">{emp.cargo || '-'}</td>
                    <td className="px-6 py-4 text-sm">${parseFloat(emp.sueldo_bruto_mensual).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-800"><Edit size={16} /></button>
                        <Link to={`/empleados/${emp.id}/terminar`} className="text-red-600 hover:text-red-800">
                          <UserX size={16} />
                        </Link>
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

export default ListaEmpleados;

