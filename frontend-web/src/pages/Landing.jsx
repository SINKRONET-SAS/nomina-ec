import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Banknote,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileSpreadsheet,
  Landmark,
  LogIn,
  MapPinned,
  ShieldCheck,
  Smartphone,
  UsersRound,
} from 'lucide-react';
import BrandLogo, { BRAND_NAME } from '../components/Brand/BrandLogo';

const BRAND = BRAND_NAME;

const flow = [
  {
    icon: Building2,
    title: 'Parametriza la empresa',
    text: 'Configura cargos, jornadas, zonas, bancos y reglas legales antes de registrar nómina.',
  },
  {
    icon: UsersRound,
    title: 'Completa fichas laborales',
    text: 'Datos personales, domicilio, referencias, contrato, cargas familiares y cuenta del trabajador.',
  },
  {
    icon: Smartphone,
    title: 'Controla asistencia',
    text: 'Marcaciones móviles, rutas de campo, novedades, horas extra y evidencias del periodo.',
  },
  {
    icon: CalendarCheck2,
    title: 'Gestiona permisos',
    text: 'El trabajador solicita permisos desde la app; RRHH revisa si son con o sin sueldo y deja la novedad trazable.',
  },
  {
    icon: ClipboardCheck,
    title: 'Calcula y cierra el mes',
    text: 'Roles de pago, fondo de reserva, aportes IESS, retenciones y neto a recibir.',
  },
  {
    icon: Banknote,
    title: 'Paga con archivo bancario',
    text: 'Genera archivos por banco configurado y conserva el respaldo de cada periodo.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Entrega reportes oficiales',
    text: 'RDEP, Formulario 107, SAE IESS y reportes internos con datos trazables.',
  },
];

const modules = [
  ['Nómina Ecuador', 'Cálculo mensual, roles, beneficios, descuentos y cierre controlado.'],
  ['Operación móvil', 'Marcación móvil, permisos con o sin sueldo, rutas de campo y evidencias del periodo.'],
  ['Bancos y pagos', 'Perfiles bancarios, homologación y archivo de pago por periodo.'],
  ['Documentos', 'Contratos, actas, roles PDF, finiquitos y soportes por trabajador.'],
  ['Legal y SRI', 'Parámetros por año, RDEP, Formulario 107 e informes auditables.'],
  ['Privacidad', 'Consentimientos, minimización de datos y bitácora por usuario.'],
];

const metrics = [
  ['21+', 'controles de cierre'],
  ['3', 'entidades cubiertas'],
  ['100%', 'trazabilidad'],
  ['EC', 'reglas locales'],
];

const offer = [
  {
    name: 'Prueba operativa',
    price: '$0',
    text: 'Valida empresa, empleados, asistencia, roles y reportes antes de pagar.',
    action: 'Crear cuenta',
    to: '/registro?plan=TRIAL',
  },
  {
    name: 'PYME Ecuador',
    price: 'Plan mensual',
    text: 'Gestiona nómina, bancos, documentos y reportes para equipos en crecimiento.',
    action: 'Ver planes',
    to: '/precios',
  },
  {
    name: 'Operación regulada',
    price: 'A medida',
    text: 'Multiempresa, soporte, parametrización y acompañamiento para cierres exigentes.',
    action: 'Hablar con ventas',
    to: '/soporte',
  },
];

const trust = [
  'Parámetros legales versionados por empresa y año.',
  'Cuentas bancarias cifradas y visibles solo como registro seguro.',
  'GPS y evidencias usadas con finalidad laboral documentada.',
  'Cada operación queda con responsable, fecha y auditoría.',
];

