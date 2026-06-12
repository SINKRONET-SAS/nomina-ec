import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Banknote, Building2, CheckCircle2 } from 'lucide-react';
import { extractApiError, fetchPlans, startCheckout } from '../services/publicApi';
import { useAuth } from '../context/AuthContext';

function formatPrice(plan) {
  if (!plan.precioMensualCentavos) return plan.id === 'CORPORATIVO' ? 'Contrato' : '$0.00';
  return `$${(plan.precioMensualCentavos / 100).toFixed(2)}/mes`;
}

function Planes() {
  const [planes, setPlanes] = useState([]);
  const [error, setError] = useState('');
  const [loadingPlan, setLoadingPlan] = useState('');
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlans()
      .then(setPlanes)
      .catch((err) => setError(extractApiError(err, 'No se pudieron cargar los planes.')));
  }, []);

  const handleCheckout = async (planId) => {
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
            Nómina-Ec
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

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {planes.map((plan) => (
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
                disabled={loadingPlan === plan.id}
                onClick={() => handleCheckout(plan.id)}
              >
                {loadingPlan === plan.id ? 'Abriendo checkout...' : plan.id === 'TRIAL' ? 'Empezar prueba' : 'Activar plan'}
                {loadingPlan !== plan.id && <ArrowRight size={18} />}
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default Planes;
