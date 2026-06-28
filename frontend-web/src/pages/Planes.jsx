import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Banknote, Building2, CheckCircle2 } from 'lucide-react';
import { extractApiError, fetchPlans, startCheckout } from '../services/publicApi';
import { fetchPlanCapabilities } from '../services/beneficiosApi';
import { useAuth } from '../context/AuthContext';

function formatPrice(plan) {
  if (!plan.precioMensualCentavos) return plan.id === 'CORPORATIVO' ? 'Contrato' : '$0.00';
  return `$${(plan.precioMensualCentavos / 100).toFixed(2)}/mes`;
}

function Planes() {
  const [planes, setPlanes] = useState([]);
  const [paymentCapabilities, setPaymentCapabilities] = useState(null);
  const [error, setError] = useState('');
  const [capabilitiesError, setCapabilitiesError] = useState('');
  const [capabilities, setCapabilities] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState('');
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlans()
      .then((payload) => {
        setPlanes(payload.plans || []);
        setPaymentCapabilities(payload.paymentCapabilities || null);
      })
      .catch((err) => setError(extractApiError(err, 'No se pudieron cargar los planes.')));
  }, []);

  useEffect(() => {
    if (!token) return;
    setCapabilitiesError('');
    fetchPlanCapabilities()
      .then(setCapabilities)
      .catch((err) => {
        console.error('[PLANES] No se pudieron cargar capacidades del plan actual', {
          code: err.response?.data?.error || 'PLAN_CAPABILITIES_ERROR',
          statusCode: err.response?.status || 500,
          correlationId: err.response?.data?.correlationId || 'frontend-planes',
          userId: null,
          message: err.message,
        });
        setCapabilitiesError(extractApiError(err, 'No pudimos cargar las capacidades del plan activo.'));
      });
  }, [token]);

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
    <main className="app-shell">
      <header className="border-b border-slate-200 bg-white">
        <div className="page-container flex h-16 items-center justify-between gap-4">
          <Link className="flex items-center gap-3 font-semibold text-slate-950" to="/">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-700 text-white">
              <Building2 size={19} />
            </span>
            SKNOMINA
          </Link>
          <Link className="secondary-button" to="/login">Iniciar sesión</Link>
        </div>
      </header>

      <section className="page-container py-12">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">Planes y PayPhone</p>
          <h1 className="mt-3 text-4xl font-semibold text-slate-950">Elige capacidad según tu operación.</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Los planes vienen desde la API. Si ya iniciaste sesión, el botón abre el checkout;
            si no, crea la empresa con el plan preseleccionado.
          </p>
        </div>

        {error && <div className="mt-6 status-error">{error}</div>}
        {capabilitiesError && <div className="mt-6 status-error">{capabilitiesError}</div>}
        {capabilities && (
          <div className="mt-6 rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
            Plan activo: <strong>{capabilities.planNombre}</strong>. Archivos bancarios: {capabilities.allowed?.bankFiles ? 'habilitados' : 'bloqueados'}.
          </div>
        )}
        {paymentCapabilities?.checkoutAvailable === false && (
          <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Checkout PayPhone bloqueado: {paymentCapabilities.blockedReason || 'faltan credenciales de cobro real'}.
          </div>
        )}

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {planes.map((plan) => {
            const checkoutBlocked = plan.id !== 'TRIAL' && paymentCapabilities?.checkoutAvailable === false;
            return (
            <article className="soft-panel flex flex-col p-6" key={plan.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">{plan.nombre}</h2>
                  <p className="mt-2 min-h-16 text-sm leading-6 text-slate-600">{plan.descripcion}</p>
                </div>
                <span className="rounded-md bg-teal-50 p-2 text-teal-800">
                  <Banknote size={20} />
                </span>
              </div>
              <p className="mt-6 text-3xl font-semibold text-slate-950">{formatPrice(plan)}</p>
              <ul className="mt-5 space-y-3 text-sm text-slate-700">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal-700" />Empleados: {plan.empleadosMax || 'pactado'}</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal-700" />Empresas: {plan.empresasMax}</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal-700" />Usuarios: {plan.usuariosMax}</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal-700" />Archivos bancarios: {plan.archivosBancarios ? 'incluidos' : 'no incluidos'}</li>
              </ul>
              <button
                className="primary-button mt-6 w-full"
                disabled={loadingPlan === plan.id || checkoutBlocked}
                onClick={() => handleCheckout(plan.id)}
              >
                {checkoutBlocked ? 'Checkout no configurado' : loadingPlan === plan.id ? 'Abriendo checkout...' : plan.id === 'TRIAL' ? 'Empezar prueba' : 'Activar plan'}
                {loadingPlan !== plan.id && <ArrowRight size={18} />}
              </button>
            </article>
          );})}
        </div>
      </section>
    </main>
  );
}

export default Planes;
