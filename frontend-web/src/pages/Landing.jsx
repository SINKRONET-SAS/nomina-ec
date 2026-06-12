import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Banknote, Building2, CalendarClock, CheckCircle2, FileText, ShieldCheck } from 'lucide-react';

const capabilities = [
  {
    icon: CalendarClock,
    title: 'Marcaciones y novedades',
    text: 'Asistencia, atrasos, permisos y aprobaciones con evidencia por empleado.',
  },
  {
    icon: Banknote,
    title: 'Nómina y bancos',
    text: 'Roles, netos a pagar y archivos bancarios preparados desde el mismo flujo.',
  },
  {
    icon: FileText,
    title: 'Documentos laborales',
    text: 'Contratos, roles de pago y actas listos para guardar evidencia auditable.',
  },
  {
    icon: ShieldCheck,
    title: 'Cumplimiento Ecuador',
    text: 'Parámetros versionados, trazabilidad por empresa y bloqueos cuando falte validación.',
  },
];

function Landing() {
  return (
    <main className="app-shell">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="page-container flex h-16 items-center justify-between gap-4">
          <Link className="flex items-center gap-3 font-semibold text-slate-950" to="/">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-700 text-white">
              <Building2 size={19} />
            </span>
            Nómina-Ec
          </Link>
          <nav className="flex items-center gap-2 text-sm font-semibold">
            <Link className="hidden rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100 sm:inline-flex" to="/precios">
              Planes
            </Link>
            <Link className="secondary-button hidden sm:inline-flex" to="/login">
              Iniciar sesión
            </Link>
            <Link className="primary-button" to="/registro">
              Crear cuenta
            </Link>
          </nav>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-white">
        <div className="page-container grid min-h-[calc(100vh-4rem)] gap-12 py-12 lg:grid-cols-[1fr_.92fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-md bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-900">
              Nómina ecuatoriana para operar, no solo registrar
            </p>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
              RRHH, nómina, bancos y auditoría en un solo flujo.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Nómina-Ec conecta registro de empresa, planes, PayPhone, roles de pago,
              archivos bancarios y documentos laborales para equipos que necesitan evidencia real.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="primary-button" to="/registro">
                Empezar ahora <ArrowRight size={18} />
              </Link>
              <Link className="secondary-button" to="/precios">
                Ver planes comerciales
              </Link>
            </div>
            <div className="mt-8 grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
              {['Registro self-service', 'Checkout PayPhone/mock', 'PWA instalable'].map((item) => (
                <div className="flex items-center gap-2" key={item}>
                  <CheckCircle2 className="h-4 w-4 text-teal-700" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-950 p-3 shadow-2xl">
            <div className="rounded-md bg-white p-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Cierre de nómina</p>
                  <p className="text-xs text-slate-500">Junio 2026 · Ecuador</p>
                </div>
                <span className="rounded-md bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                  Listo para banco
                </span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  ['Empleados', '84'],
                  ['Novedades', '12'],
                  ['Neto a pagar', '$68.240'],
                  ['Archivos', '2 bancos'],
                ].map(([label, value]) => (
                  <div className="rounded-md border border-slate-200 p-4" key={label}>
                    <p className="text-xs font-medium text-slate-500">{label}</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-md bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">Progreso operativo</span>
                  <span className="font-semibold text-teal-800">78%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200">
                  <div className="h-2 w-[78%] rounded-full bg-teal-700" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-container grid gap-5 py-12 md:grid-cols-2 lg:grid-cols-4">
        {capabilities.map((item) => (
          <article className="soft-panel p-5" key={item.title}>
            <item.icon className="mb-4 h-7 w-7 text-teal-700" />
            <h2 className="font-semibold text-slate-950">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

export default Landing;
