# Crear Dashboard
dashboard_jsx = '''import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Users, Clock, DollarSign, AlertCircle } from 'lucide-react';

function Dashboard() {
  const cards = [
    { icon: Users, label: 'Empleados Activos', value: '0', color: 'text-blue-500' },
    { icon: Clock, label: 'Novedades Pendientes', value: '0', color: 'text-yellow-500' },
    { icon: DollarSign, label: 'Nómina del Mes', value: '$0.00', color: 'text-green-500' },
    { icon: AlertCircle, label: 'Marcaciones Inválidas', value: '0', color: 'text-red-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card, idx) => (
          <div key={idx} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{card.label}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{card.value}</p>
              </div>
              <card.icon className={card.color} size={40} />
            </div>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Actividad Reciente</h2>
          <p className="text-sm text-gray-600">No hay actividad reciente</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Próximos Vencimientos</h2>
          <p className="text-sm text-gray-600">No hay vencimientos próximos</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
'''

with open('frontend-web/src/pages/Dashboard.jsx', 'w') as f:
    f.write(dashboard_jsx)

# Crear páginas de Empleados
lista_empleados = '''import React, { useState } from 'react';
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
'''

with open('frontend-web/src/pages/Empleados/ListaEmpleados.jsx', 'w') as f:
    f.write(lista_empleados)

nuevo_empleado = '''import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react';

function NuevoEmpleado() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    cedula: '', nombres: '', apellidos: '', cargo: '',
    sueldo_bruto_mensual: '', fecha_ingreso: '', tipo_contrato: 'indefinido',
    banco: '', cuenta_bancaria: ''
  });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    
    try {
      await axios.post('/api/empleados', formData);
      navigate('/empleados');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear empleado');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div>
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 mb-4">
        <ArrowLeft size={20} className="mr-2" /> Volver
      </button>
      
      <h1 className="text-2xl font-bold mb-6">Nuevo Empleado</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Cédula *</label>
              <input type="text" name="cedula" value={formData.cedula} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg" maxLength="10" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nombres *</label>
              <input type="text" name="nombres" value={formData.nombres} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Apellidos *</label>
              <input type="text" name="apellidos" value={formData.apellidos} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cargo</label>
              <input type="text" name="cargo" value={formData.cargo} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sueldo Bruto *</label>
              <input type="number" name="sueldo_bruto_mensual" value={formData.sueldo_bruto_mensual}
                onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" step="0.01" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fecha de Ingreso *</label>
              <input type="date" name="fecha_ingreso" value={formData.fecha_ingreso} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de Contrato</label>
              <select name="tipo_contrato" value={formData.tipo_contrato} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg">
                <option value="indefinido">Indefinido</option>
                <option value="ocasional">Ocasional</option>
                <option value="obra">Obra o Faena</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Banco</label>
              <select name="banco" value={formData.banco} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg">
                <option value="">Seleccionar...</option>
                <option value="PICHINCHA">Pichincha</option>
                <option value="GUAYAQUIL">Guayaquil</option>
                <option value="PRODUBANCO">Produbanco</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={() => navigate(-1)}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={cargando}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {cargando ? 'Guardando...' : 'Guardar Empleado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NuevoEmpleado;
'''

with open('frontend-web/src/pages/Empleados/NuevoEmpleado.jsx', 'w') as f:
    f.write(nuevo_empleado)

print("✓ Páginas de empleados creadas")
 # Result 
✓ Páginas de empleados creadas
