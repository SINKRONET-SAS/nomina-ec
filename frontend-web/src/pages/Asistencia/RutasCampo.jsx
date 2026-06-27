import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Edit3, FileSpreadsheet, FileText, MapPin, Plus, Route, Save, Trash2 } from 'lucide-react';
import { authenticatedApi } from '../../services/authenticatedApi';
import { extractApiError } from '../../services/publicApi';
import {
  createRouteDay,
  deleteRouteSite,
  downloadRouteReport,
  fetchRouteReport,
  fetchRouteDays,
  fetchRouteExceptions,
  fetchRouteSites,
  reviewRouteException,
  saveRouteSite,
} from '../../services/rutasApi';

const CONTROL = 'min-h-10 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100';

function todayEc() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

const emptySite = {
  code: '',
  name: '',
  clientName: '',
  address: '',
  latitude: '',
  longitude: '',
  radiusMeters: 120,
  minAccuracyMeters: 80,
  requiresPhoto: false,
  requiresQr: false,
  allowsUnplanned: true,
  status: 'activo',
  organizationUnitId: '',
};

function siteToForm(site) {
  return {
    code: site.code || '',
    name: site.name || '',
    clientName: site.clientName || '',
    address: site.address || '',
    latitude: site.latitude ?? '',
    longitude: site.longitude ?? '',
    radiusMeters: site.radiusMeters || 120,
    minAccuracyMeters: site.minAccuracyMeters || 80,
    requiresPhoto: Boolean(site.requiresPhoto),
    requiresQr: Boolean(site.requiresQr),
    allowsUnplanned: site.allowsUnplanned !== false,
    status: site.status || 'activo',
    organizationUnitId: site.organizationUnitId || '',
  };
}

