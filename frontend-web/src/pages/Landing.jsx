import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Banknote,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  LogIn,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';

const flow = [
  {
    icon: UsersRound,
    title: 'Tus empleados en orden',
    text: 'Registra contratos, cargos y horarios de trabajo. Todo listo para el pago mensual.',
  },
  {
    icon: CalendarCheck2,
    title: 'Control de entradas y salidas',
    text: 'Los empleados marcan desde el celular con GPS. Tu equipo aprueba horas extra, permisos y atrasos.',
  },
  {
    icon: ClipboardCheck,
    title: 'El sueldo se calcula solo',
    text: 'Decimos, aportes, retenciones y neto a pagar calculados automaticamente cada mes.',
  },
  {
    icon: Banknote,
    title: 'Transferencia directa al banco',
    text: 'Genera el archivo para pagar sueldos desde tu banco en minutos.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Reportes para entidades publicas',
    text: 'Prepara reportes laborales y tributarios de nomina con datos consistentes.',
  },
  {
    icon: ShieldCheck,
    title: 'Todo queda registrado',
    text: 'Cada cambio tiene fecha, hora y responsable para revisiones laborales.',
  },
];

const checklist = [
  'El salario basico y las tasas laborales quedan controlados por periodo',
  'Privacidad, soporte y eliminacion de datos disponibles para empleados',
  'Departamentos y sucursales conectados a zonas de marcacion',
  'Funciona desde celular y computadora, sin instalar programas',
];

const commercialOffer = [
  {
    name: 'Prueba operativa',
    price: '$0',
    description: 'Activa empresa, usuarios, empleados y asistencia para validar el cierre mensual.',
    action: 'Empezar prueba',
    to: '/registro?plan=TRIAL',
  },
  {
    name: 'PYME Ecuador',
    price: 'Desde planes mensuales',
    description: 'Roles, bancos, reportes, documentos y auditoria para equipos de RRHH en crecimiento.',
    action: 'Ver planes',
    to: '/precios',
  },
  {
    name: 'Corporativo',
    price: 'Precio a medida',
    description: 'Multiempresa, soporte, parametrizacion y acompanamiento para operacion regulada.',
    action: 'Hablar con ventas',
    to: '/soporte',
  },
];

