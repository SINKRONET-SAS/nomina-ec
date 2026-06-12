import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <form className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
        <h1 className="text-2xl font-bold text-slate-900">Crear cuenta en Nómina-Ec</h1>
        <p className="mt-2 text-sm text-slate-600">Crea el tenant y el usuario OWNER inicial.</p>

        {error && <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <input className="rounded-md border p-3" placeholder="Razón social" required value={form.razonSocial} onChange={(e) => update('razonSocial', e.target.value)} />
          <input className="rounded-md border p-3" placeholder="Nombre comercial" value={form.nombreComercial} onChange={(e) => update('nombreComercial', e.target.value)} />
          <input className="rounded-md border p-3" placeholder="RUC (opcional)" value={form.ruc} onChange={(e) => update('ruc', e.target.value)} />
          <input className="rounded-md border p-3" placeholder="Plan" value={form.planId} onChange={(e) => update('planId', e.target.value.toUpperCase())} />
          <input className="rounded-md border p-3" placeholder="Nombres" required value={form.nombres} onChange={(e) => update('nombres', e.target.value)} />
          <input className="rounded-md border p-3" placeholder="Apellidos" value={form.apellidos} onChange={(e) => update('apellidos', e.target.value)} />
          <input className="rounded-md border p-3 md:col-span-2" type="email" placeholder="Email" required value={form.email} onChange={(e) => update('email', e.target.value)} />
          <input className="rounded-md border p-3 md:col-span-2" type="password" placeholder="Contraseña" required minLength={8} value={form.password} onChange={(e) => update('password', e.target.value)} />
        </div>

        <label className="mt-5 flex gap-3 text-sm text-slate-700">
          <input type="checkbox" checked={form.acceptedTerms} onChange={(e) => update('acceptedTerms', e.target.checked)} />
          Acepto los términos de servicio.
        </label>
        <label className="mt-3 flex gap-3 text-sm text-slate-700">
          <input type="checkbox" checked={form.acceptedPrivacy} onChange={(e) => update('acceptedPrivacy', e.target.checked)} />
          Acepto la política de privacidad y tratamiento de datos personales.
        </label>

        <button className="mt-6 w-full rounded-md bg-teal-700 px-4 py-3 font-semibold text-white disabled:opacity-50" disabled={loading}>
          {loading ? 'Creando...' : 'Crear cuenta'}
        </button>
        <p className="mt-4 text-center text-sm text-slate-600">
          ¿Ya tienes cuenta? <Link className="font-semibold text-teal-700" to="/login">Inicia sesión</Link>
        </p>
      </form>
    </main>
  );
}

export default Register;
