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
  ShieldCheck,
  Smartphone,
  UsersRound,
} from 'lucide-react';

const flow = [
  {
    icon: Building2,
    title: 'Parametriza la empresa',
    text: 'Configura cargos, jornadas, zonas, bancos y reglas legales antes de registrar nomina.',
  },
  {
    icon: UsersRound,
    title: 'Completa fichas laborales',
    text: 'Datos personales, domicilio, referencias, contrato, cargas familiares y cuenta del trabajador.',
  },
  {
    icon: Smartphone,
    title: 'Controla asistencia',
    text: 'Marcaciones moviles, rutas de campo, novedades, horas extra y evidencias del periodo.',
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
  ['Nomina Ecuador', 'Calculo mensual, roles, beneficios, descuentos y cierre controlado.'],
  ['Asistencia y rutas', 'Marcacion movil, sitios visitados, entradas, salidas y excepciones.'],
  ['Bancos y pagos', 'Perfiles bancarios, homologacion y archivo de pago por periodo.'],
  ['Documentos', 'Contratos, actas, roles PDF, finiquitos y soportes por trabajador.'],
  ['Legal y SRI', 'Parametros por anio, RDEP, Formulario 107 e informes auditables.'],
  ['Privacidad', 'Consentimientos, minimizacion de datos y bitacora por usuario.'],
];

const metrics = [
  ['21+', 'controles de cierre'],
  ['3', 'entidades cubiertas'],
  ['100%', 'trazabilidad por usuario'],
  ['EC', 'reglas localizadas'],
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
    text: 'Gestiona nomina, bancos, documentos y reportes para equipos en crecimiento.',
    action: 'Ver planes',
    to: '/precios',
  },
  {
    name: 'Operacion regulada',
    price: 'A medida',
    text: 'Multiempresa, soporte, parametrizacion y acompanamiento para cierres exigentes.',
    action: 'Hablar con ventas',
    to: '/soporte',
  },
];

const trust = [
  'Parametros legales versionados por empresa y anio.',
  'Cuentas bancarias cifradas y visibles solo como registro seguro.',
  'GPS y evidencias usadas con finalidad laboral documentada.',
  'Cada operacion queda con responsable, fecha y auditoria.',
];

function ProductScene() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-x-0 top-0 h-px bg-slate-200" />
      <div className="absolute left-1/2 top-10 hidden w-[980px] -translate-x-1/2 lg:block">
        <div className="grid grid-cols-[210px_1fr_260px] gap-4 opacity-95">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-700 text-white">
                <Building2 size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950">Nomina-Ec</p>
                <p className="text-xs text-slate-500">Operacion mensual</p>
              </div>
            </div>
            {['Empleados', 'Asistencia', 'Nomina', 'Pagos', 'Reportes'].map((item, index) => (
              <div className={`mb-2 rounded-md px-3 py-2 text-sm ${index === 2 ? 'bg-teal-50 font-semibold text-teal-900' : 'bg-slate-50 text-slate-600'}`} key={item}>
                {item}
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-950">Cierre junio 2026</p>
                <p className="text-xs text-slate-500">Nomina calculada en America/Guayaquil</p>
              </div>
              <span className="rounded-md bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">Listo para pago</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                ['Ingresos', '$42.180'],
                ['Deducciones', '$5.940'],
                ['Neto', '$36.240'],
              ].map(([label, value]) => (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-4" key={label}>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 overflow-hidden rounded-md border border-slate-200">
              {[
                ['Carla Almeida', 'Aprobado', '$684.89'],
                ['Marco Benitez', 'Aprobado', '$718.18'],
                ['Natalia Bravo', 'Revision', '$1.215.66'],
                ['Miguel Cantos', 'Aprobado', '$1.241.69'],
              ].map(([name, status, amount]) => (
                <div className="grid grid-cols-[1fr_110px_100px] border-b border-slate-100 px-4 py-3 text-sm last:border-b-0" key={name}>
                  <span className="font-medium text-slate-800">{name}</span>
                  <span className={status === 'Aprobado' ? 'text-emerald-700' : 'text-amber-700'}>{status}</span>
                  <span className="text-right font-semibold text-slate-950">{amount}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
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
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-500">Rutas de campo</p>
              <div className="mt-4 h-28 rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="h-full rounded-md border border-dashed border-teal-300 bg-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute inset-0 bg-white/78" />
    </div>
  );
}

function Landing() {
  return (
    <main className="app-shell bg-white">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="page-container flex h-16 items-center justify-between gap-4">
          <Link className="flex min-w-0 items-center gap-3 font-semibold text-slate-950" to="/">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-teal-700 text-white">
              <Building2 size={19} />
            </span>
            <span className="truncate">Nomina-Ec</span>
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

      <section className="relative min-h-[72dvh] overflow-hidden border-b border-slate-200 bg-white">
        <ProductScene />
        <div className="page-container relative z-10 flex min-h-[72dvh] items-center py-14">
          <div className="max-w-4xl">
            <p className="inline-flex rounded-md border border-teal-200 bg-white px-3 py-1 text-sm font-semibold text-teal-900 shadow-sm">
              Software de nomina para Ecuador
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
              Nomina-Ec: paga sueldos, controla asistencia y entrega reportes sin improvisar el cierre.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-700">
              Una plataforma para RRHH y administracion: fichas laborales completas, roles de pago,
              archivo bancario, rutas de campo, RDEP, Formulario 107, SAE IESS y auditoria por usuario.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link className="primary-button" to="/registro">Empezar prueba <ArrowRight size={18} /></Link>
              <Link className="secondary-button" to="/login">Ingresar a la PWA <LogIn size={18} /></Link>
              <Link className="secondary-button" to="/precios">Ver planes</Link>
            </div>
            <div className="mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
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
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Un flujo comercialmente claro para operar cada periodo</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Cada modulo se conecta con una tarea concreta del cierre: datos laborales, asistencia,
              calculo, pagos, reportes y respaldo para auditoria.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              [CalendarCheck2, 'Asistencia', 'Horas, rutas y novedades'],
              [Landmark, 'Entidades', 'SRI, IESS y bancos'],
              [ShieldCheck, 'Auditoria', 'Responsable y evidencia'],
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
              Nomina-Ec no vende solo una calculadora. Ordena parametrizacion, documentos, novedades,
              bancos y reportes para que el cierre tenga respaldo operacional.
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
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Empieza con una prueba y escala cuando tu operacion lo pida</h2>
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
              Cada empresa mantiene su informacion separada. Las decisiones de pago, asistencia,
              reportes y documentos quedan trazadas para revision interna y soporte.
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
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">Activa la prueba y valida tu flujo real de nomina.</h2>
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
          <span className="font-semibold text-slate-800">Nomina-Ec</span>
          <div className="flex gap-4">
            <Link className="font-semibold text-slate-700 hover:text-slate-950" to="/soporte">Soporte</Link>
            <Link className="font-semibold text-slate-700 hover:text-slate-950" to="/terminos">Terminos</Link>
            <Link className="font-semibold text-slate-700 hover:text-slate-950" to="/privacidad">Privacidad</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default Landing;
