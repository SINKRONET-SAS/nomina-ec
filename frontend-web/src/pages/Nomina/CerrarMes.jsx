import React, { useState } from 'react';
import axios from 'axios';
import { Calculator, CheckCircle } from 'lucide-react';

function CerrarMes() {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const handleCalcular = async () => {
    setCargando(true);
    try {
      const response = await axios.post('/api/nomina/calcular', { anio, mes });
      setResultado(response.data.resultado);
    } catch (err) {
      alert(err.response?.data?.error || 'Error al calcular nómina');
    } finally {
      setCargando(false);
    }
  };

  const handleCerrar = async () => {
    if (!confirm('¿Está seguro de cerrar la nómina? Esta acción no se puede deshacer.')) return;
    
    setCargando(true);
    try {
      await axios.post('/api/nomina/cerrar', { anio, mes });
      alert('Nómina cerrada exitosamente');
    } catch (err) {
      alert(err.response?.data?.error || 'Error al cerrar nómina');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Cierre de Nómina Mensual</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex space-x-4 mb-6">
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
        
        <div className="flex space-x-4">
          <button onClick={handleCalcular} disabled={cargando}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            <Calculator size={20} className="mr-2" />
            {cargando ? 'Calculando...' : 'Calcular Nómina'}
          </button>
          
          {resultado && (
            <button onClick={handleCerrar} disabled={cargando}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
              <CheckCircle size={20} className="mr-2" />
              Cerrar Nómina
            </button>
          )}
        </div>
      </div>
      
      {resultado && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Resultado del Cálculo</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Empleados</p>
              <p className="text-2xl font-bold">{resultado.total}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Exitosos</p>
              <p className="text-2xl font-bold text-green-600">{resultado.exitosos || resultado.resultados?.filter(r => !r.error).length || 0}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Con Errores</p>
              <p className="text-2xl font-bold text-red-600">{resultado.errores || resultado.resultados?.filter(r => r.error).length || 0}</p>
            </div>
          </div>
          
          {resultado.resultados && resultado.resultados.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium mb-2">Detalle por Empleado</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Empleado</th>
                      <th className="px-4 py-2 text-right">Ingresos</th>
                      <th className="px-4 py-2 text-right">Neto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {resultado.resultados.filter(r => !r.error).map((r, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2">{r.nombre}</td>
                        <td className="px-4 py-2 text-right">${r.totalIngresos}</td>
                        <td className="px-4 py-2 text-right font-semibold">${r.netoRecibir}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CerrarMes;

