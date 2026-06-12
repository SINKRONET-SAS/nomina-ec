import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, KeyRound, Mail } from 'lucide-react';
import { extractApiError, forgotPassword, resetPassword } from '../services/publicApi';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  const requestCode = async (event) => {
    event.preventDefault();
    setError('');
    setLoadingRequest(true);
    try {
      const response = await forgotPassword(email);
      setMessage(response.message || 'Revisa tu correo para continuar.');
    } catch (err) {
      setError(extractApiError(err, 'No se pudo solicitar recuperación.'));
    } finally {
      setLoadingRequest(false);
    }
  };

  const submitReset = async (event) => {
    event.preventDefault();
    setError('');
    setLoadingReset(true);
    try {
      const response = await resetPassword({ email, code, password });
      setMessage(response.message || 'Contraseña actualizada.');
    } catch (err) {
      setError(extractApiError(err, 'No se pudo actualizar la contraseña.'));
    } finally {
      setLoadingReset(false);
    }
  };

  return (
    <main className="app-shell">
      <div className="page-container flex min-h-screen items-center justify-center py-8">
        <section className="soft-panel w-full max-w-xl p-6 sm:p-8">
          <Link className="mb-8 inline-flex items-center gap-3 font-semibold text-slate-950" to="/">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-700 text-white">
              <Building2 size={19} />
            </span>
            Nómina-Ec
          </Link>
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-teal-50 text-teal-800">
            <KeyRound size={22} />
          </div>
          <h1 className="mt-5 text-2xl font-semibold text-slate-950">Recuperar contraseña</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Solicita un código y úsalo para definir una contraseña nueva.
          </p>

          {message && <div className="mt-5 status-success">{message}</div>}
          {error && <div className="mt-5 status-error">{error}</div>}

          <form className="mt-7 space-y-4" onSubmit={requestCode}>
            <label className="space-y-2">
              <span className="auth-label">Email</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input className="auth-input pl-10" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </label>
            <button className="secondary-button w-full" disabled={loadingRequest}>
              {loadingRequest ? 'Solicitando...' : 'Solicitar código'}
            </button>
          </form>

          <form className="mt-6 space-y-4 border-t border-slate-200 pt-6" onSubmit={submitReset}>
            <label className="space-y-2">
              <span className="auth-label">Código recibido</span>
              <input className="auth-input" required value={code} onChange={(e) => setCode(e.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="auth-label">Nueva contraseña</span>
              <input className="auth-input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <button className="primary-button w-full" disabled={loadingReset}>
              {loadingReset ? 'Actualizando...' : 'Actualizar contraseña'}
              {!loadingReset && <ArrowRight size={18} />}
            </button>
          </form>

          <Link className="mt-6 block text-center text-sm font-semibold text-teal-800" to="/login">
            Volver a login
          </Link>
        </section>
      </div>
    </main>
  );
}

export default ForgotPassword;
