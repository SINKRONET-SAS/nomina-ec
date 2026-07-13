import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Banknote } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PlanFunctionalityList from './PlanFunctionalityList';
import { extractApiError, fetchPlans, startCheckout } from '../services/publicApi';
import {
  formatPublicPlanPrice,
  getPlanCommercialPromise,
  getPlanPriceBreakdown,
  normalizePublicPlans,
  publicPlanActionLabel,
} from '../config/publicPlanPresentation';

function PublicPlansCatalog() {
  const [plans, setPlans] = useState(() => normalizePublicPlans());
  const [paymentCapabilities, setPaymentCapabilities] = useState(null);
  const [error, setError] = useState('');
  const [loadingPlan, setLoadingPlan] = useState('');
  const [checkoutPlanId, setCheckoutPlanId] = useState('');
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    fetchPlans()
      .then((payload) => {
        if (!mounted) return;
        setPlans(normalizePublicPlans(payload.plans));
        setPaymentCapabilities(payload.paymentCapabilities || null);
      })
      .catch((err) => {
        if (!mounted) return;
        setPlans(normalizePublicPlans());
        setError(extractApiError(err, 'No se pudieron cargar los planes. Mostramos el catalogo base mientras el servicio responde.'));
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleCheckout = async (planId) => {
    if (!token) {
      navigate(`/registro?plan=${encodeURIComponent(planId)}`);
      return;
    }

    const checkoutBlocked = planId !== 'TRIAL' && paymentCapabilities?.checkoutAvailable === false;
    if (checkoutBlocked) {
      setError(paymentCapabilities?.blockedReason || 'El checkout PayPhone no está disponible temporalmente.');
      return;
    }

    if (checkoutPlanId !== planId) {
      setCheckoutPlanId(planId);
      setError('');
      return;
    }

    setError('');
    setLoadingPlan(planId);
    try {
      const checkout = await startCheckout(token, planId);
      if (checkout?.checkoutUrl) {
        window.location.assign(checkout.checkoutUrl);
      }
    } catch (err) {
      setError(extractApiError(err, 'No se pudo iniciar el checkout.'));
    } finally {
      setLoadingPlan('');
    }
  };

  return (
    <div className="space-y-6">
      {error && <div className="status-error">{error}</div>}
      {paymentCapabilities?.checkoutAvailable === false && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {paymentCapabilities.blockedReason || 'El checkout PayPhone no está disponible temporalmente.'}
        </div>
      )}

      <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan, index) => {
          const manualTransferOnly = paymentCapabilities?.status === 'manual_transfer_only';
          const checkoutBlocked = plan.id !== 'TRIAL' && paymentCapabilities?.checkoutAvailable === false;
          const checkoutSelected = checkoutPlanId === plan.id;
          const pricing = getPlanPriceBreakdown(plan);
          return (
            <article className={`soft-panel flex min-h-full flex-col p-6 ${index === 1 ? 'border-teal-300 bg-teal-50' : ''}`} key={plan.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-950">{plan.nombre}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{getPlanCommercialPromise(plan)}</p>
                </div>
                <span className="rounded-md bg-teal-50 p-2 text-teal-800">
                  <Banknote size={20} />
                </span>
              </div>
              <div className="mt-5 rounded-md border border-slate-200 bg-white/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {pricing.hasPrice ? 'Precio mensual' : 'Prueba'}
                </p>
                <p className="mt-2 text-3xl font-semibold leading-tight text-slate-950">{formatPublicPlanPrice(plan)}</p>
                {pricing.hasPrice && (
                  <div className="mt-3 space-y-2 text-sm leading-5 text-slate-600">
                    <div className="flex items-center justify-between gap-3">
                      <span>Total mensual</span>
                      <strong className="text-slate-950">{pricing.activeTotalDisplay}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Contado anual</span>
                      <strong className="text-slate-950">{pricing.annualTotalDisplay}</strong>
                    </div>
                    {pricing.rateDisclosure && (
                      <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">{pricing.calculationLabel}</p>
                    )}
                  </div>
                )}
                {!pricing.hasPrice && (
                  <p className="mt-2 text-sm leading-5 text-slate-600">Valida el flujo antes de activar un plan pagado.</p>
                )}
              </div>
              <div className="mt-5">
                <PlanFunctionalityList compact maxItems={4} showExcluded={false} plan={plan} />
              </div>
              {checkoutSelected && (
                <div className="mt-5 rounded-md border border-teal-200 bg-white p-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-950">Resumen de checkout</p>
                  <p className="mt-1 leading-6">
                    Confirma para continuar con {plan.nombre}. Antes de pagar veras el total con IVA.
                  </p>
                </div>
              )}
              <div className="mt-auto pt-6">
                <button
                  className="primary-button w-full"
                  disabled={loadingPlan === plan.id}
                  onClick={() => handleCheckout(plan.id)}
                  type="button"
                >
                  {checkoutBlocked ? (manualTransferOnly ? 'Solicitar activacion' : 'Checkout no disponible') : loadingPlan === plan.id ? 'Abriendo checkout...' : checkoutSelected ? 'Continuar a PayPhone' : publicPlanActionLabel(plan)}
                  {loadingPlan !== plan.id && <ArrowRight size={18} />}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default PublicPlansCatalog;
