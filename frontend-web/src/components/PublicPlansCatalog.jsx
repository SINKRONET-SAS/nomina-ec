import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Banknote, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { extractApiError, fetchPlans, startCheckout } from '../services/publicApi';
import {
  formatPublicPlanPrice,
  getPlanCommercialPromise,
  getPlanHighlights,
  normalizePublicPlans,
  publicPlanActionLabel,
} from '../config/publicPlanPresentation';

function PublicPlansCatalog() {
  const [plans, setPlans] = useState(() => normalizePublicPlans());
  const [paymentCapabilities, setPaymentCapabilities] = useState(null);
  const [error, setError] = useState('');
  const [loadingPlan, setLoadingPlan] = useState('');
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
    const checkoutBlocked = planId !== 'TRIAL' && paymentCapabilities?.checkoutAvailable === false;
    if (checkoutBlocked) {
      setError(paymentCapabilities?.blockedReason || 'Checkout de pago no disponible.');
      return;
    }

    if (!token) {
      navigate(`/registro?plan=${encodeURIComponent(planId)}`);
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
          Checkout PayPhone bloqueado: {paymentCapabilities.blockedReason || 'faltan credenciales de cobro real'}.
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan, index) => {
          const checkoutBlocked = plan.id !== 'TRIAL' && paymentCapabilities?.checkoutAvailable === false;
          const highlights = getPlanHighlights(plan);
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
              <p className="mt-6 text-3xl font-semibold text-slate-950">{formatPublicPlanPrice(plan)}</p>
              <ul className="mt-5 space-y-3 text-sm text-slate-700">
                {highlights.map((highlight) => (
                  <li className="flex items-center gap-2" key={highlight}>
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-700" />
                    <span>{highlight}</span>
                  </li>
                ))}
                <li className="flex items-center gap-2 text-xs text-slate-500">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-700" />
                  <span>{plan.empleadosMax || 'Capacidad pactada'} empleados · {plan.usuariosMax || 'usuarios pactados'} usuarios</span>
                </li>
              </ul>
              <button
                className="primary-button mt-6 w-full"
                disabled={loadingPlan === plan.id || checkoutBlocked}
                onClick={() => handleCheckout(plan.id)}
                type="button"
              >
                {checkoutBlocked ? 'Checkout no configurado' : loadingPlan === plan.id ? 'Abriendo checkout...' : publicPlanActionLabel(plan)}
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
