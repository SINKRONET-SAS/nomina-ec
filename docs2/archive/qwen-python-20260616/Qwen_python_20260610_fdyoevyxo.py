# Crear páginas de Nómina
cerrar_mes = '''import React, { useState } from 'react';
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
'''

with open('frontend-web/src/pages/Nomina/CerrarMes.jsx', 'w') as f:
    f.write(cerrar_mes)

roles_pagos = '''import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Download } from 'lucide-react';

function RolesPagos() {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);

  const { data: nominas, isLoading } = useQuery({
    queryKey: ['roles-pagos', anio, mes],
    queryFn: async () => {
      const response = await axios.get(`/api/nomina/${anio}/${mes}`);
      return response.data.nominas;
    }
  });

  const descargarPDF = async (id) => {
    try {
      const response = await axios.get(`/api/nomina/${id}/rol-pdf`);
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
'''

with open('frontend-web/src/pages/Nomina/RolesPagos.jsx', 'w') as f:
    f.write(roles_pagos)

descargar_reportes = '''import React, { useState } from 'react';
import axios from 'axios';
import { FileText, Download } from 'lucide-react';

function DescargarReportes() {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [cargando, setCargando] = useState('');

  const generarReporte = async (tipo) => {
    setCargando(tipo);
    try {
      let response;
      if (tipo === 'ats') {
        response = await axios.post('/api/reportes/ats', { anio, mes });
      } else if (tipo === 'sae') {
        response = await axios.post('/api/reportes/sae', { anio, mes });
      } else if (tipo === 'banco') {
        response = await axios.post('/api/reportes/banco', { anio, mes });
      }
      
      if (response.data.reporte?.url || response.data.reporte?.csvUrl) {
        window.open(response.data.reporte.url || response.data.reporte.csvUrl, '_blank');
      }
      alert('Reporte generado exitosamente');
    } catch (err) {
      alert(err.response?.data?.error || 'Error al generar reporte');
    } finally {
      setCargando('');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Reportes para Entidades</h1>
      
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
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <FileText className="text-blue-500 mb-4" size={40} />
          <h3 className="text-lg font-semibold mb-2">ATS - SRI</h3>
          <p className="text-sm text-gray-600 mb-4">
            Anexo Transaccional Simplificado para declaración de Impuesto a la Renta ante el SRI.
          </p>
          <button onClick={() => generarReporte('ats')} disabled={cargando === 'ats'}
            className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            <Download size={20} className="mr-2" />
            {cargando === 'ats' ? 'Generando...' : 'Generar XML ATS'}
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <FileText className="text-green-500 mb-4" size={40} />
          <h3 className="text-lg font-semibold mb-2">SAE - IESS</h3>
          <p className="text-sm text-gray-600 mb-4">
            Sistema de Aviso de Entrada para declaración de aportes al IESS.
          </p>
          <button onClick={() => generarReporte('sae')} disabled={cargando === 'sae'}
            className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
            <Download size={20} className="mr-2" />
            {cargando === 'sae' ? 'Generando...' : 'Generar XML SAE'}
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <FileText className="text-purple-500 mb-4" size={40} />
          <h3 className="text-lg font-semibold mb-2">Archivo Bancario</h3>
          <p className="text-sm text-gray-600 mb-4">
            Archivo CSV para pago de nómina vía transferencia bancaria.
          </p>
          <button onClick={() => generarReporte('banco')} disabled={cargando === 'banco'}
            className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
            <Download size={20} className="mr-2" />
            {cargando === 'banco' ? 'Generando...' : 'Generar Archivo'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DescargarReportes;
'''

with open('frontend-web/src/pages/Nomina/DescargarReportes.jsx', 'w') as f:
    f.write(descargar_reportes)

print("✓ Páginas de nómina creadas")
 # Result 
✓ Páginas de nómina creadas
