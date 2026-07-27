import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, CreditCard, ExternalLink, History, XCircle } from 'lucide-react';
import { authenticatedApi } from '../services/authenticatedApi';
import { extractApiError } from '../services/publicApi';

function statusLabel(estado) {
  const labels = {
    active: 'Activo',
    trial: 'Prueba',
    expired: 'Vencido',
    sin_plan: 'Sin plan',
  };
  return labels[estado] || estado || 'Sin estado';
}

function statusStyle(estado) {
  const styles = {
    active: 'bg-emerald-50 text-emerald-700',
    trial: 'bg-blue-50 text-blue-700',
    expired: 'bg-red-50 text-red-700',
    sin_plan: 'bg-slate-100 text-slate-600',
  };
  return styles[estado] || 'bg-slate-100 text-slate-700';
}

function txStatusLabel(estado) {
  const labels = {
    APPROVED: 'Aprobado',
    PENDING: 'Pendiente',
    PENDING_REVIEW: 'En revision',
    CONFIRMED: 'Confirmado',
    REJECTED: 'Rechazado',
    REVERSED: 'Reversado',
  };
  return labels[estado] || estado || 'Sin estado';
}

function txStatusStyle(estado) {
  if (estado === 'APPROVED') return 'bg-emerald-50 text-emerald-700';
  if (estado === 'REJECTED' || estado === 'REVERSED') return 'bg-red-50 text-red-700';
  return 'bg-amber-50 text-amber-700';
}

function formatDate(value) {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Guayaquil',
  }).format(new Date(value));
}

function formatCurrency(centavos) {
  return `$${(Number(centavos || 0) / 100).toFixed(2)}`;
}

