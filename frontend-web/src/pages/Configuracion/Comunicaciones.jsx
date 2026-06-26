import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, History, Mail, MessageCircle, Send, Settings2, ShieldCheck, XCircle } from 'lucide-react';
import { authenticatedApi } from '../../services/authenticatedApi';
import { extractApiError } from '../../services/publicApi';
import { useAuth } from '../../context/AuthContext';

function StatusBadge({ configured, enabled = true, channel = null }) {
  const state = channel || { configured, enabled };

  if (state.productionBlocked || state.deliveryMode === 'blocked') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-800">
        <AlertTriangle className="h-3.5 w-3.5" />
        bloqueado
      </span>
    );
  }

  if (state.deliveryMode === 'development_log') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
        <AlertTriangle className="h-3.5 w-3.5" />
        modo dev
      </span>
    );
  }

  if (!state.enabled || state.deliveryMode === 'disabled') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
        <XCircle className="h-3.5 w-3.5" />
        inactivo
      </span>
    );
  }

  return state.configured ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
      <CheckCircle2 className="h-3.5 w-3.5" />
      operativo
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
      <XCircle className="h-3.5 w-3.5" />
      incompleto
    </span>
  );
}

function ChannelCard({ icon: Icon, title, description, channel, children }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-700">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold text-slate-950">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
          </div>
        </div>
        <StatusBadge channel={channel} />
      </div>
      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        {children}
      </dl>
      {channel?.missing?.length > 0 && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs font-semibold uppercase text-amber-900">Variables faltantes</p>
          <p className="mt-1 break-words font-mono text-xs text-amber-900">{channel.missing.join(', ')}</p>
        </div>
      )}
    </article>
  );
}

function Definition({ label, value }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-900">{value || '-'}</dd>
    </div>
  );
}

function TemplateStatus({ label, enabled }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <StatusBadge configured={enabled} enabled />
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Guayaquil',
  }).format(new Date(value));
}

