import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Building2,
  CalendarClock,
  CheckCircle2,
  FileCode2,
  FileSpreadsheet,
  Gauge,
  KeyRound,
  Landmark,
  LockKeyhole,
  MessageSquare,
  ShieldCheck,
  Upload,
  UserCog,
  Workflow,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchConfigurationSummary } from '../../services/configurationApi';
import { extractApiError } from '../../services/publicApi';

const MODULES = [
  {
    key: 'empresa',
    title: 'Datos de empresa',
    icon: Building2,
    owner: 'OWNER',
    phase: 'DCF26-02',
    href: '/dashboard/configuracion/parametrizacion',
    action: 'Configurar empresa',
    ready: ({ counts }) => counts.empresa > 0,
    activeDescription: 'Registro operativo del empleador disponible para contratos, roles, RDEP y archivos oficiales.',
    pendingDescription: 'Registra RUC, razon social, representante, direccion y correo administrativo en parametrizacion.',
  },
  {
    key: 'legal',
    title: 'Parametros legales',
    icon: Landmark,
    owner: 'OWNER',
    phase: 'DCF26-02',
    href: '/dashboard/configuracion/parametrizacion',
    action: 'Cargar parametros',
    ready: ({ counts }) => counts.legalParameters > 0,
    activeDescription: 'Hay parametros legales versionados; se deben revisar antes de calculos productivos.',
    pendingDescription: 'Carga SBU, IESS, decimos, fondo de reserva, vacaciones y tabla IR desde el boton obligatorio.',
  },
  {
    key: 'bancos',
    title: 'Banco y archivo plano',
    icon: Banknote,
    owner: 'OWNER',
    phase: 'DCF26-03',
    href: '/dashboard/configuracion/parametrizacion',
    action: 'Configurar banco',
    ready: ({ counts }) => counts.bankProfiles > 0,
    activeDescription: 'Perfil bancario registrado; DCF26-03 conectara este perfil al generador de archivo.',
    pendingDescription: 'Configura al menos un banco y su estructura base. La conexion al generador se cierra en DCF26-03.',
  },
  {
    key: 'usuarios',
    title: 'Usuarios y roles',
    icon: UserCog,
    owner: 'OWNER',
    phase: 'DCF26-02',
    href: '/dashboard/configuracion/parametrizacion',
    action: 'Configurar accesos',
    ready: ({ counts }) => counts.usuarios > 0,
    activeDescription: 'Matriz inicial de usuarios y roles registrada para trazabilidad operativa.',
    pendingDescription: 'Define OWNER, administrador RRHH, supervisor, acceso empleado y segregacion de funciones.',
  },
  {
    key: 'rdep',
    title: 'RDEP SRI',
    icon: FileCode2,
    owner: 'OWNER',
    phase: 'DCF26-04',
    href: '/dashboard/nomina/reportes',
    action: 'Abrir reportes',
    ready: () => false,
    blocked: true,
    activeDescription: '',
    pendingDescription: 'Generacion visible existe, pero el cierre productivo requiere precheck y validacion XSD runtime.',
  },
  {
    key: 'superadmin',
    title: 'SUPERADMIN',
    icon: ShieldCheck,
    owner: 'SUPERADMIN',
    phase: 'DCF26-09',
    href: '/dashboard/planes',
    action: 'Gestionar planes',
    ready: () => false,
    gatedByRole: 'superadmin',
    activeDescription: '',
    pendingDescription: 'Planes tienen modulo real. Owners, contratos e incidencias se consolidan sin catalogos paralelos en DCF26-09.',
  },
  {
    key: 'api',
    title: 'API de integracion',
    icon: KeyRound,
    owner: 'SUPERADMIN',
    phase: 'DCF26-06',
    href: null,
    action: 'Bloqueada hasta API v1',
    ready: () => false,
    blocked: true,
    activeDescription: '',
    pendingDescription: 'Contrato existe, pero no se expone `/api/v1` hasta implementar autenticacion, scopes, rate limits e idempotencia.',
  },
  {
    key: 'asistencia',
    title: 'Asistencia manual y APP',
    icon: CalendarClock,
    owner: 'OWNER',
    phase: 'DCF26-10',
    href: '/dashboard/asistencia/reporte',
    action: 'Revisar asistencia',
    ready: ({ counts }) => counts.workZones > 0 && counts.workShifts > 0,
    activeDescription: 'Zonas y jornadas estan configuradas; la app movil se profundiza en DCF26-10.',
    pendingDescription: 'Configura zonas de marcacion y jornadas antes de usar asistencia productiva.',
  },
  {
    key: 'apertura',
    title: 'Apertura de mes y lotes',
    icon: Workflow,
    owner: 'OWNER',
    phase: 'DCF26-08',
    href: '/dashboard/nomina/cerrar',
    action: 'Ir al periodo',
    ready: () => false,
    blocked: true,
    activeDescription: '',
    pendingDescription: 'Hoy existe calculo/cierre; la apertura formal de periodo y lotes idempotentes se implementan en DCF26-08.',
  },
  {
    key: 'carga',
    title: 'Carga masiva de empleados',
    icon: Upload,
    owner: 'OWNER',
    phase: 'DCF26-07',
    href: '/dashboard/empleados',
    action: 'Ver empleados',
    ready: () => false,
    blocked: true,
    activeDescription: '',
    pendingDescription: 'Altas individuales existen. Importacion con plantilla, preview, errores y rollback se implementa en DCF26-07.',
  },
  {
    key: 'reportes',
    title: 'Reportes PDF y Excel',
    icon: FileSpreadsheet,
    owner: 'OWNER',
    phase: 'DCF26-11',
    href: '/dashboard/nomina/reportes',
    action: 'Generar reportes',
    ready: ({ counts }) => counts.legalParameters > 0,
    activeDescription: 'Reportes institucionales visibles; DCF26-04/11 completan validaciones y mejor experiencia.',
    pendingDescription: 'Completa parametros legales antes de generar reportes oficiales o bancarios.',
  },
  {
    key: 'dashboard',
    title: 'Dashboard y headcount',
    icon: Gauge,
    owner: 'OWNER',
    phase: 'DCF26-02',
    href: '/dashboard',
    action: 'Ver dashboard',
    ready: ({ completion }) => completion > 0,
    activeDescription: 'Dashboard toma datos reales de empleados, nomina, asistencia, planes y configuracion.',
    pendingDescription: 'Completa la parametrizacion minima para que el dashboard tenga senales operativas.',
  },
  {
    key: 'mensajes',
    title: 'Mensajes claros',
    icon: MessageSquare,
    owner: 'PLATAFORMA',
    phase: 'DCF26-11',
    href: null,
    action: 'Pendiente DCF26-11',
    ready: () => false,
    blocked: true,
    activeDescription: '',
    pendingDescription: 'Se retiraran alerts y se expondran estados accionables en DCF26-11.',
  },
];

