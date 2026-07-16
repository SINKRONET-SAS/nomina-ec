import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarPlus, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { authenticatedApi } from '../../services/authenticatedApi';
import { extractApiError } from '../../services/publicApi';
import { currentPeriodEC } from '../../utils/dateFormat';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function formatHours(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
}

function ReporteAsistencia() {
  const currentPeriod = currentPeriodEC();
  const [anio, setAnio] = useState(currentPeriod.anio);
  const [mes, setMes] = useState(currentPeriod.mes);

  const reporteQuery = useQuery({
    queryKey: ['reporte-asistencia', anio, mes],
    queryFn: async () => {
      const response = await authenticatedApi.get(`/reportes/asistencia/${anio}/${mes}`);
      return response.data.reporte;
    },
  });

  const reporte = reporteQuery.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-teal-800">Asistencia</p>
          <h1 className="text-2xl font-bold text-slate-950">Reporte mensual</h1>
          <p className="mt-2 text-sm text-slate-600">Revisa marcaciones, atrasos, extras y faltas aprobadas por empleado.</p>
        </div>
        <Link
          className="inline-flex min-h-10 w-fit items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
          to="/dashboard/asistencia/novedades"
        >
          <CalendarPlus className="h-4 w-4" />
          Registrar asistencia
        </Link>
      </div>

      <div className="flex items-start gap-3 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Sin marcaciones no significa falta ni impide calcular el rol. Solo una falta aprobada genera descuento; sueldo y ausencias se prorratean sobre una base mensual de 30 días.</p>
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-4">
          <label className="block text-sm font-medium text-slate-700">
            Mes
            <select
              className="mt-1 min-h-10 rounded-md border border-slate-300 px-3"
              onChange={(event) => setMes(Number(event.target.value))}
              value={mes}
            >
              {MONTHS.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Año
            <input
              className="mt-1 min-h-10 w-28 rounded-md border border-slate-300 px-3"
              max="2100"
              min="2020"
              onChange={(event) => setAnio(Number(event.target.value))}
              type="number"
              value={anio}
            />
          </label>
        </div>
      </section>

      {reporteQuery.isError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {extractApiError(reporteQuery.error, 'No pudimos cargar el reporte de asistencia.')}
        </div>
      )}

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-slate-500">Empleado</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-slate-500">Control</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase text-slate-500">Días con marcación</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase text-slate-500">Faltas aprobadas</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase text-slate-500">Atrasos (min)</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase text-slate-500">Extras 50% (h)</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase text-slate-500">Extras 100% (h)</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase text-slate-500">Extras nocturnas (h)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reporteQuery.isLoading ? (
                <tr><td className="px-5 py-6 text-center text-sm text-slate-600" colSpan="8">Cargando reporte...</td></tr>
              ) : reporte.length === 0 ? (
                <tr><td className="px-5 py-6 text-center text-sm text-slate-600" colSpan="8">No hay empleados vinculados a este período.</td></tr>
              ) : (
                reporte.map((row) => (
                  <tr className="hover:bg-slate-50" key={row.empleado_id}>
                    <td className="px-5 py-3 text-sm font-medium text-slate-900">{row.nombre}</td>
                    <td className="px-5 py-3 text-sm">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${row.controla_asistencia ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                        {row.controla_asistencia ? 'Activo' : 'No aplica'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-sm">{row.controla_asistencia ? (row.dias_con_marcacion || 0) : '-'}</td>
                    <td className="px-5 py-3 text-right text-sm">{row.faltas_aprobadas || 0}</td>
                    <td className="px-5 py-3 text-right text-sm">{row.minutos_tardia || 0}</td>
                    <td className="px-5 py-3 text-right text-sm">{formatHours(row.horas_extra_50)}</td>
                    <td className="px-5 py-3 text-right text-sm">{formatHours(row.horas_extra_100)}</td>
                    <td className="px-5 py-3 text-right text-sm">{formatHours(row.horas_extra_nocturna)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default ReporteAsistencia;
