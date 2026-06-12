import React from 'react';
import { Link } from 'react-router-dom';

function LegalText({ type }) {
  const isPrivacy = type === 'privacy';
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <article className="mx-auto max-w-3xl rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">{isPrivacy ? 'Política de privacidad' : 'Términos de servicio'}</h1>
        <p className="mt-4 leading-7 text-slate-700">
          Nómina-Ec procesa datos laborales, identificativos y operativos necesarios para prestar servicios de nómina,
          marcaciones, documentos laborales, reportes y archivos bancarios. El tratamiento se rige por finalidad,
          proporcionalidad, seguridad y trazabilidad.
        </p>
        <p className="mt-4 leading-7 text-slate-700">
          PayPhone procesa pagos como proveedor externo. Nómina-Ec conserva referencias de transacción, estado,
          monto y evidencia de conciliación, sin almacenar datos sensibles de tarjetas.
        </p>
        <p className="mt-4 leading-7 text-slate-700">
          Este texto es base operativa y debe cerrarse con revisión legal ecuatoriana antes de producción.
        </p>
        <Link className="mt-6 inline-block font-semibold text-teal-700" to="/">Volver</Link>
      </article>
    </main>
  );
}

export default LegalText;
