import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Building2, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react';
import PlanFunctionalityList from '../components/PlanFunctionalityList';
import { formatPublicPlanPrice, normalizePublicPlans } from '../config/publicPlanPresentation';
import { extractApiError, fetchPlans, publicRegister } from '../services/publicApi';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/Brand/BrandLogo';

const LOPDP_VERSION = 'LOPDP-2026-06';

function Register() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    razonSocial: '',
    nombreComercial: '',
    ruc: '',
    nombres: '',
    apellidos: '',
    email: '',
    password: '',
    planId: params.get('plan') || 'TRIAL',
    acceptedTerms: false,
    acceptedPrivacy: false,
    acceptedDataProcessing: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [plans, setPlans] = useState(() => normalizePublicPlans());
  const { setSessionFromPayload } = useAuth();
  const navigate = useNavigate();

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === String(form.planId || '').trim().toUpperCase()) || normalizePublicPlans().find((plan) => plan.id === 'TRIAL'),
    [form.planId, plans]
  );

  useEffect(() => {
    let mounted = true;
    fetchPlans()
      .then((payload) => {
        if (!mounted) return;
        setPlans(normalizePublicPlans(payload.plans));
      })
      .catch(() => {
        if (!mounted) return;
        setPlans(normalizePublicPlans());
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.acceptedTerms || !form.acceptedPrivacy || !form.acceptedDataProcessing) {
      setError('Debes aceptar terminos, privacidad y tratamiento de datos personales para crear la cuenta.');
      return;
    }

    setLoading(true);
    try {
      const acceptedAt = new Date().toISOString();
      const payload = await publicRegister({
        ...form,
        lopdpConsent: {
          version: LOPDP_VERSION,
          acceptedAt,
          acceptedTerms: form.acceptedTerms,
          acceptedPrivacy: form.acceptedPrivacy,
          acceptedDataProcessing: form.acceptedDataProcessing,
        },
      });
      setSessionFromPayload(payload);
      navigate('/dashboard');
    } catch (err) {
      setError(extractApiError(err, 'No se pudo crear la cuenta.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-shell">
      <div className="page-container grid min-h-screen gap-8 py-8 lg:grid-cols-[.88fr_1.12fr] lg:items-center">
        <section className="hidden lg:block">
          <Link className="mb-12 inline-flex items-center gap-3 font-semibold text-slate-950" to="/">
            <BrandLogo imageClassName="h-10 w-10" />
          </Link>
          <h1 className="max-w-xl text-5xl font-semibold leading-tight text-slate-950">
            Crea tu empresa y empieza con un flujo operativo real.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
            El registro crea la empresa, el usuario administrador inicial y la suscripción base seleccionada.
          </p>
          <div className="mt-8 grid gap-4">
            {[
              'Empresa y administrador inicial en una sola acción',
              'Prueba o plan comercial desde el primer acceso',
              'Aceptación explícita de términos, privacidad y tratamiento de datos',
            ].map((item) => (
              <div className="flex items-center gap-3 text-sm font-medium text-slate-700" key={item}>
                <CheckCircle2 className="h-5 w-5 text-teal-700" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <form className="soft-panel mx-auto w-full max-w-3xl p-5 sm:p-7" onSubmit={handleSubmit}>
          <div className="mb-7 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">Registro comercial</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Crear cuenta en SKNOMINA</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Datos mínimos para activar la empresa y el usuario propietario.
              </p>
            </div>
            <Link className="text-sm font-semibold text-teal-800" to="/login">Ingresar</Link>
          </div>

          {error && <div className="mb-5 status-error">{error}</div>}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="auth-label">Razón social</span>
              <input className="auth-input" required value={form.razonSocial} onChange={(e) => update('razonSocial', e.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="auth-label">Nombre comercial</span>
              <input className="auth-input" value={form.nombreComercial} onChange={(e) => update('nombreComercial', e.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="auth-label">RUC</span>
              <input className="auth-input" placeholder="Opcional" value={form.ruc} onChange={(e) => update('ruc', e.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="auth-label">Plan</span>
              <select className="auth-input" value={form.planId} onChange={(e) => update('planId', e.target.value)}>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>{plan.nombre} - {formatPublicPlanPrice(plan)}</option>
                ))}
              </select>
            </label>
            {selectedPlan && (
              <section className="rounded-md border border-slate-200 bg-white p-4 md:col-span-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">Resumen de checkout</p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-950">{selectedPlan.nombre}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{selectedPlan.descripcion}</p>
                  </div>
                  <p className="text-xl font-semibold text-slate-950">{formatPublicPlanPrice(selectedPlan)}</p>
                </div>
                <div className="mt-4">
                  <PlanFunctionalityList compact plan={selectedPlan} />
                </div>
              </section>
            )}
            <label className="space-y-2">
              <span className="auth-label">Nombres</span>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input className="auth-input pl-10" required value={form.nombres} onChange={(e) => update('nombres', e.target.value)} />
              </div>
            </label>
            <label className="space-y-2">
              <span className="auth-label">Apellidos</span>
              <input className="auth-input" value={form.apellidos} onChange={(e) => update('apellidos', e.target.value)} />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="auth-label">Email del administrador</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input className="auth-input pl-10" type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} />
              </div>
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="auth-label">Contraseña</span>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  className="auth-input px-10"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                />
                <button
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  onClick={() => setShowPassword((current) => !current)}
                  title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  type="button"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>
          </div>

          <div className="mt-6 space-y-3 rounded-md bg-slate-50 p-4">
            <label className="flex gap-3 text-sm text-slate-700">
              <input className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600" type="checkbox" required checked={form.acceptedTerms} onChange={(e) => update('acceptedTerms', e.target.checked)} />
              <span>Acepto los términos de servicio de SKNOMINA.</span>
            </label>
            <label className="flex gap-3 text-sm text-slate-700">
              <input className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600" type="checkbox" required checked={form.acceptedPrivacy} onChange={(e) => update('acceptedPrivacy', e.target.checked)} />
              <span>Acepto la política de privacidad.</span>
            </label>
            <label className="flex gap-3 text-sm text-slate-700">
              <input className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600" type="checkbox" required checked={form.acceptedDataProcessing} onChange={(e) => update('acceptedDataProcessing', e.target.checked)} />
              <span>Autorizo el tratamiento de datos personales laborales bajo la versión {LOPDP_VERSION}.</span>
            </label>
          </div>

          <button className="primary-button mt-6 w-full" disabled={loading}>
            {loading ? 'Creando empresa...' : 'Crear cuenta y entrar'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>
      </div>
    </main>
  );
}

export default Register;
