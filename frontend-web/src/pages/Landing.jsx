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
    title: 'Empleados, unidades y zonas',
    text: 'Alta laboral, documentos y unidades organizativas vinculadas a zonas de marcacion.',
  },
  {
    icon: CalendarCheck2,
    title: 'Asistencia y novedades',
    text: 'Marcaciones, permisos, atrasos y aprobaciones con evidencia para el cierre mensual.',
  },
  {
    icon: ClipboardCheck,
    title: 'Roles y cierre',
    text: 'Cálculo de ingresos, descuentos, provisiones, cierre de periodo y rol de pago.',
  },
  {
    icon: Banknote,
    title: 'Banco y archivo plano',
    text: 'Netos a pagar, cuentas validadas y archivo bancario preparado para transferencia.',
  },
  {
    icon: FileSpreadsheet,
    title: 'RDEP, IESS y entidades',
    text: 'Base para anexos laborales y reportes requeridos por entidades públicas ecuatorianas.',
  },
  {
    icon: ShieldCheck,
    title: 'Auditoría y privacidad',
    text: 'Trazabilidad por usuario, parámetros versionados y controles de datos personales.',
  },
];

const checklist = [
  'Parámetros legales versionados y trazables por periodo',
  'Políticas públicas de privacidad, soporte y eliminación de cuenta',
  'Unidades organizativas conectadas a zonas de marcacion',
  'PWA operativa para acceso web y flujos de RRHH',
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
            Nómina-Ec
          </Link>
          <nav className="flex items-center gap-2 text-sm font-semibold">
            <Link className="hidden rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100 sm:inline-flex" to="/precios">
              Planes
            </Link>
            <Link className="hidden rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100 md:inline-flex" to="/soporte">
              Soporte
            </Link>
            <Link className="secondary-button hidden sm:inline-flex" to="/privacidad">
              Privacidad
            </Link>
            <Link className="secondary-button" to="/login">
              <LogIn size={17} />
              <span className="hidden sm:inline">Ingresar a la PWA</span>
              <span className="sm:hidden">PWA</span>
            </Link>
            <Link className="primary-button" to="/registro">
              Crear cuenta
            </Link>
          </nav>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="page-container grid gap-8 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-md bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-900">
              Software de nómina para Ecuador
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
              Nómina, asistencia, bancos y reportes en una operación trazable.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
              Nómina-Ec concentra la operación mensual de RRHH para empresas ecuatorianas:
              parametrización legal, empleados, asistencia, roles de pago, documentos,
              unidades con zona de marcacion, archivo bancario, reportes RDEP/IESS y auditoría por usuario.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link className="primary-button" to="/login">
                Ingresar a la PWA <LogIn size={18} />
              </Link>
              <Link className="primary-button" to="/registro">
                Crear cuenta <ArrowRight size={18} />
              </Link>
              <Link className="secondary-button" to="/soporte">
                Hablar con ventas
              </Link>
              <Link className="secondary-button" to="/privacidad">
                Revisar privacidad
              </Link>
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
                    ['RDEP e IESS', 'trazable'],
                    ['Usuarios y roles', 'activo'],
                  ].map(([label, status]) => (
                    <div className="flex items-center justify-between gap-3" key={label}>
                      <span className="text-sm font-medium text-slate-800">{label}</span>
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {status}
                      </span>
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
                    ['Reportes', 'RDEP/IESS'],
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

      <section className="page-container py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase text-teal-800">Flujo operativo</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Una ruta para cerrar el mes</h2>
          </div>
          <Link className="text-sm font-semibold text-teal-800" to="/precios">
            Ver planes comerciales
          </Link>
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
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              Diseñado para operar con control legal y de datos.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Cada empresa puede parametrizar sus reglas, roles, cuentas bancarias y reportes
              sin mezclar información entre organizaciones. La operación queda respaldada con
              bitácora, fuentes legales versionadas y políticas públicas de privacidad.
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

      <footer className="border-t border-slate-200 bg-white">
        <div className="page-container flex flex-wrap items-center justify-between gap-3 py-6 text-sm text-slate-600">
          <span>Nómina-Ec</span>
          <div className="flex gap-4">
            <Link className="font-semibold text-slate-700" to="/soporte">Soporte</Link>
            <Link className="font-semibold text-slate-700" to="/terminos">Términos</Link>
            <Link className="font-semibold text-slate-700" to="/privacidad">Privacidad</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default Landing;
