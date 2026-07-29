import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Download, LockKeyhole, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { approveBenefitPayrollRole, closeBenefitPayrollRole, createBenefitPayrollRole, downloadBenefitPayrollFile, fetchBenefitPayrollRoles } from '../../services/benefitPayrollApi';
import { extractApiError } from '../../services/publicApi';
import { currentPeriodEC } from '../../utils/dateFormat';
import { downloadBlob } from '../../utils/downloadBlob';

const BENEFIT_OPTIONS = [
  { value: 'decimo_tercero', label: 'Décimo tercero acumulado' },
  { value: 'decimo_cuarto', label: 'Décimo cuarto acumulado' },
  { value: 'participacion_laboral', label: 'Participación laboral / utilidades' },
  { value: 'salario_digno', label: 'Compensación de salario digno' },
  { value: 'fondos_reserva', label: 'Fondos de reserva / conciliación IESS' },
];

function legalPaymentDate(type, region, year) {
  if (type === 'decimo_tercero') return `${year}-12-24`;
  if (type === 'decimo_cuarto' && region === 'costa_galapagos') return `${year}-03-15`;
  if (type === 'decimo_cuarto' && region === 'sierra_amazonia') return `${year}-08-15`;
  return '';
}

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function divergenceLabel(key) {
  return {
    sbu: 'SBU/SMV',
    iess_aporte_personal: 'aporte personal IESS',
    iess_aporte_patronal: 'aporte patronal IESS',
    jornada_maxima_semanal: 'jornada máxima semanal',
  }[key] || key;
}

function emptyDraft() {
  const period = currentPeriodEC();
  return {
    tipoBeneficio: 'decimo_tercero',
    anio: period.anio,
    region: 'costa_galapagos',
    fechaPago: `${period.anio}-12-24`,
    sbuPago: '',
    utilidadLiquida: '',
    salarioDignoMensual: '',
    utilidadCompensacion: '',
    descripcion: '',
    observacion: '',
  };
}

