// ============================================================
// SKNOMINA - Panel operativo de nomina
// ============================================================
import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
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
  Mail,
  Settings2,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authenticatedApi } from '../services/authenticatedApi';
import { confirmEmailVerification, extractApiError, requestEmailVerification } from '../services/publicApi';
import { currentPeriodEC, formatDateEC, formatDateTimeEC, todayISOEC } from '../utils/dateFormat';
import { hasRoleAccess } from '../utils/access';
import { money } from '../utils/money';

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
  const period = currentPeriodEC();
  return {
    year: period.anio,
    month: period.mes,
    label: `${monthNames[period.mes - 1]} ${period.anio}`,
    timeZone: period.timeZone,
  };
}

function canManageEmployees(user) {
  return hasRoleAccess(user, ['owner', 'admin_rrhh', 'supervisor']);
}

function canManagePayroll(user) {
  return hasRoleAccess(user, ['owner', 'admin_rrhh']);
}

function canManageConfiguration(user) {
  return hasRoleAccess(user, ['superadmin', 'owner', 'admin_rrhh']);
}

async function loadEmployeeDashboardData() {
  const period = getPeriod();
  const [
    profileResult,
    attendanceResult,
    routeResult,
    payrollResult,
    mobilizationResult,
  ] = await Promise.all([
    optionalGet('/mobile/me'),
    optionalGet('/mobile/asistencia/resumen'),
    optionalGet('/mobile/ruta/hoy'),
    optionalGet(`/mobile/nomina/${period.year}/${period.month}`),
    optionalGet('/movilizacion/mis-informes'),
  ]);

  return {
    period,
    employeeWorkspace: {
      profile: profileResult.data?.employee || attendanceResult.data?.employee || null,
      user: profileResult.data?.user || null,
      attendance: {
        marcaciones: pickArray(attendanceResult.data, ['marcaciones', 'items']),
        novedades: pickArray(attendanceResult.data, ['novedades', 'items']),
      },
      route: routeResult.data?.route || null,
      routeMessage: routeResult.data?.message || null,
      payroll: payrollResult.data?.nomina || null,
      movilizacion: pickArray(mobilizationResult.data, ['informes', 'items']),
      health: {
        profile: profileResult.ok,
        attendance: attendanceResult.ok,
        route: routeResult.ok,
        payroll: payrollResult.ok,
        movilizacion: mobilizationResult.ok,
      },
    },
  };
}

