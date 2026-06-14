// ============================================================
// Nomina-Ec - Panel operativo de nomina
// ============================================================
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Banknote,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  DollarSign,
  FileText,
  Landmark,
  LockKeyhole,
  Settings2,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authenticatedApi } from '../services/authenticatedApi';

const monthNames = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function pickArray(payload, keys) {
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  }
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function safeCount(value) {
  return Array.isArray(value) ? value.length : 0;
}

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

async function optionalGet(url) {
  try {
    const response = await authenticatedApi.get(url);
    return { ok: true, data: response.data };
  } catch (err) {
    return {
      ok: false,
      status: err?.response?.status || 0,
      message: err?.response?.data?.message || err.message,
    };
  }
}

function getPeriod() {
  const today = new Date();
  return {
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    label: `${monthNames[today.getMonth()]} ${today.getFullYear()}`,
  };
}

async function loadDashboardData(role) {
  const period = getPeriod();
  const [
    empleadosResult,
    novedadesResult,
    marcacionesResult,
    configuracionResult,
    nominasResult,
    suscripcionResult,
    auditoriaResult,
  ] = await Promise.all([
    optionalGet('/empleados'),
    optionalGet('/novedades/pendientes'),
    optionalGet('/marcaciones/hoy'),
    optionalGet('/configuracion/resumen'),
    optionalGet(`/nomina/${period.year}/${period.month}`),
    optionalGet('/pagos/status'),
    ['owner', 'superadmin'].includes(role) ? optionalGet('/auditoria?limit=5') : Promise.resolve({ ok: false }),
  ]);

  const empleados = pickArray(empleadosResult.data, ['empleados', 'items']);
  const novedades = pickArray(novedadesResult.data, ['novedades', 'items']);
  const marcaciones = pickArray(marcacionesResult.data, ['marcaciones', 'items']);
  const nominas = pickArray(nominasResult.data, ['nominas', 'items']);
  const auditLogs = pickArray(auditoriaResult.data, ['auditLogs', 'items']);
  const resources = configuracionResult.data?.data?.resources || {};
  const onboarding = configuracionResult.data?.data?.onboarding || {};
  const qaChecklist = configuracionResult.data?.data?.qaChecklist || [];
  const subscription = suscripcionResult.data?.data || null;

  return {
    period,
    empleados,
    novedades,
    marcaciones,
    nominas,
    auditLogs,
    resources,
    onboarding,
    qaChecklist,
    subscription,
    health: {
      empleados: empleadosResult.ok,
      novedades: novedadesResult.ok,
      marcaciones: marcacionesResult.ok,
      configuracion: configuracionResult.ok,
      nominas: nominasResult.ok,
      suscripcion: suscripcionResult.ok,
      auditoria: auditoriaResult.ok,
    },
  };
}

function payrollStatus(nominas) {
  if (!safeCount(nominas)) {
    return {
      label: 'Sin roles calculados',
      tone: 'bg-amber-50 text-amber-800 border-amber-200',
      next: 'Calcula la nomina del periodo para generar roles y valores de pago.',
    };
  }

  const closed = nominas.filter((row) => row.estado === 'cerrada' || row.cerrada).length;
  if (closed === nominas.length) {
    return {
      label: 'Nomina cerrada',
      tone: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      next: 'Puedes emitir roles, archivo bancario y anexos para entidades.',
    };
  }

  return {
    label: 'Roles calculados sin cierre',
    tone: 'bg-blue-50 text-blue-800 border-blue-200',
    next: 'Revisa novedades, valida totales y cierra el periodo cuando corresponda.',
  };
}

