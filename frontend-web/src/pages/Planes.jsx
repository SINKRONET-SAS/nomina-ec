import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Planes Nómina-Ec</h1>
            <p className="mt-2 text-slate-600">Elige capacidad según empleados, empresas y operación bancaria.</p>
          </div>
          <Link className="text-sm font-semibold text-teal-700" to="/">Volver al inicio</Link>
        </div>

        {error && <div className="mb-5 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {planes.map((plan) => (
            <article className="rounded-lg bg-white p-6 shadow-sm" key={plan.id}>
              <h2 className="text-xl font-bold">{plan.nombre}</h2>
              <p className="mt-2 min-h-16 text-sm leading-6 text-slate-600">{plan.descripcion}</p>
              <p className="mt-5 text-3xl font-bold text-teal-700">{formatPrice(plan)}</p>
              <ul className="mt-5 space-y-2 text-sm text-slate-700">
                <li>Empleados: {plan.empleadosMax || 'pactado'}</li>
                <li>Empresas: {plan.empresasMax}</li>
                <li>Usuarios: {plan.usuariosMax}</li>
                <li>Archivos bancarios: {plan.archivosBancarios ? 'incluidos' : 'no incluidos'}</li>
              </ul>
              <button
                className="mt-6 w-full rounded-md bg-teal-700 px-4 py-3 font-semibold text-white disabled:opacity-50"
                disabled={loadingPlan === plan.id}
                onClick={() => handleCheckout(plan.id)}
              >
                {loadingPlan === plan.id ? 'Abriendo...' : plan.id === 'TRIAL' ? 'Empezar prueba' : 'Activar plan'}
              </button>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

export default Planes;
