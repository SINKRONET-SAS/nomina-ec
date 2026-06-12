// ============================================================
// Nomina-Ec - Dashboard operativo
// ============================================================
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  DollarSign,
  FileText,
  ListChecks,
  Settings2,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authenticatedApi } from '../services/authenticatedApi';

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

function formatMoney(value) {
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

async function loadDashboardData(role) {
  const [
    empleadosResult,
    novedadesResult,
    marcacionesResult,
    configuracionResult,
    suscripcionResult,
    auditoriaResult,
  ] = await Promise.all([
    optionalGet('/empleados'),
    optionalGet('/novedades/pendientes'),
    optionalGet('/marcaciones/hoy'),
    optionalGet('/configuracion/resumen'),
    optionalGet('/pagos/status'),
    ['owner', 'superadmin'].includes(role) ? optionalGet('/auditoria?limit=5') : Promise.resolve({ ok: false }),
  ]);

  const empleados = pickArray(empleadosResult.data, ['empleados', 'items']);
  const novedades = pickArray(novedadesResult.data, ['novedades', 'items']);
  const marcaciones = pickArray(marcacionesResult.data, ['marcaciones', 'items']);
  const auditLogs = pickArray(auditoriaResult.data, ['auditLogs', 'items']);
  const resources = configuracionResult.data?.data?.resources || {};
  const onboarding = configuracionResult.data?.data?.onboarding || {};
  const subscription = suscripcionResult.data?.data || null;

  return {
    empleados,
    novedades,
    marcaciones,
    auditLogs,
    resources,
    onboarding,
    subscription,
    health: {
      empleados: empleadosResult.ok,
      novedades: novedadesResult.ok,
      marcaciones: marcacionesResult.ok,
      configuracion: configuracionResult.ok,
      suscripcion: suscripcionResult.ok,
      auditoria: auditoriaResult.ok,
    },
  };
}

function Dashboard() {
  const { usuario } = useAuth();
  const role = usuario?.rol;
  const canManagePayroll = ['owner', 'admin_rrhh'].includes(role);
  const canAudit = ['owner', 'superadmin'].includes(role);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-operativo', role],
    queryFn: () => loadDashboardData(role),
    enabled: Boolean(role),
    retry: false,
  });

  const nominaVisible = canManagePayroll;
  const configCount = Object.values(data?.resources || {}).reduce((total, value) => {
    return total + safeCount(value);
  }, 0);

  const cards = [
    {
      icon: Users,
      label: 'Empleados visibles',
      value: safeCount(data?.empleados),
      href: '/dashboard/empleados',
      tone: 'bg-blue-50 text-blue-700',
    },
    {
      icon: Clock,
      label: 'Novedades pendientes',
      value: safeCount(data?.novedades),
      href: '/dashboard/asistencia/novedades',
      tone: 'bg-amber-50 text-amber-700',
    },
    {
      icon: ClipboardCheck,
      label: 'Marcaciones hoy',
      value: safeCount(data?.marcaciones),
      href: '/dashboard/asistencia/reporte',
      tone: 'bg-cyan-50 text-cyan-700',
    },
    {
      icon: Settings2,
      label: 'Registros parametrizados',
      value: configCount,
      href: '/dashboard/configuracion/parametrizacion',
      tone: 'bg-teal-50 text-teal-700',
    },
  ];

  const modules = [
    {
      title: 'Empleados',
      description: 'Alta, consulta y terminacion laboral usan el backend de empleados.',
      href: '/dashboard/empleados',
      icon: Users,
      enabled: ['owner', 'admin_rrhh', 'supervisor'].includes(role),
    },
    {
      title: 'Asistencia',
      description: 'Novedades pendientes, marcaciones del dia y reporte mensual ya tienen API.',
      href: '/dashboard/asistencia/novedades',
      icon: Clock,
      enabled: ['owner', 'admin_rrhh', 'supervisor'].includes(role),
    },
    {
      title: 'Nomina',
      description: 'Calculo mensual, cierre, roles de pago y reportes a entidades.',
      href: '/dashboard/nomina/cerrar',
      icon: DollarSign,
      enabled: nominaVisible,
    },
    {
      title: 'Documentos',
      description: 'Contratos, finiquitos y descargas de documentos laborales.',
      href: '/dashboard/documentos/contratos',
      icon: FileText,
      enabled: canManagePayroll,
    },
    {
      title: 'Planes y pagos',
      description: 'Suscripcion activa, PayPhone y planes comerciales publicados.',
      href: '/precios',
      icon: Banknote,
      enabled: ['owner', 'superadmin'].includes(role),
    },
    {
      title: 'Auditoria',
      description: 'Trazabilidad de acciones sensibles por tenant y usuario.',
      href: '/dashboard/auditoria',
      icon: ShieldCheck,
      enabled: canAudit,
    },
  ];

  const activeModules = modules.filter((module) => module.enabled);
  const completion = data?.onboarding?.completionPercent || 0;
  const subscriptionLabel = data?.subscription
    ? `${data.subscription.planNombre || data.subscription.planId} - ${data.subscription.estado}`
    : 'Sin suscripcion activa registrada';

  return (
    <div className="space-y-6">
      <section className="soft-panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">Consola operativa</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Todo lo que ya esta conectado</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Esta vista consume APIs reales del backend para que la funcionalidad no quede escondida:
              empleados, asistencia, nomina, parametrizacion, pagos y auditoria segun tu rol.
            </p>
          </div>
          <div className="rounded-md bg-teal-50 px-5 py-4 text-center">
            <p className="text-sm font-medium text-teal-900">Preparacion</p>
            <p className="text-3xl font-semibold text-teal-900">{isLoading ? '...' : `${completion}%`}</p>
          </div>
        </div>
        <div className="mt-5 h-2 rounded-full bg-slate-100">
          <div className="h-2 rounded-full bg-teal-700" style={{ width: `${completion}%` }} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link className="soft-panel p-5 transition hover:border-teal-300 hover:shadow-md" key={card.label} to={card.href}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{isLoading ? '...' : card.value}</p>
              </div>
              <span className={`rounded-md p-3 ${card.tone}`}>
                <card.icon size={24} />
              </span>
            </div>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="soft-panel p-6">
          <div className="mb-4 flex items-center gap-3">
            <ListChecks className="h-5 w-5 text-teal-700" />
            <h2 className="text-lg font-semibold text-slate-950">Modulos visibles por rol</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {activeModules.map((module) => (
              <Link className="rounded-md border border-slate-200 p-4 transition hover:border-teal-300 hover:bg-teal-50" key={module.title} to={module.href}>
                <div className="flex items-start gap-3">
                  <module.icon className="mt-0.5 h-5 w-5 text-teal-700" />
                  <div>
                    <h3 className="font-semibold text-slate-950">{module.title}</h3>
                    <p className="mt-1 text-sm leading-5 text-slate-600">{module.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

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
                IESS 2026 y revision profesional siguen bloqueando activacion productiva completa,
                pero la consola ya deja navegar la operacion disponible.
              </p>
            </div>
          </div>
        </div>
      </section>

      {canAudit && (
        <section className="soft-panel p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-950">Auditoria reciente</h2>
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
        </section>
      )}
    </div>
  );
}

export default Dashboard;
