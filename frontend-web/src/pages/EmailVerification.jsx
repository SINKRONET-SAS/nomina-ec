import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowRight, CheckCircle2, Mail, ShieldCheck } from 'lucide-react';
import BrandLogo from '../components/Brand/BrandLogo';
import { confirmEmailVerification, extractApiError, requestEmailVerification } from '../services/publicApi';

function EmailVerification() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get('email') || '');
  const [tenantRuc, setTenantRuc] = useState(params.get('tenantRuc') || '');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const payload = () => ({
    email: email.trim(),
    tenantRuc: tenantRuc.replace(/\D/g, ''),
  });

  async function confirm(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (code.length !== 6) {
      setError('Ingresa el código de seis dígitos recibido por correo.');
      return;
    }
    setLoading(true);
    try {
      await confirmEmailVerification({ ...payload(), code });
      setVerified(true);
      setMessage('Correo verificado correctamente. Ya puedes ingresar al panel.');
    } catch (err) {
      setError(extractApiError(err, 'No pudimos verificar el correo. Si el código caducó, solicita uno nuevo.'));
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setError('');
    setMessage('');
    if (!email.trim()) {
      setError('Ingresa primero el email de la cuenta.');
      return;
    }
    setLoading(true);
    try {
      await requestEmailVerification(payload());
      setCode('');
      setMessage('Enviamos un nuevo código. El código anterior dejó de ser válido; usa únicamente el último recibido.');
    } catch (err) {
      setError(extractApiError(err, 'No pudimos enviar el código. Intenta nuevamente.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell flex min-h-screen items-center justify-center px-4 py-8">
      <section className="soft-panel w-full max-w-lg p-6 sm:p-8">
        <Link className="inline-flex items-center gap-3 font-semibold text-slate-950" to="/">
          <BrandLogo imageClassName="h-10 w-10" />
        </Link>
        <div className="mt-8 flex h-11 w-11 items-center justify-center rounded-md bg-teal-50 text-teal-800">
          <ShieldCheck size={22} />
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-slate-950">Activar cuenta por email</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Registra el código que recibió el delegado. Los códigos caducados o reemplazados no se pueden utilizar.
        </p>

        {error && <div className="mt-5 status-error">{error}</div>}
        {message && <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</div>}

        <form className="mt-7 space-y-5" onSubmit={confirm}>
          <label className="block space-y-2">
            <span className="auth-label">Email del delegado</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input className="auth-input pl-10" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
            </div>
          </label>
          <label className="block space-y-2">
            <span className="auth-label">RUC de empresa (opcional)</span>
            <input className="auth-input" inputMode="numeric" value={tenantRuc} onChange={(event) => setTenantRuc(event.target.value.replace(/\D/g, '').slice(0, 13))} autoComplete="organization" />
          </label>
          <label className="block space-y-2">
            <span className="auth-label">Código de verificación</span>
            <input className="auth-input font-mono tracking-[0.35em]" inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" required />
          </label>
          <button className="primary-button w-full" type="submit" disabled={loading || verified || code.length !== 6}>
            {loading ? 'Validando...' : verified ? 'Correo verificado' : 'Confirmar código'}
            {!loading && !verified && <ArrowRight size={18} />}
            {verified && <CheckCircle2 size={18} />}
          </button>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
          <button className="font-semibold text-teal-800 disabled:opacity-50" type="button" onClick={resend} disabled={loading || verified}>Reenviar código</button>
          <Link className="font-semibold text-slate-700" to="/login">Volver a iniciar sesión</Link>
        </div>
      </section>
    </main>
  );
}

export default EmailVerification;
