import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authenticatedApi } from '../../services/authenticatedApi';

function formatHours(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
}

function ReporteAsistencia() {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);

  const { data: reporte, isLoading } = useQuery({
    queryKey: ['reporte-asistencia', anio, mes],
    queryFn: async () => {
      const response = await authenticatedApi.get(`/reportes/asistencia/${anio}/${mes}`);
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Extras 50% (horas)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Extras 100% (horas)</th>
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
                    <td className="px-6 py-4 text-sm">{formatHours(r.horas_extra_50)}</td>
                    <td className="px-6 py-4 text-sm">{formatHours(r.horas_extra_100)}</td>
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