function countCatalog(summary, catalogType) {
  return (summary?.resources?.catalogs || []).filter((record) => record.catalog_type === catalogType).length;
}

function buildCounts(summary) {
  return {
    empresa: countCatalog(summary, 'empresa_operativa'),
    usuarios: countCatalog(summary, 'usuarios_roles'),
    legalParameters: summary?.resources?.legalParameters?.length || 0,
    bankProfiles: summary?.resources?.bankProfiles?.length || 0,
    organizationUnits: summary?.resources?.organizationUnits?.length || 0,
    workZones: summary?.resources?.workZones?.length || 0,
    workShifts: summary?.resources?.workShifts?.length || 0,
    noveltyTypes: summary?.resources?.noveltyTypes?.length || 0,
  };
}

function moduleState(module, context, role) {
  if (module.gatedByRole && module.gatedByRole !== role) {
    return {
      label: 'Restringido por rol',
      tone: 'border-slate-200 bg-slate-50 text-slate-700',
      icon: LockKeyhole,
      description: module.pendingDescription,
    };
  }

  if (module.blocked) {
    return {
      label: `Pendiente ${module.phase}`,
      tone: 'border-amber-200 bg-amber-50 text-amber-900',
      icon: AlertTriangle,
      description: module.pendingDescription,
    };
  }

  if (module.ready(context)) {
    return {
      label: 'Operativo visible',
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      icon: CheckCircle2,
      description: module.activeDescription,
    };
  }

  return {
    label: 'Requiere accion',
    tone: 'border-blue-200 bg-blue-50 text-blue-800',
    icon: ArrowRight,
    description: module.pendingDescription,
  };
}

