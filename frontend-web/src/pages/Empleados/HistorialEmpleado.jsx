import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { authenticatedApi } from '../../services/authenticatedApi';
import { formatDateEC } from '../../utils/dateFormat';

const moneyFormatter = new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

function money(value) {
  return moneyFormatter.format(Number(value || 0));
}

function HistorialEmpleado() {
  const { id } = useParams();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['empleado-historial', id],
    queryFn: async () => {
      const [employeeResponse, historyResponse] = await Promise.all([
        authenticatedApi.get(`/empleados/${id}`),
        authenticatedApi.get(`/empleados/${id}/historial`),
      ]);
      return {
        empleado: employeeResponse.data.empleado,
        history: historyResponse.data.history,
      };
    },
  });

  const empleado = data?.empleado;
  const history = data?.history || { roles: [], novedades: [], permisos: [], documentos: [], resumen: {} };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700" to="/dashboard/empleados">
            <ArrowLeft className="h-4 w-4" />
            Volver a empleados
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">Historial laboral</h1>
          <p className="mt-1 text-sm text-slate-600">
            {empleado ? `${empleado.nombres} ${empleado.apellidos} - ${empleado.cedula}` : 'Ficha laboral agrupada'}
          </p>
        </div>
      </div>

      {isLoading && <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">Cargando historial...</div>}
      {isError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error?.response?.data?.message || 'No pudimos cargar el historial laboral.'}
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <section className="grid gap-3 md:grid-cols-4">
            {[
              ['Roles', history.resumen?.roles || 0],
              ['Novedades', history.resumen?.novedades || 0],
              ['Permisos', history.resumen?.permisos || 0],
              ['Documentos', history.resumen?.documentos || 0],
            ].map(([label, value]) => (
              <div className="rounded-lg border border-slate-200 bg-white p-4" key={label}>
                <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
              </div>
            ))}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-950">Roles de pago</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Periodo</th>
                    <th className="px-3 py-2">Ingresos</th>
                    <th className="px-3 py-2">Deducciones</th>
                    <th className="px-3 py-2">Neto</th>
                    <th className="px-3 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.roles.length === 0 ? (
                    <tr><td className="px-3 py-3 text-slate-600" colSpan="5">Sin roles registrados.</td></tr>
                  ) : history.roles.map((rol) => (
                    <tr key={rol.id}>
                      <td className="px-3 py-2">{rol.anio}-{String(rol.mes).padStart(2, '0')}</td>
                      <td className="px-3 py-2">{money(rol.total_ingresos)}</td>
                      <td className="px-3 py-2">{money(rol.total_deducciones)}</td>
                      <td className="px-3 py-2 font-semibold">{money(rol.neto_recibir)}</td>
                      <td className="px-3 py-2">{rol.estado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-950">Novedades y permisos</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {history.novedades.length === 0 ? (
                <p className="text-sm text-slate-600">Sin novedades registradas.</p>
              ) : history.novedades.map((item) => (
                <div className="rounded-md border border-slate-200 p-3" key={item.id}>
                  <p className="text-sm font-semibold text-slate-950">{String(item.tipo_novedad || '').replace(/_/g, ' ')}</p>
                  <p className="mt-1 text-xs text-slate-600">{formatDateEC(item.fecha)} - {item.estado}</p>
                  <p className="mt-2 text-sm text-slate-700">{item.justificacion || 'Sin justificacion'}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-950">Documentos</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {history.documentos.length === 0 ? (
                <p className="text-sm text-slate-600">Sin documentos asociados.</p>
              ) : history.documentos.map((documento) => (
                <a
                  className="flex items-center gap-3 rounded-md border border-slate-200 p-3 text-sm font-semibold text-teal-700 hover:border-teal-300"
                  href={documento.documento_url}
                  key={documento.id}
                  rel="noreferrer"
                  target="_blank"
                >
                  <FileText className="h-4 w-4" />
                  {documento.tipo_documento} - {documento.firmado ? 'Firmado' : 'Pendiente'}
                </a>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default HistorialEmpleado;
