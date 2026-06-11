# Crear páginas restantes del frontend
# Terminar Empleado
terminar_empleado = '''import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

function TerminarEmpleado() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [causa, setCausa] = useState('');
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    
    try {
      const response = await axios.post(`/api/empleados/${id}/terminar`, { causa });
      setResultado(response.data.liquidacion);
    } catch (err) {
      alert(err.response?.data?.error || 'Error al terminar empleado');
    } finally {
      setCargando(false);
    }
  };

  if (resultado) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Liquidación Generada</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Detalle de Liquidación</h2>
          <div className="space-y-2">
            <p><strong>Empleado:</strong> {resultado.nombre}</p>
            <p><strong>Cédula:</strong> {resultado.cedula}</p>
            <p><strong>Años de Servicio:</strong> {resultado.aniosServicio}</p>
            <hr className="my-4" />
            <div className="grid grid-cols-2 gap-2">
              <p>Sueldo Pendiente:</p><p className="text-right">${resultado.liquidacion.sueldoPendiente}</p>
              <p>Décimo Tercero:</p><p className="text-right">${resultado.liquidacion.decimoTercero}</p>
              <p>Décimo Cuarto:</p><p className="text-right">${resultado.liquidacion.decimoCuarto}</p>
              <p>Vacaciones:</p><p className="text-right">${resultado.liquidacion.vacaciones}</p>
              <p>Indemnización:</p><p className="text-right">${resultado.liquidacion.indemnizacion}</p>
            </div>
            <hr className="my-4" />
            <p className="text-xl font-bold">TOTAL: ${resultado.liquidacion.total}</p>
          </div>
          <div className="mt-6 flex justify-end">
            <button onClick={() => navigate('/empleados')} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
              Volver a Empleados
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 mb-4">
        <ArrowLeft size={20} className="mr-2" /> Volver
      </button>
      
      <h1 className="text-2xl font-bold mb-6">Terminar Relación Laboral</h1>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <AlertTriangle className="text-yellow-600 mr-3 mt-1" size={24} />
          <div>
            <h3 className="font-semibold text-yellow-800">Atención</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Esta acción generará el acta de finiquito y calculará la liquidación automática.
              El empleado debe haber devuelto todos los equipos asignados.
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Causa de Terminación *</label>
            <select value={causa} onChange={(e) => setCausa(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg" required>
              <option value="">Seleccionar...</option>
              <option value="renuncia_voluntaria">Renuncia Voluntaria</option>
              <option value="despido_intempestivo">Despido Intempestivo</option>
              <option value="desahucio">Desahucio (Art. 186)</option>
              <option value="mutuo_acuerdo">Mutuo Acuerdo</option>
            </select>
          </div>
          
          <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={() => navigate(-1)}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={cargando || !causa}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
              {cargando ? 'Procesando...' : 'Generar Liquidación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TerminarEmpleado;
'''

with open('frontend-web/src/pages/Empleados/TerminarEmpleado.jsx', 'w') as f:
    f.write(terminar_empleado)

# Páginas de Asistencia
novedades_pendientes = '''import React from 'react';
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
'''

with open('frontend-web/src/pages/Asistencia/NovedadesPendientes.jsx', 'w') as f:
    f.write(novedades_pendientes)

reporte_asistencia = '''import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

function ReporteAsistencia() {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);

  const { data: reporte, isLoading } = useQuery({
    queryKey: ['reporte-asistencia', anio, mes],
    queryFn: async () => {
      const response = await axios.get(`/api/reportes/asistencia/${anio}/${mes}`);
      return response.data.reporte;
    }
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Reporte de Asistencia</h1>
      
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Días Trabajados</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tardías (min)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Extras 50% (min)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Extras 100% (min)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan="5" className="px-6 py-4 text-center">Cargando...</td></tr>
              ) : !reporte || reporte.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-4 text-center">No hay datos</td></tr>
              ) : (
                reporte.map(r => (
                  <tr key={r.empleado_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{r.nombre}</td>
                    <td className="px-6 py-4 text-sm">{r.dias_trabajados}</td>
                    <td className="px-6 py-4 text-sm">{r.minutos_tardia}</td>
                    <td className="px-6 py-4 text-sm">{r.minutos_extra_50}</td>
                    <td className="px-6 py-4 text-sm">{r.minutos_extra_100}</td>
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

export default ReporteAsistencia;
'''

with open('frontend-web/src/pages/Asistencia/ReporteAsistencia.jsx', 'w') as f:
    f.write(reporte_asistencia)

print("✓ Páginas de asistencia creadas")
 # Result 
✓ Páginas de asistencia creadas