function ProductScene() {
  const employees = [
    ['Carla Almeida', 'Aprobado', '$684.89'],
    ['Marco Benítez', 'Aprobado', '$718.18'],
    ['Natalia Bravo', 'Revisión', '$1,215.66'],
    ['Miguel Cantos', 'Aprobado', '$1,241.69'],
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_14%,rgba(14,165,233,0.14),transparent_26rem),radial-gradient(circle_at_72%_72%,rgba(245,158,11,0.13),transparent_24rem)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#ffffff_0%,#ffffff_38%,rgba(255,255,255,0.90)_58%,rgba(255,255,255,0.42)_86%,rgba(255,255,255,0.72)_100%)]" />

      <div className="absolute right-[max(2rem,calc((100vw-80rem)/2))] top-16 hidden w-[540px] xl:block 2xl:w-[600px]">
        <div className="rounded-lg border border-slate-200 bg-white/95 p-5 shadow-2xl shadow-slate-200/70">
          <div className="flex items-start justify-between gap-5 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <BrandLogo imageClassName="h-10 w-10" showText={false} />
              <div>
                <p className="text-sm font-semibold text-slate-950">{BRAND}</p>
                <p className="text-xs text-slate-500">Cierre mensual Ecuador</p>
              </div>
            </div>
            <span className="rounded-md bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">Listo para pago</span>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              ['Ingresos', '$42,180'],
              ['Deducciones', '$5,940'],
              ['Neto', '$36,240'],
            ].map(([label, value]) => (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4" key={label}>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 overflow-hidden rounded-md border border-slate-200">
            {employees.map(([name, status, amount]) => (
              <div className="grid grid-cols-[1fr_105px_96px] border-b border-slate-100 px-4 py-3 text-sm last:border-b-0" key={name}>
                <span className="font-medium text-slate-800">{name}</span>
                <span className={status === 'Aprobado' ? 'text-emerald-700' : 'text-amber-700'}>{status}</span>
                <span className="text-right font-semibold text-slate-950">{amount}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_0.82fr] gap-4">
          <div className="rounded-lg border border-slate-200 bg-white/95 p-4 shadow-lg shadow-slate-200/60">
            <p className="text-xs font-semibold uppercase text-slate-500">Reportes oficiales</p>
            <div className="mt-4 space-y-2">
              {['XML RDEP', 'PDF Formulario 107', 'XML SAE IESS'].map((item, index) => (
                <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm" key={item}>
                  <span className="text-slate-700">{item}</span>
                  <CheckCircle2 className={index === 1 ? 'h-4 w-4 text-sky-700' : 'h-4 w-4 text-teal-700'} />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white/95 p-4 shadow-lg shadow-slate-200/60">
            <p className="text-xs font-semibold uppercase text-slate-500">Operación móvil</p>
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex h-[58px] items-center justify-center">
                <MapPinned className="h-9 w-9 text-teal-700" />
              </div>
              <div className="mt-2 space-y-1 text-sm font-medium text-slate-700">
                <p>Permisos desde la app</p>
                <p>Rutas de campo</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Landing() {
  return (
    <main className="app-shell bg-white">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="page-container flex h-16 items-center justify-between gap-4">
          <Link className="flex min-w-0 items-center gap-3 font-semibold text-slate-950" to="/">
            <BrandLogo imageClassName="h-10 w-10" />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link className="hidden text-sm font-semibold text-slate-700 hover:text-slate-950 sm:inline-flex" to="/precios">Planes</Link>
            <Link className="hidden text-sm font-semibold text-slate-700 hover:text-slate-950 sm:inline-flex" to="/soporte">Soporte</Link>
            <Link className="secondary-button min-h-10 px-3" to="/login">
              <LogIn size={17} />
              <span className="hidden sm:inline">Ingresar</span>
            </Link>
            <Link className="primary-button min-h-10 px-3 sm:px-4" to="/registro">Crear cuenta</Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <ProductScene />
        <div className="page-container relative z-10 flex min-h-[74dvh] items-center py-12 lg:py-16">
          <div className="max-w-[560px]">
            <p className="inline-flex rounded-md border border-teal-200 bg-white px-3 py-1 text-sm font-semibold text-teal-900 shadow-sm">
              Software de nómina para Ecuador
            </p>
            <h1 className="mt-5 text-5xl font-semibold leading-none text-slate-950 sm:text-6xl lg:text-7xl">
              {BRAND}
            </h1>
            <p className="mt-5 text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">
              Nómina, asistencia, pagos y reportes listos para cerrar el mes.
            </p>
            <p className="mt-5 max-w-lg text-base leading-8 text-slate-700">
              Una plataforma para RRHH y administración: fichas laborales completas, roles de pago,
              permisos con o sin sueldo, archivo bancario por banco, rutas de campo, RDEP,
              Formulario 107, SAE IESS y auditoría por usuario.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link className="primary-button" to="/registro">Empezar prueba <ArrowRight size={18} /></Link>
              <Link className="secondary-button" to="/login">Ingresar a la PWA <LogIn size={18} /></Link>
              <Link className="secondary-button" to="/precios">Ver planes</Link>
            </div>
            <div className="mt-8 grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-4">
              {metrics.map(([value, label]) => (
                <div className="rounded-md border border-slate-200 bg-white/90 px-4 py-3 shadow-sm" key={label}>
                  <p className="text-2xl font-semibold text-slate-950">{value}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="page-container grid gap-6 py-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase text-teal-800">Cierre mensual</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Un flujo claro para operar cada periodo</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Cada módulo se conecta con una tarea concreta del cierre: datos laborales, asistencia,
              cálculo, pagos, reportes y respaldo para auditoría.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              [CalendarCheck2, 'Asistencia y permisos', 'Horas, rutas, permisos y novedades'],
              [Landmark, 'Entidades', 'SRI, IESS y bancos'],
              [ShieldCheck, 'Auditoría', 'Responsable y evidencia'],
            ].map(([Icon, title, text]) => (
              <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={title}>
                <Icon className="h-6 w-6 text-teal-700" />
                <h3 className="mt-4 font-semibold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-container py-12">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase text-teal-800">Ruta operativa</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">De la ficha del empleado al pago bancario</h2>
          </div>
          <Link className="text-sm font-semibold text-teal-800 hover:text-teal-950" to="/registro">Crear cuenta <ArrowRight className="inline h-4 w-4" /></Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {flow.map((item) => (
            <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={item.title}>
              <item.icon className="mb-4 h-6 w-6 text-teal-700" />
              <h3 className="font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-950 text-white">
        <div className="page-container grid gap-8 py-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase text-amber-300">Producto local</p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight">Lo importante queda listo antes de presionar cerrar mes.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              {BRAND} no vende solo una calculadora. Ordena parametrización, permisos, documentos,
              novedades, bancos y reportes para que el cierre tenga respaldo operacional.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {modules.map(([title, text], index) => (
              <article className="rounded-lg border border-white/10 bg-white/5 p-4" key={title}>
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-white text-slate-950">
                  {index + 1}
                </div>
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-container py-12">
        <div className="mb-7 max-w-3xl">
          <p className="text-sm font-semibold uppercase text-teal-800">Planes</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Empieza con una prueba y escala cuando tu operación lo pida</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {offer.map((item, index) => (
            <article className={`rounded-lg border p-5 shadow-sm ${index === 1 ? 'border-teal-300 bg-teal-50' : 'border-slate-200 bg-white'}`} key={item.name}>
              <h3 className="text-lg font-semibold text-slate-950">{item.name}</h3>
              <p className="mt-3 text-2xl font-semibold text-teal-800">{item.price}</p>
              <p className="mt-3 min-h-20 text-sm leading-6 text-slate-600">{item.text}</p>
              <Link className={index === 1 ? 'primary-button mt-5 w-full' : 'secondary-button mt-5 w-full'} to={item.to}>
                {item.action}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="page-container grid gap-8 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase text-teal-800">Confianza</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Datos laborales protegidos y operaciones revisables</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Cada empresa mantiene su información separada. Las decisiones de pago, asistencia,
              reportes y documentos quedan trazadas para revisión interna y soporte.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {trust.map((item) => (
              <div className="flex items-start gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm" key={item}>
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
                <span className="text-sm font-medium leading-6 text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="page-container py-12">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 shadow-sm md:flex md:items-center md:justify-between md:gap-6">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-teal-800">
                <FileCheck2 className="h-5 w-5" />
                Cierre controlado desde el primer mes
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">Activa la prueba y valida tu flujo real de nómina.</h2>
            </div>
            <div className="mt-5 flex flex-wrap gap-3 md:mt-0">
              <Link className="primary-button" to="/registro">Crear cuenta <ArrowRight size={18} /></Link>
              <Link className="secondary-button" to="/soporte">Hablar con ventas</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="page-container flex flex-wrap items-center justify-between gap-3 py-6 text-sm text-slate-600">
          <span className="font-semibold text-slate-800">{BRAND}</span>
          <div className="flex gap-4">
            <Link className="font-semibold text-slate-700 hover:text-slate-950" to="/soporte">Soporte</Link>
            <Link className="font-semibold text-slate-700 hover:text-slate-950" to="/terminos">Términos</Link>
            <Link className="font-semibold text-slate-700 hover:text-slate-950" to="/privacidad">Privacidad</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default Landing;
