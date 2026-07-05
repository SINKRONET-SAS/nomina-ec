import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, CheckCircle, Lock, RefreshCw, Unlock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { authenticatedApi } from '../../services/authenticatedApi';
import { extractApiError } from '../../services/publicApi';
import { currentPeriodEC, formatDateEC } from '../../utils/dateFormat';

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const STATUS_LABELS = {
  planned: 'Planificado',
  open: 'Abierto',
  novelties_loaded: 'Novedades cargadas',
  calculation_failed: 'Calculo fallido',
  calculated: 'Calculado',
  closed: 'Cerrado',
  reopened: 'Reabierto',
};

function statusClass(status) {
  if (status === 'closed') return 'bg-slate-900 text-white';
  if (status === 'calculated') return 'bg-blue-100 text-blue-800';
  if (['open', 'novelties_loaded', 'reopened'].includes(status)) return 'bg-emerald-100 text-emerald-800';
  if (status === 'calculation_failed') return 'bg-red-100 text-red-800';
  return 'bg-slate-100 text-slate-700';
}

function PeriodosNomina() {
  const queryClient = useQueryClient();
  const initialPeriod = useMemo(() => currentPeriodEC(), []);
  const [anio, setAnio] = useState(initialPeriod.anio);
  const [message, setMessage] = useState(null);
  const [closeTarget, setCloseTarget] = useState(null);
  const [closeReason, setCloseReason] = useState('');

  const periodsQuery = useQuery({
    queryKey: ['nomina-periodos-anuales', anio],
    queryFn: async () => {
      const response = await authenticatedApi.get(`/nomina/periodos/${anio}`);
      return response.data?.periods || [];
    },
    retry: false,
  });

  const refreshPeriods = () => queryClient.invalidateQueries({ queryKey: ['nomina-periodos-anuales', anio] });

  const generateMutation = useMutation({
    mutationFn: async () => authenticatedApi.post('/nomina/periodos/generar-anual', { anio }),
    onSuccess: (response) => {
      setMessage({ type: 'success', text: `${response.data?.total || 12} periodos generados para ${anio}.` });
      refreshPeriods();
    },
  });

  const openMutation = useMutation({
    mutationFn: async (mes) => authenticatedApi.post('/nomina/periodo/abrir', { anio, mes }),
    onSuccess: (response) => {
      const period = response.data?.period;
      setMessage({ type: 'success', text: `Periodo ${String(period?.mes || '').padStart(2, '0')}/${period?.anio || anio} abierto.` });
      refreshPeriods();
    },
  });

  const closeMutation = useMutation({
    mutationFn: async () => authenticatedApi.post('/nomina/periodo/cerrar-operativo', {
      anio,
      mes: closeTarget?.mes,
      motivo: closeReason,
    }),
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Periodo cerrado sin pendientes operativos.' });
      setCloseTarget(null);
      setCloseReason('');
      refreshPeriods();
    },
  });

  const currentError = periodsQuery.error || generateMutation.error || openMutation.error || closeMutation.error;
  const periods = periodsQuery.data || [];
  const alertIsError = Boolean(currentError || message?.type === 'error');

  const beginClose = (period) => {
    setMessage(null);
    setCloseTarget(period);
    setCloseReason(`Cierre operativo del periodo ${String(period.mes).padStart(2, '0')}/${period.anio}`);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">Periodos de nomina</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">Calendario anual y meses operativos</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              Genera los doce meses del anio, revisa fechas desde y hasta, y abre o cierra cada periodo sin romper el ciclo de calculo.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm font-semibold text-slate-700">
              Anio
              <input
                className="mt-1 w-32 rounded-md border border-slate-300 px-3 py-2"
                max="2100"
                min="2020"
                onChange={(event) => setAnio(Number(event.target.value))}
                type="number"
                value={anio}
              />
            </label>
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:bg-slate-300"
              disabled={generateMutation.isPending}
              onClick={() => generateMutation.mutate()}
              type="button"
            >
              <CalendarDays className="h-4 w-4" />
              {generateMutation.isPending ? 'Generando' : 'Generar anio'}
            </button>
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={refreshPeriods}
              type="button"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </button>
          </div>
        </div>
      </section>

      {(message || currentError) && (
        <div className={`rounded-md border px-4 py-3 text-sm font-medium ${alertIsError ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          {currentError ? extractApiError(currentError, 'No pudimos completar la operacion sobre periodos.') : message.text}
          {currentError?.response?.data?.details && (
            <pre className="mt-2 overflow-x-auto text-xs">{JSON.stringify(currentError.response.data.details, null, 2)}</pre>
          )}
        </div>
      )}

      {closeTarget && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-lg font-semibold text-amber-950">
            Cerrar periodo {String(closeTarget.mes).padStart(2, '0')}/{closeTarget.anio}
          </h2>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            El cierre operativo bloquea novedades si no existen roles borrador ni novedades pendientes. Si el periodo ya fue calculado, usa el cierre de nomina.
          </p>
          <label className="mt-4 block text-sm font-semibold text-amber-950">
            Motivo
            <input
              className="mt-1 w-full rounded-md border border-amber-300 px-3 py-2"
              onChange={(event) => setCloseReason(event.target.value)}
              value={closeReason}
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white disabled:bg-slate-300"
              disabled={closeReason.trim().length < 10 || closeMutation.isPending}
              onClick={() => closeMutation.mutate()}
              type="button"
            >
              <Lock className="h-4 w-4" />
              Confirmar cierre
            </button>
            <button
              className="inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700"
              onClick={() => setCloseTarget(null)}
              type="button"
            >
              Cancelar
            </button>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Mes</th>
                <th className="px-4 py-3 text-left">Desde</th>
                <th className="px-4 py-3 text-left">Hasta</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-right">Roles</th>
                <th className="px-4 py-3 text-right">Borrador</th>
                <th className="px-4 py-3 text-right">Novedades pendientes</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {periods.map((period) => {
                const isClosed = period.status === 'closed';
                const isCalculated = period.status === 'calculated';
                return (
                  <tr key={period.id}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{MONTH_NAMES[Number(period.mes) - 1]}</td>
                    <td className="px-4 py-3">{formatDateEC(period.fecha_desde)}</td>
                    <td className="px-4 py-3">{formatDateEC(period.fecha_hasta)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex min-h-7 items-center rounded-full px-3 text-xs font-semibold ${statusClass(period.status)}`}>
                        {STATUS_LABELS[period.status] || period.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{period.payroll_total || 0}</td>
                    <td className="px-4 py-3 text-right">{period.payroll_borrador || 0}</td>
                    <td className="px-4 py-3 text-right">{period.novedades_pendientes || 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {!isClosed && !isCalculated && (
                          <button
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-teal-700 hover:bg-teal-50 disabled:text-slate-300"
                            disabled={openMutation.isPending}
                            onClick={() => openMutation.mutate(period.mes)}
                            title="Abrir periodo"
                            type="button"
                          >
                            <Unlock className="h-4 w-4" />
                          </button>
                        )}
                        {!isClosed && (
                          <button
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
                            onClick={() => beginClose(period)}
                            title="Cerrar periodo"
                            type="button"
                          >
                            <Lock className="h-4 w-4" />
                          </button>
                        )}
                        {isCalculated && (
                          <Link
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50"
                            title="Ir a cierre de nomina"
                            to={`/dashboard/nomina/cerrar?anio=${period.anio}&mes=${period.mes}`}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {periods.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan="8">
                    Genera el anio para crear los doce periodos mensuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default PeriodosNomina;