function Step({ done, icon: Icon, title, description, href, action }) {
  return (
    <Link className="rounded-md border border-slate-200 p-4 transition hover:border-teal-300 hover:bg-teal-50" to={href}>
      <div className="flex items-start gap-3">
        <span className={`rounded-md p-2 ${done ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-600'}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-950">{title}</h3>
            {done && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          </div>
          <p className="mt-1 text-sm leading-5 text-slate-600">{description}</p>
          <p className="mt-3 text-sm font-semibold text-teal-700">{action}</p>
        </div>
      </div>
    </Link>
  );
}

function Dashboard() {
  const { usuario } = useAuth();
  const role = usuario?.rol;
  const canAudit = ['owner', 'superadmin'].includes(role);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-nomina-operativa', role],
    queryFn: () => loadDashboardData(role),
    enabled: Boolean(role),
    retry: false,
  });

  const period = data?.period || getPeriod();
  const activeEmployees = (data?.empleados || []).filter((employee) => employee.activo !== false);
  const nominas = data?.nominas || [];
  const status = payrollStatus(nominas);
  const completion = data?.onboarding?.completionPercent || 0;
  const rolesClosed = nominas.filter((row) => row.estado === 'cerrada' || row.cerrada).length;
  const totalIngresos = nominas.reduce((total, row) => total + Number(row.total_ingresos || 0), 0);
  const totalDeducciones = nominas.reduce((total, row) => total + Number(row.total_deducciones || 0), 0);
  const netoPagar = nominas.reduce((total, row) => total + Number(row.neto_recibir || 0), 0);
  const missingQa = (data?.qaChecklist || []).filter((item) => !item.passed);
  const subscriptionLabel = data?.subscription
    ? `${data.subscription.planNombre || data.subscription.planId} - ${data.subscription.estado}`
    : 'Sin suscripcion activa registrada';

  const summaryCards = [
    {
      icon: Users,
      label: 'Empleados activos',
      value: safeCount(activeEmployees),
      detail: safeCount(activeEmployees) ? 'Base laboral para el calculo' : 'Registra empleados para operar nomina',
      href: '/dashboard/empleados',
      tone: 'bg-blue-50 text-blue-700',
    },
    {
      icon: FileText,
      label: 'Roles del periodo',
      value: safeCount(nominas),
      detail: `${rolesClosed} cerrados`,
      href: '/dashboard/nomina/roles',
      tone: 'bg-cyan-50 text-cyan-700',
    },
    {
      icon: Banknote,
      label: 'Neto a pagar',
      value: money(netoPagar),
      detail: `${money(totalIngresos)} ingresos · ${money(totalDeducciones)} deducciones`,
      href: '/dashboard/nomina/roles',
      tone: 'bg-emerald-50 text-emerald-700',
    },
    {
      icon: Clock,
      label: 'Novedades pendientes',
      value: safeCount(data?.novedades),
      detail: 'Afectan calculo, asistencia o soportes',
      href: '/dashboard/asistencia/novedades',
      tone: 'bg-amber-50 text-amber-700',
    },
  ];

  return (
    <div className="space-y-6">
      <section className="soft-panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">Operacion de nomina</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Periodo {period.label}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Administra el ciclo mensual: empleados activos, novedades, calculo de roles, cierre,
              archivo bancario y anexos para entidades publicas del Ecuador.
            </p>
          </div>
          <div className={`rounded-md border px-5 py-4 text-center ${status.tone}`}>
            <p className="text-sm font-medium">Estado del periodo</p>
            <p className="mt-1 text-xl font-semibold">{isLoading ? '...' : status.label}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {isLoading ? 'Cargando estado operativo...' : status.next}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white" to="/dashboard/nomina/cerrar">
              <DollarSign className="h-4 w-4" />
              Calcular nomina
            </Link>
            <Link className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:border-teal-300" to="/dashboard/empleados/nuevo">
              <UserPlus className="h-4 w-4" />
              Nuevo empleado
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <Link className="soft-panel p-5 transition hover:border-teal-300 hover:shadow-md" key={card.label} to={card.href}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{isLoading ? '...' : card.value}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">{isLoading ? '' : card.detail}</p>
              </div>
              <span className={`rounded-md p-3 ${card.tone}`}>
                <card.icon size={24} />
              </span>
            </div>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="soft-panel p-6">
          <div className="mb-4 flex items-center gap-3">
            <CalendarClock className="h-5 w-5 text-teal-700" />
            <h2 className="text-lg font-semibold text-slate-950">Ciclo mensual de nomina</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Step
              done={safeCount(activeEmployees) > 0}
              icon={Users}
              title="1. Base de empleados"
              description="Altas, datos contractuales, sueldo, cargo, fecha de ingreso y estado laboral."
              href="/dashboard/empleados"
              action={safeCount(activeEmployees) > 0 ? 'Revisar empleados' : 'Registrar empleados'}
            />
            <Step
              done={safeCount(data?.novedades) === 0}
              icon={ClipboardCheck}
              title="2. Novedades y asistencia"
              description="Permisos, atrasos, horas extras y soportes antes de calcular el periodo."
              href="/dashboard/asistencia/novedades"
              action={safeCount(data?.novedades) === 0 ? 'Sin pendientes' : 'Resolver novedades'}
            />
            <Step
              done={safeCount(nominas) > 0}
              icon={DollarSign}
              title="3. Calculo de roles"
              description="Genera ingresos, descuentos, IESS, impuesto a la renta y neto a pagar."
              href="/dashboard/nomina/cerrar"
              action={safeCount(nominas) > 0 ? 'Recalcular o revisar' : 'Calcular periodo'}
            />
            <Step
              done={safeCount(nominas) > 0 && rolesClosed === safeCount(nominas)}
              icon={LockKeyhole}
              title="4. Cierre y emision"
              description="Cierra la nomina, descarga roles, archivo bancario y reportes RDEP/IESS."
              href="/dashboard/nomina/roles"
              action={rolesClosed ? 'Ver roles cerrados' : 'Preparar cierre'}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="soft-panel p-6">
            <div className="mb-4 flex items-center gap-3">
              <Settings2 className="h-5 w-5 text-teal-700" />
              <h2 className="text-lg font-semibold text-slate-950">Preparacion legal</h2>
            </div>
            <div className="rounded-md bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-700">Parametrizacion validada</span>
                <span className="font-semibold text-teal-800">{isLoading ? '...' : `${completion}%`}</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white">
                <div className="h-2 rounded-full bg-teal-700" style={{ width: `${completion}%` }} />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {isLoading ? (
                <p className="text-sm text-slate-500">Cargando validaciones...</p>
              ) : missingQa.length === 0 ? (
                <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Configuracion minima lista para operar.</p>
              ) : (
                missingQa.slice(0, 3).map((item) => (
                  <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900" key={item.code}>
                    {item.label}
                  </p>
                ))
              )}
            </div>
            <Link className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:border-teal-300" to="/dashboard/configuracion/parametrizacion">
              <Settings2 className="h-4 w-4" />
              Parametrizar
            </Link>
          </div>

          <div className="soft-panel p-6">
            <div className="mb-4 flex items-center gap-3">
              <Landmark className="h-5 w-5 text-teal-700" />
              <h2 className="text-lg font-semibold text-slate-950">Salidas de nomina</h2>
            </div>
            <div className="grid gap-2">
              <Link className="rounded-md bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-teal-50 hover:text-teal-800" to="/dashboard/nomina/roles">
                Roles de pago por empleado
              </Link>
              <Link className="rounded-md bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-teal-50 hover:text-teal-800" to="/dashboard/nomina/reportes">
                RDEP, IESS y archivo bancario
              </Link>
              <Link className="rounded-md bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-teal-50 hover:text-teal-800" to="/dashboard/documentos/contratos">
                Contratos y documentos laborales
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="soft-panel p-6">
          <div className="mb-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-teal-700" />
            <h2 className="text-lg font-semibold text-slate-950">Estado comercial</h2>
          </div>
          <p className="text-sm text-slate-500">Plan actual</p>
          <p className="mt-1 font-semibold text-slate-950">{isLoading ? '...' : subscriptionLabel}</p>
          <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-700" />
              <p className="text-sm leading-6 text-amber-900">
                Valida parametros legales vigentes antes de usar calculos, anexos o archivos oficiales en produccion.
              </p>
            </div>
          </div>
        </div>

        {canAudit && (
          <div className="soft-panel p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-teal-700" />
                <h2 className="text-lg font-semibold text-slate-950">Trazabilidad reciente</h2>
              </div>
              <Link className="text-sm font-semibold text-teal-700 hover:text-teal-900" to="/dashboard/auditoria">Ver auditoria</Link>
            </div>
            {isLoading ? (
              <p className="text-sm text-slate-500">Cargando auditoria...</p>
            ) : safeCount(data?.auditLogs) === 0 ? (
              <p className="text-sm text-slate-500">No hay eventos recientes visibles para este rol.</p>
            ) : (
              <div className="grid gap-2">
                {data.auditLogs.map((log) => (
                  <div className="rounded-md bg-slate-50 px-4 py-3 text-sm" key={log.id}>
                    <span className="font-semibold text-slate-950">{log.accion || log.action}</span>
                    <span className="text-slate-500"> - {log.entidad || log.entity || 'sin entidad'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default Dashboard;
