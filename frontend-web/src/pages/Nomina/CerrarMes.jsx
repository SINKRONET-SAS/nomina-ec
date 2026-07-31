import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import {
  AlertTriangle,
  CalendarClock,
  Calculator,
  CheckCircle,
  ClipboardCheck,
  Download,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  Trash2,
  Undo2,
  Upload,
  XCircle,
} from 'lucide-react';
import { authenticatedApi } from '../../services/authenticatedApi';
import { extractApiError } from '../../services/publicApi';
import CompactNotice from '../../components/UI/CompactNotice';
import TablePagination from '../../components/UI/TablePagination';
import EmployeeSearchSelect from '../../components/UI/EmployeeSearchSelect';
import { ECUADOR_TIME_ZONE, currentPeriodEC, firstDayOfPeriodEC } from '../../utils/dateFormat';
import { downloadBlob } from '../../utils/downloadBlob';
import {
  buildNoveltyTypeOptions,
  getNoveltyTypeLabel,
  hoursDraftToNumber,
  isAmountNoveltyType,
  normalizeHoursDraft,
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

function hasOvertimeLimitCalculationError(resultado) {
  return (resultado?.resultados || []).some((row) => (
    row?.errorCode === 'NOMINA_HORAS_EXTRA_LIMITE_SEMANAL'
    || row?.details?.violations?.length > 0
  ));
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

function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function batchSearchText(batch = {}, noveltyTypeOptions = []) {
  return normalizeSearchText([
    batchScopeLabel(batch),
    batch.scope_value,
    batch.tipo_novedad,
    getNoveltyTypeLabel(batch.tipo_novedad, noveltyTypeOptions),
    batch.fecha,
    batch.monto,
    batch.total_empleados,
    batch.total_creadas,
  ].join(' '));
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
  const [showReopenPeriod, setShowReopenPeriod] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [batchSearch, setBatchSearch] = useState('');
  const [batchNoveltyFilter, setBatchNoveltyFilter] = useState('all');
  const [batchScopeFilter, setBatchScopeFilter] = useState('all');
  const [bulkCsv, setBulkCsv] = useState('');
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkResult, setBulkResult] = useState(null);
  const [batchForm, setBatchForm] = useState({
    scopeType: 'company',
    scopeValue: '',
    tipoNovedad: 'hora_extra_50',
    fecha: firstDayOfPeriodEC(initialPeriod.anio, initialPeriod.mes),
    horas: '1.00',
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
  const batches = state.batches || [];
  const batchNoveltyOptions = useMemo(() => {
    const options = new Map();
    for (const batch of batches) {
      const value = String(batch.tipo_novedad || '').trim();
      if (value) options.set(value, getNoveltyTypeLabel(value, noveltyTypeOptions));
    }
    return Array.from(options, ([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }, [batches, noveltyTypeOptions]);
  const filteredBatches = useMemo(() => {
    const search = normalizeSearchText(batchSearch);
    return batches.filter((batch) => {
      if (batchScopeFilter !== 'all' && batch.scope_type !== batchScopeFilter) return false;
      if (batchNoveltyFilter !== 'all' && batch.tipo_novedad !== batchNoveltyFilter) return false;
      if (!search) return true;
      return batchSearchText(batch, noveltyTypeOptions).includes(search);
    });
  }, [batches, batchSearch, batchNoveltyFilter, batchScopeFilter, noveltyTypeOptions]);
  const hasBatchFilters = Boolean(batchSearch.trim() || batchNoveltyFilter !== 'all' || batchScopeFilter !== 'all');

  const [batchPage, setBatchPage] = useState(1);
  const [batchPageSize, setBatchPageSize] = useState(10);
  const totalBatchPages = Math.max(1, Math.ceil(filteredBatches.length / batchPageSize));
  const paginatedBatches = useMemo(() => {
    const start = (batchPage - 1) * batchPageSize;
    return filteredBatches.slice(start, start + batchPageSize);
  }, [filteredBatches, batchPage, batchPageSize]);

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
        horas: isAmountNoveltyType(nextType.value, noveltyTypeOptions) ? '0' : current.horas || '1.00',
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
      horas: hoursDraftToNumber(batchForm.horas),
      monto: batchForm.monto,
      justificacion: batchForm.justificacion,
    }),
    onSuccess: (response) => {
      const batch = response.data?.batch;
      setMessage({ type: 'success', text: `Lote ${batch?.id || ''}: ${batch?.total_creadas || 0} novedades creadas.` });
      refreshPeriod();
    },
  });

  const bulkNoveltyMutation = useMutation({
    mutationFn: (rows) => authenticatedApi.post('/novedades/carga-masiva', { rows }),
    onSuccess: (response) => {
      setBulkResult(response.data);
      setMessage({
        type: 'success',
        text: `Carga masiva procesada: ${response.data?.creadas || 0} creadas, ${response.data?.errores || 0} con error.`,
      });
      setError('');
      setBulkCsv('');
      setBulkFileName('');
      queryClient.invalidateQueries({ queryKey: ['nomina-periodo', anio, mes] });
      queryClient.invalidateQueries({ queryKey: ['novedades-pendientes'] });
    },
    onError: (error) => {
      setBulkResult(null);
      setMessage(null);
      setError(error.response?.data?.message || error.response?.data?.error || 'No pudimos procesar la carga masiva.');
    },
  });

  const resolveNoveltiesMutation = useMutation({
    mutationFn: async ({
      decision,
      motivo,
      approveOvertimeLimitExceptions = false,
      overtimeLimitApprovalReason = '',
    }) => authenticatedApi.put('/novedades/periodo/resolver', {
      anio,
      mes,
      decision,
      motivo,
      approveOvertimeLimitExceptions,
      overtimeLimitApprovalReason,
    }),
    onSuccess: (response) => {
      const total = response.data?.total || 0;
      const decision = response.data?.decision === 'rechazar' ? 'rechazadas' : 'aprobadas';
      setMessage({ type: 'success', text: `${total} novedades ${decision} para el periodo.` });
      queryClient.invalidateQueries({ queryKey: ['novedades-pendientes'] });
      refreshPeriod();
    },
    onError: (error, variables) => {
      const code = error.response?.data?.error;
      if (code === 'NOVEDAD_HORAS_EXTRA_LIMITE_APROBACION_REQUERIDA' && !variables?.approveOvertimeLimitExceptions) {
        const reason = window.prompt('Hay horas extra que exceden el limite semanal. Registra el motivo de aprobacion para aprobar el periodo:');
        if (reason === null) return;
        if (reason.trim().length < 10) {
          setMessage({ type: 'error', text: 'La aprobacion del exceso requiere un motivo de al menos 10 caracteres.' });
          return;
        }
        resolveNoveltiesMutation.mutate({
          decision: variables.decision,
          motivo: variables.motivo || '',
          approveOvertimeLimitExceptions: true,
          overtimeLimitApprovalReason: reason.trim(),
        });
      }
    },
  });

  const calculateMutation = useMutation({
    mutationFn: async ({
      approveOvertimeLimitExceptions = false,
      overtimeLimitApprovalReason = '',
    } = {}) => authenticatedApi.post('/nomina/calcular', {
      anio,
      mes,
      approveOvertimeLimitExceptions,
      overtimeLimitApprovalReason,
    }),
    onSuccess: (response) => {
      setResultado(response.data.resultado);
      const approved = Number(response.data?.overtimeLimitApproval?.updated || 0);
      if (approved > 0) {
        setMessage({ type: 'success', text: `Aprobacion registrada para ${approved} novedades de horas extra. Nomina calculada.` });
        refreshPeriod();
        return;
      }
      setMessage({ type: 'success', text: 'Nómina calculada. Revisa el detalle antes de cerrar el periodo.' });
      refreshPeriod();
    },
    onError: (error, variables = {}) => {
      const calculationResult = error.response?.data?.resultado;
      if (calculationResult) setResultado(calculationResult);
      if (hasOvertimeLimitCalculationError(calculationResult) && !variables?.approveOvertimeLimitExceptions) {
        const reason = window.prompt('Las horas extra fueron cargadas de forma acumulada y exceden el limite semanal. Registra el motivo de aprobacion para continuar:');
        if (reason === null) {
          refreshPeriod();
          return;
        }
        if (reason.trim().length < 10) {
          setMessage({ type: 'error', text: 'La aprobacion del exceso requiere un motivo de al menos 10 caracteres.' });
          refreshPeriod();
          return;
        }
        calculateMutation.mutate({
          approveOvertimeLimitExceptions: true,
          overtimeLimitApprovalReason: reason.trim(),
        });
        return;
      }
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

  const reopenMutation = useMutation({
    mutationFn: async () => authenticatedApi.post('/nomina/reabrir', {
      anio,
      mes,
      motivo: reopenReason.trim(),
    }),
    onSuccess: (response) => {
      const roles = response.data?.rolesRevertidos || 0;
      setResultado(null);
      setMessage({
        type: 'success',
        text: `Periodo reabierto. ${roles} roles revertidos a borrador. Corrige los valores legales si es necesario, luego descarta el cálculo y recalcula.`,
      });
      setShowReopenPeriod(false);
      setReopenReason('');
      queryClient.invalidateQueries({ queryKey: ['roles-pagos', anio, mes] });
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
    reopenMutation.reset();
    setShowDiscardCalculation(false);
    setDiscardReason('');
    setShowReopenPeriod(false);
    setReopenReason('');
    setBatchSearch('');
    setBatchNoveltyFilter('all');
    setBatchScopeFilter('all');
    setBulkCsv('');
    setBulkFileName('');
    setBulkResult(null);
    bulkNoveltyMutation.reset();
  }, [anio, mes]);

  const updateBatch = (field, value) => {
    setBatchForm((current) => ({ ...current, [field]: value }));
  };

  async function downloadBulkNoveltyTemplate() {
    try {
      const response = await authenticatedApi.get('/novedades/plantilla-carga-masiva', { responseType: 'blob' });
      downloadBlob(response.data, 'plantilla_carga_masiva_novedades.csv');
      setError('');
    } catch (error) {
      setError(error.response?.data?.message || 'No pudimos descargar la plantilla de novedades.');
    }
  }

  async function loadBulkNoveltyFile(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      if (!content.trim()) throw new Error('El archivo CSV seleccionado está vacío.');
      setBulkCsv(content);
      setBulkFileName(file.name);
      setBulkResult(null);
      setMessage({ type: 'success', text: `Archivo listo: ${file.name}. Revisa las filas y procesa la carga.` });
      setError('');
    } catch (error) {
      setBulkFileName('');
      setBulkCsv('');
      setBulkResult(null);
      setMessage(null);
      setError(error.message || 'No pudimos leer el archivo CSV seleccionado.');
    } finally {
      input.value = '';
    }
  }

  function submitBulkNovelties(event) {
    event.preventDefault();
    try {
      bulkNoveltyMutation.mutate(parseCsvRows(bulkCsv));
    } catch (error) {
      setBulkResult(null);
      setMessage(null);
      setError(error.message);
    }
  }

  const updateBatchHours = (value) => {
    const nextValue = normalizeHoursDraft(value);
    if (nextValue === null) return;
    updateBatch('horas', nextValue);
  };

  const scopeNeedsValue = batchForm.scopeType !== 'company';
  const requiresAmount = isAmountNoveltyType(batchForm.tipoNovedad, noveltyTypeOptions);
  const canCreateBatch = isWritablePeriod
    && (!scopeNeedsValue || batchForm.scopeValue)
    && (requiresAmount ? Number(batchForm.monto) > 0 : hoursDraftToNumber(batchForm.horas) > 0);
  const currentError = openMutation.error || batchMutation.error || bulkNoveltyMutation.error || deleteBatchMutation.error || resolveNoveltiesMutation.error || precalculateMutation.error || calculateMutation.error || closeMutation.error || discardCalculationMutation.error || periodQuery.error || noveltyTypesQuery.error;
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

          {isClosedPeriod && (
            <div className="mt-5 border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-slate-900">Reapertura controlada</h3>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Revierte los roles cerrados a borrador para corregir parámetros y recalcular. Requiere motivo documentado.
              </p>
              {!showReopenPeriod ? (
                <button
                  className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 text-xs font-semibold text-amber-800"
                  onClick={() => setShowReopenPeriod(true)}
                  type="button"
                >
                  <Undo2 className="h-4 w-4" />
                  Reabrir periodo
                </button>
              ) : (
                <div className="mt-3 space-y-3">
                  <textarea
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    onChange={(event) => setReopenReason(event.target.value)}
                    placeholder="Motivo de reapertura (mín. 10 caracteres)..."
                    rows={2}
                    value={reopenReason}
                  />
                  <div className="flex gap-2">
                    <button
                      className="inline-flex min-h-9 items-center gap-2 rounded-md bg-amber-600 px-4 text-xs font-semibold text-white disabled:bg-slate-300"
                      disabled={reopenReason.trim().length < 10 || reopenMutation.isPending}
                      onClick={() => reopenMutation.mutate()}
                      type="button"
                    >
                      <Undo2 className="h-4 w-4" />
                      {reopenMutation.isPending ? 'Reabriendo...' : 'Confirmar reapertura'}
                    </button>
                    <button
                      className="inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700"
                      onClick={() => { setShowReopenPeriod(false); setReopenReason(''); }}
                      type="button"
                    >
                      Cancelar
                    </button>
                  </div>
                  {reopenMutation.isError && (
                    <p className="text-xs font-semibold text-red-700">
                      {extractApiError(reopenMutation.error) || 'Error al reabrir el periodo.'}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
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
                  horas: isAmountNoveltyType(nextType, noveltyTypeOptions) ? '0' : current.horas || '1.00',
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
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              disabled={requiresAmount}
              inputMode="decimal"
              onChange={(event) => updateBatchHours(event.target.value)}
              pattern="[0-9]+([.,][0-9]{0,2})?"
              type="text"
              value={batchForm.horas}
            />
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
                  HE 100% y nocturna usan multiplicador {Number(overtimeParameters.extraordinaryMultiplier || 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({percentLabel(overtimeParameters.extraordinarySurchargeRate)} de recargo).
                  Limite semanal: {Number(overtimeParameters.maxWeeklyOvertimeHours || 0).toLocaleString('es-EC')} horas.
                </p>
              </div>
            )}
            {hasOvertimeLimitCalculationError(resultado) && (
              <div className="mb-4 flex flex-col gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold">Horas extra acumuladas requieren aprobacion</p>
                  <p className="mt-1 text-xs leading-5">
                    El lote acumulado se valida contra el limite semanal. Aprueba la excepcion para registrar el motivo y recalcular.
                  </p>
                </div>
                <button
                  className="inline-flex min-h-9 items-center justify-center rounded-md bg-amber-700 px-3 text-sm font-semibold text-white hover:bg-amber-800 disabled:bg-slate-300"
                  disabled={calculateMutation.isPending}
                  onClick={() => {
                    const reason = window.prompt('Motivo de aprobacion para exceder el limite semanal de horas extra:');
                    if (reason === null) return;
                    if (reason.trim().length < 10) {
                      setMessage({ type: 'error', text: 'La aprobacion del exceso requiere un motivo de al menos 10 caracteres.' });
                      return;
                    }
                    calculateMutation.mutate({
                      approveOvertimeLimitExceptions: true,
                      overtimeLimitApprovalReason: reason.trim(),
                    });
                  }}
                  type="button"
                >
                  Aprobar exceso y recalcular
                </button>
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

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Carga masiva de novedades</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Descarga la plantilla oficial, selecciona el archivo o pega sus filas para registrar novedades del periodo.
            </p>
          </div>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-teal-200 px-4 text-sm font-semibold text-teal-700 hover:border-teal-400"
            onClick={downloadBulkNoveltyTemplate}
            type="button"
          >
            <Download className="h-4 w-4" />
            Descargar plantilla
          </button>
        </div>
        <form className="mt-4" onSubmit={submitBulkNovelties}>
          <div className="rounded-md border border-dashed border-teal-300 bg-teal-50/60 p-3">
            <p className="text-sm font-semibold text-slate-700">Archivo CSV</p>
            <label className="mt-2 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">
              <Upload className="h-4 w-4" />
              {bulkFileName ? 'Cambiar archivo' : 'Seleccionar archivo'}
              <input accept=".csv,.txt,text/csv,text/plain" className="sr-only" onChange={loadBulkNoveltyFile} type="file" />
            </label>
            <span className="ml-3 text-xs text-slate-600">También puedes pegar las filas en el cuadro inferior.</span>
          </div>
          {bulkFileName && <p className="mt-2 text-xs text-slate-500">Archivo seleccionado: {bulkFileName}</p>}
          <textarea
            aria-label="Filas CSV de novedades en Cerrar Mes"
            className="mt-3 min-h-40 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
            onChange={(event) => {
              setBulkCsv(event.target.value);
              setBulkFileName('');
              setBulkResult(null);
            }}
            placeholder="cedula,fecha,tipoNovedad,horas,monto,justificacion,idempotencyKey"
            value={bulkCsv}
          />
          <p className="mt-2 text-xs leading-5 text-slate-500">
            La cédula identifica al empleado. La fecha debe corresponder al periodo seleccionado; EmpleadoId queda disponible solo para integraciones.
          </p>
          <button
            className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-slate-800 px-4 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
            disabled={bulkNoveltyMutation.isPending || !bulkCsv.trim()}
            type="submit"
          >
            <Plus className="h-4 w-4" />
            {bulkNoveltyMutation.isPending ? 'Procesando...' : 'Procesar carga masiva'}
          </button>
        </form>
        {bulkResult && (
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <p className="font-semibold text-slate-900">Resultado de la carga</p>
            <p className="mt-1 text-slate-600">
              {bulkResult.creadas || 0} creadas · {bulkResult.errores || 0} con error.
            </p>
            {bulkResult.results?.some((row) => row.status === 'error') && (
              <div className="mt-2 space-y-1 text-xs text-red-700">
                {bulkResult.results.filter((row) => row.status === 'error').slice(0, 10).map((row) => (
                  <p key={row.rowNumber || row.fila}>Fila {row.rowNumber || row.fila}: {row.message || row.error || 'Revisa los datos.'}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {batches.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Lotes de novedades</h2>
              <p className="mt-1 text-sm text-slate-600">
                {filteredBatches.length} de {batches.length} lotes visibles.
              </p>
              {hasBatchFilters && (
                <button
                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:border-slate-300"
                  onClick={() => {
                    setBatchSearch('');
                    setBatchNoveltyFilter('all');
                    setBatchScopeFilter('all');
                    setBatchPage(1);
                  }}
                  type="button"
                >
                  <XCircle className="h-4 w-4" />
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(240px,1fr)_220px_180px]">
            <label className="text-sm font-semibold text-slate-700">
              Empleado, cédula o alcance
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
                onChange={(event) => { setBatchSearch(event.target.value); setBatchPage(1); }}
                placeholder="Buscar por nombre, cédula, cargo o departamento"
                value={batchSearch}
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Novedad
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
                onChange={(event) => { setBatchNoveltyFilter(event.target.value); setBatchPage(1); }}
                value={batchNoveltyFilter}
              >
                <option value="all">Todas</option>
                {batchNoveltyOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Alcance
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
                onChange={(event) => { setBatchScopeFilter(event.target.value); setBatchPage(1); }}
                value={batchScopeFilter}
              >
                <option value="all">Todos</option>
                {SCOPE_TYPES.map((scope) => (
                  <option key={scope.value} value={scope.value}>{scope.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="min-w-[18rem] px-4 py-3 text-left">Alcance</th>
                  <th className="px-4 py-3 text-left">Novedad</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3 text-right">Empleados</th>
                  <th className="px-4 py-3 text-right">Creadas</th>
                  <th className="w-20 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBatches.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-center text-sm font-semibold text-slate-500" colSpan={7}>
                      No hay lotes que coincidan con los filtros.
                    </td>
                  </tr>
                )}
                {paginatedBatches.map((batch) => (
                  <tr key={batch.id}>
                    <td className="max-w-[28rem] whitespace-normal break-words px-4 py-3 font-medium text-slate-800">{batchScopeLabel(batch)}</td>
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
          <TablePagination
            currentPage={batchPage}
            onPageChange={setBatchPage}
            onPageSizeChange={(size) => { setBatchPageSize(size); setBatchPage(1); }}
            pageSize={batchPageSize}
            totalItems={filteredBatches.length}
            totalPages={totalBatchPages}
          />
        </section>
      )}
    </div>
  );
}

function parseCsvRows(text) {
  const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) {
    throw new Error('Pega el encabezado y al menos una fila de la plantilla.');
  }
  const headers = splitCsvLine(lines[0].replace(/^\uFEFF/, '')).map((header) => header.trim());
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

export default CerrarMes;
