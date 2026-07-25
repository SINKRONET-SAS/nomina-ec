import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileBarChart2 } from 'lucide-react';
import { authenticatedApi } from '../../services/authenticatedApi';
import { extractApiError } from '../../services/publicApi';
import { currentPeriodEC, formatDateEC } from '../../utils/dateFormat';
import { downloadBlob } from '../../utils/downloadBlob';
import { money } from '../../utils/money';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function ReporteNovedades() {
  const currentPeriod = currentPeriodEC();
  const [anio, setAnio] = useState(currentPeriod.anio);
  const [mes, setMes] = useState(currentPeriod.mes);
  const [estado, setEstado] = useState('');
  const [origen, setOrigen] = useState('');
  const [buscar, setBuscar] = useState('');

  const filters = { estado, origen, buscar };
  const reporteQuery = useQuery({
    queryKey: ['reporte-novedades', anio, mes, estado, origen, buscar],
    queryFn: async () => {
      const response = await authenticatedApi.get(`/reportes/novedades/${anio}/${mes}`, { params: filters });
      return response.data.reporte;
    },
  });

  async function downloadReport() {
    const response = await authenticatedApi.get(`/reportes/novedades/${anio}/${mes}.csv`, {
      params: filters,
      responseType: 'blob',
    });
    downloadBlob(response.data, `reporte_novedades_${anio}_${String(mes).padStart(2, '0')}.csv`);
  }

  const reporte = reporteQuery.data || { resumen: {}, filas: [] };
  const resumen = reporte.resumen || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-800">Asistencia y nómina</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">Reporte de novedades</h1>
          <p className="mt-2 text-sm text-slate-600">Verifica novedades manuales y masivas por periodo, estado, origen, empleado, horas y monto.</p>
        </div>
        <button className="inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60" disabled={reporteQuery.isLoading} onClick={downloadReport} type="button">
          <Download className="h-4 w-4" /> Descargar CSV
        </button>
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-5">
          <label className="text-sm font-medium text-slate-700">Mes<select className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3" onChange={(event) => setMes(Number(event.target.value))} value={mes}>{MONTHS.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select></label>
          <label className="text-sm font-medium text-slate-700">Año<input className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3" min="2020" max="2100" onChange={(event) => setAnio(Number(event.target.value))} type="number" value={anio} /></label>
          <label className="text-sm font-medium text-slate-700">Estado<select className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3" onChange={(event) => setEstado(event.target.value)} value={estado}><option value="">Todos</option><option value="pendiente">Pendiente</option><option value="aprobado">Aprobado</option><option value="rechazado">Rechazado</option><option value="anulado">Anulado</option></select></label>
          <label className="text-sm font-medium text-slate-700">Origen<select className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3" onChange={(event) => setOrigen(event.target.value)} value={origen}><option value="">Todos</option><option value="manual">Manual</option><option value="carga_masiva">Carga masiva</option><option value="asistencia">Dia laborable calculado</option></select></label>
          <label className="text-sm font-medium text-slate-700 md:col-span-2 xl:col-span-1">Buscar<input className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3" onChange={(event) => setBuscar(event.target.value)} placeholder="Empleado o cédula" value={buscar} /></label>
        </div>
      </section>

      {reporteQuery.isError && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{extractApiError(reporteQuery.error, 'No pudimos cargar el reporte de novedades.')}</div>}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {[['Total', resumen.total || 0], ['Horas', Number(resumen.totalHoras || 0).toFixed(2)], ['Monto', money(resumen.totalMonto || 0)], ['Manual', resumen.manual || 0], ['Carga masiva', resumen.cargaMasiva || 0], ['Asistencia', resumen.asistencia || 0]].map(([label, value]) => <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm" key={label}><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-slate-950">{value}</p></div>)}
      </section>

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3"><FileBarChart2 className="h-5 w-5 text-teal-700" /><h2 className="font-semibold text-slate-950">Detalle de cargas</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Empleado</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Origen</th><th className="px-4 py-3 text-right">Horas</th><th className="px-4 py-3 text-right">Monto</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Justificación</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {reporteQuery.isLoading ? <tr><td className="px-4 py-8 text-center" colSpan="8">Cargando reporte...</td></tr> : reporte.filas.length === 0 ? <tr><td className="px-4 py-8 text-center text-slate-500" colSpan="8">No hay novedades para los filtros seleccionados.</td></tr> : reporte.filas.map((row) => <tr className="hover:bg-slate-50" key={row.id}><td className="px-4 py-3"><p className="font-medium text-slate-900">{row.empleado_nombre}</p><p className="text-xs text-slate-500">{row.cedula}</p></td><td className="px-4 py-3">{formatDateEC(row.fecha)}</td><td className="px-4 py-3">{row.tipo_novedad}</td><td className="px-4 py-3">{row.origen === 'carga_masiva' ? 'Carga masiva' : row.origen === 'asistencia' ? 'Dia laborable calculado' : 'Manual'}</td><td className="px-4 py-3 text-right">{Number(row.horas || 0).toFixed(2)}</td><td className="px-4 py-3 text-right font-semibold">{money(row.monto || 0)}</td><td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{row.estado}</span>{row.consumida_por_rol && <p className="mt-1 text-xs text-amber-700">Consumida por rol</p>}</td><td className="max-w-xs px-4 py-3 text-slate-600">{row.justificacion || '—'}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
