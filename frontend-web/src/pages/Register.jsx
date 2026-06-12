import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Building2, CheckCircle2, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { extractApiError, publicRegister } from '../services/publicApi';
import { useAuth } from '../context/AuthContext';

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
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setSessionFromPayload } = useAuth();
  const navigate = useNavigate();

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = await publicRegister(form);
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
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-700 text-white">
              <Building2 size={19} />
            </span>
            Nómina-Ec
          </Link>
          <h1 className="max-w-xl text-5xl font-semibold leading-tight text-slate-950">
            Crea tu empresa y empieza con un flujo operativo real.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
            El registro crea el tenant, el usuario OWNER inicial y la suscripción base seleccionada.
          </p>
          <div className="mt-8 grid gap-4">
            {[
              'Tenant y OWNER inicial en una sola acción',
              'Prueba o plan comercial desde el primer acceso',
              'Aceptación explícita de términos y privacidad',
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
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Crear cuenta en Nómina-Ec</h2>
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
                {['TRIAL', 'MICRO', 'PYME', 'EMPRESA', 'CORPORATIVO'].map((plan) => (
                  <option key={plan} value={plan}>{plan}</option>
                ))}
              </select>
            </label>
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
              <span className="auth-label">Email OWNER</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input className="auth-input pl-10" type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} />
              </div>
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="auth-label">Contraseña</span>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input className="auth-input pl-10" type="password" required minLength={8} value={form.password} onChange={(e) => update('password', e.target.value)} />
              </div>
            </label>
          </div>

          <div className="mt-6 space-y-3 rounded-md bg-slate-50 p-4">
            <label className="flex gap-3 text-sm text-slate-700">
              <input className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600" type="checkbox" checked={form.acceptedTerms} onChange={(e) => update('acceptedTerms', e.target.checked)} />
              <span>Acepto los términos de servicio de Nómina-Ec.</span>
            </label>
            <label className="flex gap-3 text-sm text-slate-700">
              <input className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600" type="checkbox" checked={form.acceptedPrivacy} onChange={(e) => update('acceptedPrivacy', e.target.checked)} />
              <span>Acepto la política de privacidad y tratamiento de datos personales.</span>
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
