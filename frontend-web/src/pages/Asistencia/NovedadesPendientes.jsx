import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authenticatedApi } from '../../services/authenticatedApi';
import { CalendarCheck2, Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { formatDateEC, todayISOEC } from '../../utils/dateFormat';
import {
  buildNoveltyTypeOptions,
  getNoveltyTypeLabel,
  hoursToMinutes,
  isAmountNoveltyType,
  minutesToHours,
} from '../../config/noveltyTypes';

const initialForm = {
  empleadoId: '',
  fecha: new Date().toISOString().slice(0, 10),
  tipoNovedad: 'hora_extra_50',
  minutos: '60',
  monto: '',
  justificacion: '',
};

const today = todayISOEC();
const initialAttendanceForm = {
  empleadoId: '',
  fecha: today,
  mes: today.slice(0, 7),
  desde: today,
  hasta: today,
  horaInicio: '08:00',
  horaFin: '17:00',
  justificacion: '',
};

function monthBounds(month) {
  const [year, monthNumber] = String(month || '').split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`;
  return {
    desde: `${month}-01`,
    hasta: month === today.slice(0, 7) ? today : monthEnd,
  };
}

function NovedadesPendientes() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initialForm);
  const [bulkCsv, setBulkCsv] = useState('');
  const [bulkResult, setBulkResult] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editingNovelty, setEditingNovelty] = useState(null);
  const [attendanceScope, setAttendanceScope] = useState('employee');
  const [attendancePeriod, setAttendancePeriod] = useState('day');
  const [attendanceForm, setAttendanceForm] = useState(initialAttendanceForm);
  
  const { data: novedades, isLoading } = useQuery({
    queryKey: ['novedades-pendientes'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/novedades/pendientes?scope=operativas');
      return response.data.novedades;
    }
  });

  const { data: empleados } = useQuery({
    queryKey: ['empleados-novedad-manual'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/empleados');
      return response.data.empleados || response.data.data || [];
    },
  });

  const crearMutation = useMutation({
    mutationFn: (payload) => authenticatedApi.post('/novedades', payload),
    onSuccess: () => {
      setMessage('Novedad manual registrada para revisión.');
      setError('');
      setForm(initialForm);
      setEditingNovelty(null);
      queryClient.invalidateQueries({ queryKey: ['novedades-pendientes'] });
    },
    onError: (err) => {
      setMessage('');
      setError(err.response?.data?.message || err.response?.data?.error || 'No pudimos registrar la novedad manual.');
    },
  });

  const asistenciaMutation = useMutation({
    mutationFn: (payload) => authenticatedApi.post('/marcaciones/manual', payload),
    onSuccess: (response) => {
      const result = response.data.asistencia;
      setMessage(`Asistencia registrada: ${result.marcacionesCreadas} marcaciones nuevas y ${result.marcacionesExistentes} ya existentes.`);
      setError('');
      setAttendanceForm((current) => ({ ...current, justificacion: '' }));
      queryClient.invalidateQueries({ queryKey: ['reporte-asistencia'] });
      queryClient.invalidateQueries({ queryKey: ['marcaciones-hoy'] });
    },
    onError: (err) => {
      setMessage('');
      setError(err.response?.data?.message || err.response?.data?.error || 'No pudimos registrar la asistencia manual.');
    },
  });

  const { data: noveltyTypesResponse, isLoading: noveltyTypesLoading } = useQuery({
    queryKey: ['novedades-tipos', form.fecha],
    queryFn: async () => {
      const response = await authenticatedApi.get('/novedades/tipos', {
        params: { fecha: form.fecha },
      });
      return response.data;
    },
  });

  const noveltyTypeOptions = useMemo(
    () => buildNoveltyTypeOptions(noveltyTypesResponse?.tipos || []),
    [noveltyTypesResponse]
  );

  useEffect(() => {
    if (noveltyTypeOptions.length === 0) return;
    if (!noveltyTypeOptions.some((type) => type.value === form.tipoNovedad)) {
      setForm((current) => ({
        ...current,
        tipoNovedad: noveltyTypeOptions[0].value,
        minutos: isAmountNoveltyType(noveltyTypeOptions[0].value, noveltyTypeOptions) ? '0' : current.minutos || '60',
      }));
    }
  }, [form.tipoNovedad, noveltyTypeOptions]);

  const actualizarMutation = useMutation({
    mutationFn: ({ id, payload }) => authenticatedApi.put(`/novedades/${id}`, payload),
    onSuccess: () => {
      setMessage('Novedad actualizada y devuelta a revision.');
      setError('');
      setEditingNovelty(null);
      setForm(initialForm);
      queryClient.invalidateQueries({ queryKey: ['novedades-pendientes'] });
    },
    onError: (err) => {
      setMessage('');
      setError(err.response?.data?.message || err.response?.data?.error || 'No pudimos actualizar la novedad.');
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: (id) => authenticatedApi.delete(`/novedades/${id}`),
    onSuccess: () => {
      setMessage('Novedad eliminada antes de ser consumida por rol.');
      setError('');
      setEditingNovelty(null);
      setForm(initialForm);
      queryClient.invalidateQueries({ queryKey: ['novedades-pendientes'] });
    },
    onError: (err) => {
      setMessage('');
      setError(err.response?.data?.message || err.response?.data?.error || 'No pudimos eliminar la novedad.');
    },
  });

  const cargaMasivaMutation = useMutation({
    mutationFn: (rows) => authenticatedApi.post('/novedades/carga-masiva', { rows }),
    onSuccess: (response) => {
      setBulkResult(response.data);
      setMessage(`Carga masiva procesada: ${response.data.creadas || 0} creadas, ${response.data.errores || 0} con error.`);
      setError('');
      queryClient.invalidateQueries({ queryKey: ['novedades-pendientes'] });
    },
    onError: (err) => {
      setBulkResult(null);
      setMessage('');
      setError(err.response?.data?.message || err.response?.data?.error || 'No pudimos procesar la carga masiva.');
    },
  });

  const aprobarMutation = useMutation({
    mutationFn: (id) => authenticatedApi.put(`/novedades/${id}/aprobar`),
    onSuccess: () => queryClient.invalidateQueries(['novedades-pendientes'])
  });

  const rechazarMutation = useMutation({
    mutationFn: (id) => authenticatedApi.put(`/novedades/${id}/rechazar`),
    onSuccess: () => queryClient.invalidateQueries(['novedades-pendientes'])
  });

  function updateField(name, value) {
    setMessage('');
    setError('');
    setForm((current) => ({ ...current, [name]: value }));
  }

  function updateNoveltyType(value) {
    setMessage('');
    setError('');
    setForm((current) => ({
      ...current,
      tipoNovedad: value,
      minutos: isAmountNoveltyType(value, noveltyTypeOptions) ? '0' : current.minutos || '60',
    }));
  }

  function submitManualNovelty(event) {
    event.preventDefault();
    const payload = {
      empleadoId: form.empleadoId,
      fecha: form.fecha,
      tipoNovedad: form.tipoNovedad,
      horas: Number(minutesToHours(form.minutos) || 0),
      monto: Number(form.monto || 0),
      justificacion: form.justificacion,
    };
    if (editingNovelty?.id) {
      actualizarMutation.mutate({ id: editingNovelty.id, payload });
      return;
    }
    crearMutation.mutate(payload);
  }

  function startEditNovelty(nov) {
    setMessage('');
    setError('');
    setEditingNovelty(nov);
    setForm({
      empleadoId: nov.empleado_id || '',
      fecha: String(nov.fecha || '').slice(0, 10),
      tipoNovedad: nov.tipo_novedad || 'hora_extra_50',
      minutos: String(nov.minutos || 0),
      monto: String(nov.monto || ''),
      justificacion: nov.justificacion || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEditNovelty() {
    setEditingNovelty(null);
    setForm(initialForm);
    setMessage('');
    setError('');
  }

  function deleteNovelty(nov) {
    const employeeName = `${nov.nombres || ''} ${nov.apellidos || ''}`.trim();
    const accepted = window.confirm(`Eliminar novedad de ${employeeName || 'empleado'} del ${String(nov.fecha || '').slice(0, 10)} antes de que sea consumida por rol.`);
    if (accepted) {
      eliminarMutation.mutate(nov.id);
    }
  }

  async function descargarPlantilla() {
    try {
      const response = await authenticatedApi.get('/novedades/plantilla-carga-masiva', {
        responseType: 'blob',
      });
      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'plantilla_carga_masiva_novedades.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError(err.response?.data?.message || 'No pudimos descargar la plantilla de novedades.');
    }
  }

  function submitBulkNovelty(event) {
    event.preventDefault();
    try {
      const rows = parseCsvRows(bulkCsv);
      cargaMasivaMutation.mutate(rows);
    } catch (err) {
      setError(err.message);
      setMessage('');
    }
  }

  function updateAttendanceField(name, value) {
    setMessage('');
    setError('');
    setAttendanceForm((current) => ({ ...current, [name]: value }));
  }

  function submitManualAttendance(event) {
    event.preventDefault();
    let range;
    if (attendancePeriod === 'month') {
      range = monthBounds(attendanceForm.mes);
    } else if (attendancePeriod === 'range') {
      range = { desde: attendanceForm.desde, hasta: attendanceForm.hasta };
    } else {
      range = { desde: attendanceForm.fecha, hasta: attendanceForm.fecha };
    }

    const employee = (empleados || []).find((item) => item.id === attendanceForm.empleadoId);
    const target = attendanceScope === 'all'
      ? `todos los empleados vinculados entre ${range.desde} y ${range.hasta}`
      : `${employee?.apellidos || ''} ${employee?.nombres || ''}`.trim();
    const accepted = window.confirm(`Registrar asistencia manual para ${target || 'el empleado seleccionado'}? Las marcaciones existentes se conservarán.`);
    if (!accepted) return;

    asistenciaMutation.mutate({
      scope: attendanceScope,
      empleadoId: attendanceScope === 'employee' ? attendanceForm.empleadoId : undefined,
      desde: range.desde,
      hasta: range.hasta,
      horaInicio: attendanceForm.horaInicio,
      horaFin: attendanceForm.horaFin,
      justificacion: attendanceForm.justificacion,
    });
  }

  const requiresAmount = isAmountNoveltyType(form.tipoNovedad, noveltyTypeOptions);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Novedades manuales y pendientes</h1>
        <p className="mt-2 text-sm text-slate-600">
          Registra ajustes manuales de nómina o asistencia y aprueba los pendientes antes de calcular el período.
        </p>
      </div>
      {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <CalendarCheck2 className="mt-1 h-5 w-5 text-teal-700" />
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Registrar jornada manual</h2>
            <p className="mt-1 text-sm text-slate-600">Completa marcaciones faltantes sin reemplazar las que ya existen.</p>
          </div>
        </div>

        <form className="mt-5 space-y-5" onSubmit={submitManualAttendance}>
          <div className="grid gap-5 lg:grid-cols-2">
            <fieldset>
              <legend className="text-sm font-semibold text-slate-800">Alcance</legend>
              <div className="mt-2 inline-flex rounded-md border border-slate-300 p-1">
                {[
                  ['employee', 'Un empleado'],
                  ['all', 'Todos'],
                ].map(([value, label]) => (
                  <button
                    className={`min-h-9 rounded px-4 text-sm font-semibold ${attendanceScope === value ? 'bg-teal-700 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                    key={value}
                    onClick={() => setAttendanceScope(value)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-semibold text-slate-800">Período</legend>
              <div className="mt-2 inline-flex flex-wrap rounded-md border border-slate-300 p-1">
                {[
                  ['day', 'Un día'],
                  ['month', 'Mes'],
                  ['range', 'Rango'],
                ].map(([value, label]) => (
                  <button
                    className={`min-h-9 rounded px-4 text-sm font-semibold ${attendancePeriod === value ? 'bg-teal-700 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                    key={value}
                    onClick={() => setAttendancePeriod(value)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {attendanceScope === 'employee' && (
              <label className="block text-sm font-medium text-slate-700 md:col-span-2">
                Empleado
                <select
                  className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3"
                  onChange={(event) => updateAttendanceField('empleadoId', event.target.value)}
                  required
                  value={attendanceForm.empleadoId}
                >
                  <option value="">Seleccionar empleado...</option>
                  {(empleados || []).map((empleado) => (
                    <option disabled={empleado.controla_asistencia === false} key={empleado.id} value={empleado.id}>
                      {empleado.apellidos || ''} {empleado.nombres || ''} - {empleado.cedula || ''}{empleado.controla_asistencia === false ? ' - control desactivado' : ''}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {attendancePeriod === 'day' && (
              <label className="block text-sm font-medium text-slate-700">
                Fecha
                <input
                  className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3"
                  max={today}
                  onChange={(event) => updateAttendanceField('fecha', event.target.value)}
                  required
                  type="date"
                  value={attendanceForm.fecha}
                />
              </label>
            )}

            {attendancePeriod === 'month' && (
              <label className="block text-sm font-medium text-slate-700">
                Mes
                <input
                  className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3"
                  max={today.slice(0, 7)}
                  onChange={(event) => updateAttendanceField('mes', event.target.value)}
                  required
                  type="month"
                  value={attendanceForm.mes}
                />
              </label>
            )}

            {attendancePeriod === 'range' && (
              <>
                <label className="block text-sm font-medium text-slate-700">
                  Desde
                  <input
                    className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3"
                    max={today}
                    onChange={(event) => updateAttendanceField('desde', event.target.value)}
                    required
                    type="date"
                    value={attendanceForm.desde}
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Hasta
                  <input
                    className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3"
                    max={today}
                    min={attendanceForm.desde}
                    onChange={(event) => updateAttendanceField('hasta', event.target.value)}
                    required
                    type="date"
                    value={attendanceForm.hasta}
                  />
                </label>
              </>
            )}

            <label className="block text-sm font-medium text-slate-700">
              Entrada
              <input
                className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3"
                onChange={(event) => updateAttendanceField('horaInicio', event.target.value)}
                required
                type="time"
                value={attendanceForm.horaInicio}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Salida
              <input
                className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3"
                onChange={(event) => updateAttendanceField('horaFin', event.target.value)}
                required
                type="time"
                value={attendanceForm.horaFin}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700 md:col-span-2 xl:col-span-4">
              Motivo del registro
              <textarea
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                minLength="5"
                onChange={(event) => updateAttendanceField('justificacion', event.target.value)}
                placeholder="Ej. regularización autorizada por RRHH"
                required
                rows="2"
                value={attendanceForm.justificacion}
              />
            </label>
          </div>

          {attendancePeriod !== 'day' && (
            <p className="text-xs text-slate-500">En mes o rango se aplican los días laborables y horarios de la jornada configurada. El mes actual se registra hasta hoy; el límite es de 31 días.</p>
          )}

          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={asistenciaMutation.isPending}
            type="submit"
          >
            <CalendarCheck2 className="h-4 w-4" />
            {asistenciaMutation.isPending ? 'Registrando...' : 'Registrar asistencia'}
          </button>
        </form>
      </section>

      <form className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={submitManualNovelty}>
        <div className="flex items-start gap-3">
          <Plus className="mt-1 h-5 w-5 text-teal-700" />
          <div>
            <h2 className="text-lg font-semibold text-slate-950">{editingNovelty ? 'Editar novedad manual' : 'Ingreso manual de novedad'}</h2>
            <p className="mt-1 text-sm text-slate-600">La novedad debe pertenecer a un mes abierto y vuelve a revisión cuando se modifica.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="block text-sm font-medium text-slate-700">
            Empleado
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              required
              value={form.empleadoId}
              onChange={(event) => updateField('empleadoId', event.target.value)}
            >
              <option value="">Seleccionar empleado...</option>
              {(empleados || []).map((empleado) => (
                <option key={empleado.id} value={empleado.id}>
                  {empleado.apellidos || ''} {empleado.nombres || ''} - {empleado.cedula || ''}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Fecha
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              required
              type="date"
              value={form.fecha}
              onChange={(event) => updateField('fecha', event.target.value)}
            />
            <span className="mt-1 block text-xs font-normal text-slate-500">Debe corresponder a un mes de nómina abierto.</span>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Tipo de novedad
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              disabled={noveltyTypesLoading || noveltyTypeOptions.length === 0}
              value={form.tipoNovedad}
              onChange={(event) => updateNoveltyType(event.target.value)}
            >
              {noveltyTypeOptions.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Horas
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              disabled={requiresAmount}
              min="0"
              step="0.01"
              type="number"
              value={minutesToHours(form.minutos)}
              onChange={(event) => updateField('minutos', hoursToMinutes(event.target.value))}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Monto
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              min="0"
              required={requiresAmount}
              step="0.01"
              type="number"
              value={form.monto}
              onChange={(event) => updateField('monto', event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700 md:col-span-2 xl:col-span-3">
            Justificación
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              rows="3"
              value={form.justificacion}
              onChange={(event) => updateField('justificacion', event.target.value)}
              placeholder="Motivo operativo o respaldo de RRHH"
            />
          </label>
        </div>
        <button
          className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          disabled={crearMutation.isPending || actualizarMutation.isPending}
          type="submit"
        >
          <Plus className="h-4 w-4" />
          {editingNovelty
            ? (actualizarMutation.isPending ? 'Actualizando...' : 'Actualizar novedad')
            : (crearMutation.isPending ? 'Registrando...' : 'Registrar novedad')}
        </button>
        {editingNovelty && (
          <button
            className="ml-3 mt-5 inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:border-slate-300"
            onClick={cancelEditNovelty}
            type="button"
          >
            <X className="h-4 w-4" />
            Cancelar
          </button>
        )}
      </form>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Carga masiva de novedades</h2>
            <p className="mt-1 text-sm text-slate-600">
              Usa la plantilla CSV oficial y pega las filas para registrar novedades pendientes por empleado.
            </p>
          </div>
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-teal-200 px-4 text-sm font-semibold text-teal-700 hover:border-teal-400"
            type="button"
            onClick={descargarPlantilla}
          >
            Descargar plantilla
          </button>
        </div>
        <form className="mt-4" onSubmit={submitBulkNovelty}>
          <textarea
            className="min-h-40 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
            value={bulkCsv}
            onChange={(event) => setBulkCsv(event.target.value)}
            placeholder="empleadoId,cedula,fecha,tipoNovedad,horas,monto,justificacion,idempotencyKey"
          />
          <button
            className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-md bg-slate-800 px-4 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
            disabled={cargaMasivaMutation.isPending}
            type="submit"
          >
            <Plus className="h-4 w-4" />
            {cargaMasivaMutation.isPending ? 'Procesando...' : 'Procesar carga masiva'}
          </button>
        </form>
        {bulkResult?.results?.length > 0 && (
          <div className="mt-4 max-h-56 overflow-auto rounded-md border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Fila</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bulkResult.results.map((row) => (
                  <tr key={row.rowNumber}>
                    <td className="px-3 py-2">{row.rowNumber}</td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2">{row.message || row.novedad?.id || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo de novedad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan="6" className="px-6 py-4 text-center">Cargando...</td></tr>
              ) : !novedades || novedades.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-4 text-center">No hay novedades editables antes de rol</td></tr>
              ) : (
                novedades.map(nov => (
                  <tr key={nov.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{nov.nombres} {nov.apellidos}</td>
                    <td className="px-6 py-4 text-sm">{formatDateEC(nov.fecha)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        nov.tipo_novedad === 'tardia' ? 'bg-yellow-100 text-yellow-800' :
                        nov.tipo_novedad === 'hora_extra_50' ? 'bg-blue-100 text-blue-800' :
                        nov.tipo_novedad === 'hora_extra_100' ? 'bg-purple-100 text-purple-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {getNoveltyTypeLabel(nov.tipo_novedad, noveltyTypeOptions)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">{minutesToHours(nov.minutos)} h</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {nov.estado || 'pendiente'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        {nov.estado === 'pendiente' && (
                          <>
                            <button
                              onClick={() => aprobarMutation.mutate(nov.id)}
                              className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200"
                              title="Aprobar"
                              type="button"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => rechazarMutation.mutate(nov.id)}
                              className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                              title="Rechazar"
                              type="button"
                            >
                              <X size={16} />
                            </button>
                          </>
                        )}
                        {nov.editable && (
                          <>
                            <button
                              onClick={() => startEditNovelty(nov)}
                              className="p-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                              title="Editar antes de rol"
                              type="button"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              disabled={eliminarMutation.isPending}
                              onClick={() => deleteNovelty(nov)}
                              className="p-1 bg-slate-100 text-slate-700 rounded hover:bg-red-100 hover:text-red-700 disabled:opacity-60"
                              title="Eliminar antes de rol"
                              type="button"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
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

function parseCsvRows(text) {
  const lines = String(text || '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) {
    throw new Error('Pega el encabezado y al menos una fila de la plantilla.');
  }
  const headers = splitCsvLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    return headers.reduce((row, header, index) => ({
      ...row,
      [header]: cells[index] || '',
    }), {});
  });
}

function splitCsvLine(line) {
  const cells = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

export default NovedadesPendientes;

