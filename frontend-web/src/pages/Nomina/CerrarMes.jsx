import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarClock,
  Calculator,
  CheckCircle,
  ClipboardCheck,
  Layers,
  Lock,
  RefreshCw,
  Trash2,
  Undo2,
  XCircle,
} from 'lucide-react';
import { authenticatedApi } from '../../services/authenticatedApi';
import { extractApiError } from '../../services/publicApi';
import EmployeeSearchSelect from '../../components/UI/EmployeeSearchSelect';
import { ECUADOR_TIME_ZONE, currentPeriodEC, firstDayOfPeriodEC } from '../../utils/dateFormat';
import {
  buildNoveltyTypeOptions,
  getNoveltyTypeLabel,
  hoursToMinutes,
  isAmountNoveltyType,
  minutesToHours,
} from '../../config/noveltyTypes';

const SCOPE_TYPES = [
  { value: 'company', label: 'Toda la empresa' },
  { value: 'department', label: 'Departamento' },
  { value: 'position', label: 'Cargo' },
  { value: 'employee', label: 'Empleado' },
];

const WRITABLE_PERIOD_STATUSES = new Set(['open', 'novelties_loaded', 'reopened', 'calculation_failed']);
const CALCULABLE_PERIOD_STATUSES = new Set(['open', 'novelties_loaded', 'reopened', 'calculation_failed']);

function summarize(rows = []) {
  return rows.reduce((memo, row) => ({ ...memo, [row.estado || row.status]: row.total }), {});
}

function precheckDetails(error) {
  return error?.response?.data?.details || null;
}

function hasBlocker(precheck, codes = []) {
  return (precheck?.blockers || []).some((blocker) => codes.includes(blocker.code));
}

function firstOvertimeParameters(resultado) {
  return (resultado?.resultados || [])
    .map((row) => row.detalleCalculo?.horasExtraParametros)
    .find(Boolean) || null;
}

