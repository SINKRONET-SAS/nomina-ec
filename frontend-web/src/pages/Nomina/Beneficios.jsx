import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Edit3, Plus } from 'lucide-react';
import { authenticatedApi } from '../../services/authenticatedApi';
import { createBeneficio, fetchBeneficios, updateBeneficio } from '../../services/beneficiosApi';
import { extractApiError } from '../../services/publicApi';
import { ECUADOR_TIME_ZONE, currentPeriodEC } from '../../utils/dateFormat';
import { money } from '../../utils/money';

function emptyForm() {
  const period = currentPeriodEC();
  return {
    empleadoId: '',
    tipo: 'anticipo',
    descripcion: '',
    montoTotal: '',
    cuotaMensual: '',
    anioInicio: period.anio,
    mesInicio: period.mes,
    estado: 'pendiente',
  };
}

function Beneficios() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => emptyForm());
  const [editingId, setEditingId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const empleadosQuery = useQuery({
    queryKey: ['empleados-beneficios'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/empleados');
      return response.data?.empleados || [];
    },
  });

  const beneficiosQuery = useQuery({
    queryKey: ['beneficios-empleados'],
    queryFn: () => fetchBeneficios(),
  });

  const empleados = empleadosQuery.data || [];
  const beneficios = beneficiosQuery.data || [];

  const totals = useMemo(() => beneficios.reduce((acc, item) => {
    if (item.estado === 'aprobado') {
      acc.aprobado += Number(item.saldoPendiente || 0);
    }
    if (item.estado === 'pendiente') {
      acc.pendiente += Number(item.saldoPendiente || 0);
    }
    return acc;
  }, { aprobado: 0, pendiente: 0 }), [beneficios]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        montoTotal: Number(form.montoTotal),
        cuotaMensual: Number(form.cuotaMensual || form.montoTotal),
        anioInicio: Number(form.anioInicio),
        mesInicio: Number(form.mesInicio),
      };
      return editingId ? updateBeneficio(editingId, payload) : createBeneficio(payload);
    },
    onSuccess: () => {
      setError('');
      setMessage(editingId ? 'Beneficio actualizado.' : 'Beneficio registrado.');
      setEditingId('');
      setForm(emptyForm());
      queryClient.invalidateQueries({ queryKey: ['beneficios-empleados'] });
    },
    onError: (err) => {
      setMessage('');
      setError(extractApiError(err, 'No pudimos guardar el beneficio.'));
    },
  });

  function editBenefit(item) {
    setEditingId(item.id);
    setForm({
      empleadoId: item.empleadoId,
      tipo: item.tipo,
      descripcion: item.descripcion || '',
      montoTotal: String(item.montoTotal || ''),
      cuotaMensual: String(item.cuotaMensual || ''),
      anioInicio: item.anioInicio,
      mesInicio: item.mesInicio,
      estado: item.estado,
    });
  }

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function submit(event) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Beneficios, anticipos y prestamos</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Registra valores aprobables por empleado. Solo los beneficios en estado aprobado entran como deduccion
              al calcular y cerrar la nómina del periodo.
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Periodo inicial calculado en {ECUADOR_TIME_ZONE}.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md bg-amber-50 px-4 py-3 text-amber-900">
              <p className="text-xs font-semibold uppercase">Pendiente</p>
              <p className="text-xl font-semibold">{money(totals.pendiente)}</p>
            </div>
            <div className="rounded-md bg-emerald-50 px-4 py-3 text-emerald-900">
              <p className="text-xs font-semibold uppercase">Aprobado</p>
              <p className="text-xl font-semibold">{money(totals.aprobado)}</p>
            </div>
          </div>
        </div>
      </section>

      {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={submit}>
          <h2 className="font-semibold text-slate-950">{editingId ? 'Editar beneficio' : 'Nuevo beneficio'}</h2>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Empleado</span>
              <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.empleadoId} onChange={(event) => updateField('empleadoId', event.target.value)} required>
                <option value="">Seleccione...</option>
                {empleados.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.nombres} {emp.apellidos} - {emp.cedula}</option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="text-sm font-medium text-slate-700">Tipo</span>
                <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.tipo} onChange={(event) => updateField('tipo', event.target.value)}>
                  <option value="anticipo">Anticipo</option>
                  <option value="prestamo">Prestamo</option>
                </select>
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Estado</span>
                <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.estado} onChange={(event) => updateField('estado', event.target.value)}>
                  <option value="pendiente">Pendiente</option>
                  <option value="aprobado">Aprobado</option>
                  <option value="anulado">Anulado</option>
                </select>
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Descripción</span>
              <textarea className="mt-1 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={form.descripcion} onChange={(event) => updateField('descripcion', event.target.value)} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="text-sm font-medium text-slate-700">Monto total</span>
                <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" min="0.01" step="0.01" value={form.montoTotal} onChange={(event) => updateField('montoTotal', event.target.value)} required />
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Cuota mensual</span>
                <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" min="0.01" step="0.01" value={form.cuotaMensual} onChange={(event) => updateField('cuotaMensual', event.target.value)} required />
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Año inicio</span>
                <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" value={form.anioInicio} onChange={(event) => updateField('anioInicio', event.target.value)} required />
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Mes inicio</span>
                <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" min="1" max="12" value={form.mesInicio} onChange={(event) => updateField('mesInicio', event.target.value)} required />
              </label>
            </div>
          </div>
          <button className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={mutation.isPending} type="submit">
            <Plus className="h-4 w-4" />
            {mutation.isPending ? 'Guardando...' : 'Guardar beneficio'}
          </button>
        </form>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Empleado</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3 text-right">Saldo</th>
                  <th className="px-4 py-3 text-right">Cuota</th>
                  <th className="px-4 py-3">Inicio</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Accion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {beneficiosQuery.isLoading ? (
                  <tr><td className="px-4 py-6 text-center" colSpan="7">Cargando...</td></tr>
                ) : beneficios.length === 0 ? (
                  <tr><td className="px-4 py-6 text-center" colSpan="7">No hay beneficios registrados.</td></tr>
                ) : beneficios.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{item.empleadoNombre}</p>
                      <p className="text-xs text-slate-500">{item.cedula}</p>
                    </td>
                    <td className="px-4 py-3 capitalize">{item.tipo}</td>
                    <td className="px-4 py-3 text-right">{money(item.saldoPendiente)}</td>
                    <td className="px-4 py-3 text-right">{money(item.cuotaMensual)}</td>
                    <td className="px-4 py-3">{item.mesInicio}/{item.anioInicio}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {item.estado === 'aprobado' && <CheckCircle2 className="h-3 w-3 text-emerald-700" />}
                        {item.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-teal-700" type="button" onClick={() => editBenefit(item)} title="Editar beneficio">
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Beneficios;
