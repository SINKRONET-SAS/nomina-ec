import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Building2, CheckCircle2, Clock3 } from 'lucide-react';

function PaymentResult() {
  const [params] = useSearchParams();
  const reference = params.get('clientTransactionId') || 'sin referencia';
  const mock = params.get('mock') === 'true';

  return (
    <main className="app-shell">
      <div className="page-container flex min-h-screen items-center justify-center py-8">
        <section className="soft-panel w-full max-w-xl p-6 text-center sm:p-8">
          <Link className="mx-auto mb-8 inline-flex items-center gap-3 font-semibold text-slate-950" to="/">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-700 text-white">
              <Building2 size={19} />
            </span>
            SKNOMINA
          </Link>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            {mock ? <Clock3 size={28} /> : <CheckCircle2 size={28} />}
          </div>
          <h1 className="mt-6 text-2xl font-semibold text-slate-950">Resultado de pago</h1>
          <p className="mt-3 leading-7 text-slate-600">
            La transacción PayPhone fue registrada para conciliación.
          </p>
          <p className="mt-5 rounded-md bg-slate-100 p-3 font-mono text-sm text-slate-800">{reference}</p>
          {mock && (
            <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
              Modo mock activo. En producción esta URL debe ser reemplazada por confirmación sandbox/real de PayPhone.
            </p>
          )}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link className="primary-button" to="/dashboard">
              Ir al panel
            </Link>
            <Link className="secondary-button" to="/precios">
              Revisar planes
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default PaymentResult;
