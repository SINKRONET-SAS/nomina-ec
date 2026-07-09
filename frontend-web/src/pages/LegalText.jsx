import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const version = 'SAAS-LOPDP-2026-07';

const content = {
  '/privacidad': {
    title: 'Política de privacidad',
    intro: 'SKNOMINA trata datos personales laborales como plataforma SaaS para operar nómina, asistencia, documentos, auditoría, archivo bancario y reportes requeridos por la empresa contratante.',
    sections: [
      ['Responsable', 'Cada empresa contratante actúa como responsable del tratamiento de los datos de sus trabajadores. SKNOMINA actúa como proveedor tecnológico y encargado cuando procesa datos por cuenta de la empresa.'],
      ['Finalidades', 'Registro de empresas, administración de usuarios, marcaciones, roles de pago, documentos laborales, reportes RDEP/IESS, soporte, seguridad, auditoría y cumplimiento contractual.'],
      ['Base de tratamiento', 'Ejecución contractual, obligaciones laborales, obligaciones legales aplicables y consentimiento cuando se trate de cookies o analítica no esencial.'],
      ['Datos tratados', 'Identificación, contacto, datos laborales, novedades, asistencia, geolocalización de marcación, evidencia fotográfica cuando la empresa la active, cuentas bancarias para pago y trazabilidad de auditoría.'],
      ['Derechos del titular', 'El titular puede solicitar acceso, rectificación, eliminación, oposición, portabilidad, suspensión del tratamiento y retiro de consentimiento mediante los canales de soporte de su empresa o de SKNOMINA.'],
      ['Retención', 'Los datos se conservan por el tiempo necesario para obligaciones laborales, tributarias, seguridad, auditoría y defensa de reclamaciones. La empresa debe definir su política final de retención.'],
      ['Incidentes', 'Los incidentes de seguridad se gestionan con registro, contención, análisis, comunicación a responsables y notificación a autoridades o titulares cuando corresponda.'],
      ['Transferencias y procesadores', 'Los proveedores de infraestructura, pagos, correo, soporte o analítica deben estar inventariados y sujetos a acuerdos de tratamiento de datos cuando aplique.'],
      ['Cookies', 'Las cookies necesarias operan la sesión. La analítica no esencial queda bloqueada hasta consentimiento expreso.'],
    ],
  },
  '/terminos': {
    title: 'Términos de servicio',
    intro: 'SKNOMINA es una plataforma SaaS. La empresa contratante conserva la responsabilidad laboral, tributaria, documental y de protección de datos frente a sus trabajadores y autoridades.',
    sections: [
      ['Naturaleza SaaS', 'SKNOMINA provee software, automatización, plantillas y almacenamiento operativo. No es empleador, representante, mandatario, asesor legal, contador, auditor, intermediario laboral ni parte de los contratos o documentos laborales generados por la empresa.'],
      ['Responsabilidad del cliente', 'La empresa contratante debe validar datos, parámetros legales, cargos, jornadas, beneficios, documentos, registros externos, autorizaciones, soportes y reportes antes de usarlos en producción o presentarlos ante terceros.'],
      ['Uso autorizado', 'El servicio debe usarse para operaciones laborales legítimas y con usuarios autorizados por la empresa.'],
      ['Configuración', 'Antes de producción se deben completar y revisar datos de empresa, usuarios y roles, bancos, archivo plano, parámetros legales, políticas aplicables y permisos de tratamiento de datos.'],
      ['Plantillas y cálculos', 'Las plantillas, cálculos, reportes y advertencias del sistema son herramientas de apoyo. Su validez depende de la información ingresada, la configuración aprobada por la empresa y la revisión profesional que corresponda.'],
      ['Limitaciones', 'SKNOMINA no garantiza aprobación automática de entidades públicas, no realiza registros oficiales por cuenta de la empresa y no reemplaza asesoría legal, laboral, tributaria, contable o de protección de datos.'],
      ['Pagos y planes', 'Los planes comerciales, periodos de prueba y pagos se rigen por la oferta vigente y las condiciones aceptadas por la empresa contratante.'],
      ['Suspensión', 'El servicio puede restringirse por incumplimiento contractual, uso indebido, riesgo de seguridad, plan vencido o mandato legal.'],
    ],
  },
  '/eliminar-cuenta': {
    title: 'Eliminación de cuenta',
    intro: 'Los titulares y empresas pueden solicitar eliminación o bloqueo de cuenta conforme a sus obligaciones laborales, contractuales y legales.',
    sections: [
      ['Solicitud', 'La solicitud debe enviarse desde el canal de soporte autorizado, indicando empresa, usuario, correo y alcance requerido.'],
      ['Validación', 'SKNOMINA verificará identidad y autorización antes de ejecutar eliminación, bloqueo o anonimización.'],
      ['Restricciones', 'Algunos datos laborales pueden conservarse por obligaciones legales, auditoría, defensa de reclamaciones o requerimientos de entidades públicas.'],
      ['Plazo operativo', 'La respuesta operativa inicial se registra con trazabilidad y responsable asignado.'],
    ],
  },
  '/soporte': {
    title: 'Soporte',
    intro: 'Soporte operativo para empresas que evalúan o usan SKNOMINA.',
    sections: [
      ['Canales', 'Use el canal comercial o técnico definido en su contrato o solicitud de demo.'],
      ['Prioridad', 'Incidentes de seguridad, acceso, cierre de nómina y pagos tienen prioridad operativa.'],
      ['Datos sensibles', 'No envíe datos reales de empleados por canales no autorizados. Use identificadores internos o datos ficticios para demos.'],
    ],
  },
};

function LegalText() {
  const location = useLocation();
  const data = content[location.pathname] || content['/privacidad'];

  return (
    <main className="app-shell">
      <section className="page-container py-12">
        <div className="soft-panel mx-auto max-w-4xl p-6 sm:p-8">
          <Link className="text-sm font-semibold text-teal-800" to="/">Volver al inicio</Link>
          <p className="mt-6 text-sm font-semibold uppercase text-teal-800">Versión {version}</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">{data.title}</h1>
          <p className="mt-5 text-base leading-8 text-slate-600">{data.intro}</p>
          <div className="mt-8 grid gap-4">
            {data.sections.map(([title, text]) => (
              <section className="rounded-md border border-slate-200 bg-slate-50 p-4" key={title}>
                <h2 className="text-base font-semibold text-slate-950">{title}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">{text}</p>
              </section>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default LegalText;
