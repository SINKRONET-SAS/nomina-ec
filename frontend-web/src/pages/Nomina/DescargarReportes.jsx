import React, { useState } from 'react';
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