async function loadDashboardData(user) {
  const role = user?.rol;
  if (role === 'empleado') {
    return loadEmployeeDashboardData();
  }

  const period = getPeriod();
  const [
    empleadosResult,
    novedadesResult,
    marcacionesResult,
    configuracionResult,
    nominasResult,
    suscripcionResult,
    capacidadesResult,
    auditoriaResult,
  ] = await Promise.all([
    canManageEmployees(user) ? optionalGet('/empleados') : Promise.resolve({ ok: false }),
    canManageEmployees(user) ? optionalGet('/novedades/pendientes') : Promise.resolve({ ok: false }),
    canManageEmployees(user) ? optionalGet('/marcaciones/hoy') : Promise.resolve({ ok: false }),
    canManageConfiguration(user) ? optionalGet('/configuracion/resumen') : Promise.resolve({ ok: false }),
    canManagePayroll(user) ? optionalGet(`/nomina/${period.year}/${period.month}`) : Promise.resolve({ ok: false }),
    optionalGet('/pagos/status'),
    optionalGet('/pagos/capabilities'),
    hasRoleAccess(user, ['owner', 'superadmin']) ? optionalGet('/auditoria?limit=5') : Promise.resolve({ ok: false }),
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
  const capabilities = capacidadesResult.data?.data || null;

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
    capabilities,
    health: {
      empleados: empleadosResult.ok,
      novedades: novedadesResult.ok,
      marcaciones: marcacionesResult.ok,
      configuracion: configuracionResult.ok,
      nominas: nominasResult.ok,
      suscripcion: suscripcionResult.ok,
      capacidades: capacidadesResult.ok,
      auditoria: auditoriaResult.ok,
    },
  };
}

function payrollStatus(nominas) {
  if (!safeCount(nominas)) {
    return {
      label: 'Sin roles calculados',
      tone: 'bg-amber-50 text-amber-800 border-amber-200',
      next: 'Calcula la nómina del periodo para generar roles y valores de pago.',
    };
  }

  const closed = nominas.filter((row) => row.estado === 'cerrada' || row.cerrada).length;
  if (closed === nominas.length) {
    return {
      label: 'Nómina cerrada',
      tone: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      next: 'Puedes emitir roles, preparar pagos bancarios y generar anexos para entidades.',
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

function EmailVerificationBanner({ email }) {
  const [code, setCode] = useState('');
  const statusQuery = useQuery({
    queryKey: ['email-verification-status'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/auth/email-verification/status');
      return response.data?.data;
    },
    enabled: Boolean(email),
    retry: false,
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirmEmailVerification({ email, code }),
    onSuccess: () => statusQuery.refetch(),
  });
  const resendMutation = useMutation({
    mutationFn: () => requestEmailVerification(email),
  });

  if (statusQuery.data?.verified) return null;

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex gap-3">
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <h2 className="font-semibold text-amber-950">Verifica el correo administrativo</h2>
            <p className="mt-1 text-sm leading-6 text-amber-900">
              Ingresa el codigo enviado a {email}. Este paso protege recuperacion de clave y notificaciones laborales.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="min-h-10 rounded-md border border-amber-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
            maxLength={6}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Codigo"
            value={code}
          />
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:bg-slate-300"
            disabled={confirmMutation.isPending || code.length < 6}
            onClick={() => confirmMutation.mutate()}
            type="button"
          >
            Confirmar
          </button>
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-900 disabled:opacity-60"
            disabled={resendMutation.isPending}
            onClick={() => resendMutation.mutate()}
            type="button"
          >
            Reenviar
          </button>
        </div>
      </div>
      {(confirmMutation.isError || resendMutation.isError) && (
        <p className="mt-3 text-sm font-semibold text-red-700">
          {extractApiError(confirmMutation.error || resendMutation.error, 'No pudimos completar la verificacion.')}
        </p>
      )}
      {resendMutation.isSuccess && (
        <p className="mt-3 text-sm font-semibold text-amber-900">Si el correo existe, se envio un nuevo codigo.</p>
      )}
    </section>
  );
}

function Dashboard() {
  const { usuario } = useAuth();
  const role = usuario?.rol;
  const isEmployeeSession = role === 'empleado';
  const canAudit = hasRoleAccess(usuario, ['owner', 'superadmin']);
  const [permisoDraft, setPermisoDraft] = useState(() => ({
    fechaInicio: todayISOEC(),
    fechaFin: todayISOEC(),
    motivo: '',
    minutos: 480,
    remunerado: true,
  }));

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-nomina-operativa', role, usuario?.tenantId],
    queryFn: () => loadDashboardData(usuario),
    enabled: Boolean(role),
    retry: false,
  });

  const permisoMutation = useMutation({
    mutationFn: async (payload) => authenticatedApi.post('/mobile/permisos', payload),
    onSuccess: async () => {
      setPermisoDraft((current) => ({
        ...current,
        motivo: '',
      }));
      await refetch();
    },
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
  const bankFilesAllowed = Boolean(data?.capabilities?.allowed?.bankFiles);

  if (isEmployeeSession) {
    const employeeWorkspace = data?.employeeWorkspace || {};
    const employee = employeeWorkspace.profile;
    const employeeTenant = employeeWorkspace.tenant || null;
    const attendanceMarks = employeeWorkspace.attendance?.marcaciones || [];
    const attendanceNovelties = employeeWorkspace.attendance?.novedades || [];
    const route = employeeWorkspace.route;
    const movilizacion = employeeWorkspace.movilizacion || [];
    const payroll = employeeWorkspace.payroll;
    const employeeHealth = employeeWorkspace.health || {};

    const employeeSummaryCards = [
      {
        icon: Users,
        label: 'Ficha laboral',
        value: employee?.cargo || employee?.departamento || 'Activa',
        detail: employee?.app_link_source === 'employee_app_link' ? 'Vinculada a tu usuario' : 'Acceso laboral disponible',
        tone: 'bg-blue-50 text-blue-700',
      },
      {
        icon: Clock,
        label: 'Marcaciones recientes',
        value: safeCount(attendanceMarks),
        detail: safeCount(attendanceMarks) ? 'Ultimas registradas en tu jornada' : 'Sin marcaciones recientes',
        tone: 'bg-cyan-50 text-cyan-700',
      },
      {
        icon: ClipboardCheck,
        label: 'Novedades',
        value: safeCount(attendanceNovelties),
        detail: safeCount(attendanceNovelties) ? 'Permisos o novedades registradas' : 'Sin novedades pendientes',
        tone: 'bg-amber-50 text-amber-700',
      },
      {
        icon: DollarSign,
        label: `Rol ${period.label}`,
        value: payroll ? money(payroll.neto_recibir) : 'Pendiente',
        detail: payroll ? `Estado: ${payroll.estado || 'generado'}` : 'Aun no hay rol publicado para este periodo',
        tone: 'bg-emerald-50 text-emerald-700',
      },
    ];

    const submitPermiso = async () => {
      await permisoMutation.mutateAsync({
        fechaInicio: permisoDraft.fechaInicio,
        fechaFin: permisoDraft.fechaFin,
        motivo: permisoDraft.motivo,
        minutos: Number(permisoDraft.minutos || 0),
        remunerado: permisoDraft.remunerado,
      });
    };

    return (
      <div className="space-y-6">
        <EmailVerificationBanner email={usuario?.email} />
        <section className="soft-panel p-6" id="mi-jornada">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">Tu espacio de trabajo</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">
            {employee ? `${employee.nombres || ''} ${employee.apellidos || ''}`.trim() : 'Tu cuenta laboral sigue activa'}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Aquí ves tu información dentro de {employeeTenant?.razonSocial || usuario?.tenantRazonSocial || 'tu empresa actual'}:
            jornada, permisos, ruta y rol del periodo.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-600">
            <span className="rounded-md bg-slate-100 px-3 py-2">
              Empresa: {employeeTenant?.razonSocial || usuario?.tenantRazonSocial || 'No definida'}
            </span>
            <span className="rounded-md bg-slate-100 px-3 py-2">Cargo: {employee?.cargo || 'Sin cargo'}</span>
            <span className="rounded-md bg-slate-100 px-3 py-2">Departamento: {employee?.departamento || 'Sin departamento'}</span>
            <span className="rounded-md bg-slate-100 px-3 py-2">Cédula: {employee?.cedula || '-'}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:border-teal-300" to="/dashboard/privacidad">
              Revisar privacidad
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {employeeSummaryCards.map((card) => (
            <div className="soft-panel p-5" key={card.label}>
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
            </div>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]" id="mi-ruta">
          <div className="soft-panel p-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-teal-700" />
              <h2 className="text-lg font-semibold text-slate-950">Asistencia reciente</h2>
            </div>
            {!employeeHealth.attendance ? (
              <p className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
                No pudimos cargar el resumen de asistencia para esta sesión.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {attendanceMarks.slice(0, 5).map((mark) => (
                  <div className="rounded-md border border-slate-200 px-4 py-3" key={mark.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-slate-950">{mark.tipo_marcacion || mark.tipo || 'Marcacion'}</p>
                      <span className="text-xs text-slate-500">{formatDateTimeEC(mark.timestamp)}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {mark.dentro_perimetro === false ? 'Fuera de perimetro' : 'Dentro de perimetro'}
                      {Number.isFinite(Number(mark.distancia_metros))
                        ? ` · ${Math.round(Number(mark.distancia_metros || 0))} m`
                        : ''}
                    </p>
                  </div>
                ))}
                {attendanceMarks.length === 0 && (
                  <p className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    No hay marcaciones recientes en esta cuenta.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="soft-panel p-6">
            <div className="flex items-center gap-3">
              <CalendarClock className="h-5 w-5 text-teal-700" />
              <h2 className="text-lg font-semibold text-slate-950">Ruta de hoy</h2>
            </div>
            {!employeeHealth.route ? (
              <p className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
                No pudimos consultar la ruta asignada.
              </p>
            ) : route ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-md bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Estado</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">{route.status || 'planned'}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Pendientes: {route.totals?.pending || 0} · En sitio: {route.totals?.inSite || 0} · Completadas: {route.totals?.completed || 0}
                  </p>
                </div>
                <div className="space-y-2">
                  {(route.stops || []).slice(0, 4).map((stop) => (
                    <div className="rounded-md border border-slate-200 px-4 py-3" key={stop.id}>
                      <p className="font-semibold text-slate-950">
                        {stop.site?.name || stop.unplannedName || 'Parada'}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {stop.site?.address || stop.unplannedAddress || 'Sin direccion'} · {stop.status || 'pending'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-4 rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {employeeWorkspace.routeMessage || 'No tienes ruta asignada para hoy.'}
              </p>
            )}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <div className="soft-panel p-6" id="mis-permisos">
            <div className="flex items-center gap-3">
              <ClipboardCheck className="h-5 w-5 text-teal-700" />
              <h2 className="text-lg font-semibold text-slate-950">Solicitar permiso</h2>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="text-sm text-slate-600">
                Fecha inicio
                <input
                  className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3 py-2"
                  type="date"
                  value={permisoDraft.fechaInicio}
                  onChange={(event) => setPermisoDraft((current) => ({ ...current, fechaInicio: event.target.value }))}
                />
              </label>
              <label className="text-sm text-slate-600">
                Fecha fin
                <input
                  className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3 py-2"
                  type="date"
                  value={permisoDraft.fechaFin}
                  onChange={(event) => setPermisoDraft((current) => ({ ...current, fechaFin: event.target.value }))}
                />
              </label>
              <label className="text-sm text-slate-600">
                Minutos
                <input
                  className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3 py-2"
                  type="number"
                  min="1"
                  max="1440"
                  value={permisoDraft.minutos}
                  onChange={(event) => setPermisoDraft((current) => ({ ...current, minutos: event.target.value }))}
                />
              </label>
              <label className="flex items-center gap-3 pt-6 text-sm text-slate-700">
                <input
                  checked={permisoDraft.remunerado}
                  type="checkbox"
                  onChange={(event) => setPermisoDraft((current) => ({ ...current, remunerado: event.target.checked }))}
                />
                Permiso remunerado
              </label>
            </div>
            <label className="mt-3 block text-sm text-slate-600">
              Motivo
              <textarea
                className="mt-1 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2"
                value={permisoDraft.motivo}
                onChange={(event) => setPermisoDraft((current) => ({ ...current, motivo: event.target.value }))}
                placeholder="Describe el motivo del permiso"
              />
            </label>
            {(permisoMutation.isError) && (
              <p className="mt-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
                {extractApiError(permisoMutation.error, 'No pudimos registrar tu permiso.')}
              </p>
            )}
            {permisoMutation.isSuccess && (
              <p className="mt-3 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                Solicitud registrada. La novedad quedo pendiente de revision.
              </p>
            )}
            <div className="mt-4">
              <button
                className="inline-flex min-h-10 items-center justify-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:bg-slate-300"
                disabled={permisoMutation.isPending || !permisoDraft.fechaInicio || !permisoDraft.fechaFin || !permisoDraft.motivo.trim()}
                onClick={submitPermiso}
                type="button"
              >
                {permisoMutation.isPending ? 'Registrando...' : 'Solicitar permiso'}
              </button>
            </div>
          </div>

          <div className="soft-panel p-6" id="mi-nomina">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-teal-700" />
              <h2 className="text-lg font-semibold text-slate-950">Movilizacion y rol</h2>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-md border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Rol del periodo</p>
                {payroll ? (
                  <>
                    <p className="mt-1 text-lg font-semibold text-slate-950">{money(payroll.neto_recibir)}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Ingresos: {money(payroll.total_ingresos)} · Deducciones: {money(payroll.total_deducciones)}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">Estado: {payroll.estado || 'generado'}</p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-slate-600">Aun no hay rol publicado para {period.label}.</p>
                )}
              </div>
              <div className="rounded-md border border-slate-200 p-4">
                <p className="text-sm text-slate-500">Informes de movilización</p>
                <div className="mt-3 space-y-2">
                  {movilizacion.slice(0, 5).map((report) => (
                    <div className="rounded-md bg-slate-50 px-3 py-2" key={report.id}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-slate-950">{report.periodo || '-'}</span>
                        <span className="text-xs uppercase tracking-wide text-slate-500">{report.estado || 'pendiente'}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        Total: {money(report.total_usd)} · Dias: {report.dias || 0}
                        {report.created_at ? ` · ${formatDateEC(report.created_at)}` : ''}
                      </p>
                    </div>
                  ))}
                  {movilizacion.length === 0 && (
                    <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      No tienes informes de movilización registrados.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const summaryCards = [
    {
      icon: Users,
      label: 'Empleados activos',
      value: safeCount(activeEmployees),
      detail: safeCount(activeEmployees) ? 'Base laboral para el cálculo' : 'Registra empleados para operar nómina',
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
      detail: 'Afectan cálculo, asistencia o soportes',
      href: '/dashboard/asistencia/novedades',
      tone: 'bg-amber-50 text-amber-700',
    },
  ];
  return (
    <div className="space-y-6">
      <EmailVerificationBanner email={usuario?.email} />

      <section className="soft-panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">Operación de nómina</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Periodo {period.label}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Administra el ciclo mensual: empleados activos, novedades, cálculo de roles,
              cierre, pagos y reportes para entidades.
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
              Calcular nómina
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

      <section className="soft-panel p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">Preparacion del cierre</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">Lo importante para cerrar el mes</h2>
            <p className="mt-1 text-sm text-slate-600">
              Revisa la información laboral, las novedades, los parámetros y las salidas antes de calcular roles.
            </p>
          </div>
          <Link className="inline-flex min-h-10 items-center justify-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white" to="/dashboard/nomina/cerrar">
            Ir al cierre mensual
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Link className="rounded-md border border-slate-200 p-4 transition hover:border-teal-300 hover:bg-teal-50" to="/dashboard/empleados">
            <Users className="h-5 w-5 text-teal-700" />
            <h3 className="mt-3 font-semibold text-slate-950">Empleados</h3>
            <p className="mt-2 text-sm leading-5 text-slate-600">Datos laborales, sueldo, banco, unidad y estado activo.</p>
          </Link>
          <Link className="rounded-md border border-slate-200 p-4 transition hover:border-teal-300 hover:bg-teal-50" to="/dashboard/asistencia/novedades">
            <ClipboardCheck className="h-5 w-5 text-teal-700" />
            <h3 className="mt-3 font-semibold text-slate-950">Novedades</h3>
            <p className="mt-2 text-sm leading-5 text-slate-600">Permisos, atrasos, horas extras y aprobaciones del periodo.</p>
          </Link>
          <Link className="rounded-md border border-slate-200 p-4 transition hover:border-teal-300 hover:bg-teal-50" to="/dashboard/configuracion/parametrizacion">
            <Settings2 className="h-5 w-5 text-teal-700" />
            <h3 className="mt-3 font-semibold text-slate-950">Configuración</h3>
            <p className="mt-2 text-sm leading-5 text-slate-600">Empresa, jornada, zonas, bancos y parámetros laborales vigentes.</p>
          </Link>
          <Link className="rounded-md border border-slate-200 p-4 transition hover:border-teal-300 hover:bg-teal-50" to="/dashboard/nomina/reportes">
            <Landmark className="h-5 w-5 text-teal-700" />
            <h3 className="mt-3 font-semibold text-slate-950">Reportes</h3>
            <p className="mt-2 text-sm leading-5 text-slate-600">Roles, pagos bancarios y reportes para entidades cuando aplique.</p>
          </Link>
        </div>
      </section>
      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="soft-panel p-6">
          <div className="mb-4 flex items-center gap-3">
            <CalendarClock className="h-5 w-5 text-teal-700" />
            <h2 className="text-lg font-semibold text-slate-950">Ciclo mensual de nómina</h2>
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
              title="3. Cálculo de roles"
              description="Genera ingresos, descuentos, IESS, impuesto a la renta y neto a pagar."
              href="/dashboard/nomina/cerrar"
              action={safeCount(nominas) > 0 ? 'Recalcular o revisar' : 'Calcular periodo'}
            />
            <Step
              done={safeCount(nominas) > 0 && rolesClosed === safeCount(nominas)}
              icon={LockKeyhole}
              title="4. Cierre y emisión"
              description="Cierra la nómina, descarga roles y prepara pagos bancarios o reportes para entidades."
              href="/dashboard/nomina/roles"
              action={rolesClosed ? 'Ver roles cerrados' : 'Preparar cierre'}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="soft-panel p-6">
            <div className="mb-4 flex items-center gap-3">
              <Settings2 className="h-5 w-5 text-teal-700" />
              <h2 className="text-lg font-semibold text-slate-950">Configuración laboral</h2>
            </div>
            <div className="rounded-md bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-700">Configuración lista</span>
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
                <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Configuración mínima lista para operar.</p>
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
              Revisar configuración
            </Link>
          </div>

          <div className="soft-panel p-6">
            <div className="mb-4 flex items-center gap-3">
              <Landmark className="h-5 w-5 text-teal-700" />
              <h2 className="text-lg font-semibold text-slate-950">Salidas de nómina</h2>
            </div>
            <div className="grid gap-2">
              <Link className="rounded-md bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-teal-50 hover:text-teal-800" to="/dashboard/nomina/roles">
                Roles de pago por empleado
              </Link>
              <Link className="rounded-md bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-teal-50 hover:text-teal-800" to="/dashboard/nomina/reportes">
                Reportes para entidades
              </Link>
              <Link className="rounded-md bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-teal-50 hover:text-teal-800" to="/dashboard/nomina/pagos-bancarios">
                Pagos bancarios
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
                Revisa los parámetros laborales y las novedades pendientes antes de cerrar el periodo.
                {bankFilesAllowed ? ' Tu plan permite archivos bancarios.' : ' El plan actual no permite archivos bancarios.'}
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
