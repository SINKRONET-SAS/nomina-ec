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

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan, index) => {
          const manualTransferOnly = paymentCapabilities?.status === 'manual_transfer_only';
          const checkoutBlocked = plan.id !== 'TRIAL' && paymentCapabilities?.checkoutAvailable === false;
          const checkoutSelected = checkoutPlanId === plan.id;
          const pricing = getPlanPriceBreakdown(plan);
          return (
            <article className={`soft-panel flex flex-col p-6 ${index === 1 ? 'border-teal-300 bg-teal-50' : ''}`} key={plan.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-950">{plan.nombre}</h3>
                  <p className="mt-2 min-h-20 text-sm leading-6 text-slate-600">{getPlanCommercialPromise(plan)}</p>
                </div>
                <span className="rounded-md bg-teal-50 p-2 text-teal-800">
                  <Banknote size={20} />
                </span>
              </div>
              <div className="mt-6 space-y-2">
                <p className="text-3xl font-semibold text-slate-950">{formatPublicPlanPrice(plan)}</p>
                {pricing.hasPrice && (
                  <div className="space-y-1 text-sm leading-5 text-slate-600">
                    <p>{pricing.primaryTotalLabel}</p>
                    <p>{pricing.annualBaseLabel} | {pricing.annualTotalLabel}</p>
                    <p>{pricing.monthlyBaseLabel} | {pricing.monthlyTotalLabel}</p>
                    <p>{pricing.rateLabel}</p>
                  </div>
                )}
              </div>
              <div className="mt-5">
                <PlanFunctionalityList compact showExcluded={false} plan={plan} />
              </div>
              {checkoutSelected && (
                <div className="mt-5 rounded-md border border-teal-200 bg-white p-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-950">Resumen de checkout</p>
                  <p className="mt-1 leading-6">
                    Se abrirá la pasarela para activar {plan.nombre} con las funcionalidades listadas en esta tarjeta.
                  </p>
                </div>
              )}
              <button
                className="primary-button mt-6 w-full"
                disabled={loadingPlan === plan.id}
                onClick={() => handleCheckout(plan.id)}
                type="button"
              >
                {checkoutBlocked ? (manualTransferOnly ? 'Activación por transferencia' : 'Checkout no disponible') : loadingPlan === plan.id ? 'Abriendo checkout...' : checkoutSelected ? 'Continuar a PayPhone' : publicPlanActionLabel(plan)}
                {loadingPlan !== plan.id && <ArrowRight size={18} />}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default PublicPlansCatalog;