function ReadinessBar({ value }) {
  return (
    <div className="rounded-md bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-700">Avance funcional verificado</span>
        <span className="text-lg font-semibold text-teal-800">{value}%</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-white">
        <div className="h-2 rounded-full bg-teal-700" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function OperacionIntegral() {
  const { token, usuario } = useAuth();

  const {
    data: summary,
    error,
    isError,
    isLoading,
  } = useQuery({
    queryKey: ['configuration-summary'],
    queryFn: () => fetchConfigurationSummary(token),
    enabled: Boolean(token),
    retry: false,
  });

  const counts = useMemo(() => buildCounts(summary), [summary]);
  const completion = summary?.onboarding?.completionPercent || 0;
  const context = { counts, completion };
  const enrichedModules = MODULES.map((module) => ({
    ...module,
    state: moduleState(module, context, usuario?.rol),
  }));
  const operativeCount = enrichedModules.filter((module) => module.state.label === 'Operativo visible').length;
  const blockedCount = enrichedModules.filter((module) => module.state.label.startsWith('Pendiente')).length;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">DCF26 cierre funcional</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Centro de operacion integral</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              Esta vista ya no guarda configuraciones genericas. Cada modulo abre un flujo real existente
              o muestra el bloqueo de fase que impide declararlo operativo.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[520px]">
            <div className="rounded-md bg-emerald-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-emerald-700">Operativos</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-900">{isLoading ? '...' : operativeCount}</p>
            </div>
            <div className="rounded-md bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-amber-700">Bloqueados</p>
              <p className="mt-1 text-2xl font-semibold text-amber-900">{isLoading ? '...' : blockedCount}</p>
            </div>
            <div className="rounded-md bg-teal-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-teal-700">Onboarding</p>
              <p className="mt-1 text-2xl font-semibold text-teal-900">{isLoading ? '...' : `${completion}%`}</p>
            </div>
          </div>
        </div>
      </section>

      {isError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {extractApiError(error, 'No pudimos cargar el estado operativo. Revisa la sesion e intenta nuevamente.')}
        </div>
      )}

      <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Checks que alimentan la operacion</h2>
          <div className="mt-4 space-y-3">
            <ReadinessBar value={completion} />
            <div className="grid gap-2 text-sm">
              <p className="flex justify-between rounded-md bg-slate-50 px-3 py-2"><span>Empresa</span><strong>{counts.empresa}</strong></p>
              <p className="flex justify-between rounded-md bg-slate-50 px-3 py-2"><span>Parametros legales</span><strong>{counts.legalParameters}</strong></p>
              <p className="flex justify-between rounded-md bg-slate-50 px-3 py-2"><span>Bancos</span><strong>{counts.bankProfiles}</strong></p>
              <p className="flex justify-between rounded-md bg-slate-50 px-3 py-2"><span>Usuarios y roles</span><strong>{counts.usuarios}</strong></p>
              <p className="flex justify-between rounded-md bg-slate-50 px-3 py-2"><span>Zonas / jornadas</span><strong>{counts.workZones}/{counts.workShifts}</strong></p>
            </div>
          </div>
        </aside>

        <div className="grid gap-4 lg:grid-cols-2">
          {enrichedModules.map((module) => {
            const Icon = module.icon;
            const StateIcon = module.state.icon;
            const actionDisabled = !module.href || (module.gatedByRole && module.gatedByRole !== usuario?.rol);

            return (
              <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={module.key}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="rounded-md bg-teal-50 p-2 text-teal-700">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-950">{module.title}</h3>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{module.owner}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{module.state.description}</p>
                    </div>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${module.state.tone}`}>
                    <StateIcon className="h-3.5 w-3.5" />
                    {module.state.label}
                  </span>
                </div>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{module.phase}</span>
                  {actionDisabled ? (
                    <span className="inline-flex min-h-10 items-center rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-500">
                      {module.action}
                    </span>
                  ) : (
                    <Link className="inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white" to={module.href}>
                      {module.action}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default OperacionIntegral;
