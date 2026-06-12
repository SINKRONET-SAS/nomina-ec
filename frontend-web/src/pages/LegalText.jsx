import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const content = {
  '/privacidad': {
    title: 'Política de privacidad',
    body: 'Nómina-Ec trata datos personales laborales para operar nómina, asistencia, documentos, auditoría y obligaciones regulatorias. La activación productiva requiere completar la revisión legal profesional y las políticas definitivas del responsable del tratamiento.',
  },
  '/terminos': {
    title: 'Términos de servicio',
    body: 'El uso de Nómina-Ec está sujeto a configuración segura por empresa, validación legal Ecuador 2026 y aprobación comercial de planes. Los servicios de pago se concilian mediante PayPhone o modo de pruebas en ambientes locales.',
  },
};

function LegalText() {
  const location = useLocation();
  const data = content[location.pathname] || content['/privacidad'];

  return (
    <main className="app-shell">
      <section className="page-container py-12">
        <div className="soft-panel mx-auto max-w-3xl p-6 sm:p-8">
          <Link className="text-sm font-semibold text-teal-800" to="/">Volver al inicio</Link>
          <h1 className="mt-6 text-3xl font-semibold text-slate-950">{data.title}</h1>
          <p className="mt-5 text-base leading-8 text-slate-600">{data.body}</p>
        </div>
      </section>
    </main>
  );
}

export default LegalText;
