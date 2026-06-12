import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { extractApiError, forgotPassword, resetPassword } from '../services/publicApi';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const requestCode = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const response = await forgotPassword(email);
      setMessage(response.message || 'Revisa tu correo para continuar.');
    } catch (err) {
      setError(extractApiError(err, 'No se pudo solicitar recuperación.'));
    }
  };

  const submitReset = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const response = await resetPassword({ email, code, password });
      setMessage(response.message || 'Contraseña actualizada.');
    } catch (err) {
      setError(extractApiError(err, 'No se pudo actualizar la contraseña.'));
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-xl rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Recuperar contraseña</h1>
        <p className="mt-2 text-sm text-slate-600">Solicita un código y define una contraseña nueva.</p>
        {message && <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">{message}</div>}
        {error && <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}

        <form className="mt-6 space-y-4" onSubmit={requestCode}>
          <input className="w-full rounded-md border p-3" type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="w-full rounded-md border border-teal-700 px-4 py-3 font-semibold text-teal-700">Solicitar código</button>
        </form>

        <form className="mt-6 space-y-4" onSubmit={submitReset}>
          <input className="w-full rounded-md border p-3" required placeholder="Código" value={code} onChange={(e) => setCode(e.target.value)} />
          <input className="w-full rounded-md border p-3" type="password" required minLength={8} placeholder="Nueva contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="w-full rounded-md bg-teal-700 px-4 py-3 font-semibold text-white">Actualizar contraseña</button>
        </form>

        <Link className="mt-5 block text-center text-sm font-semibold text-teal-700" to="/login">Volver a login</Link>
      </div>
    </main>
  );
}

export default ForgotPassword;
