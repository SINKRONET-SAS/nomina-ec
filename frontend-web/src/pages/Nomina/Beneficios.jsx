import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Edit3, LockKeyhole, Plus, Send, Sparkles } from 'lucide-react';
import { authenticatedApi } from '../../services/authenticatedApi';
import { createBeneficio, fetchBeneficios, updateBeneficio } from '../../services/beneficiosApi';
import { approveAdvanceRole, closeAdvanceRole, createAdvanceRole, decideAdvanceLine, downloadAdvanceRoleCsv, fetchAdvanceRoles } from '../../services/advancePayrollApi';
import { extractApiError } from '../../services/publicApi';
import { ECUADOR_TIME_ZONE, currentPeriodEC } from '../../utils/dateFormat';
import { downloadBlob } from '../../utils/downloadBlob';
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

function emptyAdvanceDraft() {
  const period = currentPeriodEC();
  return {
    anio: period.anio,
    mes: period.mes,
    fechaCorte: '',
    descripcion: '',
    tipoNovedad: 'bono_desempeno',
    nombreBonificacion: '',
    lines: {},
  };
}

function Beneficios() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => emptyForm());
  const [editingId, setEditingId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [advanceDraft, setAdvanceDraft] = useState(() => emptyAdvanceDraft());

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

  const advanceRolesQuery = useQuery({
    queryKey: ['roles-anticipos'],
    queryFn: () => fetchAdvanceRoles(),
  });

  const empleados = empleadosQuery.data || [];
  const beneficios = beneficiosQuery.data || [];
  const advanceRoles = advanceRolesQuery.data || [];

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
      setMessage(editingId ? 'Registro actualizado.' : 'Registro guardado.');
      setEditingId('');
      setForm(emptyForm());
      queryClient.invalidateQueries({ queryKey: ['beneficios-empleados'] });
    },
    onError: (err) => {
      setMessage('');
      setError(extractApiError(err, 'No pudimos guardar el anticipo o préstamo.'));
    },
  });

  const advanceRoleMutation = useMutation({
    mutationFn: () => {
      const lineas = Object.entries(advanceDraft.lines)
        .filter(([, line]) => line.selected && Number(line.monto) > 0)
        .map(([empleadoId, line]) => ({ empleadoId, monto: Number(line.monto), tipoNovedad: advanceDraft.tipoNovedad, nombreBonificacion: advanceDraft.nombreBonificacion }));
      return createAdvanceRole({ ...advanceDraft, lineas });
    },
    onSuccess: () => {
      setMessage('Rol de anticipos generado. Apruebalo y resuelve cada linea como descuento o bonificacion.');
      setError('');
      setAdvanceDraft(emptyAdvanceDraft());
      queryClient.invalidateQueries({ queryKey: ['roles-anticipos'] });
    },
    onError: (err) => { setMessage(''); setError(extractApiError(err, 'No pudimos generar el rol de anticipos.')); },
  });

  const advanceActionMutation = useMutation({
    mutationFn: ({ action, roleId, lineId, decision }) => {
      if (action === 'approve') return approveAdvanceRole(roleId);
      if (action === 'decide') return decideAdvanceLine(roleId, lineId, decision);
      return closeAdvanceRole(roleId);
    },
    onSuccess: () => { setMessage('Rol de anticipos actualizado.'); setError(''); queryClient.invalidateQueries({ queryKey: ['roles-anticipos'] }); queryClient.invalidateQueries({ queryKey: ['beneficios-empleados'] }); },
    onError: (err) => { setMessage(''); setError(extractApiError(err, 'No pudimos actualizar el rol de anticipos.')); },
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

  function updateAdvanceField(name, value) {
    setAdvanceDraft((current) => ({ ...current, [name]: value }));
  }

  function updateAdvanceLine(employeeId, field, value) {
    setAdvanceDraft((current) => ({
      ...current,
      lines: { ...current.lines, [employeeId]: { ...(current.lines[employeeId] || {}), [field]: value } },
    }));
  }

  function submitAdvanceRole(event) {
    event.preventDefault();
    advanceRoleMutation.mutate();
  }

  async function downloadAdvanceRole(role) {
    try {
      const blob = await downloadAdvanceRoleCsv(role.id);
      downloadBlob(blob, `rol_anticipos_${role.anio}_${String(role.mes).padStart(2, '0')}.csv`);
    } catch (err) {
      setMessage('');
      setError(extractApiError(err, 'No pudimos descargar la evidencia del rol de anticipos.'));
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Anticipos y préstamos</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Registra descuentos aprobables por empleado. Solo anticipos o préstamos aprobados entran como deducción
              al calcular y cerrar la nómina del período.
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Período inicial calculado en {ECUADOR_TIME_ZONE}.</p>
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
          <h2 className="font-semibold text-slate-950">{editingId ? 'Editar anticipo o préstamo' : 'Nuevo anticipo o préstamo'}</h2>
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
                  <option value="prestamo">Préstamo</option>
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
            {mutation.isPending ? 'Guardando...' : 'Guardar registro'}
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
                  <th className="px-4 py-3">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {beneficiosQuery.isLoading ? (
                  <tr><td className="px-4 py-6 text-center" colSpan="7">Cargando...</td></tr>
                ) : beneficios.length === 0 ? (
                  <tr><td className="px-4 py-6 text-center" colSpan="7">No hay anticipos o préstamos registrados.</td></tr>
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
                      <button className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-teal-700" type="button" onClick={() => editBenefit(item)} title="Editar anticipo o préstamo">
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

      <section className="space-y-5 rounded-lg border border-teal-100 bg-teal-50/40 p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-teal-700" /><h2 className="text-xl font-semibold text-slate-950">Roles de anticipos y bonificaciones</h2></div>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-700">Genera el rol desde esta misma ruta. Luego de aprobarlo, cada linea se resuelve como descuento para fin de mes o como bonificacion. El nombre de la bonificacion y el tipo de novedad quedan registrados en la evidencia.</p>
        </div>
        <form className="rounded-md border border-slate-200 bg-white p-4" onSubmit={submitAdvanceRole}>
          <div className="grid gap-3 md:grid-cols-4">
            <label><span className="text-sm font-medium text-slate-700">Año</span><input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" min="2020" value={advanceDraft.anio} onChange={(event) => updateAdvanceField('anio', event.target.value)} required /></label>
            <label><span className="text-sm font-medium text-slate-700">Mes</span><input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" min="1" max="12" value={advanceDraft.mes} onChange={(event) => updateAdvanceField('mes', event.target.value)} required /></label>
            <label><span className="text-sm font-medium text-slate-700">Fecha de corte</span><input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="date" value={advanceDraft.fechaCorte} onChange={(event) => updateAdvanceField('fechaCorte', event.target.value)} /></label>
            <label><span className="text-sm font-medium text-slate-700">Tipo de novedad</span><input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={advanceDraft.tipoNovedad} onChange={(event) => updateAdvanceField('tipoNovedad', event.target.value)} required /><span className="mt-1 block text-xs text-slate-500">Debe estar activo en Parametrización.</span></label>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label><span className="text-sm font-medium text-slate-700">Descripción del rol</span><input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={advanceDraft.descripcion} onChange={(event) => updateAdvanceField('descripcion', event.target.value)} placeholder="Anticipos de la quincena" /></label>
            <label><span className="text-sm font-medium text-slate-700">Nombre de la bonificación</span><input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={advanceDraft.nombreBonificacion} onChange={(event) => updateAdvanceField('nombreBonificacion', event.target.value)} placeholder="Bono por cumplimiento" /><span className="mt-1 block text-xs text-slate-500">Puedes personalizarlo para todas las líneas del rol.</span></label>
          </div>
          <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full min-w-[700px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Incluir</th><th className="px-3 py-2">Empleado</th><th className="px-3 py-2">Cédula</th><th className="px-3 py-2">Monto</th></tr></thead><tbody className="divide-y divide-slate-100">{empleados.map((employee) => { const line = advanceDraft.lines[employee.id] || {}; return <tr key={employee.id}><td className="px-3 py-2"><input type="checkbox" checked={line.selected === true} onChange={(event) => updateAdvanceLine(employee.id, 'selected', event.target.checked)} /></td><td className="px-3 py-2 font-medium text-slate-900">{employee.nombres} {employee.apellidos}</td><td className="px-3 py-2 text-slate-600">{employee.cedula}</td><td className="px-3 py-2"><input className="w-36 rounded-md border border-slate-300 px-3 py-1.5" type="number" min="0.01" step="0.01" value={line.monto || ''} onChange={(event) => updateAdvanceLine(employee.id, 'monto', event.target.value)} disabled={!line.selected} /></td></tr>; })}</tbody></table>
          </div>
          <button className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-60" type="submit" disabled={advanceRoleMutation.isPending}><Plus className="h-4 w-4" />{advanceRoleMutation.isPending ? 'Generando...' : 'Generar rol de anticipos'}</button>
        </form>

        <div className="space-y-4">
          {advanceRoles.length === 0 ? <p className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">Todavía no hay roles de anticipos generados.</p> : advanceRoles.map((role) => { const pendingLines = role.lineas.filter((line) => line.estado === 'aprobado').length; return <article className="rounded-md border border-slate-200 bg-white p-4" key={role.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-950">Rol {role.anio}-{String(role.mes).padStart(2, '0')} · {role.descripcion || 'Sin descripción'}</h3><p className="mt-1 text-xs text-slate-500">Corte: {role.fechaCorte} · Total: {money(role.total)} · Estado: <strong>{role.estado}</strong></p></div><div className="flex flex-wrap gap-2"><button className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700" type="button" onClick={() => downloadAdvanceRole(role)}>Descargar evidencia</button>{role.estado === 'borrador' && <button className="inline-flex items-center gap-1 rounded-md border border-teal-200 px-3 py-1.5 text-xs font-semibold text-teal-800 disabled:opacity-50" type="button" onClick={() => advanceActionMutation.mutate({ action: 'approve', roleId: role.id })} disabled={advanceActionMutation.isPending}><Send className="h-3.5 w-3.5" />Aprobar</button>}{role.estado === 'aprobado' && <button className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50" type="button" onClick={() => advanceActionMutation.mutate({ action: 'close', roleId: role.id })} disabled={advanceActionMutation.isPending || pendingLines > 0}><LockKeyhole className="h-3.5 w-3.5" />Cerrar rol</button>}</div></div><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Empleado</th><th className="px-3 py-2">Monto</th><th className="px-3 py-2">Tipo / nombre</th><th className="px-3 py-2">Resolución</th><th className="px-3 py-2 text-right">Acciones</th></tr></thead><tbody className="divide-y divide-slate-100">{role.lineas.map((line) => <tr key={line.id}><td className="px-3 py-2"><p className="font-medium text-slate-900">{line.empleadoNombre}</p><p className="text-xs text-slate-500">{line.cedula}</p></td><td className="px-3 py-2">{money(line.monto)}</td><td className="px-3 py-2"><p>{line.tipoNovedad}</p><p className="text-xs text-slate-500">{line.nombreBonificacion || 'Sin nombre personalizado'}</p></td><td className="px-3 py-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{line.estado}</span></td><td className="px-3 py-2 text-right">{role.estado === 'aprobado' && line.estado === 'aprobado' && <><button className="mr-2 rounded-md border border-amber-200 px-2 py-1 text-xs font-semibold text-amber-800 disabled:opacity-50" type="button" onClick={() => advanceActionMutation.mutate({ action: 'decide', roleId: role.id, lineId: line.id, decision: 'descontar' })} disabled={advanceActionMutation.isPending}>Descontar</button><button className="rounded-md border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-800 disabled:opacity-50" type="button" onClick={() => advanceActionMutation.mutate({ action: 'decide', roleId: role.id, lineId: line.id, decision: 'bonificar' })} disabled={advanceActionMutation.isPending}>Bonificar</button></>}</td></tr>)}</tbody></table></div></article>; })}
        </div>
      </section>
    </div>
  );
}

export default Beneficios;
