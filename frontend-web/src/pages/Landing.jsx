import React from 'react';
import { Link } from 'react-router-dom';
import { Banknote, CalendarClock, FileText, ShieldCheck } from 'lucide-react';

const capabilities = [
  {
    icon: CalendarClock,
    title: 'Marcaciones y novedades',
    text: 'Controla asistencia, atrasos, permisos y aprobaciones por empresa activa.',
  },
  {
    icon: Banknote,
    title: 'Nómina y bancos',
    text: 'Calcula roles, prepara archivos planos bancarios y conserva evidencia auditable.',
  },
  {
    icon: FileText,
    title: 'Documentos laborales',
    text: 'Genera roles de pago, contratos, certificados y actas de finiquito desde una sola operación.',
  },
  {
    icon: ShieldCheck,
    title: 'Cumplimiento Ecuador',
    text: 'Trabaja con parámetros legales versionados, trazabilidad y bloqueo productivo cuando falte validación.',
  },
];

function Landing() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="bg-teal-800 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-teal-100">
              Nómina ecuatoriana operativa
            </p>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">Nómina-Ec</h1>
            <p className="mt-5 max-w-2xl text-lg text-teal-50">
              SaaS para gestionar empleados, marcaciones, novedades, roles de pago,
              documentos laborales y archivos bancarios con trazabilidad por tenant.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="rounded-md bg-white px-5 py-3 font-semibold text-teal-800" to="/registro">
                Crear cuenta
              </Link>
              <Link className="rounded-md border border-teal-200 px-5 py-3 font-semibold text-white" to="/precios">
                Ver planes
              </Link>
              <Link className="rounded-md px-5 py-3 font-semibold text-teal-50" to="/login">
                Iniciar sesión
              </Link>
            </div>
          </div>
          <div className="rounded-lg bg-white/10 p-6 shadow-2xl ring-1 ring-white/15">
            <div className="rounded-md bg-white p-5 text-slate-900">
              <div className="flex items-center justify-between border-b pb-4">
                <span className="font-semibold">Resumen de nómina</span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-700">En control</span>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-slate-500">Empleados</dt><dd className="text-2xl font-bold">84</dd></div>
                <div><dt className="text-slate-500">Novedades</dt><dd className="text-2xl font-bold">12</dd></div>
                <div><dt className="text-slate-500">Neto a pagar</dt><dd className="text-2xl font-bold">$68.240</dd></div>
                <div><dt className="text-slate-500">Banco</dt><dd className="text-2xl font-bold">Listo</dd></div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-6 py-12 md:grid-cols-2 lg:grid-cols-4">
        {capabilities.map((item) => (
          <article className="rounded-lg bg-white p-5 shadow-sm" key={item.title}>
            <item.icon className="mb-4 h-7 w-7 text-teal-700" />
            <h2 className="font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

export default Landing;
