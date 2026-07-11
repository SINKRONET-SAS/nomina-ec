import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Banknote,
  Building2,
  CheckCircle2,
  CreditCard,
  LifeBuoy,
  PackagePlus,
  RefreshCw,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react';
import PlanesGestion from './PlanesGestion';
import { fetchAdminPlans } from '../services/beneficiosApi';
import {
  applyManualBankTransfer,
  confirmManualBankTransfer,
  createManualBankTransfer,
  createSupportIncident,
  fetchManualBankTransfers,
  fetchSuperadminOverview,
  rejectManualBankTransfer,
  reverseManualBankTransfer,
  updateSupportIncident,
} from '../services/superadminApi';
import { extractApiError } from '../services/publicApi';

const tabs = [
  { id: 'vision', label: 'Visión general' },
  { id: 'empresas', label: 'Empresas' },
  { id: 'incidencias', label: 'Incidencias' },
  { id: 'planes', label: 'Planes' },
  { id: 'transferencias', label: 'Transferencias' },
];

const incidentStatuses = [
  { value: 'abierta', label: 'Abierta' },
  { value: 'en_revision', label: 'En revisión' },
  { value: 'bloqueada', label: 'Bloqueada' },
  { value: 'cerrada', label: 'Cerrada' },
];

function formatDate(value) {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function formatMoneyFromCents(value) {
  return `$${(Number(value || 0) / 100).toFixed(2)}`;
}

function statusTone(status) {
  if (status === 'cerrada') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (status === 'bloqueada') return 'border-red-200 bg-red-50 text-red-800';
  if (status === 'en_revision') return 'border-blue-200 bg-blue-50 text-blue-800';
  return 'border-amber-200 bg-amber-50 text-amber-900';
}

function severityTone(severity) {
  if (severity === 'critica') return 'bg-red-100 text-red-800';
  if (severity === 'alta') return 'bg-orange-100 text-orange-800';
  if (severity === 'media') return 'bg-amber-100 text-amber-900';
  return 'bg-slate-100 text-slate-700';
}

function StatCard({ icon: Icon, label, value, help }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
        </div>
        <span className="rounded-md bg-teal-50 p-2 text-teal-700">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{help}</p>
    </article>
  );
}

function EmptyState({ children }) {
  return (
    <div className="rounded-md bg-slate-50 px-4 py-5 text-sm text-slate-600">
      {children}
    </div>
  );
}

function IncidentForm({ owners, mutation }) {
  const [draft, setDraft] = useState({ tenantId: '', title: '', severity: 'media', description: '' });

  const updateField = (name, value) => {
    setDraft((current) => ({ ...current, [name]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    try {
      await mutation.mutateAsync({
        ...draft,
        tenantId: draft.tenantId || null,
      });
      setDraft({ tenantId: '', title: '', severity: 'media', description: '' });
    } catch {
      // El panel superior muestra el mensaje comercial de error.
    }
  };

  return (
    <form className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={submit}>
      <div className="flex items-center gap-2">
        <LifeBuoy className="h-5 w-5 text-teal-700" />
        <h2 className="text-lg font-semibold text-slate-950">Nueva incidencia</h2>
      </div>
      <label className="mt-4 block text-sm font-semibold text-slate-700">
        Empresa
        <select
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          onChange={(event) => updateField('tenantId', event.target.value)}
          value={draft.tenantId}
        >
          <option value="">General plataforma</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>{owner.razonSocial || owner.ruc || owner.id}</option>
          ))}
        </select>
      </label>
      <label className="mt-3 block text-sm font-semibold text-slate-700">
        Título
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          maxLength={120}
          onChange={(event) => updateField('title', event.target.value)}
          value={draft.title}
        />
      </label>
      <label className="mt-3 block text-sm font-semibold text-slate-700">
        Severidad
        <select
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          onChange={(event) => updateField('severity', event.target.value)}
          value={draft.severity}
        >
          <option value="baja">Baja</option>
          <option value="media">Media</option>
          <option value="alta">Alta</option>
          <option value="critica">Crítica</option>
        </select>
      </label>
      <label className="mt-3 block text-sm font-semibold text-slate-700">
        Descripción
        <textarea
          className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          onChange={(event) => updateField('description', event.target.value)}
          value={draft.description}
        />
      </label>
      <button
        className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:bg-slate-300"
        disabled={!draft.title.trim() || mutation.isPending}
        type="submit"
      >
        <AlertTriangle className="h-4 w-4" />
        {mutation.isPending ? 'Registrando' : 'Registrar incidencia'}
      </button>
    </form>
  );
}

