import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Building2,
  CalendarClock,
  CheckCircle2,
  Copy,
  FileCode2,
  FileSpreadsheet,
  Gauge,
  KeyRound,
  Landmark,
  LockKeyhole,
  MapPinned,
  MessageSquare,
  Plus,
  ShieldCheck,
  Smartphone,
  Upload,
  UserCog,
  Workflow,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchConfigurationSummary } from '../../services/configurationApi';
import { fetchPlanCapabilities } from '../../services/beneficiosApi';
import { createApiClient, fetchApiClients } from '../../services/integracionesApi';
import { extractApiError } from '../../services/publicApi';

const API_SCOPE_OPTIONS = [
  { value: 'employees.read', label: 'Empleados' },
  { value: 'attendance.write', label: 'Asistencia' },
  { value: 'novelties.write', label: 'Novedades' },
  { value: 'payroll.read', label: 'Nómina' },
];

function scopeLabel(value) {
  return API_SCOPE_OPTIONS.find((option) => option.value === value)?.label || value;
}

const MODULES = [
  {
    key: 'empresa',
    title: 'Datos de empresa',
    icon: Building2,
    owner: 'Empresa',
    href: '/dashboard/configuracion/parametrizacion',
    action: 'Configurar empresa',
    ready: ({ counts }) => counts.empresa > 0,
    activeDescription: 'Registro operativo del empleador disponible para contratos, roles, RDEP y archivos oficiales.',
    pendingDescription: 'Registra RUC, razón social, representante, dirección y correo administrativo en parametrización.',
  },
  {
    key: 'legal',
    title: 'Parámetros legales',
    icon: Landmark,
    owner: 'Empresa',
    href: '/dashboard/configuracion/parametrizacion',
    action: 'Cargar parámetros',
    ready: ({ counts }) => counts.legalParameters > 0,
    activeDescription: 'Hay parámetros legales versionados; se deben revisar antes de cálculos productivos.',
    pendingDescription: 'Carga SBU, IESS, décimos, fondo de reserva, vacaciones y tabla IR desde el botón obligatorio.',
  },
  {
    key: 'bancos',
    title: 'Banco y archivo plano',
    icon: Banknote,
    owner: 'Empresa',
    href: '/dashboard/configuracion/parametrizacion',
    action: 'Configurar banco',
    ready: ({ counts }) => counts.bankProfiles > 0,
    activeDescription: 'Perfil bancario registrado para preparar pagos y archivos bancarios.',
    pendingDescription: 'Configura al menos un banco y su estructura base para preparar pagos.',
  },
  {
    key: 'usuarios',
    title: 'Usuarios y roles',
    icon: UserCog,
    owner: 'Empresa',
    href: '/dashboard/configuracion/parametrizacion',
    action: 'Configurar accesos',
    ready: ({ counts }) => counts.usuarios > 0,
    activeDescription: 'Matriz inicial de usuarios y roles registrada para trazabilidad operativa.',
    pendingDescription: 'Define administrador, RRHH, supervisor y accesos de empleado según responsabilidad.',
  },
  {
    key: 'rdep',
    title: 'Reportes para entidades',
    icon: FileCode2,
    owner: 'Empresa',
    href: '/dashboard/nomina/reportes',
    action: 'Abrir reportes',
    ready: () => false,
    blocked: true,
    activeDescription: '',
    pendingDescription: 'Completa y revisa los datos antes de generar reportes para entidades.',
  },
  {
    key: 'superadmin',
    title: 'Planes y soporte',
    icon: ShieldCheck,
    owner: 'Soporte',
    href: '/dashboard/planes',
    action: 'Gestionar planes',
    ready: () => true,
    gatedByRole: 'superadmin',
    activeDescription: 'Planes, contratos e incidencias se supervisan desde un panel administrativo.',
    pendingDescription: 'Requiere permisos administrativos para ver planes, contratos e incidencias.',
  },
  {
    key: 'api',
    title: 'Integraciones',
    icon: KeyRound,
    owner: 'Soporte',
    href: '#api-v1-clientes',
    action: 'Gestionar clientes',
    ready: ({ counts }) => counts.apiClients > 0,
    gatedByRoles: ['owner', 'superadmin'],
    activeDescription: 'Integraciones externas activas con permisos definidos y trazabilidad.',
    pendingDescription: 'Crea al menos una credencial de integración para conectar sistemas externos.',
  },
  {
    key: 'asistencia',
    title: 'Asistencia',
    icon: CalendarClock,
    owner: 'Empresa',
    href: '/dashboard/asistencia/reporte',
    action: 'Revisar asistencia',
    ready: ({ counts }) => counts.workZones > 0 && counts.workShifts > 0,
    activeDescription: 'Zonas y jornadas están configuradas para registrar asistencia.',
    pendingDescription: 'Configura zonas de marcación y jornadas antes de usar asistencia productiva.',
  },
  {
    key: 'app_movil',
    title: 'App empleados',
    icon: Smartphone,
    owner: 'Empresa',
    href: '/dashboard/empleados',
    action: 'Gestionar invitaciones',
    ready: ({ counts }) => counts.usuarios > 0,
    capability: 'mobileApp',
    capabilityLabel: 'app movil',
    activeDescription: 'La empresa tiene habilitado el canal de app movil para empleados, permisos, marcaciones y autoservicio.',
    pendingDescription: 'Habilita usuarios y enlaces de app antes de activar al equipo operativo.',
  },
  {
    key: 'rutas_campo',
    title: 'Rutas de campo',
    icon: MapPinned,
    owner: 'Empresa',
    href: '/dashboard/asistencia/rutas',
    action: 'Abrir rutas',
    ready: ({ counts }) => counts.workZones > 0,
    capability: 'fieldRoutes',
    capabilityLabel: 'rutas de campo',
    activeDescription: 'El plan permite gestionar sitios, rutas diarias, visitas y excepciones GPS.',
    pendingDescription: 'Configura zonas de marcacion y sitios para operar rutas de campo.',
  },
  {
    key: 'apertura',
    title: 'Periodo y novedades',
    icon: Workflow,
    owner: 'Empresa',
    href: '/dashboard/nomina/cerrar',
    action: 'Abrir periodo',
    ready: () => true,
    activeDescription: 'Periodo mensual, novedades, cálculo y cierre se operan desde pantallas visibles.',
    pendingDescription: 'Abre el periodo antes de cargar novedades y calcular roles.',
  },
  {
    key: 'carga',
    title: 'Carga masiva de empleados',
    icon: Upload,
    owner: 'Empresa',
    href: '/dashboard/empleados',
    action: 'Importar empleados',
    ready: () => true,
    activeDescription: 'Flujo visible con plantilla, carga CSV/TSV, prevalidación, errores por fila, confirmación y lote auditable.',
    pendingDescription: 'Carga empleados con prevalidación antes de confirmar el lote.',
  },
  {
    key: 'reportes',
    title: 'Reportes PDF y Excel',
    icon: FileSpreadsheet,
    owner: 'Empresa',
    href: '/dashboard/nomina/reportes',
    action: 'Generar reportes',
    ready: ({ counts }) => counts.legalParameters > 0,
    activeDescription: 'Reportes institucionales visibles para revisar y descargar.',
    pendingDescription: 'Completa parámetros legales antes de generar reportes oficiales o bancarios.',
  },
  {
    key: 'dashboard',
    title: 'Dashboard y headcount',
    icon: Gauge,
    owner: 'Empresa',
    href: '/dashboard',
    action: 'Ver dashboard',
    ready: ({ completion }) => completion > 0,
    activeDescription: 'Dashboard toma datos reales de empleados, nómina, asistencia, planes y configuración.',
    pendingDescription: 'Completa la parametrización mínima para que el dashboard tenga señales operativas.',
  },
  {
    key: 'mensajes',
    title: 'Mensajes y ayuda',
    icon: MessageSquare,
    owner: 'Soporte',
    href: null,
    action: 'Revisar mensajes',
    ready: () => false,
    blocked: true,
    activeDescription: '',
    pendingDescription: 'Los mensajes deben explicar qué ocurrió y qué acción tomar.',
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
  if (module.capability && role !== 'superadmin' && !context.capabilities?.allowed?.[module.capability]) {
    return {
      label: 'Bloqueado por plan',
      tone: 'border-amber-200 bg-amber-50 text-amber-900',
      icon: LockKeyhole,
      description: `El plan actual no incluye ${module.capabilityLabel || 'esta funcionalidad'}. Activalo desde Gestion de planes.`,
    };
  }

  if (module.key === 'api' && role === 'owner' && !context.capabilities?.allowed?.apiAccess) {
    return {
      label: 'Bloqueado por plan',
      tone: 'border-amber-200 bg-amber-50 text-amber-900',
      icon: LockKeyhole,
      description: 'El plan actual no incluye acceso a la API externa. Activalo desde la consola fundador.',
    };
  }

  if (module.gatedByRoles && !module.gatedByRoles.includes(role)) {
    return {
      label: 'Restringido por rol',
      tone: 'border-slate-200 bg-slate-50 text-slate-700',
      icon: LockKeyhole,
      description: module.pendingDescription,
    };
  }

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
      label: 'Requiere revision',
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

function ApiClientsPanel({ clients = [], createMutation, canManage, disabledReason = '' }) {
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState(['employees.read']);
  const [createdKey, setCreatedKey] = useState(null);
  const [copied, setCopied] = useState(false);

  const toggleScope = (scope) => {
    setScopes((current) => (
      current.includes(scope)
        ? current.filter((item) => item !== scope)
        : [...current, scope]
    ));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await createMutation.mutateAsync({ name, scopes });
      setCreatedKey(response?.apiKey || null);
      setCopied(false);
      setName('');
      setScopes(['employees.read']);
    } catch {
      setCreatedKey(null);
    }
  };

  const copyKey = async () => {
    if (!createdKey || !navigator.clipboard) return;
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" id="api-v1-clientes">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-teal-700" />
            <h2 className="text-lg font-semibold text-slate-950">Integraciones externas</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Crea credenciales para sistemas externos autorizados sin exponer usuarios finales. Cada credencial queda
            limitada por permisos, volumen de uso y trazabilidad.
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
          Disponible
        </span>
      </div>

      {!canManage && (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {disabledReason || 'Esta sección requiere permisos administrativos para administrar integraciones.'}
        </div>
      )}

      {canManage && (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <form className="rounded-md border border-slate-200 p-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-semibold text-slate-800" htmlFor="api-client-name">
              Nombre del cliente
            </label>
            <input
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              id="api-client-name"
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              placeholder="ERP interno, app asistencia, BI nómina"
              value={name}
            />

            <fieldset className="mt-4">
              <legend className="text-sm font-semibold text-slate-800">Permisos permitidos</legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {API_SCOPE_OPTIONS.map((option) => (
                  <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700" key={option.value}>
                    <input
                      checked={scopes.includes(option.value)}
                      className="h-4 w-4 accent-teal-700"
                      onChange={() => toggleScope(option.value)}
                      type="checkbox"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {createMutation.isError && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
                {extractApiError(createMutation.error, 'No pudimos crear la integración. Revisa los datos e intenta nuevamente.')}
              </div>
            )}

            <button
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!name.trim() || scopes.length === 0 || createMutation.isPending}
              type="submit"
            >
              <Plus className="h-4 w-4" />
              {createMutation.isPending ? 'Creando integración' : 'Crear integración'}
            </button>
          </form>

          <div className="rounded-md border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Clientes activos</h3>
            <div className="mt-3 space-y-2">
              {clients.length === 0 && (
                <p className="rounded-md bg-slate-50 px-3 py-3 text-sm text-slate-600">
                  Todavía no hay integraciones externas para esta empresa.
                </p>
              )}
              {clients.map((client) => (
                <div className="rounded-md bg-slate-50 px-3 py-3" key={client.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-900">{client.name}</p>
                    <span className="text-xs font-semibold text-teal-700">{client.active ? 'activo' : 'inactivo'}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Uso permitido: {client.rate_limit_per_minute || 60}/min</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(client.scopes || []).map((scope) => (
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600" key={scope}>{scopeLabel(scope)}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {createdKey && (
        <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Clave de integración creada. Se muestra una sola vez.</p>
          <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center">
            <code className="min-h-10 flex-1 overflow-auto rounded-md bg-white px-3 py-2 text-sm text-slate-800">{createdKey}</code>
            <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white" onClick={copyKey} type="button">
              <Copy className="h-4 w-4" />
              {copied ? 'Copiada' : 'Copiar'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function OperacionIntegral() {
  const { token, usuario } = useAuth();
  const queryClient = useQueryClient();

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

  const canManageApi = ['owner', 'superadmin'].includes(usuario?.rol);
  const {
    data: planCapabilities,
  } = useQuery({
    queryKey: ['plan-capabilities'],
    queryFn: fetchPlanCapabilities,
    enabled: Boolean(token) && usuario?.rol !== 'superadmin',
    retry: false,
  });
  const apiAccessAllowed = usuario?.rol === 'superadmin' || Boolean(planCapabilities?.allowed?.apiAccess);
  const {
    data: apiClients = [],
    error: apiClientsError,
    isError: isApiClientsError,
  } = useQuery({
    queryKey: ['api-clients'],
    queryFn: fetchApiClients,
    enabled: Boolean(token) && canManageApi && apiAccessAllowed,
    retry: false,
  });

  const createApiClientMutation = useMutation({
    mutationFn: createApiClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-clients'] });
    },
  });

  const counts = useMemo(() => ({
    ...buildCounts(summary),
    apiClients: apiClients.length,
  }), [summary, apiClients.length]);
  const completion = summary?.onboarding?.completionPercent || 0;
  const context = { counts, completion, capabilities: planCapabilities };
  const visibleModules = MODULES.filter((module) => {
    if (module.gatedByRole && module.gatedByRole !== usuario?.rol) return false;
    return true;
  });
  const enrichedModules = visibleModules.map((module) => ({
    ...module,
    state: moduleState(module, context, usuario?.rol),
  }));
  const operativeCount = enrichedModules.filter((module) => module.state.label === 'Operativo visible').length;
  const blockedCount = enrichedModules.filter((module) => ['Bloqueado por plan', 'Requiere revision'].includes(module.state.label)).length;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">Centro de trabajo</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Operaciones de SKNOMINA</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              Accede a las configuraciones y flujos que sostienen empleados, asistencia, nómina,
              reportes e integraciones.
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
              <p className="text-xs font-semibold uppercase text-teal-700">Configuración</p>
              <p className="mt-1 text-2xl font-semibold text-teal-900">{isLoading ? '...' : `${completion}%`}</p>
            </div>
          </div>
        </div>
      </section>

      {isError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {extractApiError(error, 'No pudimos cargar el estado operativo. Revisa la sesión e intenta nuevamente.')}
        </div>
      )}

      <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Estado de configuración</h2>
          <div className="mt-4 space-y-3">
            <ReadinessBar value={completion} />
            <div className="grid gap-2 text-sm">
              <p className="flex justify-between rounded-md bg-slate-50 px-3 py-2"><span>Empresa</span><strong>{counts.empresa}</strong></p>
              <p className="flex justify-between rounded-md bg-slate-50 px-3 py-2"><span>Parámetros legales</span><strong>{counts.legalParameters}</strong></p>
              <p className="flex justify-between rounded-md bg-slate-50 px-3 py-2"><span>Bancos</span><strong>{counts.bankProfiles}</strong></p>
              <p className="flex justify-between rounded-md bg-slate-50 px-3 py-2"><span>Usuarios y roles</span><strong>{counts.usuarios}</strong></p>
              <p className="flex justify-between rounded-md bg-slate-50 px-3 py-2"><span>Integraciones</span><strong>{counts.apiClients}</strong></p>
              <p className="flex justify-between rounded-md bg-slate-50 px-3 py-2"><span>Zonas / jornadas</span><strong>{counts.workZones}/{counts.workShifts}</strong></p>
            </div>
          </div>
        </aside>

        <div className="grid gap-4 lg:grid-cols-2">
          {enrichedModules.map((module) => {
            const Icon = module.icon;
            const StateIcon = module.state.icon;
            const actionDisabled = !module.href
              || (module.gatedByRole && module.gatedByRole !== usuario?.rol)
              || (module.gatedByRoles && !module.gatedByRoles.includes(usuario?.rol))
              || module.state.label === 'Bloqueado por plan';

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
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Flujo operativo</span>
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

      {isApiClientsError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {extractApiError(apiClientsError, 'No pudimos cargar los clientes API. Revisa la sesión e intenta nuevamente.')}
        </div>
      )}

      <ApiClientsPanel
        clients={apiClients}
        createMutation={createApiClientMutation}
        canManage={canManageApi && apiAccessAllowed}
        disabledReason={canManageApi && !apiAccessAllowed ? 'El plan actual no incluye acceso a la API externa.' : ''}
      />
    </div>
  );
}

export default OperacionIntegral;
