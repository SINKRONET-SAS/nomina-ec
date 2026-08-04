import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, CheckCircle2, Download, Edit3, LockKeyhole, Plus, RotateCcw, Send, Sparkles, Trash2, Upload, X } from 'lucide-react';
import { authenticatedApi } from '../../services/authenticatedApi';
import { annulBeneficio, approveBeneficio, createBeneficio, deleteBeneficio, fetchBeneficios, updateBeneficio } from '../../services/beneficiosApi';
import { annulAdvanceRole, applyAdvanceRoleSelection, approveAdvanceRole, closeAdvanceRole, createAdvanceRole, createAdvanceRoleBulk, decideAdvanceLine, deleteAdvanceRole, downloadAdvanceReport, downloadAdvanceRoleCsv, downloadAdvanceTemplate, fetchAdvanceNoveltyTypes, fetchAdvanceRoles, reopenAdvanceRole, reverseApprovalAdvanceRole, updateAdvanceRole } from '../../services/advancePayrollApi';
import { extractApiError } from '../../services/publicApi';
import { ECUADOR_TIME_ZONE, currentPeriodEC } from '../../utils/dateFormat';
import { downloadBlob } from '../../utils/downloadBlob';
import { money } from '../../utils/money';
import TablePagination from '../../components/UI/TablePagination';

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
  const [editingAdvanceRoleId, setEditingAdvanceRoleId] = useState('');
  const [advanceFilters, setAdvanceFilters] = useState(() => ({ anio: currentPeriodEC().anio, mes: currentPeriodEC().mes, estado: '', tipoNovedad: '', buscar: '' }));
  const [advanceEmployeeSearch, setAdvanceEmployeeSearch] = useState('');
  const [advanceBulkCsv, setAdvanceBulkCsv] = useState('');
  const [advanceBulkFileName, setAdvanceBulkFileName] = useState('');
  const [debouncedEmpSearch, setDebouncedEmpSearch] = useState('');
  const debounceTimer = useRef(null);
  const [benefitFilters, setBenefitFilters] = useState({ buscar: '', tipo: '', estado: '' });
  const [benefitPage, setBenefitPage] = useState(1);
  const [benefitPageSize, setBenefitPageSize] = useState(10);
  const [rolePage, setRolePage] = useState(1);
  const [rolePageSize, setRolePageSize] = useState(5);
  const [roleLinePages, setRoleLinePages] = useState({});
  const [roleLinePageSize, setRoleLinePageSize] = useState(10);

  const empleadosQuery = useQuery({
    queryKey: ['empleados-beneficios'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/empleados');
      return response.data?.empleados || [];
    },
  });

  const beneficiosQuery = useQuery({
    queryKey: ['beneficios-empleados', benefitFilters, benefitPage, benefitPageSize],
    queryFn: () => fetchBeneficios({ ...benefitFilters, page: benefitPage, pageSize: benefitPageSize }),
  });

  const advanceRolesQuery = useQuery({
    queryKey: ['roles-anticipos', advanceFilters],
    queryFn: () => fetchAdvanceRoles(advanceFilters),
  });

  const advanceTypesQuery = useQuery({
    queryKey: ['roles-anticipos-tipos', advanceDraft.anio, advanceDraft.mes],
    queryFn: () => fetchAdvanceNoveltyTypes({ anio: advanceDraft.anio, mes: advanceDraft.mes }),
  });

  const empleados = empleadosQuery.data || [];
  const beneficiosPage = beneficiosQuery.data || {};
  const beneficios = beneficiosPage.items || [];
  const benefitPagination = beneficiosPage.pagination || {};
  const benefitTotals = beneficiosPage.totals || {};
  const advanceRoles = advanceRolesQuery.data || [];
  const advanceTypes = advanceTypesQuery.data || [];
  const filteredAdvanceEmployees = useMemo(() => empleados.filter((employee) => `${employee.nombres} ${employee.apellidos} ${employee.cedula}`.toLowerCase().includes(debouncedEmpSearch.toLowerCase().trim())), [empleados, debouncedEmpSearch]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  const handleEmployeeSearch = useCallback((value) => {
    setAdvanceEmployeeSearch(value);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { setDebouncedEmpSearch(value); setAdvEmpPage(1); }, 300);
  }, []);

  const totalBenefitPages = Math.max(1, Number(benefitPagination.totalPages || 1));

  const [advEmpPage, setAdvEmpPage] = useState(1);
  const [advEmpPageSize, setAdvEmpPageSize] = useState(10);
  const totalAdvEmpPages = Math.max(1, Math.ceil(filteredAdvanceEmployees.length / advEmpPageSize));
  const paginatedAdvEmployees = useMemo(() => {
    const start = (advEmpPage - 1) * advEmpPageSize;
    return filteredAdvanceEmployees.slice(start, start + advEmpPageSize);
  }, [filteredAdvanceEmployees, advEmpPage, advEmpPageSize]);

  const localTotals = useMemo(() => beneficios.reduce((acc, item) => {
    if (item.estado === 'aprobado') {
      acc.aprobado += Number(item.saldoPendiente || 0);
    }
    if (item.estado === 'pendiente') {
      acc.pendiente += Number(item.saldoPendiente || 0);
    }
    return acc;
  }, { aprobado: 0, pendiente: 0 }), [beneficios]);
  const totals = {
    aprobado: benefitTotals.aprobado != null ? Number(benefitTotals.aprobado) : localTotals.aprobado,
    pendiente: benefitTotals.pendiente != null ? Number(benefitTotals.pendiente) : localTotals.pendiente,
  };

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
      setForm(emptyForm());
      queryClient.invalidateQueries({ queryKey: ['beneficios-empleados'] });
    },
    onError: (err) => {
      setMessage('');
      setError(extractApiError(err, 'No pudimos guardar el anticipo o préstamo.'));
    },
  });

  const benefitActionMutation = useMutation({
    mutationFn: ({ action, id }) => {
      if (action === 'delete') return deleteBeneficio(id);
      if (action === 'approve') return approveBeneficio(id);
      return annulBeneficio(id);
    },
    onSuccess: (_data, variables) => {
      const labels = { delete: 'eliminado', approve: 'aprobado', annul: 'anulado' };
      setError('');
      setMessage(`Registro ${labels[variables.action]}.`);
      setEditingId('');
      setForm(emptyForm());
      queryClient.invalidateQueries({ queryKey: ['beneficios-empleados'] });
    },
    onError: (err) => {
      setMessage('');
      setError(extractApiError(err, 'No pudimos procesar la acción.'));
    },
  });

  const advanceRoleMutation = useMutation({
    mutationFn: () => {
      const lineas = Object.entries(advanceDraft.lines)
        .filter(([, line]) => line.selected && Number(line.monto) > 0)
        .map(([empleadoId, line]) => ({ empleadoId, monto: Number(line.monto), tipoNovedad: advanceDraft.tipoNovedad, nombreBonificacion: advanceDraft.nombreBonificacion, resolucion: line.resolucion }));
      const payload = { ...advanceDraft, lineas };
      return editingAdvanceRoleId ? updateAdvanceRole(editingAdvanceRoleId, payload) : createAdvanceRole(payload);
    },
    onSuccess: () => {
      setMessage(editingAdvanceRoleId ? 'Rol de anticipos actualizado.' : 'Rol de anticipos generado. Apruebalo y resuelve cada linea como descuento, bonificacion o ingreso con descuento al cierre.');
      setError('');
      setEditingAdvanceRoleId('');
      setAdvanceDraft(emptyAdvanceDraft());
      queryClient.invalidateQueries({ queryKey: ['roles-anticipos'] });
    },
    onError: (err) => { setMessage(''); setError(extractApiError(err, 'No pudimos generar el rol de anticipos.')); },
  });

  const advanceBulkMutation = useMutation({
    mutationFn: () => createAdvanceRoleBulk({ ...advanceDraft, csv: advanceBulkCsv }),
    onSuccess: () => {
      setMessage('Carga masiva del rol de anticipos procesada.');
      setError('');
      setAdvanceBulkCsv('');
      setAdvanceBulkFileName('');
      queryClient.invalidateQueries({ queryKey: ['roles-anticipos'] });
    },
    onError: (err) => { setMessage(''); setError(extractApiError(err, 'No pudimos procesar la carga masiva del rol de anticipos.')); },
  });

  const advanceActionMutation = useMutation({
    mutationFn: async ({ action, roleId, lineId, decision }) => {
      if (action === 'delete') return deleteAdvanceRole(roleId);
      if (action === 'annul') return annulAdvanceRole(roleId);
      if (action === 'approve') return approveAdvanceRole(roleId);
      if (action === 'reverseApproval') return reverseApprovalAdvanceRole(roleId);
      if (action === 'reopen') return reopenAdvanceRole(roleId);
      if (action === 'approveAndApply') {
        await approveAdvanceRole(roleId);
        return applyAdvanceRoleSelection(roleId);
      }
      if (action === 'apply') return applyAdvanceRoleSelection(roleId);
      if (action === 'decide') return decideAdvanceLine(roleId, lineId, decision);
      return closeAdvanceRole(roleId);
    },
    onSuccess: (_data, variables) => {
      const labels = { delete: 'eliminado', annul: 'anulado', approve: 'aprobado', reverseApproval: 'devuelto a borrador', reopen: 'reabierto a borrador', approveAndApply: 'aprobado y aplicado', apply: 'aplicado', decide: 'resuelto', close: 'cerrado' };
      setMessage(`Rol de anticipos ${labels[variables.action] || 'actualizado'}.`);
      setError('');
      queryClient.invalidateQueries({ queryKey: ['roles-anticipos'] });
      queryClient.invalidateQueries({ queryKey: ['beneficios-empleados'] });
    },
    onError: (err) => { setMessage(''); setError(extractApiError(err, 'No pudimos actualizar el rol de anticipos.')); },
  });

  const totalRolePages = Math.max(1, Math.ceil(advanceRoles.length / rolePageSize));
  const paginatedRoles = useMemo(() => {
    const start = (rolePage - 1) * rolePageSize;
    return advanceRoles.slice(start, start + rolePageSize);
  }, [advanceRoles, rolePage, rolePageSize]);

  function cancelEdit() {
    setEditingId('');
    setForm(emptyForm());
  }

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
    const monto = Number(form.montoTotal);
    const cuota = Number(form.cuotaMensual || form.montoTotal);
    if (cuota > monto) {
      setMessage('');
      setError('La cuota mensual no puede ser mayor al monto total.');
      return;
    }
    mutation.mutate();
  }

  function updateAdvanceField(name, value) {
    setAdvanceDraft((current) => ({ ...current, [name]: value }));
  }

  function cancelAdvanceEdit() {
    setEditingAdvanceRoleId('');
    setAdvanceDraft(emptyAdvanceDraft());
  }

  function editAdvanceRole(role) {
    if (role.estado !== 'borrador') return;
    const firstLine = role.lineas[0] || {};
    const lines = Object.fromEntries(role.lineas.map((line) => [line.empleadoId, {
      selected: true,
      monto: String(line.monto ?? ''),
      resolucion: line.resolucionSolicitada || '',
    }]));
    setEditingAdvanceRoleId(role.id);
    setAdvanceDraft({
      anio: role.anio,
      mes: role.mes,
      fechaCorte: role.fechaCorte || '',
      descripcion: role.descripcion || '',
      tipoNovedad: firstLine.tipoNovedad || '',
      nombreBonificacion: firstLine.nombreBonificacion || '',
      lines,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateAdvanceLine(employeeId, field, value) {
    setAdvanceDraft((current) => ({
      ...current,
      lines: { ...current.lines, [employeeId]: { ...(current.lines[employeeId] || {}), [field]: value } },
    }));
  }

  function submitAdvanceRole(event) {
    event.preventDefault();
    const selected = Object.values(advanceDraft.lines).filter((line) => line.selected);
    if (selected.length === 0) {
      setMessage('');
      setError('Selecciona al menos un empleado para generar el rol parcial.');
      return;
    }
    if (selected.some((line) => !(Number(line.monto) > 0))) {
      setMessage('');
      setError('Cada empleado seleccionado debe tener un monto mayor a cero.');
      return;
    }
    if (selected.some((line) => !['descontar', 'bonificar', 'bonificar_descontar'].includes(line.resolucion))) {
      setMessage('');
      setError('Define para cada empleado si el valor será un anticipo a descontar o una bonificación a pagar en el cierre.');
      return;
    }
    advanceRoleMutation.mutate();
  }

  function updateAdvanceFilter(name, value) {
    setAdvanceFilters((current) => ({ ...current, [name]: value }));
  }

  function updateBenefitFilter(name, value) {
    setBenefitFilters((current) => ({ ...current, [name]: value }));
    setBenefitPage(1);
  }

  useEffect(() => {
    if (benefitPage > totalBenefitPages) setBenefitPage(totalBenefitPages);
  }, [benefitPage, totalBenefitPages]);

  async function selectAdvanceBulkFile(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      if (!text.trim()) throw new Error('El archivo CSV está vacío.');
      setAdvanceBulkFileName(file.name);
      setAdvanceBulkCsv(text);
      setError('');
    } catch (err) {
      setAdvanceBulkFileName('');
      setAdvanceBulkCsv('');
      setMessage('');
      setError(err.message || 'No pudimos leer el archivo CSV seleccionado.');
    } finally {
      input.value = '';
    }
  }

  async function downloadAdvanceReportFile() {
    try {
      const blob = await downloadAdvanceReport(advanceFilters);
      downloadBlob(blob, `reporte_roles_anticipos_${advanceFilters.anio}_${String(advanceFilters.mes).padStart(2, '0')}.csv`);
    } catch (err) {
      setMessage('');
      setError(extractApiError(err, 'No pudimos descargar el reporte filtrado de anticipos.'));
    }
  }

  async function downloadAdvanceTemplateFile() {
    try {
      const blob = await downloadAdvanceTemplate();
      downloadBlob(blob, 'plantilla_rol_anticipos.csv');
    } catch (err) {
      setMessage('');
      setError(extractApiError(err, 'No pudimos descargar la plantilla de anticipos.'));
    }
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
          <div className="mt-5 flex items-center gap-2">
            <button className="inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={mutation.isPending} type="submit">
              <Plus className="h-4 w-4" />
              {mutation.isPending ? 'Guardando...' : 'Guardar registro'}
            </button>
            {editingId && (
              <button className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50" type="button" onClick={cancelEdit}>
                <X className="h-4 w-4" />
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
              <label><span className="text-xs font-medium text-slate-600">Buscar empleado, cédula o descripción</span><input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={benefitFilters.buscar} onChange={(event) => updateBenefitFilter('buscar', event.target.value)} placeholder="Nombre, cédula o descripción" /></label>
              <label><span className="text-xs font-medium text-slate-600">Tipo</span><select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={benefitFilters.tipo} onChange={(event) => updateBenefitFilter('tipo', event.target.value)}><option value="">Todos</option><option value="anticipo">Anticipo</option><option value="prestamo">Préstamo</option></select></label>
              <label><span className="text-xs font-medium text-slate-600">Estado</span><select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={benefitFilters.estado} onChange={(event) => updateBenefitFilter('estado', event.target.value)}><option value="">Todos</option><option value="pendiente">Pendiente</option><option value="aprobado">Aprobado</option><option value="descontado">Descontado</option><option value="anulado">Anulado</option></select></label>
              <button className="self-end rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50" type="button" onClick={() => { setBenefitFilters({ buscar: '', tipo: '', estado: '' }); setBenefitPage(1); }}><RotateCcw className="mr-1 inline h-3.5 w-3.5" />Limpiar</button>
            </div>
            <p className="mt-2 text-xs text-slate-500">La búsqueda consulta todos los registros; la tabla muestra una página para revisar el origen de cada descuento.</p>
          </div>

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
                    <td className="px-4 py-3">
                      <p className="capitalize">{item.tipo}</p>
                      <p className="text-xs text-slate-500">{item.descripcion || 'Sin descripción'}</p>
                      {item.metadata?.source === 'rol_anticipos' && <p className="text-xs font-semibold text-sky-700">Origen: rol de anticipos</p>}
                    </td>
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
                      <div className="flex items-center gap-1">
                        {item.estado === 'pendiente' && (
                          <button className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-emerald-200 text-emerald-700 hover:bg-emerald-50" type="button" onClick={() => { if (window.confirm('¿Aprobar este registro?')) benefitActionMutation.mutate({ action: 'approve', id: item.id }); }} title="Aprobar" aria-label={`Aprobar beneficio de ${item.empleadoNombre}`} disabled={benefitActionMutation.isPending}>
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                        {item.metadata?.source !== 'rol_anticipos' && item.estado !== 'anulado' && (
                          <button className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-amber-200 text-amber-700 hover:bg-amber-50" type="button" onClick={() => { if (window.confirm('¿Anular este registro?')) benefitActionMutation.mutate({ action: 'annul', id: item.id }); }} title="Anular" aria-label={`Anular beneficio de ${item.empleadoNombre}`} disabled={benefitActionMutation.isPending}>
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                        {item.metadata?.source !== 'rol_anticipos' && <button className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-teal-700 hover:bg-slate-50" type="button" onClick={() => editBenefit(item)} title="Editar" aria-label={`Editar beneficio de ${item.empleadoNombre}`}>
                          <Edit3 className="h-4 w-4" />
                        </button>}
                        {item.metadata?.source !== 'rol_anticipos' && item.estado !== 'aprobado' && (
                          <button className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50" type="button" onClick={() => { if (window.confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) benefitActionMutation.mutate({ action: 'delete', id: item.id }); }} title="Eliminar" aria-label={`Eliminar beneficio de ${item.empleadoNombre}`} disabled={benefitActionMutation.isPending}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        {item.metadata?.source === 'rol_anticipos' && (
                          <button className="rounded-md border border-sky-200 px-2 py-1 text-xs font-semibold text-sky-800 hover:bg-sky-50" type="button" onClick={() => document.getElementById('roles-anticipos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} title="Los efectos generados se corrigen desde el rol completo para conservar la trazabilidad.">
                            Gestionar rol
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination
            currentPage={benefitPage}
            totalPages={totalBenefitPages}
            pageSize={benefitPageSize}
            totalItems={Number(benefitPagination.totalItems || 0)}
            onPageChange={setBenefitPage}
            onPageSizeChange={(newSize) => {
              setBenefitPageSize(newSize);
              setBenefitPage(1);
            }}
          />
        </div>
        </div>
      </section>

      <section id="roles-anticipos" className="scroll-mt-4 space-y-5 rounded-lg border border-teal-100 bg-teal-50/40 p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-teal-700" /><h2 className="text-xl font-semibold text-slate-950">Roles de anticipos y bonificaciones</h2></div>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-700">Genera el rol desde esta misma ruta. Luego de aprobarlo, cada linea se resuelve como descuento para fin de mes o como bonificacion. El nombre de la bonificacion y el tipo de novedad quedan registrados en la evidencia.</p>
        </div>
        <form className="rounded-md border border-slate-200 bg-white p-4" onSubmit={submitAdvanceRole}>
          <div className="grid gap-3 md:grid-cols-4">
            <label><span className="text-sm font-medium text-slate-700">Año</span><input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" min="2020" value={advanceDraft.anio} onChange={(event) => updateAdvanceField('anio', event.target.value)} required /></label>
            <label><span className="text-sm font-medium text-slate-700">Mes</span><input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" min="1" max="12" value={advanceDraft.mes} onChange={(event) => updateAdvanceField('mes', event.target.value)} required /></label>
            <label><span className="text-sm font-medium text-slate-700">Fecha de corte</span><input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="date" value={advanceDraft.fechaCorte} onChange={(event) => updateAdvanceField('fechaCorte', event.target.value)} /></label>
            <label><span className="text-sm font-medium text-slate-700">Tipo de novedad</span><select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={advanceDraft.tipoNovedad} onChange={(event) => updateAdvanceField('tipoNovedad', event.target.value)} disabled={advanceTypesQuery.isLoading || advanceTypes.length === 0} required><option value="">Selecciona un tipo parametrizado</option>{advanceTypes.map((type) => <option key={type.code} value={type.code}>{type.name} ({type.code})</option>)}</select><span className="mt-1 block text-xs text-slate-500">Solo tipos activos de Parametrización.</span></label>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label><span className="text-sm font-medium text-slate-700">Descripción del rol</span><input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={advanceDraft.descripcion} onChange={(event) => updateAdvanceField('descripcion', event.target.value)} placeholder="Anticipos de la quincena" /></label>
            <label><span className="text-sm font-medium text-slate-700">Nombre de la bonificación</span><input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={advanceDraft.nombreBonificacion} onChange={(event) => updateAdvanceField('nombreBonificacion', event.target.value)} placeholder="Bono por cumplimiento" /><span className="mt-1 block text-xs text-slate-500">Puedes personalizarlo para todas las líneas del rol.</span></label>
          </div>
          <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 p-3">
              <label className="block"><span className="text-sm font-medium text-slate-700">Buscar empleado para incluir</span><input className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" value={advanceEmployeeSearch} onChange={(event) => handleEmployeeSearch(event.target.value)} placeholder="Cédula, nombres o apellidos" /></label>
            </div>
            <table className="w-full min-w-[980px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Incluir</th><th className="px-3 py-2">Empleado</th><th className="px-3 py-2">Cédula</th><th className="px-3 py-2">Monto</th><th className="px-3 py-2">Aplicación en cierre</th></tr></thead><tbody className="divide-y divide-slate-100">{paginatedAdvEmployees.map((employee) => { const line = advanceDraft.lines[employee.id] || {}; return <tr key={employee.id}><td className="px-3 py-2"><input type="checkbox" checked={line.selected === true} onChange={(event) => updateAdvanceLine(employee.id, 'selected', event.target.checked)} aria-label={`Incluir a ${employee.nombres} ${employee.apellidos}`} /></td><td className="px-3 py-2 font-medium text-slate-900">{employee.nombres} {employee.apellidos}</td><td className="px-3 py-2 text-slate-600">{employee.cedula}</td><td className="px-3 py-2"><input className="w-36 rounded-md border border-slate-300 px-3 py-1.5" type="number" min="0.01" step="0.01" value={line.monto || ''} onChange={(event) => updateAdvanceLine(employee.id, 'monto', event.target.value)} disabled={!line.selected} /></td><td className="px-3 py-2"><select className="w-64 rounded-md border border-slate-300 px-3 py-1.5 text-xs" value={line.resolucion || ''} onChange={(event) => updateAdvanceLine(employee.id, 'resolucion', event.target.value)} disabled={!line.selected} aria-label={`Aplicación en cierre de ${employee.nombres} ${employee.apellidos}`}><option value="">Selecciona una opción</option><option value="descontar">Anticipo: descontar al cierre</option><option value="bonificar">Bonificación: pagar al cierre</option><option value="bonificar_descontar">Bonificación: ingresar ahora y descontar al cierre</option></select></td></tr>; })}</tbody></table>
            <TablePagination
              currentPage={advEmpPage}
              totalPages={totalAdvEmpPages}
              pageSize={advEmpPageSize}
              totalItems={filteredAdvanceEmployees.length}
              onPageChange={setAdvEmpPage}
              onPageSizeChange={(newSize) => {
                setAdvEmpPageSize(newSize);
                setAdvEmpPage(1);
              }}
            />
          </div>
          <button className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:opacity-60" type="submit" disabled={advanceRoleMutation.isPending}><Plus className="h-4 w-4" />{advanceRoleMutation.isPending ? 'Generando...' : 'Generar rol de anticipos'}</button>
        </form>

        <section className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="font-semibold text-slate-950">Carga masiva del rol</h3><p className="mt-1 text-sm text-slate-600">Descarga la plantilla, completa cédula, monto y resolución. Usa <strong>descontar</strong>, <strong>bonificar</strong> o <strong>bonificar_descontar</strong> (ingreso ahora y descuento al cierre). La plantilla histórica de cuatro columnas también es aceptada.</p></div>
            <button className="inline-flex items-center gap-2 rounded-md border border-teal-200 px-3 py-2 text-sm font-semibold text-teal-800" type="button" onClick={downloadAdvanceTemplateFile}><Download className="h-4 w-4" />Descargar plantilla</button>
          </div>
          <div className="mt-3 rounded-md border border-dashed border-teal-300 bg-teal-50/50 p-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white"><Upload className="h-4 w-4" />Seleccionar archivo<input className="sr-only" type="file" accept=".csv,.txt,text/csv,text/plain" onChange={selectAdvanceBulkFile} /></label>
            <span className="ml-3 text-sm text-slate-600">{advanceBulkFileName || 'Ningún archivo seleccionado'}</span>
          </div>
          <textarea className="mt-3 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs" value={advanceBulkCsv} onChange={(event) => setAdvanceBulkCsv(event.target.value)} placeholder="cedula,monto,tipoNovedad,nombreBonificacion,resolucion" aria-label="Contenido CSV del rol de anticipos" />
          <button className="mt-3 inline-flex items-center gap-2 rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" type="button" onClick={() => advanceBulkMutation.mutate()} disabled={advanceBulkMutation.isPending || !advanceBulkCsv.trim()}><Upload className="h-4 w-4" />{advanceBulkMutation.isPending ? 'Procesando...' : 'Procesar carga masiva'}</button>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><h3 className="font-semibold text-slate-950">Roles generados</h3><p className="mt-1 text-sm text-slate-600">Filtra por período, estado, tipo de novedad o empleado.</p></div>
            <button className="inline-flex items-center gap-2 rounded-md border border-teal-200 px-3 py-2 text-sm font-semibold text-teal-800" type="button" onClick={downloadAdvanceReportFile}><Download className="h-4 w-4" />Descargar reporte filtrado</button>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-5">
            <label><span className="text-xs font-medium text-slate-600">Año</span><input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" min="2020" value={advanceFilters.anio} onChange={(event) => updateAdvanceFilter('anio', event.target.value)} /></label>
            <label><span className="text-xs font-medium text-slate-600">Mes</span><input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="number" min="1" max="12" value={advanceFilters.mes} onChange={(event) => updateAdvanceFilter('mes', event.target.value)} /></label>
            <label><span className="text-xs font-medium text-slate-600">Estado</span><select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={advanceFilters.estado} onChange={(event) => updateAdvanceFilter('estado', event.target.value)}><option value="">Todos</option><option value="borrador">Borrador</option><option value="aprobado">Aprobado</option><option value="cerrado">Cerrado</option><option value="anulado">Anulado</option></select></label>
            <label><span className="text-xs font-medium text-slate-600">Tipo de novedad</span><select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={advanceFilters.tipoNovedad} onChange={(event) => updateAdvanceFilter('tipoNovedad', event.target.value)}><option value="">Todos</option>{advanceTypes.map((type) => <option key={type.code} value={type.code}>{type.name}</option>)}</select></label>
            <label><span className="text-xs font-medium text-slate-600">Empleado</span><input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={advanceFilters.buscar} onChange={(event) => updateAdvanceFilter('buscar', event.target.value)} placeholder="Cédula o nombre" /></label>
          </div>
          <div className="mt-3">
            <button className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50" type="button" onClick={() => setAdvanceFilters({ anio: currentPeriodEC().anio, mes: currentPeriodEC().mes, estado: '', tipoNovedad: '', buscar: '' })}><RotateCcw className="h-3.5 w-3.5" />Limpiar filtros</button>
          </div>
        </section>

        <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-900">Flujo: selecciona empleados y resolución, genera el borrador, aprueba y luego aplica cada línea. La opción <strong>bonificar_descontar</strong> registra un ingreso y un único anticipo vinculado para descontarlo al cerrar el rol mensual. El botón de cierre solo queda disponible cuando todas las líneas ya impactaron el rol mensual.</p>
        <div className="space-y-4">
          {advanceRoles.length === 0 ? <p className="rounded-md border border-slate-200 border-dashed bg-white px-4 py-6 text-center text-sm text-slate-500">Todavía no hay roles de anticipos generados.</p> : paginatedRoles.map((sourceRole) => {
            const pendingLines = sourceRole.lineas.filter((line) => line.estado === 'aprobado').length;
            const pendingWithoutResolution = sourceRole.lineas.some((line) => line.estado === 'aprobado' && !['descontar', 'bonificar', 'bonificar_descontar'].includes(line.resolucionSolicitada));
            const canApplySelection = pendingLines > 0 && !pendingWithoutResolution;
            const hasAppliedEffects = sourceRole.lineas.some((line) => line.beneficioId || line.bonificacionNovedadId);
            const canReverseApproval = sourceRole.estado === 'aprobado' && !hasAppliedEffects;
            const canManageRole = ['borrador', 'aprobado'].includes(sourceRole.estado);
            const totalLinePages = Math.max(1, Math.ceil(sourceRole.lineas.length / roleLinePageSize));
            const linePage = Math.min(roleLinePages[sourceRole.id] || 1, totalLinePages);
            const paginatedLines = sourceRole.lineas.slice((linePage - 1) * roleLinePageSize, linePage * roleLinePageSize);
            const role = { ...sourceRole, lineas: paginatedLines };
            return <article className="rounded-md border border-slate-200 bg-white p-4" key={role.id}>
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-950">Rol {role.anio}-{String(role.mes).padStart(2, '0')} · {role.descripcion || 'Sin descripción'}</h3><p className="mt-1 text-xs text-slate-500">Corte: {role.fechaCorte ? new Date(role.fechaCorte + 'T12:00:00').toLocaleDateString('es-EC') : 'Sin fecha'} · Total: {money(role.total)} · Estado: <strong>{role.estado}</strong></p></div><div className="flex flex-wrap gap-2"><button className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700" type="button" onClick={() => downloadAdvanceRole(role)} aria-label={`Descargar evidencia del rol ${role.anio}-${role.mes}`}>Descargar evidencia</button>{role.estado === 'borrador' && <button className="inline-flex items-center gap-1 rounded-md border border-teal-200 px-3 py-1.5 text-xs font-semibold text-teal-800 disabled:opacity-50" type="button" onClick={() => advanceActionMutation.mutate({ action: canApplySelection ? 'approveAndApply' : 'approve', roleId: role.id })} disabled={advanceActionMutation.isPending} aria-label={`Aprobar rol ${role.anio}-${role.mes}`}><Send className="h-3.5 w-3.5" />{canApplySelection ? 'Aprobar y aplicar selección' : 'Aprobar'}</button>}{role.estado === 'aprobado' && canApplySelection && <button className="inline-flex items-center gap-1 rounded-md border border-teal-200 px-3 py-1.5 text-xs font-semibold text-teal-800 disabled:opacity-50" type="button" onClick={() => advanceActionMutation.mutate({ action: 'apply', roleId: role.id })} disabled={advanceActionMutation.isPending} aria-label={`Aplicar selección del rol ${role.anio}-${role.mes}`}><CheckCircle2 className="h-3.5 w-3.5" />Aplicar selección</button>}{role.estado === 'aprobado' && <button className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50" type="button" onClick={() => advanceActionMutation.mutate({ action: 'close', roleId: role.id })} disabled={advanceActionMutation.isPending || pendingLines > 0} aria-label={`Cerrar rol ${role.anio}-${role.mes}`}><LockKeyhole className="h-3.5 w-3.5" />Cerrar rol</button>}</div></div>
              {advanceActionMutation.isError && advanceActionMutation.variables?.roleId === role.id && <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800" role="alert">{extractApiError(advanceActionMutation.error, 'No pudimos aplicar la resolución de este rol.')}</p>}
              {role.estado === 'aprobado' && pendingLines > 0 && <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">{pendingWithoutResolution ? <>Resuelve cada línea: <strong>Descontar</strong> crea un anticipo que se deduce del sueldo al cerrar mes; <strong>Bonificar</strong> registra un ingreso para pagarlo al cierre; <strong>Ingresar y descontar</strong> registra el ingreso y el anticipo que se descontará al cerrar el mes.</> : 'Las resoluciones seleccionadas están listas para aplicarse al cierre mensual.'}</p>}
              {role.estado === 'cerrado' && <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-violet-100 bg-violet-50 px-3 py-2"><span className="text-xs text-violet-900">Este rol está cerrado. Reábrelo para corregirlo; volverán a estar disponibles editar, eliminar, aprobar y anular.</span><button className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-800 disabled:opacity-50" type="button" onClick={() => { if (window.confirm('¿Reabrir este rol para corregirlo? Se conservara la evidencia; los efectos aun no consumidos se anularan para evitar duplicados.')) advanceActionMutation.mutate({ action: 'reopen', roleId: role.id }); }} disabled={advanceActionMutation.isPending} title="Reabre el rol como borrador si el periodo mensual sigue disponible y el rol no fue consumido por el calculo."><RotateCcw className="h-3.5 w-3.5" />Reabrir para corregir</button></div>}
              <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Empleado</th><th className="px-3 py-2">Monto</th><th className="px-3 py-2">Tipo / nombre</th><th className="px-3 py-2">Resolución</th><th className="px-3 py-2 text-right">Acciones</th></tr></thead><tbody className="divide-y divide-slate-100">{role.lineas.map((line) => <tr key={line.id}><td className="px-3 py-2"><p className="font-medium text-slate-900">{line.empleadoNombre}</p><p className="text-xs text-slate-500">{line.cedula}</p></td><td className="px-3 py-2">{money(line.monto)}</td><td className="px-3 py-2"><p>{line.tipoNovedad}</p><p className="text-xs text-slate-500">{line.nombreBonificacion || 'Sin nombre personalizado'}</p></td><td className="px-3 py-2"><p className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{line.resolucionSolicitada === 'descontar' ? 'Anticipo · descontar al cierre' : line.resolucionSolicitada === 'bonificar' ? 'Bonificación · pagar al cierre' : line.resolucionSolicitada === 'bonificar_descontar' ? 'Bonificación · ingresar y descontar al cierre' : 'Pendiente de resolución'}</p><p className="mt-1 text-xs text-slate-500">Estado: {line.estado}</p></td><td className="px-3 py-2 text-right">{role.estado === 'aprobado' && line.estado === 'aprobado' && <><button className="mr-2 rounded-md border border-amber-200 px-2 py-1 text-xs font-semibold text-amber-800 disabled:opacity-50" type="button" onClick={() => advanceActionMutation.mutate({ action: 'decide', roleId: role.id, lineId: line.id, decision: 'descontar' })} disabled={advanceActionMutation.isPending} title="Crea un beneficio que se deduce del sueldo al cerrar mes" aria-label={`Descontar línea de ${line.empleadoNombre}`}>Descontar</button><button className="mr-2 rounded-md border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-800 disabled:opacity-50" type="button" onClick={() => advanceActionMutation.mutate({ action: 'decide', roleId: role.id, lineId: line.id, decision: 'bonificar' })} disabled={advanceActionMutation.isPending} title="Registra una novedad de ingreso adicional" aria-label={`Bonificar línea de ${line.empleadoNombre}`}>Bonificar</button><button className="rounded-md border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-800 disabled:opacity-50" type="button" onClick={() => advanceActionMutation.mutate({ action: 'decide', roleId: role.id, lineId: line.id, decision: 'bonificar_descontar' })} disabled={advanceActionMutation.isPending} title="Registra el ingreso y crea el anticipo que se descontará al cerrar el mes" aria-label={`Ingresar y descontar línea de ${line.empleadoNombre}`}>Ingresar y descontar</button></>}</td></tr>)}</tbody></table></div>
              {canManageRole && <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <span className="mr-2 text-xs text-slate-500">Acciones disponibles mientras el rol no este cerrado:</span>
                {role.estado === 'borrador' && <>
                  <button className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50" type="button" onClick={() => editAdvanceRole(sourceRole)} disabled={advanceActionMutation.isPending || advanceRoleMutation.isPending}><Edit3 className="h-3.5 w-3.5" />Editar</button>
                  <button className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50" type="button" onClick={() => { if (window.confirm('¿Eliminar este borrador? Esta accion no se puede deshacer.')) advanceActionMutation.mutate({ action: 'delete', roleId: role.id }); }} disabled={advanceActionMutation.isPending}><Trash2 className="h-3.5 w-3.5" />Eliminar</button>
                  <button className="inline-flex items-center gap-1 rounded-md border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-800 disabled:opacity-50" type="button" onClick={() => { if (window.confirm('¿Anular este rol? Se conservara su evidencia y no podra volver a usarse.')) advanceActionMutation.mutate({ action: 'annul', roleId: role.id }); }} disabled={advanceActionMutation.isPending}><Ban className="h-3.5 w-3.5" />Anular</button>
                </>}
                {role.estado === 'aprobado' && <>
                  <button className="inline-flex items-center gap-1 rounded-md border border-violet-200 px-3 py-1.5 text-xs font-semibold text-violet-800 disabled:opacity-50" type="button" onClick={() => { if (window.confirm('¿Reversar la aprobacion y devolver el rol a borrador?')) advanceActionMutation.mutate({ action: 'reverseApproval', roleId: role.id }); }} disabled={advanceActionMutation.isPending || !canReverseApproval} title={canReverseApproval ? 'Devuelve el rol a borrador para corregirlo.' : 'No disponible: el rol ya tiene efectos aplicados.'}><RotateCcw className="h-3.5 w-3.5" />Reversar aprobacion</button>
                  <button className="inline-flex items-center gap-1 rounded-md border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-800 disabled:opacity-50" type="button" onClick={() => { if (window.confirm('¿Anular este rol aprobado y todos sus efectos no consumidos? Se conservará la evidencia. Si algún efecto ya fue usado por un cálculo de nómina, la operación se bloqueará sin cambios.')) advanceActionMutation.mutate({ action: 'annul', roleId: role.id }); }} disabled={advanceActionMutation.isPending}><Ban className="h-3.5 w-3.5" />Anular rol y efectos</button>
                </>}
                {role.estado === 'aprobado' && hasAppliedEffects && <p className="basis-full text-xs text-slate-600">Para corregir este lote usa <strong>Anular rol y efectos</strong>. Se anularán juntos los anticipos y novedades vinculados que todavía no hayan sido consumidos por un cálculo de nómina.</p>}
              </div>}
              <TablePagination
                currentPage={linePage}
                totalPages={totalLinePages}
                pageSize={roleLinePageSize}
                totalItems={sourceRole.lineas.length}
                onPageChange={(page) => setRoleLinePages((current) => ({ ...current, [sourceRole.id]: page }))}
                onPageSizeChange={(newSize) => {
                  setRoleLinePageSize(newSize);
                  setRoleLinePages((current) => ({ ...current, [sourceRole.id]: 1 }));
                }}
              />
            </article>;
          })}
          {advanceRoles.length > 0 && (
            <TablePagination
              currentPage={rolePage}
              totalPages={totalRolePages}
              pageSize={rolePageSize}
              totalItems={advanceRoles.length}
              onPageChange={setRolePage}
              onPageSizeChange={(newSize) => { setRolePageSize(newSize); setRolePage(1); }}
            />
          )}
        </div>
      </section>
    </div>
  );
}

export default Beneficios;