function Landing() {
  return (
    <main className="app-shell bg-white">
      <header className="border-b border-slate-200 bg-white">
        <div className="page-container flex h-16 items-center justify-between gap-4">
          <Link className="flex items-center gap-3 font-semibold text-slate-950" to="/">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-700 text-white">
              <Building2 size={19} />
            </span>
            Nomina-Ec
          </Link>
          <nav className="flex items-center gap-3">
            <Link className="text-sm font-semibold text-slate-700 hover:text-slate-950" to="/precios">Planes</Link>
            <Link className="text-sm font-semibold text-slate-700 hover:text-slate-950" to="/soporte">Soporte</Link>
            <Link className="secondary-button" to="/login">
              <LogIn size={17} />
              <span className="hidden sm:inline">Ingresar a la PWA</span>
              <span className="sm:hidden">PWA</span>
            </Link>
            <Link className="primary-button" to="/registro">Crear cuenta</Link>
          </nav>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="page-container grid gap-8 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-md bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-900">
              Software de nomina para Ecuador
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
              Paga sueldos, controla horarios y deja evidencia sin enredarte cada mes.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
              Nomina-Ec concentra empleados, asistencia, roles de pago, documentos, zonas de marcacion,
              archivo bancario, reportes para entidades publicas y auditoria por usuario.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link className="primary-button" to="/login">Ingresar a la PWA <LogIn size={18} /></Link>
              <Link className="primary-button" to="/registro">Crear cuenta <ArrowRight size={18} /></Link>
              <Link className="secondary-button" to="/soporte">Hablar con ventas</Link>
              <Link className="secondary-button" to="/privacidad">Revisar privacidad</Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Cierre mensual Ecuador</p>
                  <p className="text-xs text-slate-500">Control operativo y trazabilidad legal</p>
                </div>
                <span className="rounded-md bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                  Flujo auditado
                </span>
              </div>
            </div>
            <div className="grid gap-0 md:grid-cols-[0.9fr_1.1fr]">
              <div className="border-b border-slate-200 p-5 md:border-b-0 md:border-r">
                <p className="text-xs font-semibold uppercase text-slate-500">Avance operativo</p>
                <div className="mt-4 space-y-4">
                  {[
                    ['Datos de empresa', 'configurado'],
                    ['Unidades y zonas', 'vinculadas'],
                    ['Reportes publicos', 'trazable'],
                    ['Usuarios y roles', 'activo'],
                  ].map(([label, status]) => (
                    <div className="flex items-center justify-between gap-3" key={label}>
                      <span className="text-sm font-medium text-slate-800">{label}</span>
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{status}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Plantilla', 'Por empresa'],
                    ['Zonas activas', 'Por unidad'],
                    ['Neto a pagar', 'Por periodo'],
                    ['Reportes', 'Listos'],
                  ].map(([label, value]) => (
                    <div className="rounded-md border border-slate-200 p-4" key={label}>
                      <p className="text-xs font-medium text-slate-500">{label}</p>
                      <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-md bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">Checklist de cierre</span>
                    <span className="font-semibold text-teal-800">Completo</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div className="h-2 w-full rounded-full bg-teal-700" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="page-container py-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase text-teal-800">Oferta comercial</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Empieza pequeno y escala sin cambiar de sistema</h2>
            </div>
            <Link className="text-sm font-semibold text-teal-800" to="/precios">Comparar capacidades</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {commercialOffer.map((offer) => (
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-5" key={offer.name}>
                <h3 className="text-lg font-semibold text-slate-950">{offer.name}</h3>
                <p className="mt-3 text-2xl font-semibold text-teal-800">{offer.price}</p>
                <p className="mt-3 min-h-20 text-sm leading-6 text-slate-600">{offer.description}</p>
                <Link className="mt-5 inline-flex min-h-10 items-center justify-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white" to={offer.to}>
                  {offer.action}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-container py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase text-teal-800">Flujo operativo</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Una ruta para cerrar el mes</h2>
          </div>
          <Link className="text-sm font-semibold text-teal-800" to="/precios">Ver planes comerciales</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {flow.map((item) => (
            <article className="soft-panel p-5" key={item.title}>
              <item.icon className="mb-4 h-6 w-6 text-teal-700" />
              <h3 className="font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="page-container grid gap-8 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase text-teal-800">Confianza comercial</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Disenado para operar con control legal y de datos.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Cada empresa puede configurar sus reglas, roles, cuentas bancarias y reportes sin mezclar informacion
              entre organizaciones. La operacion queda respaldada con bitacora, fuentes revisables y politicas publicas de privacidad.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {checklist.map((item) => (
              <div className="flex items-start gap-3 rounded-md border border-slate-200 bg-white p-4" key={item}>
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-teal-700" />
                <span className="text-sm font-medium leading-6 text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="page-container py-10">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase text-teal-800">Proteccion de datos</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Los datos de tus empleados se tratan con controles claros</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Nomina-Ec separa empresas, minimiza evidencias sensibles y mantiene historial de acciones.
              Tu empresa administra la relacion laboral y los consentimientos de cada trabajador.
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ['Privacidad laboral', 'Avisos y derechos de datos personales disponibles para empleados.'],
              ['Bancos protegidos', 'Las cuentas se guardan cifradas y se descifran solo para generar pagos.'],
              ['GPS con finalidad', 'La ubicacion se usa para asistencia y rutas autorizadas, con trazabilidad.'],
            ].map(([title, text]) => (
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-5" key={title}>
                <ShieldCheck className="mb-3 h-5 w-5 text-teal-700" />
                <h3 className="font-semibold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="page-container flex flex-wrap items-center justify-between gap-3 py-6 text-sm text-slate-600">
          <span>Nomina-Ec</span>
          <div className="flex gap-4">
            <Link className="font-semibold text-slate-700" to="/soporte">Soporte</Link>
            <Link className="font-semibold text-slate-700" to="/terminos">Terminos</Link>
            <Link className="font-semibold text-slate-700" to="/privacidad">Privacidad</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default Landing;