function Stat({ label, value }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function RutasCampo() {
  const queryClient = useQueryClient();
  const [fecha, setFecha] = useState(todayEc());
  const [fechaInicioReporte, setFechaInicioReporte] = useState(todayEc());
  const [fechaFinReporte, setFechaFinReporte] = useState(todayEc());
  const [siteForm, setSiteForm] = useState(emptySite);
  const [editingSiteId, setEditingSiteId] = useState(null);
  const [routeForm, setRouteForm] = useState({ empleadoId: '', fecha: todayEc() });
  const [draftStops, setDraftStops] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [error, setError] = useState('');

  const sitesQuery = useQuery({ queryKey: ['route-sites'], queryFn: fetchRouteSites });
  const daysQuery = useQuery({ queryKey: ['route-days', fecha], queryFn: () => fetchRouteDays({ fecha }) });
  const exceptionsQuery = useQuery({ queryKey: ['route-exceptions', fecha], queryFn: () => fetchRouteExceptions({ fecha }) });
  const routeReportQuery = useQuery({
    queryKey: ['route-report', fechaInicioReporte, fechaFinReporte],
    queryFn: () => fetchRouteReport({ fechaInicio: fechaInicioReporte, fechaFin: fechaFinReporte }),
  });
  const employeesQuery = useQuery({
    queryKey: ['empleados-activos-rutas'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/empleados');
      return response.data.empleados || [];
    },
  });

  const sites = sitesQuery.data || [];
  const routeDays = daysQuery.data || [];
  const exceptions = exceptionsQuery.data || [];
  const routeReport = routeReportQuery.data || { rows: [], total: 0 };
  const employees = employeesQuery.data || [];

  const activeSites = useMemo(() => sites.filter((site) => site.status === 'activo'), [sites]);

  const invalidateRoutes = () => {
    queryClient.invalidateQueries({ queryKey: ['route-sites'] });
    queryClient.invalidateQueries({ queryKey: ['route-days'] });
    queryClient.invalidateQueries({ queryKey: ['route-exceptions'] });
  };

  const siteMutation = useMutation({
    mutationFn: () => saveRouteSite({
      ...siteForm,
      organizationUnitId: siteForm.organizationUnitId || null,
    }, editingSiteId),
    onSuccess: () => {
      setSiteForm(emptySite);
      setEditingSiteId(null);
      setError('');
      invalidateRoutes();
    },
    onError: (err) => setError(extractApiError(err, 'No pudimos guardar el sitio.')),
  });

  const deleteSiteMutation = useMutation({
    mutationFn: deleteRouteSite,
    onSuccess: invalidateRoutes,
    onError: (err) => setError(extractApiError(err, 'No pudimos eliminar el sitio. Si ya tiene rutas, dejalo inactivo.')),
  });

  const routeMutation = useMutation({
    mutationFn: () => createRouteDay({
      empleadoId: routeForm.empleadoId,
      fecha: routeForm.fecha,
      stops: draftStops,
    }),
    onSuccess: () => {
      setDraftStops([]);
      setSelectedSiteId('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['route-days'] });
    },
    onError: (err) => setError(extractApiError(err, 'No pudimos asignar la ruta.')),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, payload }) => reviewRouteException(id, payload),
    onSuccess: invalidateRoutes,
    onError: (err) => setError(extractApiError(err, 'No pudimos revisar la excepcion.')),
  });

  const updateSiteForm = (field, value) => setSiteForm((current) => ({ ...current, [field]: value }));

  const addStop = () => {
    if (!selectedSiteId) return;
    if (draftStops.some((stop) => stop.siteId === selectedSiteId)) return;
    setDraftStops((current) => [...current, { siteId: selectedSiteId, sequenceOrder: current.length + 1 }]);
    setSelectedSiteId('');
  };

  const downloadBlob = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportReport = async (format) => {
    try {
      setError('');
      const blob = await downloadRouteReport(format, { fechaInicio: fechaInicioReporte, fechaFin: fechaFinReporte });
      downloadBlob(blob, `rutas-${fechaInicioReporte}-${fechaFinReporte}.${format}`);
      setError('');
    } catch (err) {
      setError(extractApiError(err, 'No pudimos exportar rutas.'));
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Rutas de campo</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Mercaderistas y visitas por tienda</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Gestiona sitios, rutas diarias, visitas no programadas y excepciones GPS. La jornada sigue alimentando nomina; las visitas alimentan operacion.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input className={CONTROL} type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} />
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <Stat label="Sitios activos" value={activeSites.length} />
          <Stat label="Rutas del dia" value={routeDays.length} />
          <Stat label="Visitas completadas" value={routeDays.reduce((total, day) => total + Number(day.totals?.completed || 0), 0)} />
          <Stat label="Excepciones" value={exceptions.length} />
        </div>
      </section>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div> : null}

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Reporte de entradas y salidas</h2>
            <p className="mt-1 text-sm text-slate-600">
              Consulta las llegadas y salidas registradas en cada sitio visitado dentro del rango seleccionado.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Desde
              <input className={CONTROL} type="date" value={fechaInicioReporte} onChange={(event) => setFechaInicioReporte(event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Hasta
              <input className={CONTROL} type="date" value={fechaFinReporte} onChange={(event) => setFechaFinReporte(event.target.value)} />
            </label>
            <button className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => exportReport('pdf')} type="button">
              <FileText size={16} /> PDF
            </button>
            <button className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => exportReport('csv')} type="button">
              <Download size={16} /> CSV
            </button>
            <button className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => exportReport('xlsx')} type="button">
              <FileSpreadsheet size={16} /> Excel
            </button>
          </div>
        </div>
        <div className="mt-4 overflow-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Empleado</th>
                <th className="px-3 py-2 text-left">Sitio</th>
                <th className="px-3 py-2 text-left">Llegada</th>
                <th className="px-3 py-2 text-left">Salida</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-left">Zona</th>
                <th className="px-3 py-2 text-left">Excepciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {routeReport.rows.map((row, index) => (
                <tr key={`${row.fecha}-${row.cedula}-${row.sitio}-${index}`}>
                  <td className="px-3 py-2">{row.fecha}</td>
                  <td className="px-3 py-2">
                    <p className="font-semibold text-slate-900">{row.empleado}</p>
                    <p className="text-xs text-slate-500">{row.cedula}</p>
                  </td>
                  <td className="px-3 py-2">{row.sitio || 'No programada'}</td>
                  <td className="px-3 py-2">{row.llegada || 'Pendiente'}</td>
                  <td className="px-3 py-2">{row.salida || 'Pendiente'}</td>
                  <td className="px-3 py-2">{row.estado}</td>
                  <td className="px-3 py-2">{row.dentroZona ? 'Dentro' : `Fuera (${row.distanciaMaximaMetros} m)`}</td>
                  <td className="px-3 py-2">{row.excepciones}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {routeReportQuery.isLoading ? <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">Cargando reporte...</p> : null}
          {!routeReportQuery.isLoading && routeReport.rows.length === 0 ? <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">No hay entradas o salidas registradas en el rango seleccionado.</p> : null}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <MapPin className="text-teal-700" size={20} />
            <h2 className="text-lg font-semibold text-slate-950">{editingSiteId ? 'Editar sitio' : 'Nuevo sitio'}</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Codigo
              <input className={CONTROL} value={siteForm.code} onChange={(event) => updateSiteForm('code', event.target.value)} placeholder="TIA_CEIBOS" />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Nombre
              <input className={CONTROL} value={siteForm.name} onChange={(event) => updateSiteForm('name', event.target.value)} placeholder="Tienda Ceibos" />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Cliente
              <input className={CONTROL} value={siteForm.clientName} onChange={(event) => updateSiteForm('clientName', event.target.value)} placeholder="Cliente o cadena" />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Estado
              <select className={CONTROL} value={siteForm.status} onChange={(event) => updateSiteForm('status', event.target.value)}>
                <option value="activo">activo</option>
                <option value="inactivo">inactivo</option>
                <option value="archivado">archivado</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">
              Direccion
              <input className={CONTROL} value={siteForm.address} onChange={(event) => updateSiteForm('address', event.target.value)} placeholder="Direccion referencial" />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Latitud
              <input className={CONTROL} value={siteForm.latitude} onChange={(event) => updateSiteForm('latitude', event.target.value)} placeholder="-2.170998" />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Longitud
              <input className={CONTROL} value={siteForm.longitude} onChange={(event) => updateSiteForm('longitude', event.target.value)} placeholder="-79.922359" />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Radio metros
              <input className={CONTROL} type="number" value={siteForm.radiusMeters} onChange={(event) => updateSiteForm('radiusMeters', event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Precision minima
              <input className={CONTROL} type="number" value={siteForm.minAccuracyMeters} onChange={(event) => updateSiteForm('minAccuracyMeters', event.target.value)} />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-700">
            <label className="inline-flex items-center gap-2"><input checked={siteForm.requiresPhoto} onChange={(event) => updateSiteForm('requiresPhoto', event.target.checked)} type="checkbox" /> Foto obligatoria</label>
            <label className="inline-flex items-center gap-2"><input checked={siteForm.requiresQr} onChange={(event) => updateSiteForm('requiresQr', event.target.checked)} type="checkbox" /> QR requerido</label>
            <label className="inline-flex items-center gap-2"><input checked={siteForm.allowsUnplanned} onChange={(event) => updateSiteForm('allowsUnplanned', event.target.checked)} type="checkbox" /> Permite no programada</label>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button className="inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800" disabled={siteMutation.isPending} onClick={() => siteMutation.mutate()} type="button">
              <Save size={16} /> {editingSiteId ? 'Actualizar sitio' : 'Guardar sitio'}
            </button>
            {editingSiteId ? (
              <button className="min-h-10 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700" onClick={() => { setEditingSiteId(null); setSiteForm(emptySite); }} type="button">
                Cancelar
              </button>
            ) : null}
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Sitios registrados</h2>
          <div className="mt-4 max-h-[460px] divide-y divide-slate-100 overflow-auto">
            {sitesQuery.isLoading ? <p className="text-sm text-slate-500">Cargando sitios...</p> : null}
            {sites.map((site) => (
              <div className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between" key={site.id}>
                <div>
                  <p className="font-semibold text-slate-950">{site.name}</p>
                  <p className="text-sm text-slate-500">{site.code} | {site.clientName || 'Sin cliente'} | radio {site.radiusMeters} m</p>
                  <p className="text-xs text-slate-500">{site.address || 'Sin direccion'}</p>
                </div>
                <div className="flex gap-2">
                  <button className="inline-flex min-h-9 items-center gap-1 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700" onClick={() => { setEditingSiteId(site.id); setSiteForm(siteToForm(site)); }} type="button">
                    <Edit3 size={15} /> Editar
                  </button>
                  <button className="inline-flex min-h-9 items-center gap-1 rounded-md border border-red-200 px-3 text-sm font-semibold text-red-700" onClick={() => deleteSiteMutation.mutate(site.id)} type="button">
                    <Trash2 size={15} /> Eliminar
                  </button>
                </div>
              </div>
            ))}
            {!sitesQuery.isLoading && sites.length === 0 ? <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">Aun no hay sitios de visita.</p> : null}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Route className="text-teal-700" size={20} />
            <h2 className="text-lg font-semibold text-slate-950">Asignar ruta diaria</h2>
          </div>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Empleado
              <select className={CONTROL} value={routeForm.empleadoId} onChange={(event) => setRouteForm((current) => ({ ...current, empleadoId: event.target.value }))}>
                <option value="">Seleccione...</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.apellidos} {employee.nombres} - {employee.cargo}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Fecha
              <input className={CONTROL} type="date" value={routeForm.fecha} onChange={(event) => setRouteForm((current) => ({ ...current, fecha: event.target.value }))} />
            </label>
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-slate-700">Agregar tienda</label>
              <div className="flex gap-2">
                <select className={`${CONTROL} flex-1`} value={selectedSiteId} onChange={(event) => setSelectedSiteId(event.target.value)}>
                  <option value="">Seleccione sitio...</option>
                  {activeSites.map((site) => <option key={site.id} value={site.id}>{site.name} ({site.code})</option>)}
                </select>
                <button className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={addStop} type="button">
                  <Plus size={16} /> Agregar
                </button>
              </div>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              {draftStops.length === 0 ? <p className="text-sm text-slate-500">Agrega al menos una tienda.</p> : null}
              {draftStops.map((stop, index) => {
                const site = sites.find((item) => item.id === stop.siteId);
                return (
                  <div className="flex items-center justify-between py-2 text-sm" key={stop.siteId}>
                    <span>{index + 1}. {site?.name || stop.siteId}</span>
                    <button className="font-semibold text-red-700" onClick={() => setDraftStops((current) => current.filter((item) => item.siteId !== stop.siteId))} type="button">Quitar</button>
                  </div>
                );
              })}
            </div>
            <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-300" disabled={!routeForm.empleadoId || draftStops.length === 0 || routeMutation.isPending} onClick={() => routeMutation.mutate()} type="button">
              <Save size={16} /> Guardar ruta
            </button>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Rutas del dia</h2>
          <div className="mt-4 max-h-[420px] divide-y divide-slate-100 overflow-auto">
            {daysQuery.isLoading ? <p className="text-sm text-slate-500">Cargando rutas...</p> : null}
            {routeDays.map((day) => (
              <div className="py-3" key={day.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{day.employeeName}</p>
                    <p className="text-sm text-slate-500">{day.cargo || 'Sin cargo'} | {day.operationalDate}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{day.status}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {day.totals?.total || 0} paradas | {day.totals?.completed || 0} completadas | {day.totals?.exceptions || 0} con excepcion
                </p>
              </div>
            ))}
            {!daysQuery.isLoading && routeDays.length === 0 ? <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">No hay rutas asignadas para la fecha.</p> : null}
          </div>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Excepciones pendientes</h2>
        <div className="mt-4 overflow-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Empleado</th>
                <th className="px-3 py-2 text-left">Sitio</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-left">Motivo</th>
                <th className="px-3 py-2 text-left">Accion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {exceptions.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2">{item.employee_name}</td>
                  <td className="px-3 py-2">{item.site_name || 'No programada'}</td>
                  <td className="px-3 py-2">{item.exception_type}</td>
                  <td className="px-3 py-2">{item.status}</td>
                  <td className="px-3 py-2">{item.reason}</td>
                  <td className="px-3 py-2">
                    {item.status === 'pending_review' ? (
                      <div className="flex gap-2">
                        <button className="rounded-md bg-teal-700 px-3 py-2 text-xs font-semibold text-white" onClick={() => reviewMutation.mutate({ id: item.id, payload: { status: 'approved', resolution: 'Aprobada por supervisor.' } })} type="button">Aprobar</button>
                        <button className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700" onClick={() => reviewMutation.mutate({ id: item.id, payload: { status: 'rejected', resolution: 'Rechazada por supervisor.' } })} type="button">Rechazar</button>
                      </div>
                    ) : <span className="text-slate-500">Revisada</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!exceptionsQuery.isLoading && exceptions.length === 0 ? <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">No hay excepciones para la fecha.</p> : null}
        </div>
      </section>
    </div>
  );
}

export default RutasCampo;