function Comunicaciones() {
  const { usuario } = useAuth();
  const [testEmail, setTestEmail] = useState(usuario?.email || '');

  const statusQuery = useQuery({
    queryKey: ['communications-status'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/comunicaciones/status');
      return response.data?.data;
    },
  });

  const eventsQuery = useQuery({
    queryKey: ['communications-events'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/comunicaciones/eventos?limit=25');
      return response.data?.data || [];
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const response = await authenticatedApi.post('/comunicaciones/prueba-email', { to: testEmail });
      return response.data;
    },
  });

  const status = statusQuery.data || {};
  const email = status.email || {};
  const whatsapp = status.whatsapp || {};
  const compliance = status.compliance || {};
  const events = eventsQuery.data || [];

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">Comunicaciones</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">SMTP y WhatsApp transaccional</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Verifica los canales usados para registro, recuperacion de clave e invitaciones de app de asistencia.
            </p>
          </div>
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:border-teal-300"
            onClick={() => statusQuery.refetch()}
            type="button"
          >
            <Settings2 className="h-4 w-4" />
            Actualizar estado
          </button>
        </div>
      </section>

      {statusQuery.isError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {extractApiError(statusQuery.error, 'No pudimos cargar el estado de comunicaciones.')}
        </div>
      )}

      {email.deliveryMode === 'development_log' && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          Modo desarrollo activo: las pruebas quedan auditadas como `dev_logged`, pero no salen por SMTP real.
        </div>
      )}

      {(email.productionBlocked || email.deliveryMode === 'blocked') && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          Correo bloqueado: configura SMTP real y remitente verificado antes de prometer envio de correos transaccionales.
        </div>
      )}

      <section className="grid gap-4 xl:grid-cols-2">
        <ChannelCard
          icon={Mail}
          title="Correo SMTP"
          description="Canal requerido para verificacion de correo, recuperacion de clave e invitaciones laborales."
          channel={email}
        >
          <Definition label="Servidor" value={email.host} />
          <Definition label="Puerto" value={email.port} />
          <Definition label="TLS directo" value={email.secure ? 'si' : 'no'} />
          <Definition label="Remitente" value={email.fromEmail} />
          <Definition label="Modo entrega" value={email.deliveryMode} />
          <Definition label="Proveedor real requerido" value={email.realProviderRequired ? 'si' : 'no'} />
        </ChannelCard>

        <ChannelCard
          icon={MessageCircle}
          title="WhatsApp Business"
          description="Canal complementario para activar la app movil de asistencia y futuras acciones operativas."
          channel={whatsapp}
        >
          <Definition label="Graph API" value={whatsapp.graphApiVersion} />
          <Definition label="Phone number ID" value={whatsapp.phoneNumberId} />
          <Definition label="Proveedor" value={whatsapp.provider} />
          <Definition label="Estado" value={whatsapp.enabled ? 'habilitado' : 'deshabilitado'} />
          <Definition label="Modo entrega" value={whatsapp.deliveryMode} />
          <Definition label="Modo dev" value={whatsapp.devMode ? 'si' : 'no'} />
        </ChannelCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Send className="h-5 w-5 text-teal-700" />
            <h2 className="font-semibold text-slate-950">Prueba SMTP</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Envia un correo de prueba al usuario actual o a una direccion controlada por soporte.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              className="min-h-10 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              onChange={(event) => setTestEmail(event.target.value)}
              type="email"
              value={testEmail}
            />
            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={testMutation.isPending || !testEmail}
              onClick={() => testMutation.mutate()}
              type="button"
            >
              <Mail className="h-4 w-4" />
              {testMutation.isPending ? 'Enviando' : 'Enviar prueba'}
            </button>
          </div>
          {testMutation.isSuccess && (
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
              Resultado: {testMutation.data?.delivery?.status || 'procesado'}.
            </div>
          )}
          {testMutation.isError && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
              {extractApiError(testMutation.error, 'No pudimos enviar la prueba SMTP.')}
            </div>
          )}
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-950">Plantillas operativas</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            WhatsApp requiere plantillas aprobadas. Si falta una plantilla, el flujo sigue por email y muestra el bloqueo del canal.
          </p>
          <div className="mt-4 grid gap-2">
            <TemplateStatus label="Invitacion empleado app" enabled={whatsapp.templates?.employeeInvite} />
            <TemplateStatus label="Recuperacion de clave" enabled={whatsapp.templates?.passwordReset} />
            <TemplateStatus label="Verificacion de correo" enabled={whatsapp.templates?.emailVerification} />
            <TemplateStatus label="Prueba de sistema" enabled={whatsapp.templates?.systemTest} />
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-teal-700" />
            <h2 className="font-semibold text-slate-950">Proteccion de datos</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            El registro operativo conserva evidencia minima de envio sin guardar codigos, contenido ni destinatarios en claro.
          </p>
          <dl className="mt-4 grid gap-3 text-sm">
            <Definition label="Contenido de mensajes" value={compliance.storesMessageContent ? 'almacenado' : 'no almacenado'} />
            <Definition label="Codigos de verificacion" value={compliance.storesVerificationCodes ? 'almacenados' : 'solo hash operativo'} />
            <Definition label="Retencion eventos" value={`${compliance.eventRetentionDays || 365} dias`} />
            <Definition label="Base de control" value={compliance.legalBasis || 'LOPDP_EC'} />
          </dl>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <History className="h-5 w-5 text-teal-700" />
              <h2 className="font-semibold text-slate-950">Historial reciente</h2>
            </div>
            <button
              className="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:border-teal-300"
              onClick={() => eventsQuery.refetch()}
              type="button"
            >
              Actualizar
            </button>
          </div>
          {eventsQuery.isError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
              {extractApiError(eventsQuery.error, 'No pudimos cargar el historial de comunicaciones.')}
            </div>
          )}
          {!eventsQuery.isLoading && events.length === 0 && (
            <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Aun no hay eventos registrados para este alcance.
            </p>
          )}
          <div className="grid gap-2">
            {events.map((event) => (
              <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2" key={event.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold uppercase text-slate-700">
                      {event.channel}
                    </span>
                    <span className="text-sm font-semibold text-slate-950">{event.template}</span>
                    <span className="text-xs text-slate-500">{event.recipientHint || 'sin destinatario visible'}</span>
                  </div>
                  <span className="text-xs font-semibold text-teal-800">{event.status}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>{formatDateTime(event.createdAt)}</span>
                  <span>Retencion: {formatDateTime(event.retentionUntil)}</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

export default Comunicaciones;