function percentLabel(value) {
  return `${(Number(value || 0) * 100).toLocaleString('es-EC', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}

function batchScopeLabel(batch = {}) {
  const resolvedLabel = String(batch.scope_label || '').trim();
  if (resolvedLabel) return resolvedLabel;
  if (batch.scope_type === 'company') return 'Toda la empresa';
  if (batch.scope_type === 'employee') return 'Empleado no disponible';
  if (batch.scope_type === 'department') return `Departamento: ${batch.scope_value || 'sin dato'}`;
  if (batch.scope_type === 'position') return `Cargo: ${batch.scope_value || 'sin dato'}`;
  return batch.scope_value || 'Alcance no disponible';
}

function CerrarMes() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialPeriod = useMemo(() => currentPeriodEC(), []);
  const initialAnio = Number(searchParams.get('anio')) || initialPeriod.anio;
  const initialMes = Number(searchParams.get('mes')) || initialPeriod.mes;
  const [anio, setAnio] = useState(initialAnio);
  const [mes, setMes] = useState(initialMes);
  const [resultado, setResultado] = useState(null);
  const [message, setMessage] = useState(null);
  const [closeConfirmation, setCloseConfirmation] = useState(false);
  const [showDiscardCalculation, setShowDiscardCalculation] = useState(false);
  const [discardReason, setDiscardReason] = useState('');
  const [batchForm, setBatchForm] = useState({
    scopeType: 'company',
    scopeValue: '',
    tipoNovedad: 'hora_extra_50',
    fecha: firstDayOfPeriodEC(initialPeriod.anio, initialPeriod.mes),
    minutos: 60,
    monto: '',
    justificacion: 'Lote mensual de novedades',
  });

  const periodQuery = useQuery({
    queryKey: ['nomina-periodo', anio, mes],
    queryFn: async () => {
      const response = await authenticatedApi.get(`/nomina/periodo/${anio}/${mes}`);
      return response.data?.state;
    },
    retry: false,
  });

  const employeesQuery = useQuery({
    queryKey: ['empleados'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/empleados');
      return response.data?.empleados || [];
    },
    retry: false,
  });

  const noveltyTypesQuery = useQuery({
    queryKey: ['novedades-tipos', batchForm.fecha],
    queryFn: async () => {
      const response = await authenticatedApi.get('/novedades/tipos', {
        params: { fecha: batchForm.fecha },
      });
      return response.data;
    },
    enabled: Boolean(batchForm.fecha),
    retry: false,
  });

  const employees = employeesQuery.data || [];
  const noveltyTypeOptions = useMemo(
    () => buildNoveltyTypeOptions(noveltyTypesQuery.data?.tipos || []),
    [noveltyTypesQuery.data]
  );
  const departments = useMemo(() => [...new Set(employees.map((item) => item.departamento).filter(Boolean))], [employees]);
  const positions = useMemo(() => [...new Set(employees.map((item) => item.cargo).filter(Boolean))], [employees]);
  const state = periodQuery.data || {};
  const period = state.period;
  const periodStatus = period?.status || null;
  const isClosedPeriod = periodStatus === 'closed';
  const isCalculatedPeriod = periodStatus === 'calculated';
  const isWritablePeriod = WRITABLE_PERIOD_STATUSES.has(periodStatus);
  const canOpenPeriod = !period || periodStatus === 'planned';
  const canCalculatePeriod = CALCULABLE_PERIOD_STATUSES.has(periodStatus);
  const canClosePayroll = isCalculatedPeriod;
  const payrollStatus = summarize(state.payrollByStatus);
  const draftPayrolls = Number(payrollStatus.borrador || 0);
  const canDiscardCalculation = !isClosedPeriod && draftPayrolls > 0;
  const noveltyStatus = summarize(state.noveltiesByStatus);
  const pendingNovelties = Number(noveltyStatus.pendiente || 0);

  useEffect(() => {
    setBatchForm((current) => ({
      ...current,
      fecha: firstDayOfPeriodEC(anio, mes),
    }));
  }, [anio, mes]);

  useEffect(() => {
    if (noveltyTypeOptions.length === 0) return;
    if (!noveltyTypeOptions.some((type) => type.value === batchForm.tipoNovedad)) {
      const nextType = noveltyTypeOptions[0];
      setBatchForm((current) => ({
        ...current,
        tipoNovedad: nextType.value,
        minutos: isAmountNoveltyType(nextType.value, noveltyTypeOptions) ? 0 : current.minutos || 60,
      }));
    }
  }, [batchForm.tipoNovedad, noveltyTypeOptions]);

  const refreshPeriod = () => queryClient.invalidateQueries({ queryKey: ['nomina-periodo', anio, mes] });

  const openMutation = useMutation({
    mutationFn: async () => authenticatedApi.post('/nomina/periodo/abrir', { anio, mes }),
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Periodo abierto para cargar novedades y calcular nómina.' });
      refreshPeriod();
    },
  });

  const batchMutation = useMutation({
    mutationFn: async () => authenticatedApi.post('/nomina/novedades/lote', {
      anio,
      mes,
      scopeType: batchForm.scopeType,
      scopeValue: batchForm.scopeValue,
      tipoNovedad: batchForm.tipoNovedad,
      fecha: batchForm.fecha,
      horas: Number(minutesToHours(batchForm.minutos) || 0),
      monto: batchForm.monto,
      justificacion: batchForm.justificacion,
    }),
    onSuccess: (response) => {
      const batch = response.data?.batch;
      setMessage({ type: 'success', text: `Lote ${batch?.id || ''}: ${batch?.total_creadas || 0} novedades creadas.` });
      refreshPeriod();
    },
  });

  const resolveNoveltiesMutation = useMutation({
    mutationFn: async ({ decision, motivo }) => authenticatedApi.put('/novedades/periodo/resolver', {
      anio,
      mes,
      decision,
      motivo,
    }),
    onSuccess: (response) => {
      const total = response.data?.total || 0;
      const decision = response.data?.decision === 'rechazar' ? 'rechazadas' : 'aprobadas';
      setMessage({ type: 'success', text: `${total} novedades ${decision} para el periodo.` });
      queryClient.invalidateQueries({ queryKey: ['novedades-pendientes'] });
      refreshPeriod();
    },
  });

  const calculateMutation = useMutation({
    mutationFn: async () => authenticatedApi.post('/nomina/calcular', { anio, mes }),
    onSuccess: (response) => {
      setResultado(response.data.resultado);
      setMessage({ type: 'success', text: 'Nómina calculada. Revisa el detalle antes de cerrar el periodo.' });
      refreshPeriod();
    },
    onError: (error) => {
      const calculationResult = error.response?.data?.resultado;
      if (calculationResult) setResultado(calculationResult);
      refreshPeriod();
    },
  });

  const precalculateMutation = useMutation({
    mutationFn: async () => authenticatedApi.post('/nomina/precalcular', { anio, mes }),
    onSuccess: (response) => {
      const previewResult = response.data.resultado;
      setResultado(previewResult);
      setMessage({
        type: Number(previewResult?.errores || 0) > 0 ? 'error' : 'success',
        text: response.data.message,
      });
    },
  });

  const closeMutation = useMutation({
    mutationFn: async () => authenticatedApi.post('/nomina/cerrar', { anio, mes }),
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Nómina cerrada correctamente.' });
      setCloseConfirmation(false);
      refreshPeriod();
    },
  });

  const [pendingDeleteBatch, setPendingDeleteBatch] = useState(null);

  const deleteBatchMutation = useMutation({
    mutationFn: async (batchId) => authenticatedApi.delete(`/nomina/novedades/lote/${batchId}`),
    onSuccess: (response) => {
      const deleted = response.data?.deleted || 0;
      setMessage({ type: 'success', text: `Lote eliminado: ${deleted} novedades borradas.` });
      setPendingDeleteBatch(null);
      refreshPeriod();
    },
  });

  const discardCalculationMutation = useMutation({
    mutationFn: async () => authenticatedApi.post('/nomina/descartar-calculo', {
      anio,
      mes,
      motivo: discardReason.trim(),
    }),
    onSuccess: (response) => {
      const deleted = response.data?.result?.deleted || 0;
      setResultado(null);
      setMessage({
        type: 'success',
        text: `${deleted} roles en borrador fueron descartados. Corrige las novedades necesarias y vuelve a calcular.`,
      });
      setShowDiscardCalculation(false);
      setDiscardReason('');
      queryClient.invalidateQueries({ queryKey: ['roles-pagos', anio, mes] });
      queryClient.invalidateQueries({ queryKey: ['novedades-pendientes'] });
      refreshPeriod();
    },
  });

  useEffect(() => {
    setMessage(null);
    setResultado(null);
    setCloseConfirmation(false);
    setPendingDeleteBatch(null);
    openMutation.reset();
    batchMutation.reset();
    deleteBatchMutation.reset();
    resolveNoveltiesMutation.reset();
    precalculateMutation.reset();
    calculateMutation.reset();
    closeMutation.reset();
    discardCalculationMutation.reset();
    setShowDiscardCalculation(false);
    setDiscardReason('');
  }, [anio, mes]);

  const updateBatch = (field, value) => {
    setBatchForm((current) => ({ ...current, [field]: value }));
  };

  const scopeNeedsValue = batchForm.scopeType !== 'company';
  const requiresAmount = isAmountNoveltyType(batchForm.tipoNovedad, noveltyTypeOptions);
  const canCreateBatch = isWritablePeriod && (!scopeNeedsValue || batchForm.scopeValue) && (!requiresAmount || Number(batchForm.monto) > 0);
  const currentError = openMutation.error || batchMutation.error || deleteBatchMutation.error || resolveNoveltiesMutation.error || precalculateMutation.error || calculateMutation.error || closeMutation.error || discardCalculationMutation.error || periodQuery.error || noveltyTypesQuery.error;
  const currentPrecheck = precheckDetails(currentError);
  const alertIsError = Boolean(currentError || message?.type === 'error');
  const hasLegalParameterBlocker = hasBlocker(currentPrecheck, [
    'LEGAL_PARAMETERS_NOT_VALIDATED',
    'LEGAL_PARAMETERS_DIVERGENCE',
  ]);
  const overtimeParameters = firstOvertimeParameters(resultado);
  const calculationPending = precalculateMutation.isPending || calculateMutation.isPending;

  const resolvePendingNovelties = (decision) => {
    if (decision === 'aprobar') {
      const accepted = window.confirm(`Aprobar ${pendingNovelties} novedades pendientes de ${String(mes).padStart(2, '0')}/${anio}.`);
      if (!accepted) return;
      resolveNoveltiesMutation.mutate({ decision: 'aprobar', motivo: '' });
      return;
    }

    const motivo = window.prompt(`Motivo para rechazar ${pendingNovelties} novedades pendientes de ${String(mes).padStart(2, '0')}/${anio}:`);
    if (motivo === null) return;
    if (motivo.trim().length < 5) {
      setMessage({ type: 'error', text: 'El rechazo requiere un motivo claro.' });
      return;
    }
    resolveNoveltiesMutation.mutate({ decision: 'rechazar', motivo: motivo.trim() });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">Operación mensual</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">Apertura, novedades, cálculo y cierre</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              Abre el periodo antes de cargar novedades. Los lotes crean registros reales por alcance y quedan auditados.
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Periodo inicial calculado en {ECUADOR_TIME_ZONE}.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-semibold text-slate-700">
              Mes
              <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" onChange={(event) => setMes(Number(event.target.value))} value={mes}>
                {Array.from({ length: 12 }, (_, index) => (
                  <option key={index + 1} value={index + 1}>{index + 1}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Año
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" onChange={(event) => setAnio(Number(event.target.value))} type="number" value={anio} />
            </label>
          </div>
        </div>
      </section>

      {(message || currentError) && (
        <div className={`rounded-md border px-4 py-3 text-sm font-medium ${alertIsError ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          {currentError ? extractApiError(currentError, 'No pudimos completar la accion. Revisa el periodo e intenta nuevamente.') : message.text}
          {currentPrecheck?.blockers?.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs font-semibold">
              {currentPrecheck.blockers.map((blocker) => (
                <li key={blocker.code}>{blocker.message}</li>
              ))}
            </ul>
          )}
          {currentPrecheck?.warnings?.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-amber-900">
              {currentPrecheck.warnings.map((warning) => (
                <li key={warning.code}>{warning.message}</li>
              ))}
            </ul>
          )}
          {hasLegalParameterBlocker && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                className="inline-flex min-h-9 items-center rounded-md bg-red-700 px-3 text-xs font-semibold text-white hover:bg-red-800"
                to="/dashboard/configuracion/parametrizacion?seccion=legal"
              >
                Cargar/validar valores legales
              </Link>
              <span className="self-center text-xs font-semibold text-red-700">
                Luego aprueba o rechaza novedades pendientes y recalcula.
              </span>
            </div>
          )}
        </div>
      )}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-teal-700" />
                <h2 className="text-lg font-semibold text-slate-950">Periodo {String(mes).padStart(2, '0')}/{anio}</h2>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Estado: <strong>{period?.status || 'sin abrir'}</strong>
              </p>
            </div>
            <button className="inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:bg-slate-300" disabled={!canOpenPeriod || openMutation.isPending} onClick={() => openMutation.mutate()} type="button">
              <RefreshCw className="h-4 w-4" />
              {isClosedPeriod ? 'Periodo cerrado' : isCalculatedPeriod ? 'Periodo calculado' : periodStatus === 'planned' || !period ? 'Abrir periodo' : 'Periodo abierto'}
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-md bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Nóminas borrador</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{payrollStatus.borrador || 0}</p>
            </div>
            <div className="rounded-md bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase text-emerald-700">Nóminas cerradas</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-900">{payrollStatus.cerrada || 0}</p>
            </div>
            <div className="rounded-md bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase text-amber-700">Novedades pendientes</p>
              <p className="mt-1 text-2xl font-semibold text-amber-900">{pendingNovelties}</p>
              {pendingNovelties > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="inline-flex min-h-9 items-center gap-2 rounded-md bg-emerald-700 px-3 text-xs font-semibold text-white disabled:bg-slate-300"
                    disabled={!isWritablePeriod || resolveNoveltiesMutation.isPending}
                    onClick={() => resolvePendingNovelties('aprobar')}
                    type="button"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Aprobar
                  </button>
                  <button
                    className="inline-flex min-h-9 items-center gap-2 rounded-md border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 disabled:text-slate-400"
                    disabled={!isWritablePeriod || resolveNoveltiesMutation.isPending}
                    onClick={() => resolvePendingNovelties('rechazar')}
                    type="button"
                  >
                    <XCircle className="h-4 w-4" />
                    Rechazar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Cierre</h2>
          {isClosedPeriod && (
            <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
              Este periodo ya esta cerrado. Los roles quedan preservados y no se admiten cambios operativos.
            </p>
          )}
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Cierra solo después de revisar el cálculo. Esta acción marca roles como cerrados.
          </p>
          <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
            <input className="mt-1 h-4 w-4 accent-teal-700 disabled:opacity-50" checked={closeConfirmation} disabled={!canClosePayroll} onChange={(event) => setCloseConfirmation(event.target.checked)} type="checkbox" />
            Confirmo que revise el detalle del periodo.
          </label>
          {!canClosePayroll && !isClosedPeriod && (
            <p className="mt-3 text-xs font-semibold text-amber-700">Calcula la nomina antes de cerrar el periodo.</p>
          )}
          <button className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white disabled:bg-slate-300" disabled={!canClosePayroll || !closeConfirmation || closeMutation.isPending} onClick={() => closeMutation.mutate()} type="button">
            <Lock className="h-4 w-4" />
            {closeMutation.isPending ? 'Cerrando' : 'Cerrar nómina'}
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-teal-700" />
          <h2 className="text-lg font-semibold text-slate-950">Lote de novedades</h2>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3 xl:grid-cols-7">
          <label className="text-sm font-semibold text-slate-700">
            Alcance
            <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" onChange={(event) => {
              updateBatch('scopeType', event.target.value);
              updateBatch('scopeValue', '');
            }} value={batchForm.scopeType}>
              {SCOPE_TYPES.map((scope) => <option key={scope.value} value={scope.value}>{scope.label}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Valor
            {batchForm.scopeType === 'employee' ? (
              <EmployeeSearchSelect
                employees={employees}
                id="novelty-batch-employee"
                onChange={(employeeId) => updateBatch('scopeValue', employeeId)}
                placeholder="Buscar por cédula, apellido o nombre"
                value={batchForm.scopeValue}
              />
            ) : (
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                disabled={!scopeNeedsValue}
                list={batchForm.scopeType === 'department' ? 'departments-list' : 'positions-list'}
                onChange={(event) => updateBatch('scopeValue', event.target.value)}
                placeholder={scopeNeedsValue ? 'Código o nombre' : 'No aplica'}
                value={batchForm.scopeValue}
              />
            )}
            <datalist id="departments-list">{departments.map((item) => <option key={item} value={item} />)}</datalist>
            <datalist id="positions-list">{positions.map((item) => <option key={item} value={item} />)}</datalist>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Novedad
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              onChange={(event) => {
                const nextType = event.target.value;
                setBatchForm((current) => ({
                  ...current,
                  tipoNovedad: nextType,
                  minutos: isAmountNoveltyType(nextType, noveltyTypeOptions) ? 0 : current.minutos || 60,
                }));
              }}
              disabled={noveltyTypesQuery.isLoading || noveltyTypeOptions.length === 0}
              value={batchForm.tipoNovedad}
            >
              {noveltyTypeOptions.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Fecha
            <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" onChange={(event) => updateBatch('fecha', event.target.value)} type="date" value={batchForm.fecha} />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Horas
            <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" disabled={requiresAmount} min="0" onChange={(event) => updateBatch('minutos', Number(hoursToMinutes(event.target.value) || 0))} step="0.01" type="number" value={minutesToHours(batchForm.minutos)} />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Monto USD
            <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" min="0" onChange={(event) => updateBatch('monto', event.target.value)} step="0.01" type="number" value={batchForm.monto} />
          </label>
          <button className="mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:bg-slate-300" disabled={!period || !canCreateBatch || batchMutation.isPending} onClick={() => batchMutation.mutate()} type="button">
            <CheckCircle className="h-4 w-4" />
            {batchMutation.isPending ? 'Creando lote' : 'Crear lote'}
          </button>
        </div>
        <label className="mt-4 block text-sm font-semibold text-slate-700">
          Justificacion
          <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" onChange={(event) => updateBatch('justificacion', event.target.value)} value={batchForm.justificacion} />
        </label>
        {!period && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            Abre el periodo antes de crear lotes.
          </div>
        )}
        {period && !isWritablePeriod && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <Lock className="h-4 w-4" />
            El periodo no admite novedades porque su estado es {periodStatus}.
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Cálculo de nómina</h2>
            <p className="mt-1 text-sm text-slate-600">
              Precalcula para revisar valores y bloqueos sin crear roles. Cuando el resultado esté listo, calcula la nómina para guardar los borradores.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canDiscardCalculation && (
              <button
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                disabled={discardCalculationMutation.isPending}
                onClick={() => {
                  setShowDiscardCalculation(true);
                  setMessage(null);
                }}
                type="button"
              >
                <Undo2 className="h-4 w-4" />
                Descartar cálculo del periodo
              </button>
            )}
            <button className="inline-flex min-h-10 items-center gap-2 rounded-md border border-teal-700 bg-white px-4 text-sm font-semibold text-teal-800 hover:bg-teal-50 disabled:border-slate-200 disabled:text-slate-400" disabled={!canCalculatePeriod || calculationPending} onClick={() => precalculateMutation.mutate()} type="button">
              <ClipboardCheck className="h-4 w-4" />
              {precalculateMutation.isPending ? 'Precalculando' : 'Precalcular'}
            </button>
            <button className="inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:bg-slate-300" disabled={!canCalculatePeriod || calculationPending} onClick={() => calculateMutation.mutate()} type="button">
              <Calculator className="h-4 w-4" />
              {calculateMutation.isPending ? 'Calculando' : 'Calcular nómina'}
            </button>
          </div>
        </div>

        {showDiscardCalculation && canDiscardCalculation && (
          <div className="mt-4 border-t border-red-100 pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-950">Descartar calculo completo del periodo</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Se eliminaran {draftPayrolls} roles en borrador y sus lineas calculadas. Para corregir una sola novedad, usa Novedades manuales y libera solo el calculo del empleado.
                </p>
                <label className="mt-3 block text-sm font-semibold text-slate-700">
                  Motivo de la corrección
                  <textarea
                    className="mt-1 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
                    maxLength={500}
                    onChange={(event) => setDiscardReason(event.target.value)}
                    placeholder="Ejemplo: corregir horas extra aprobadas después de revisar el consolidado"
                    value={discardReason}
                  />
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="inline-flex min-h-9 items-center gap-2 rounded-md bg-red-700 px-3 text-sm font-semibold text-white disabled:bg-slate-300"
                    disabled={discardReason.trim().length < 10 || discardCalculationMutation.isPending}
                    onClick={() => discardCalculationMutation.mutate()}
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                    {discardCalculationMutation.isPending ? 'Descartando' : `Descartar ${draftPayrolls} borradores`}
                  </button>
                  <button
                    className="inline-flex min-h-9 items-center rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700"
                    disabled={discardCalculationMutation.isPending}
                    onClick={() => {
                      setShowDiscardCalculation(false);
                      setDiscardReason('');
                    }}
                    type="button"
                  >
                    Conservar cálculo
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {!canCalculatePeriod && (
          <p className="mt-3 text-sm font-semibold text-slate-600">
            {isClosedPeriod ? 'El calculo de este mes ya fue cerrado.' : isCalculatedPeriod ? 'El calculo ya esta listo para cierre.' : 'Abre el periodo antes de calcular.'}
          </p>
        )}

        {resultado && (
          <div className="mt-5">
            {resultado.preview && (
              <div className="mb-4 flex items-start gap-3 rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
                <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Vista previa sin guardar</p>
                  <p className="mt-1 text-xs leading-5">Este resultado no creó ni modificó roles. Corrige los bloqueos y vuelve a precalcular antes de guardar la nómina.</p>
                </div>
              </div>
            )}
            {overtimeParameters && (
              <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                <p className="font-semibold text-slate-950">Formula visible de horas extra</p>
                <p>
                  Valor hora = sueldo / {Number(overtimeParameters.jornadaHorasMensuales || overtimeParameters.monthlyWorkHours || 0).toLocaleString('es-EC')} horas.
                  HE 50% usa multiplicador {Number(overtimeParameters.supplementaryMultiplier || 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({percentLabel(overtimeParameters.supplementarySurchargeRate)} de recargo).
                  HE 100% usa multiplicador {Number(overtimeParameters.extraordinaryMultiplier || 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({percentLabel(overtimeParameters.extraordinarySurchargeRate)} de recargo).
                  Limite semanal: {Number(overtimeParameters.maxWeeklyOvertimeHours || 0).toLocaleString('es-EC')} horas.
                </p>
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-md bg-slate-50 p-4">
                <p className="text-sm text-slate-600">Total empleados</p>
                <p className="text-2xl font-bold">{resultado.total}</p>
              </div>
              <div className="rounded-md bg-emerald-50 p-4">
                <p className="text-sm text-emerald-700">Exitosos</p>
                <p className="text-2xl font-bold text-emerald-900">{resultado.exitosos || resultado.resultados?.filter((row) => !row.error).length || 0}</p>
              </div>
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-700">Con errores</p>
                <p className="text-2xl font-bold text-red-900">{resultado.errores || resultado.resultados?.filter((row) => row.error).length || 0}</p>
              </div>
            </div>

            {resultado.resultados?.some((row) => row.error) && (
              <div className="mt-4 overflow-hidden rounded-md border border-red-200">
                <div className="bg-red-50 px-4 py-3">
                  <p className="font-semibold text-red-900">Empleados que requieren revisión</p>
                  <p className="mt-1 text-xs text-red-700">Corrige la ficha o parametrización indicada y vuelve a {resultado.preview ? 'precalcular' : 'calcular'}.</p>
                </div>
                <div className="divide-y divide-red-100">
                  {resultado.resultados.filter((row) => row.error).map((row) => (
                    <div className="grid gap-1 px-4 py-3 text-sm md:grid-cols-[minmax(180px,0.6fr)_minmax(0,1.4fr)]" key={`${row.empleadoId}-${row.errorCode || 'error'}`}>
                      <div>
                        <p className="font-semibold text-slate-900">{row.nombre || row.empleadoId}</p>
                        {row.cedula && <p className="mt-1 text-xs text-slate-600">Cédula: {row.cedula}</p>}
                        {row.errorCode && <p className="mt-1 text-xs font-medium text-slate-500">{row.errorCode}</p>}
                      </div>
                      <p className="leading-6 text-red-800">{row.error}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {resultado.resultados?.length > 0 && (
              <div className="mt-5 overflow-x-auto rounded-md border border-slate-200">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Empleado</th>
                      <th className="px-4 py-3 text-right">Ingresos</th>
                      <th className="px-4 py-3 text-right">13ro mens.</th>
                      <th className="px-4 py-3 text-right">14to mens.</th>
                      <th className="px-4 py-3 text-right">Anticipos</th>
                      <th className="px-4 py-3 text-right">Prestamos</th>
                      <th className="px-4 py-3 text-right">Neto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resultado.resultados.filter((row) => !row.error).map((row, index) => (
                      <tr key={`${row.empleadoId || row.nombre}-${index}`}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{row.nombre}</p>
                          {row.cedula && <p className="mt-1 text-xs text-slate-500">{row.cedula}</p>}
                        </td>
                        <td className="px-4 py-3 text-right">${Number(row.totalIngresos || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">{row.detalleCalculo?.decimoTerceroModalidad === 'mensual' ? `$${Number(row.detalleCalculo?.decimoTerceroMensualizado || 0).toFixed(2)}` : '-'}</td>
                        <td className="px-4 py-3 text-right">{row.detalleCalculo?.decimoCuartoModalidad === 'mensual' ? `$${Number(row.detalleCalculo?.decimoCuartoMensualizado || 0).toFixed(2)}` : '-'}</td>
                        <td className="px-4 py-3 text-right">${Number(row.detalleCalculo?.anticipos || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">${Number(row.detalleCalculo?.prestamos || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-semibold">${Number(row.netoRecibir || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {state.batches?.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Lotes recientes</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Alcance</th>
                  <th className="px-4 py-3 text-left">Novedad</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3 text-right">Empleados</th>
                  <th className="px-4 py-3 text-right">Creadas</th>
                  <th className="w-20 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {state.batches.map((batch) => (
                  <tr key={batch.id}>
                    <td className="px-4 py-3 font-medium text-slate-800">{batchScopeLabel(batch)}</td>
                    <td className="px-4 py-3">{getNoveltyTypeLabel(batch.tipo_novedad, noveltyTypeOptions)}</td>
                    <td className="px-4 py-3">{String(batch.fecha).slice(0, 10)}</td>
                    <td className="px-4 py-3 text-right">${Number(batch.monto || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">{batch.total_empleados}</td>
                    <td className="px-4 py-3 text-right">{batch.total_creadas}</td>
                    <td className="px-4 py-3 text-right">
                      {pendingDeleteBatch === batch.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="inline-flex min-h-8 items-center rounded-md border border-red-200 bg-white px-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                            disabled={deleteBatchMutation.isPending}
                            onClick={() => deleteBatchMutation.mutate(batch.id)}
                            type="button"
                          >
                            Confirmar
                          </button>
                          <button
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500"
                            onClick={() => setPendingDeleteBatch(null)}
                            type="button"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:border-red-200 hover:text-red-700"
                          onClick={() => { setPendingDeleteBatch(batch.id); setMessage(null); }}
                          title="Eliminar lote y sus novedades"
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

export default CerrarMes;