function CompaniesTable({ owners }) {
  if (owners.length === 0) {
    return <EmptyState>No hay empresas registradas para supervisión.</EmptyState>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[920px] text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Empresa</th>
            <th className="px-4 py-3">Plan</th>
            <th className="px-4 py-3">Suscripción</th>
            <th className="px-4 py-3 text-right">Empleados</th>
            <th className="px-4 py-3 text-right">Usuarios</th>
            <th className="px-4 py-3">Vence</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {owners.map((owner) => (
            <tr key={owner.id}>
              <td className="px-4 py-3">
                <p className="font-semibold text-slate-950">{owner.razonSocial || 'Empresa sin razón social'}</p>
                <p className="text-xs text-slate-500">{owner.ruc || owner.id}</p>
              </td>
              <td className="px-4 py-3">{owner.planNombre || owner.planId || 'Sin plan'}</td>
              <td className="px-4 py-3">{owner.subscriptionStatus || 'sin suscripción'}</td>
              <td className="px-4 py-3 text-right">{owner.empleados || 0}</td>
              <td className="px-4 py-3 text-right">{owner.usuarios || 0}</td>
              <td className="px-4 py-3">{formatDate(owner.venceEn)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IncidentsTable({ incidents, updateMutation }) {
  if (incidents.length === 0) {
    return <EmptyState>No hay incidencias registradas.</EmptyState>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[920px] text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Caso</th>
            <th className="px-4 py-3">Empresa</th>
            <th className="px-4 py-3">Severidad</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Creada</th>
            <th className="px-4 py-3">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {incidents.map((incident) => (
            <tr key={incident.id}>
              <td className="px-4 py-3">
                <p className="font-semibold text-slate-950">{incident.title}</p>
                <p className="text-xs leading-5 text-slate-500">{incident.description || 'Sin descripción'}</p>
              </td>
              <td className="px-4 py-3">{incident.tenantName || 'General'}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${severityTone(incident.severity)}`}>
                  {incident.severity || 'media'}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone(incident.status)}`}>
                  {incidentStatuses.find((item) => item.value === incident.status)?.label || incident.status}
                </span>
              </td>
              <td className="px-4 py-3">{formatDate(incident.createdAt)}</td>
              <td className="px-4 py-3">
                <select
                  className="min-h-9 rounded-md border border-slate-300 px-2 text-sm"
                  disabled={updateMutation.isPending}
                  onChange={(event) => updateMutation.mutate({ id: incident.id, status: event.target.value })}
                  value={incident.status}
                >
                  {incidentStatuses.map((status) => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ManualBankTransfersPanel({ owners }) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [draft, setDraft] = useState({
    tenantId: '',
    planId: '',
    billingPeriod: 'monthly',
    amount: '',
    bankReference: '',
    paidAt: new Date().toISOString().slice(0, 10),
    notes: '',
    evidenceUrl: '',
  });
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const plansQuery = useQuery({
    queryKey: ['admin-plans'],
    queryFn: fetchAdminPlans,
  });

  const transfersQuery = useQuery({
    queryKey: ['manual-bank-transfers', statusFilter],
    queryFn: () => fetchManualBankTransfers(statusFilter ? { status: statusFilter } : {}),
  });

  const plans = plansQuery.data || [];
  const transfers = transfersQuery.data || [];

  const updateDraft = (name, value) => {
    setDraft((current) => ({ ...current, [name]: value }));
  };

  const createMutation = useMutation({
    mutationFn: () => createManualBankTransfer({
      tenantId: draft.tenantId,
      planId: draft.planId,
      billingPeriod: draft.billingPeriod,
      amount: draft.amount,
      bankReference: draft.bankReference,
      paidAt: draft.paidAt,
      notes: draft.notes,
      evidenceUrl: draft.evidenceUrl,
    }),
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Transferencia registrada en revisión.' });
      setDraft((current) => ({
        ...current,
        amount: '',
        bankReference: '',
        notes: '',
        evidenceUrl: '',
        paidAt: new Date().toISOString().slice(0, 10),
      }));
      queryClient.invalidateQueries({ queryKey: ['manual-bank-transfers'] });
    },
    onError: (err) => {
      setFeedback({ type: 'error', message: extractApiError(err, 'No pudimos registrar la transferencia.') });
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }) => {
      if (action === 'confirm') return confirmManualBankTransfer(id);
      if (action === 'apply') return applyManualBankTransfer(id);
      if (action === 'reject') {
        const reason = window.prompt('Motivo de rechazo') || '';
        if (!reason.trim()) return null;
        return rejectManualBankTransfer(id, { reason });
      }
      if (action === 'reverse') {
        const reason = window.prompt('Motivo de reversa') || '';
        if (!reason.trim()) return null;
        return reverseManualBankTransfer(id, { reason });
      }
      return null;
    },
    onSuccess: (payload) => {
      if (!payload) return;
      setFeedback({ type: 'success', message: 'Transferencia actualizada.' });
      queryClient.invalidateQueries({ queryKey: ['manual-bank-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-overview'] });
    },
    onError: (err) => {
      setFeedback({ type: 'error', message: extractApiError(err, 'No pudimos completar la acción.') });
    },
  });

  const submit = (event) => {
    event.preventDefault();
    if (!draft.tenantId || !draft.planId || !draft.amount || !draft.bankReference.trim()) {
      setFeedback({ type: 'error', message: 'Completa empresa, plan, monto y referencia bancaria.' });
      return;
    }
    createMutation.mutate();
  };

  const statusToneClass = (status) => {
    if (status === 'APPLIED') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    if (status === 'CONFIRMED') return 'border-blue-200 bg-blue-50 text-blue-800';
    if (status === 'PENDING_REVIEW') return 'border-amber-200 bg-amber-50 text-amber-900';
    return 'border-slate-200 bg-slate-50 text-slate-700';
  };

  return (
    <section className="space-y-5">
      {feedback.message && (
        <div className={feedback.type === 'success' ? 'rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800' : 'rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800'}>
          {feedback.message}
        </div>
      )}

      <form className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={submit}>
        <div className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-teal-700" />
          <h2 className="text-lg font-semibold text-slate-950">Registrar comprobante</h2>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="text-sm font-semibold text-slate-700">
            Empresa
            <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={draft.tenantId} onChange={(event) => updateDraft('tenantId', event.target.value)}>
              <option value="">Seleccionar empresa</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>{owner.razonSocial || owner.ruc || owner.id}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Plan
            <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={draft.planId} onChange={(event) => updateDraft('planId', event.target.value)}>
              <option value="">Seleccionar plan</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>{plan.nombre || plan.id}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Cobro
            <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={draft.billingPeriod} onChange={(event) => updateDraft('billingPeriod', event.target.value)}>
              <option value="monthly">Mensual</option>
              <option value="annual">Anual</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Monto recibido
            <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" inputMode="decimal" value={draft.amount} onChange={(event) => updateDraft('amount', event.target.value)} placeholder="0.00" />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Referencia bancaria
            <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={draft.bankReference} onChange={(event) => updateDraft('bankReference', event.target.value)} placeholder="TRX-000123" />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Fecha de pago
            <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" type="date" value={draft.paidAt} onChange={(event) => updateDraft('paidAt', event.target.value)} />
          </label>
          <label className="text-sm font-semibold text-slate-700 xl:col-span-2">
            Observación
            <textarea className="mt-1 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={draft.notes} onChange={(event) => updateDraft('notes', event.target.value)} />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            URL evidencia
            <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" value={draft.evidenceUrl} onChange={(event) => updateDraft('evidenceUrl', event.target.value)} placeholder="Opcional" />
          </label>
        </div>
        <button className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:bg-slate-300" disabled={createMutation.isPending} type="submit">
          <PackagePlus className="h-4 w-4" />
          {createMutation.isPending ? 'Registrando' : 'Registrar transferencia'}
        </button>
      </form>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Aplicación de pagos y upgrades</h2>
            <p className="mt-1 text-sm text-slate-600">Canal interno {`BANK_TRANSFER_MANUAL`}; no se muestra en checkout público.</p>
          </div>
          <div className="flex gap-2">
            <select className="min-h-10 rounded-md border border-slate-300 px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">Todos</option>
              <option value="PENDING_REVIEW">En revisión</option>
              <option value="CONFIRMED">Confirmadas</option>
              <option value="APPLIED">Aplicadas</option>
              <option value="REJECTED">Rechazadas</option>
              <option value="REVERSED">Reversadas</option>
            </select>
            <button className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700" onClick={() => transfersQuery.refetch()} type="button">
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </button>
          </div>
        </div>

        {transfersQuery.isLoading ? (
          <EmptyState>Cargando transferencias...</EmptyState>
        ) : transfers.length === 0 ? (
          <EmptyState>No hay transferencias para el filtro actual.</EmptyState>
        ) : (
          <div className="mt-4 space-y-3">
            {transfers.map((payment) => (
              <article className="rounded-lg border border-slate-200 p-4" key={payment.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{payment.bankReference || payment.clientTransactionId}</p>
                    <p className="mt-1 text-sm text-slate-600">{payment.tenantName || payment.tenantRuc || payment.tenantId} · {payment.planNombre} · {formatMoneyFromCents(payment.amountCentavos)}</p>
                    <p className="mt-1 text-xs text-slate-500">Pago {formatDate(payment.paidAt)} · Aplicado {formatDate(payment.appliedAt)} · Cobro {payment.billingPeriod === 'annual' ? 'anual' : 'mensual'}</p>
                  </div>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusToneClass(payment.status)}`}>
                    {payment.status}
                  </span>
                </div>
                {payment.notes && <p className="mt-3 text-sm text-slate-600">{payment.notes}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 disabled:opacity-50" disabled={payment.status !== 'PENDING_REVIEW' || actionMutation.isPending} onClick={() => actionMutation.mutate({ id: payment.id, action: 'confirm' })} type="button">
                    <CheckCircle2 className="h-4 w-4" />
                    Confirmar
                  </button>
                  <button className="inline-flex min-h-9 items-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white disabled:opacity-50" disabled={payment.status !== 'CONFIRMED' || actionMutation.isPending} onClick={() => actionMutation.mutate({ id: payment.id, action: 'apply' })} type="button">
                    <PackagePlus className="h-4 w-4" />
                    Aplicar
                  </button>
                  <button className="inline-flex min-h-9 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-semibold text-red-700 disabled:opacity-50" disabled={!['PENDING_REVIEW', 'CONFIRMED'].includes(payment.status) || actionMutation.isPending} onClick={() => actionMutation.mutate({ id: payment.id, action: 'reject' })} type="button">
                    <XCircle className="h-4 w-4" />
                    Rechazar
                  </button>
                  <button className="inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 disabled:opacity-50" disabled={payment.status !== 'APPLIED' || actionMutation.isPending} onClick={() => actionMutation.mutate({ id: payment.id, action: 'reverse' })} type="button">
                    <RefreshCw className="h-4 w-4" />
                    Reversar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Superadmin() {
  const [activeTab, setActiveTab] = useState('vision');
  const queryClient = useQueryClient();

  const overviewQuery = useQuery({
    queryKey: ['superadmin-overview'],
    queryFn: fetchSuperadminOverview,
    retry: false,
  });

  const overview = overviewQuery.data || {};
  const owners = overview.owners || [];
  const incidents = overview.incidents || [];

  const metrics = useMemo(() => {
    const openIncidents = incidents.filter((incident) => incident.status !== 'cerrada').length;
    return {
      empresas: owners.length,
      empleados: owners.reduce((total, owner) => total + Number(owner.empleados || 0), 0),
      usuarios: owners.reduce((total, owner) => total + Number(owner.usuarios || 0), 0),
      planesActivos: overview.plans?.activos || 0,
      incidenciasAbiertas: openIncidents,
    };
  }, [incidents, overview.plans?.activos, owners]);

  const createIncidentMutation = useMutation({
    mutationFn: createSupportIncident,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['superadmin-overview'] }),
  });

  const updateIncidentMutation = useMutation({
    mutationFn: ({ id, status }) => updateSupportIncident(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['superadmin-overview'] }),
  });

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">Soporte global</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Supervisión SKNOMINA</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              Revisa empresas, planes, estado contractual e incidencias de plataforma sin entrar a la operación
              interna de cada cliente.
            </p>
          </div>
          <button
            className="inline-flex min-h-10 w-fit items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700"
            onClick={() => overviewQuery.refetch()}
            type="button"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
        </div>
      </section>

      {overviewQuery.isError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {extractApiError(overviewQuery.error, 'No pudimos cargar la consola de soporte.')}
        </div>
      )}
      {createIncidentMutation.isError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {extractApiError(createIncidentMutation.error, 'No pudimos registrar la incidencia.')}
        </div>
      )}
      {updateIncidentMutation.isError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {extractApiError(updateIncidentMutation.error, 'No pudimos actualizar la incidencia.')}
        </div>
      )}

      <nav className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
        {tabs.map((tab) => (
          <button
            className={`min-h-10 rounded-md px-4 text-sm font-semibold ${
              activeTab === tab.id ? 'bg-teal-700 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {overviewQuery.isLoading && (
        <div className="rounded-md bg-slate-50 px-4 py-5 text-sm font-medium text-slate-600">Cargando consola...</div>
      )}

      {!overviewQuery.isLoading && activeTab === 'vision' && (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard icon={Building2} label="Empresas" value={metrics.empresas} help="Tenants visibles para seguimiento comercial." />
            <StatCard icon={Users} label="Empleados" value={metrics.empleados} help="Base laboral registrada en empresas activas." />
            <StatCard icon={ShieldCheck} label="Usuarios" value={metrics.usuarios} help="Accesos operativos auditables." />
            <StatCard icon={CreditCard} label="Planes activos" value={metrics.planesActivos} help="Planes comerciales disponibles." />
            <StatCard icon={LifeBuoy} label="Incidencias abiertas" value={metrics.incidenciasAbiertas} help="Casos pendientes de seguimiento." />
          </div>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div>
              <h2 className="mb-3 text-lg font-semibold text-slate-950">Empresas recientes</h2>
              <CompaniesTable owners={owners.slice(0, 6)} />
            </div>
            <div>
              <h2 className="mb-3 text-lg font-semibold text-slate-950">Alertas abiertas</h2>
              {incidents.filter((incident) => incident.status !== 'cerrada').length === 0 ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    Sin incidencias abiertas
                  </div>
                  <p className="mt-2 leading-6">La plataforma no registra bloqueos pendientes para seguimiento de soporte.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {incidents.filter((incident) => incident.status !== 'cerrada').slice(0, 5).map((incident) => (
                    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" key={incident.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950">{incident.title}</p>
                          <p className="mt-1 text-sm text-slate-500">{incident.tenantName || 'General'}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${severityTone(incident.severity)}`}>
                          {incident.severity}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {!overviewQuery.isLoading && activeTab === 'empresas' && (
        <CompaniesTable owners={owners} />
      )}

      {!overviewQuery.isLoading && activeTab === 'incidencias' && (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <IncidentsTable incidents={incidents} updateMutation={updateIncidentMutation} />
          <IncidentForm owners={owners} mutation={createIncidentMutation} />
        </section>
      )}

      {!overviewQuery.isLoading && activeTab === 'planes' && (
        <PlanesGestion showSuperadminConsole={false} />
      )}

      {!overviewQuery.isLoading && activeTab === 'transferencias' && (
        <ManualBankTransfersPanel owners={owners} />
      )}
    </div>
  );
}

export default Superadmin;
