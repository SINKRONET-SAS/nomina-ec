import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

function PaymentResult() {
  const [params] = useSearchParams();
  const reference = params.get('clientTransactionId') || 'sin referencia';
  const mock = params.get('mock') === 'true';

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <section className="mx-auto max-w-xl rounded-lg bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Resultado de pago</h1>
        <p className="mt-3 text-slate-600">
          La transacción PayPhone fue registrada para conciliación.
        </p>
        <p className="mt-4 rounded-md bg-slate-100 p-3 font-mono text-sm">{reference}</p>
        {mock && (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            Modo mock activo. En producción esta URL debe ser reemplazada por confirmación sandbox/real de PayPhone.
          </p>
        )}
        <Link className="mt-6 inline-block rounded-md bg-teal-700 px-5 py-3 font-semibold text-white" to="/dashboard">
          Ir al panel
        </Link>
      </section>
    </main>
  );
}

export default PaymentResult;
