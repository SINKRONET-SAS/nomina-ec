// ============================================================
// SKNOMINA - Página de login
// ============================================================
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/Brand/BrandLogo';

function Login() {
  const [email, setEmail] = useState('');
  const [tenantRuc, setTenantRuc] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      await login(email, password, tenantRuc);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || err.error || 'Error al iniciar sesión');
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="app-shell grid lg:grid-cols-[1.04fr_.96fr]">
      <section className="hidden min-h-screen bg-slate-950 text-white lg:block">
        <div className="flex h-full flex-col justify-between px-10 py-8">
          <Link className="inline-flex items-center gap-3 text-sm font-semibold" to="/">
            <BrandLogo imageClassName="h-11 w-11" textClassName="text-white" />
          </Link>

          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-200">
              Operación laboral Ecuador
            </p>
            <h1 className="mt-5 text-5xl font-semibold leading-tight">
              Controla nómina, bancos y documentos sin perder trazabilidad.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Un acceso para equipos de RRHH, finanzas y propietarios: roles de pago,
              novedades, archivos bancarios y auditoría por empresa.
            </p>
          </div>

          <div className="grid max-w-xl gap-3 text-sm text-slate-200">
            {['Multiempresa con datos separados por compañía', 'Flujos reales de registro, pago y recuperación', 'Bloqueos legales visibles antes de producción'].map((item) => (
              <div className="flex items-center gap-3" key={item}>
                <CheckCircle2 className="h-5 w-5 text-teal-300" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center px-4 py-8 sm:px-6 lg:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center justify-between">
            <Link className="inline-flex items-center gap-3 font-semibold text-slate-950 lg:hidden" to="/">
              <BrandLogo imageClassName="h-10 w-10" />
            </Link>
            <Link className="ml-auto text-sm font-semibold text-teal-800" to="/#planes">
              Ver planes
            </Link>
          </div>

          <div className="soft-panel p-6 sm:p-8">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-teal-50 text-teal-800">
                <ShieldCheck size={22} />
              </div>
              <h2 className="mt-5 text-2xl font-semibold text-slate-950">Iniciar sesión</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Ingresa al panel operativo de SKNOMINA.
              </p>
            </div>

            <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
              {error && <div className="status-error">{error}</div>}

              <div className="space-y-2">
                <label className="auth-label" htmlFor="email">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="auth-input pl-10"
                    placeholder="propietario@empresa.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="auth-label" htmlFor="tenantRuc">RUC de empresa</label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <input
                    id="tenantRuc"
                    type="text"
                    value={tenantRuc}
                    onChange={(e) => setTenantRuc(e.target.value.replace(/\D/g, '').slice(0, 13))}
                    className="auth-input pl-10"
                    placeholder="Opcional si tu correo esta en varias empresas"
                    autoComplete="organization"
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <label className="auth-label" htmlFor="password">Contraseña</label>
                  <Link className="text-sm font-semibold text-teal-800" to="/recuperar-password">
                    Recuperar
                  </Link>
                </div>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="auth-input px-10"
                    placeholder="Contraseña"
                    autoComplete="current-password"
                    required
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
              </div>

              <button type="submit" disabled={cargando} className="primary-button w-full">
                {cargando ? 'Validando acceso...' : 'Entrar al panel'}
                {!cargando && <ArrowRight size={18} />}
              </button>
            </form>

            <div className="mt-6 rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-600">
              ¿Aún no tienes cuenta?{' '}
              <Link className="font-semibold text-teal-800" to="/registro">
                Crear empresa y administrador inicial
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Login;

