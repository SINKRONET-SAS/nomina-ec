import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

function NotFound() {
  return (
    <main className="app-shell flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3 text-amber-700">
          <AlertTriangle className="h-6 w-6" />
          <p className="text-sm font-semibold uppercase tracking-[0.16em]">Ruta no encontrada</p>
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-slate-950">No encontramos esta pagina en Nomina-Ec</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">La ruta puede haber cambiado o tu sesion no tiene acceso al modulo solicitado.</p>
        <Link className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white" to="/dashboard">
          <ArrowLeft className="h-4 w-4" />
          Volver al panel
        </Link>
      </section>
    </main>
  );
}

export default NotFound;