function RolesBeneficiosLegales() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(emptyDraft);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [errorDetails, setErrorDetails] = useState({});
  const [downloading, setDownloading] = useState('');
  const period = useMemo(() => currentPeriodEC(), []);

  const rolesQuery = useQuery({
    queryKey: ['roles-beneficios-legales', draft.anio],
    queryFn: () => fetchBenefitPayrollRoles({ anio: draft.anio }),
  });

  useEffect(() => {
    const legalDate = legalPaymentDate(draft.tipoBeneficio, draft.region, draft.anio);
    if (legalDate) setDraft((current) => ({ ...current, fechaPago: legalDate }));
  }, [draft.tipoBeneficio, draft.region, draft.anio]);

  const createMutation = useMutation({
    mutationFn: createBenefitPayrollRole,
    onSuccess: async () => {
      setMessage('Borrador de rol de beneficios generado. Revisa provisión, ajuste y pago antes de aprobar.');
      setError('');
      setErrorCode('');
      setErrorDetails({});
      await queryClient.invalidateQueries({ queryKey: ['roles-beneficios-legales', draft.anio] });
    },
    onError: (err) => {
      setMessage('');
      setError(extractApiError(err, 'No pudimos generar el rol de beneficios.'));
      setErrorCode(err?.response?.data?.code || '');
      setErrorDetails(err?.response?.data?.details || {});
    },
  });

  const actionMutation = useMutation({
    mutationFn: ({ action, id }) => action === 'approve' ? approveBenefitPayrollRole(id) : closeBenefitPayrollRole(id),
    onSuccess: async (_role, variables) => {
      setMessage(variables.action === 'approve' ? 'Rol de beneficios aprobado. Verifica el asiento antes del cierre.' : 'Rol de beneficios cerrado y listo como evidencia de pago.');
      setError('');
      setErrorCode('');
      setErrorDetails({});
      await queryClient.invalidateQueries({ queryKey: ['roles-beneficios-legales', draft.anio] });
    },
    onError: (err) => {
      setMessage('');
      setError(extractApiError(err, 'No pudimos actualizar el estado del rol de beneficios.'));
      setErrorCode(err?.response?.data?.code || '');
      setErrorDetails(err?.response?.data?.details || {});
    },
  });

  const updateDraft = (field, value) => setDraft((current) => ({ ...current, [field]: value }));

  const submit = (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setErrorCode('');
    setErrorDetails({});
    createMutation.mutate({
      ...draft,
      anio: Number(draft.anio),
      sbuPago: draft.sbuPago === '' ? undefined : Number(draft.sbuPago),
      utilidadLiquida: draft.utilidadLiquida === '' ? undefined : Number(draft.utilidadLiquida),
      salarioDignoMensual: draft.salarioDignoMensual === '' ? undefined : Number(draft.salarioDignoMensual),
      utilidadCompensacion: draft.utilidadCompensacion === '' ? undefined : Number(draft.utilidadCompensacion),
    });
  };

  const downloadRole = async (role, format) => {
    setDownloading(`${role.id}-${format}`);
    setError('');
    setErrorCode('');
    setErrorDetails({});
    try {
      const blob = await downloadBenefitPayrollFile(role.id, format);
      downloadBlob(blob, `rol_beneficios_${role.tipoBeneficio}_${role.anio}.${format}`);
      setMessage(`Descarga lista: rol de ${role.tipoBeneficioLabel}.`);
    } catch (err) {
      setError(extractApiError(err, 'No pudimos descargar el rol de beneficios.'));
      setErrorCode(err?.response?.data?.code || '');
      setErrorDetails(err?.response?.data?.details || {});
    } finally {
      setDownloading('');
    }
  };

  return (
    <section className="mt-6 rounded-lg border border-teal-100 bg-teal-50/50 p-4 shadow" aria-labelledby="roles-beneficios-title">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-950" id="roles-beneficios-title"><CheckCircle2 className="h-5 w-5 text-teal-700" />Roles de beneficios legales</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-700">La operación está dentro de Nómina. Genera el rol desde la provisión mensual cerrada y revisa por separado el ajuste legal y el pago acumulado.</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-teal-800">Ecuador · {period.anio}</span>
      </div>

      <form className="mt-4 rounded-md border border-teal-100 bg-white p-4" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-semibold text-slate-700">Beneficio
            <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" value={draft.tipoBeneficio} onChange={(event) => updateDraft('tipoBeneficio', event.target.value)}>
              {BENEFIT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">Año
            <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" type="number" min="2020" max="2100" value={draft.anio} onChange={(event) => updateDraft('anio', event.target.value)} />
          </label>
          {draft.tipoBeneficio === 'decimo_cuarto' && <label className="text-sm font-semibold text-slate-700">Región
            <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" value={draft.region} onChange={(event) => updateDraft('region', event.target.value)}>
              <option value="costa_galapagos">Costa / Galápagos · 15 de marzo</option>
              <option value="sierra_amazonia">Sierra / Amazonía · 15 de agosto</option>
            </select>
          </label>}
          <label className="text-sm font-semibold text-slate-700">Fecha de pago
            <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" type="date" required value={draft.fechaPago} onChange={(event) => updateDraft('fechaPago', event.target.value)} />
          </label>
          {draft.tipoBeneficio === 'decimo_cuarto' && <label className="text-sm font-semibold text-slate-700">SBU/SMV oficial a la fecha de pago
            <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" type="number" min="0" step="0.01" placeholder="Usa el parámetro vigente" value={draft.sbuPago} onChange={(event) => updateDraft('sbuPago', event.target.value)} />
          </label>}
          {draft.tipoBeneficio === 'participacion_laboral' && <label className="text-sm font-semibold text-slate-700">Utilidad líquida anual
            <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" type="number" min="0" step="0.01" required value={draft.utilidadLiquida} onChange={(event) => updateDraft('utilidadLiquida', event.target.value)} />
          </label>}
          {draft.tipoBeneficio === 'salario_digno' && <>
            <label className="text-sm font-semibold text-slate-700">Salario digno mensual oficial
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" type="number" min="0" step="0.01" required value={draft.salarioDignoMensual} onChange={(event) => updateDraft('salarioDignoMensual', event.target.value)} />
            </label>
            <label className="text-sm font-semibold text-slate-700">Utilidad disponible para compensación
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" type="number" min="0" step="0.01" required value={draft.utilidadCompensacion} onChange={(event) => updateDraft('utilidadCompensacion', event.target.value)} />
            </label>
          </>}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">Descripción del rol
            <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" maxLength="240" placeholder="Pago acumulado según periodo legal" value={draft.descripcion} onChange={(event) => updateDraft('descripcion', event.target.value)} />
          </label>
          <label className="text-sm font-semibold text-slate-700">Observación de parámetros
            <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" maxLength="500" placeholder="Obligatoria si cambia el SBU/SMV" value={draft.observacion} onChange={(event) => updateDraft('observacion', event.target.value)} />
          </label>
        </div>
        <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">Fondos de reserva con destino IESS se muestran como conciliación del depósito; vacaciones no se generan como rol periódico cuando corresponden a disfrute o finiquito.</p>
        <button className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300" type="submit" disabled={createMutation.isPending}><Plus className="h-4 w-4" />{createMutation.isPending ? 'Generando borrador...' : 'Generar borrador de beneficio'}</button>
      </form>

      {message && <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">{message}</p>}
      {error && (
        <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          <p>{error}</p>
          {['LEGAL_PARAMETERS_DIVERGENCE', 'LEGAL_PARAMETERS_NOT_VALIDATED'].includes(errorCode) && (
            <div className="mt-2 rounded-md border border-red-200 bg-white/70 p-3 text-xs leading-5">
              <p>
                Revisa el año {errorDetails.year || errorDetails.anio || draft.anio} en <strong>Parametrización &gt; Valores legales</strong>.
                {errorCode === 'LEGAL_PARAMETERS_DIVERGENCE'
                  ? ' La tabla histórica conserva una referencia anterior; el cálculo usa la versión legal vigente. Recarga la pantalla y verifica que la versión vigente sea la que deseas aplicar.'
                  : ` Valida: ${(errorDetails.pendingParameters || []).map((item) => divergenceLabel(item.key)).join(', ') || 'la fuente oficial pendiente'} antes de volver a generar.`}
              </p>
              <Link
                className="mt-2 inline-flex font-semibold text-red-900 underline underline-offset-2 hover:text-red-700"
                to={errorDetails.reviewRoute || '/dashboard/configuracion/parametrizacion?seccion=legal'}
              >
                Ir a Valores legales
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 space-y-4">
        {rolesQuery.isLoading ? <p className="rounded-md bg-white px-4 py-6 text-center text-sm text-slate-500">Cargando roles de beneficios...</p> : null}
        {!rolesQuery.isLoading && (rolesQuery.data || []).length === 0 ? <p className="rounded-md border border-dashed border-teal-200 bg-white px-4 py-6 text-center text-sm text-slate-500">No hay roles de beneficios generados para este año.</p> : null}
        {(rolesQuery.data || []).map((role) => (
          <article className="rounded-md border border-slate-200 bg-white p-4" key={role.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="font-semibold text-slate-950">{role.tipoBeneficioLabel} · {role.anio}</h3><p className="mt-1 text-xs text-slate-600">Pago: {role.fechaPago} · Periodo: {role.periodoDesde} a {role.periodoHasta} · Región: {role.region || 'No aplica'} · Estado: <strong>{role.estado}</strong></p><p className="mt-1 text-sm text-slate-700">Provisión {money(role.totalProvision)} · Ajuste {money(role.totalAjuste)} · Total a pagar {money(role.totalPago)}</p></div>
              <div className="flex flex-wrap gap-2">
                <button className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50" type="button" disabled={downloading === `${role.id}-xlsx`} onClick={() => downloadRole(role, 'xlsx')}><Download className="h-3.5 w-3.5" />XLSX</button>
                <button className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50" type="button" disabled={downloading === `${role.id}-pdf`} onClick={() => downloadRole(role, 'pdf')}><Download className="h-3.5 w-3.5" />PDF</button>
                {role.estado === 'borrador' && <button className="inline-flex items-center gap-1 rounded-md border border-teal-200 px-3 py-1.5 text-xs font-semibold text-teal-800 disabled:opacity-50" type="button" disabled={actionMutation.isPending} onClick={() => actionMutation.mutate({ action: 'approve', id: role.id })}><CheckCircle2 className="h-3.5 w-3.5" />Aprobar</button>}
                {role.estado === 'aprobado' && <button className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50" type="button" disabled={actionMutation.isPending} onClick={() => actionMutation.mutate({ action: 'close', id: role.id })}><LockKeyhole className="h-3.5 w-3.5" />Cerrar</button>}
              </div>
            </div>
            <div className="mt-3 max-h-72 overflow-auto rounded-md border border-slate-100"><table className="w-full min-w-[760px] text-sm"><thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Empleado</th><th className="px-3 py-2">Días</th><th className="px-3 py-2">Provisión</th><th className="px-3 py-2">Ajuste</th><th className="px-3 py-2">Pago</th><th className="px-3 py-2">Destino</th></tr></thead><tbody className="divide-y divide-slate-100">{role.lineas.map((line) => <tr key={line.id}><td className="px-3 py-2"><p className="font-medium text-slate-900">{line.empleado}</p><p className="text-xs text-slate-500">{line.cedula}</p></td><td className="px-3 py-2">{line.dias}</td><td className="px-3 py-2">{money(line.montoProvision)}</td><td className="px-3 py-2">{money(line.montoAjuste)}</td><td className="px-3 py-2 font-semibold">{money(line.montoPago)}</td><td className="px-3 py-2">{line.destino}</td></tr>)}</tbody></table></div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default RolesBeneficiosLegales;