export default function MiSuscripcion() {
  const [upgradeError, setUpgradeError] = useState('');
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  const statusQuery = useQuery({
    queryKey: ['subscription-status'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/pagos/status');
      return response.data.data;
    },
  });

  const historyQuery = useQuery({
    queryKey: ['payment-history'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/pagos/historial');
      return response.data.data?.items || [];
    },
  });

  const plansQuery = useQuery({
    queryKey: ['public-plans'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/pagos/planes');
      return {
        plans: response.data.data || [],
        capabilities: response.data.paymentCapabilities || {},
      };
    },
  });

  const sub = statusQuery.data;
  const plans = plansQuery.data?.plans || [];
  const paymentCapabilities = plansQuery.data?.capabilities || {};
  const history = historyQuery.data || [];

  async function handleUpgrade(planId, billingPeriod = 'monthly') {
    setUpgradeError('');
    setUpgradeLoading(true);
    try {
      const response = await authenticatedApi.post('/pagos/payment-methods/checkout-intent', {
        planId,
        billingPeriod,
      });
      const checkoutUrl = response.data?.data?.checkoutUrl;
      if (checkoutUrl) {
        window.open(checkoutUrl, '_blank', 'noopener');
      } else {
        setUpgradeError('No se obtuvo una URL de pago. Contacta soporte.');
      }
    } catch (err) {
      setUpgradeError(extractApiError(err) || 'Error al iniciar el proceso de pago.');
    } finally {
      setUpgradeLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Mi suscripcion</h1>
        <p className="mt-1 text-sm text-slate-500">
          Gestiona tu plan, revisa tus pagos y actualiza tu suscripcion.
        </p>
      </div>

      {/* Estado actual */}
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
          <CreditCard size={20} />
          Plan actual
        </h2>

        {statusQuery.isLoading && (
          <p className="mt-4 text-sm text-slate-500">Cargando...</p>
        )}

        {statusQuery.isError && (
          <p className="mt-4 text-sm text-red-600">No pudimos cargar tu suscripcion.</p>
        )}

        {sub && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-medium uppercase text-slate-500">Plan</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{sub.planNombre || sub.planId || 'Sin plan'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-slate-500">Estado</p>
              <span className={`mt-1 inline-block rounded-full px-3 py-1 text-sm font-medium ${statusStyle(sub.estado)}`}>
                {statusLabel(sub.estado)}
              </span>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-slate-500">Vence</p>
              <p className="mt-1 text-sm text-slate-700">{formatDate(sub.venceEn)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-slate-500">Precio mensual</p>
              <p className="mt-1 text-sm text-slate-700">{formatCurrency(sub.precioMensualCentavos)}</p>
            </div>
          </div>
        )}

        {sub === null && !statusQuery.isLoading && (
          <div className="mt-4 flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle size={20} className="shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800">
              No tienes un plan activo. Selecciona uno a continuacion para activar tu cuenta.
            </p>
          </div>
        )}

        {sub?.estado === 'expired' && (
          <div className="mt-4 flex items-center gap-3 rounded-md border border-red-200 bg-red-50 p-4">
            <XCircle size={20} className="shrink-0 text-red-600" />
            <p className="text-sm text-red-800">
              Tu suscripcion vencio el {formatDate(sub.venceEn)}. Renueva para mantener el acceso a todas las funcionalidades.
            </p>
          </div>
        )}
      </section>

      {/* Planes disponibles */}
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-800">Cambiar o renovar plan</h2>

        {!paymentCapabilities.checkoutAvailable && paymentCapabilities.status && (
          <div className="mt-3 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Pagos en linea no disponibles</p>
              <p className="mt-1">
                {paymentCapabilities.blockedReason || 'Contacta al administrador para activar tu plan mediante transferencia bancaria.'}
              </p>
            </div>
          </div>
        )}

        {upgradeError && (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{upgradeError}</p>
        )}

        {plansQuery.isLoading && <p className="mt-4 text-sm text-slate-500">Cargando planes...</p>}

        {plans.length > 0 && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = sub?.planId === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`rounded-lg border p-5 ${isCurrent ? 'border-teal-400 bg-teal-50' : 'border-slate-200'}`}
                >
                  <h3 className="text-base font-semibold text-slate-900">{plan.nombre}</h3>
                  {plan.descripcion && <p className="mt-1 text-xs text-slate-500">{plan.descripcion}</p>}
                  <p className="mt-3 text-2xl font-bold text-slate-900">
                    {formatCurrency(plan.precioMensualCentavos)}
                    <span className="text-sm font-normal text-slate-500">/mes</span>
                  </p>
                  <ul className="mt-3 space-y-1 text-xs text-slate-600">
                    {plan.empleadosMax && <li>Hasta {plan.empleadosMax} empleados</li>}
                    {plan.archivosBancarios && <li>Archivos bancarios</li>}
                    {plan.reportesAvanzados && <li>Reportes avanzados</li>}
                    {plan.appMovil && <li>App movil</li>}
                  </ul>
                  {isCurrent ? (
                    <div className="mt-4 flex items-center gap-2 text-sm font-medium text-teal-700">
                      <CheckCircle2 size={16} />
                      Plan actual
                    </div>
                  ) : (
                    <button
                      className="mt-4 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                      disabled={upgradeLoading || !paymentCapabilities.checkoutAvailable}
                      onClick={() => handleUpgrade(plan.id)}
                    >
                      {upgradeLoading ? 'Procesando...' : 'Seleccionar plan'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Historial de pagos */}
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
          <History size={20} />
          Historial de pagos
        </h2>

        {historyQuery.isLoading && <p className="mt-4 text-sm text-slate-500">Cargando historial...</p>}

        {history.length === 0 && !historyQuery.isLoading && (
          <p className="mt-4 text-sm text-slate-500">No hay pagos registrados.</p>
        )}

        {history.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium uppercase text-slate-500">
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Plan</th>
                  <th className="px-3 py-2">Monto</th>
                  <th className="px-3 py-2">Proveedor</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {history.map((tx) => (
                  <tr key={tx.id} className="border-b last:border-0">
                    <td className="px-3 py-2 text-slate-700">{formatDate(tx.createdAt)}</td>
                    <td className="px-3 py-2 text-slate-700">{tx.planNombre || tx.planId}</td>
                    <td className="px-3 py-2 font-medium text-slate-900">{formatCurrency(tx.montoCentavos)}</td>
                    <td className="px-3 py-2 text-slate-600">{tx.proveedor === 'BANK_TRANSFER_MANUAL' ? 'Transferencia' : tx.proveedor}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${txStatusStyle(tx.estado)}`}>
                        {txStatusLabel(tx.estado)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
