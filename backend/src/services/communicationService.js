const nodemailer = require('nodemailer');
const AppError = require('../utils/AppError');
const { recordCommunicationEvent } = require('./communicationAuditService');

const EMAIL_FROM_NAME = process.env.SMTP_FROM_NAME || 'Nomina-Ec';
const DEFAULT_WHATSAPP_LANGUAGE = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es';
const DEFAULT_COMMUNICATION_PROVIDER = 'smtp';
const DEVELOPMENT_DELIVERY_PROVIDER = 'development_log';

let cachedTransporter = null;
let cachedTransportKey = '';

function boolEnv(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'si', 'on'].includes(String(value).trim().toLowerCase());
}

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function communicationProvider() {
  return String(process.env.COMMUNICATION_PROVIDER || DEFAULT_COMMUNICATION_PROVIDER).trim().toLowerCase();
}

function realProviderRequired() {
  return boolEnv(process.env.COMMUNICATION_REQUIRE_REAL_PROVIDER, isProduction());
}

function developmentDeliveryAllowed() {
  return !isProduction()
    && !realProviderRequired()
    && boolEnv(process.env.COMMUNICATION_DEV_MODE, true);
}

function redact(value) {
  if (!value) return '';
  const text = String(value);
  if (text.length <= 6) return '***';
  return `${text.slice(0, 3)}***${text.slice(-3)}`;
}

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!email || /[\r\n]/.test(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError('Correo electronico invalido para envio transaccional.', {
      code: 'COMM_EMAIL_INVALID',
      statusCode: 422,
    });
  }
  return email;
}

function sanitizeHeader(value, fallback = '') {
  return String(value || fallback).replace(/[\r\n]+/g, ' ').trim();
}

function normalizePhone(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return '';

  if (digits.startsWith('593') && digits.length >= 11) return digits;
  if (digits.startsWith('0') && digits.length === 10) return `593${digits.slice(1)}`;
  if (digits.startsWith('9') && digits.length === 9) return `593${digits}`;
  return digits;
}

function hasWhatsAppConsent(employee = {}) {
  return Boolean(employee.whatsapp_consent_at || employee.whatsappConsentAt);
}

function appBaseUrl() {
  return String(process.env.APP_PUBLIC_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
}

function getEmailConfig() {
  const provider = communicationProvider();
  const host = process.env.SMTP_HOST || '';
  const port = Number.parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = boolEnv(process.env.SMTP_SECURE, false);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASSWORD || '';
  const fromEmail = process.env.SMTP_FROM_EMAIL || user;
  const enabled = boolEnv(process.env.SMTP_ENABLED, provider === 'smtp');
  const missing = [];

  if (!host) missing.push('SMTP_HOST');
  if (!fromEmail) missing.push('SMTP_FROM_EMAIL');
  if (boolEnv(process.env.SMTP_AUTH_REQUIRED, Boolean(user || pass))) {
    if (!user) missing.push('SMTP_USER');
    if (!pass) missing.push('SMTP_PASSWORD');
  }

  const configured = provider === 'smtp' && enabled && missing.length === 0;
  const devMode = !configured && developmentDeliveryAllowed();

  return {
    provider,
    enabled,
    configured,
    ready: configured || devMode,
    deliveryMode: configured ? 'smtp' : (devMode ? DEVELOPMENT_DELIVERY_PROVIDER : 'blocked'),
    devMode,
    productionBlocked: isProduction() && !configured,
    realProviderRequired: realProviderRequired(),
    host,
    port,
    secure,
    user,
    pass,
    fromEmail,
    fromName: EMAIL_FROM_NAME,
    missing,
  };
}

function getWhatsAppConfig() {
  const enabled = boolEnv(process.env.WHATSAPP_ENABLED, false);
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  const graphApiVersion = process.env.WHATSAPP_GRAPH_API_VERSION || '';
  const apiBaseUrl = (process.env.WHATSAPP_API_BASE_URL || 'https://graph.facebook.com').replace(/\/+$/, '');
  const missing = [];

  if (!accessToken) missing.push('WHATSAPP_ACCESS_TOKEN');
  if (!phoneNumberId) missing.push('WHATSAPP_PHONE_NUMBER_ID');
  if (!graphApiVersion) missing.push('WHATSAPP_GRAPH_API_VERSION');

  const configured = enabled && missing.length === 0;
  const devMode = !configured && developmentDeliveryAllowed();

  return {
    enabled,
    configured,
    ready: configured || devMode,
    deliveryMode: configured ? 'whatsapp_cloud_api' : (devMode ? DEVELOPMENT_DELIVERY_PROVIDER : 'blocked'),
    devMode,
    accessToken,
    phoneNumberId,
    graphApiVersion,
    apiBaseUrl,
    languageCode: DEFAULT_WHATSAPP_LANGUAGE,
    templates: {
      employeeInvite: process.env.WHATSAPP_TEMPLATE_EMPLOYEE_INVITE || '',
      passwordReset: process.env.WHATSAPP_TEMPLATE_PASSWORD_RESET || '',
      emailVerification: process.env.WHATSAPP_TEMPLATE_EMAIL_VERIFICATION || '',
      systemTest: process.env.WHATSAPP_TEMPLATE_SYSTEM_TEST || '',
    },
    missing,
  };
}

function communicationStatus() {
  const email = getEmailConfig();
  const whatsapp = getWhatsAppConfig();
  const retentionDays = Number.parseInt(process.env.COMMUNICATION_RETENTION_DAYS || '365', 10);

  return {
    email: {
      provider: email.provider,
      enabled: email.enabled,
      configured: email.configured,
      ready: email.ready,
      deliveryMode: email.deliveryMode,
      devMode: email.devMode,
      productionBlocked: email.productionBlocked,
      realProviderRequired: email.realProviderRequired,
      host: email.host || null,
      port: email.port,
      secure: email.secure,
      fromEmail: email.fromEmail ? redact(email.fromEmail) : null,
      missing: email.missing,
    },
    whatsapp: {
      provider: 'whatsapp_cloud_api',
      enabled: whatsapp.enabled,
      configured: whatsapp.configured,
      ready: whatsapp.ready,
      deliveryMode: whatsapp.deliveryMode,
      devMode: whatsapp.devMode,
      phoneNumberId: whatsapp.phoneNumberId ? redact(whatsapp.phoneNumberId) : null,
      graphApiVersion: whatsapp.graphApiVersion || null,
      missing: whatsapp.missing,
      templates: {
        employeeInvite: Boolean(whatsapp.templates.employeeInvite),
        passwordReset: Boolean(whatsapp.templates.passwordReset),
        emailVerification: Boolean(whatsapp.templates.emailVerification),
        systemTest: Boolean(whatsapp.templates.systemTest),
      },
    },
    transactionalFlows: {
      emailVerification: ['email'],
      passwordReset: ['email'],
      employeeAppInvite: ['email', 'whatsapp'],
    },
    compliance: {
      dataMinimization: true,
      storesMessageContent: false,
      storesVerificationCodes: false,
      whatsappRequiresEmployeeConsent: true,
      eventRetentionDays: Number.isFinite(retentionDays) && retentionDays > 0 ? retentionDays : 365,
      legalBasis: 'LOPDP_EC_registro_recuperacion_comunicaciones_laborales',
    },
  };
}

function getTransporter() {
  const config = getEmailConfig();
  if (!config.configured) return null;

  const key = JSON.stringify({
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user,
    fromEmail: config.fromEmail,
  });

  if (cachedTransporter && cachedTransportKey === key) return cachedTransporter;

  cachedTransportKey = key;
  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user || config.pass ? { user: config.user, pass: config.pass } : undefined,
    connectionTimeout: Number.parseInt(process.env.SMTP_CONNECTION_TIMEOUT_MS || '10000', 10),
    greetingTimeout: Number.parseInt(process.env.SMTP_GREETING_TIMEOUT_MS || '10000', 10),
    socketTimeout: Number.parseInt(process.env.SMTP_SOCKET_TIMEOUT_MS || '15000', 10),
    disableFileAccess: true,
    disableUrlAccess: true,
  });

  return cachedTransporter;
}

function devDelivery(channel, template, payload = {}) {
  console.log('[COMUNICACIONES] Entrega registrada en modo desarrollo', {
    code: 'COMMUNICATION_DEV_DELIVERY',
    statusCode: 200,
    correlationId: payload.correlationId || null,
    userId: payload.userId || null,
    channel,
    template,
    to: payload.to ? redact(payload.to) : null,
  });

  return {
    channel,
    provider: 'development_log',
    status: 'dev_logged',
    configured: false,
    template,
  };
}

async function auditDelivery(result, event = {}) {
  await recordCommunicationEvent({
    tenantId: event.tenantId,
    userId: event.userId,
    correlationId: event.correlationId,
    channel: result.channel,
    provider: result.provider,
    template: result.template || event.template,
    status: result.status,
    recipient: event.recipient,
    messageId: result.messageId,
    metadata: {
      purpose: event.purpose,
      flow: event.flow,
      required: event.required,
      configured: result.configured,
      reason: result.reason,
      error: result.error,
      missing: result.missing,
    },
  });
  return result;
}

async function sendEmail({
  to,
  subject,
  text,
  html,
  template,
  correlationId,
  userId,
  tenantId,
  purpose,
  flow,
  required = false,
}) {
  const config = getEmailConfig();
  let recipient = '';

  try {
    recipient = normalizeEmail(to);
  } catch (err) {
    if (required) throw err;
    return auditDelivery({
      channel: 'email',
      provider: 'smtp',
      status: 'skipped',
      configured: config.configured,
      template,
      reason: 'email_invalido',
    }, { tenantId, userId, correlationId, recipient: to, purpose, flow, required });
  }

  if (!config.configured) {
    if (config.devMode) {
      return auditDelivery(
        devDelivery('email', template, { correlationId, userId, to: recipient }),
        { tenantId, userId, correlationId, recipient, purpose, flow, required }
      );
    }

    const result = {
      channel: 'email',
      provider: config.provider,
      status: 'not_configured',
      configured: false,
      template,
      missing: config.missing,
      reason: config.productionBlocked ? 'production_provider_required' : 'provider_not_configured',
    };

    await auditDelivery(result, { tenantId, userId, correlationId, recipient, purpose, flow, required });

    if (required) {
      throw new AppError('SMTP real no esta configurado para enviar correos transaccionales.', {
        code: 'COMM_SMTP_NOT_CONFIGURED',
        statusCode: 503,
        details: { missing: config.missing, provider: config.provider, deliveryMode: config.deliveryMode },
      });
    }

    return result;
  }

  const transporter = getTransporter();
  try {
    const info = await transporter.sendMail({
      from: {
        name: sanitizeHeader(config.fromName, 'Nomina-Ec'),
        address: normalizeEmail(config.fromEmail),
      },
      to: recipient,
      subject: sanitizeHeader(subject, 'Notificacion Nomina-Ec'),
      text,
      html,
      disableFileAccess: true,
      disableUrlAccess: true,
    });

    return auditDelivery({
      channel: 'email',
      provider: 'smtp',
      status: 'sent',
      configured: true,
      template,
      messageId: info.messageId || null,
    }, { tenantId, userId, correlationId, recipient, purpose, flow, required });
  } catch (err) {
    console.error('[COMUNICACIONES] Error enviando email SMTP', {
      code: err.code || 'COMM_SMTP_SEND_ERROR',
      statusCode: 502,
      correlationId: correlationId || null,
      userId: userId || null,
      message: err.message,
      to: redact(recipient),
      template,
    });

    const result = {
      channel: 'email',
      provider: 'smtp',
      status: 'failed',
      configured: true,
      template,
      error: err.code || 'COMM_SMTP_SEND_ERROR',
    };
    await auditDelivery(result, { tenantId, userId, correlationId, recipient, purpose, flow, required });

    if (required) {
      throw new AppError('No pudimos enviar el correo transaccional.', {
        code: 'COMM_SMTP_SEND_ERROR',
        statusCode: 502,
        details: { template },
      });
    }

    return result;
  }
}

async function sendWhatsAppTemplate({
  to,
  templateName,
  variables = [],
  correlationId,
  userId,
  tenantId,
  template,
  purpose,
  flow,
}) {
  const config = getWhatsAppConfig();
  const phone = normalizePhone(to);

  if (!phone || !templateName) {
    return auditDelivery({
      channel: 'whatsapp',
      provider: 'whatsapp_cloud_api',
      status: 'skipped',
      configured: config.configured,
      template,
      reason: !phone ? 'telefono_no_disponible' : 'template_no_configurado',
    }, { tenantId, userId, correlationId, recipient: phone || to, purpose, flow });
  }

  if (!config.configured) {
    if (config.devMode) {
      return auditDelivery(
        devDelivery('whatsapp', template, { correlationId, userId, to: phone }),
        { tenantId, userId, correlationId, recipient: phone, purpose, flow }
      );
    }

    return auditDelivery({
      channel: 'whatsapp',
      provider: 'whatsapp_cloud_api',
      status: 'not_configured',
      configured: false,
      template,
      missing: config.missing,
    }, { tenantId, userId, correlationId, recipient: phone, purpose, flow });
  }

  const url = `${config.apiBaseUrl}/${config.graphApiVersion}/${config.phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: config.languageCode },
      ...(variables.length > 0 ? { components: [{
        type: 'body',
        parameters: variables.map((value) => ({
          type: 'text',
          text: String(value || '').slice(0, 1024),
        })),
      }] } : {}),
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new AppError('WhatsApp rechazo la solicitud de envio.', {
        code: 'COMM_WHATSAPP_SEND_ERROR',
        statusCode: 502,
        details: {
          status: response.status,
          error: data?.error?.message || data?.error || 'respuesta_no_exitosa',
        },
      });
    }

    return auditDelivery({
      channel: 'whatsapp',
      provider: 'whatsapp_cloud_api',
      status: 'sent',
      configured: true,
      template,
      messageId: data?.messages?.[0]?.id || null,
    }, { tenantId, userId, correlationId, recipient: phone, purpose, flow });
  } catch (err) {
    console.error('[COMUNICACIONES] Error enviando WhatsApp', {
      code: err.code || 'COMM_WHATSAPP_SEND_ERROR',
      statusCode: err.statusCode || 502,
      correlationId: correlationId || null,
      userId: userId || null,
      message: err.message,
      to: redact(phone),
      template,
    });

    return auditDelivery({
      channel: 'whatsapp',
      provider: 'whatsapp_cloud_api',
      status: 'failed',
      configured: config.configured,
      template,
      error: err.code || 'COMM_WHATSAPP_SEND_ERROR',
    }, { tenantId, userId, correlationId, recipient: phone, purpose, flow });
  }
}

function verificationEmailTemplate({ code, name }) {
  const safeName = sanitizeHeader(name, 'usuario');
  return {
    subject: 'Codigo de verificacion Nomina-Ec',
    text: `Hola ${safeName}.\n\nTu codigo de verificacion de Nomina-Ec es: ${code}\nVence en 24 horas.\n\nSi no solicitaste este acceso, ignora este mensaje.`,
    html: `<p>Hola ${safeName}.</p><p>Tu codigo de verificacion de Nomina-Ec es:</p><p style="font-size:22px;font-weight:700;letter-spacing:3px">${code}</p><p>Vence en 24 horas.</p><p>Si no solicitaste este acceso, ignora este mensaje.</p>`,
  };
}

function resetEmailTemplate({ code, name }) {
  const safeName = sanitizeHeader(name, 'usuario');
  return {
    subject: 'Recuperacion de clave Nomina-Ec',
    text: `Hola ${safeName}.\n\nTu codigo para restablecer la clave es: ${code}\nVence en 30 minutos.\n\nSi no solicitaste este cambio, contacta al administrador de tu empresa.`,
    html: `<p>Hola ${safeName}.</p><p>Tu codigo para restablecer la clave es:</p><p style="font-size:22px;font-weight:700;letter-spacing:3px">${code}</p><p>Vence en 30 minutos.</p><p>Si no solicitaste este cambio, contacta al administrador de tu empresa.</p>`,
  };
}

function employeeInviteEmailTemplate({ employeeName, code, activationUrl, expiresAt }) {
  const safeName = sanitizeHeader(employeeName, 'empleado');
  return {
    subject: 'Activa tu app de asistencia Nomina-Ec',
    text: `Hola ${safeName}.\n\nRRHH habilito tu acceso a la app de asistencia Nomina-Ec.\nCodigo: ${code}\nLink: ${activationUrl}\nVigente hasta: ${expiresAt || 'fecha registrada por RRHH'}.\n\nNo compartas este codigo.`,
    html: `<p>Hola ${safeName}.</p><p>RRHH habilito tu acceso a la app de asistencia Nomina-Ec.</p><p><strong>Codigo:</strong> ${code}</p><p><a href="${activationUrl}">Abrir activacion</a></p><p>Vigente hasta: ${expiresAt || 'fecha registrada por RRHH'}.</p><p>No compartas este codigo.</p>`,
  };
}

async function sendEmailVerification({ to, code, name, correlationId, userId, tenantId }) {
  const content = verificationEmailTemplate({ code, name });
  return sendEmail({
    to,
    ...content,
    template: 'email_verification',
    correlationId,
    userId,
    tenantId,
    purpose: 'verificacion_correo',
    flow: 'registro_usuario',
  });
}

async function sendPasswordReset({ to, code, name, correlationId, userId, tenantId }) {
  const content = resetEmailTemplate({ code, name });
  return sendEmail({
    to,
    ...content,
    template: 'password_reset',
    correlationId,
    userId,
    tenantId,
    purpose: 'recuperacion_clave',
    flow: 'auth_password_reset',
  });
}

async function sendEmployeeInvite({ employee, invite, correlationId, userId }) {
  const name = [employee?.nombres, employee?.apellidos].filter(Boolean).join(' ') || 'empleado';
  const tenantId = employee?.tenant_id || employee?.tenantId || invite?.tenantId || null;
  const content = employeeInviteEmailTemplate({
    employeeName: name,
    code: invite.code,
    activationUrl: invite.activationUrl,
    expiresAt: invite.expiresAt,
  });
  const whatsapp = getWhatsAppConfig();
  const results = [];

  results.push(await sendEmail({
    to: invite.email || employee?.email_personal,
    ...content,
    template: 'employee_app_invite',
    correlationId,
    userId,
    tenantId,
    purpose: 'activacion_app_asistencia',
    flow: 'empleado_invitacion_app',
  }));

  if (hasWhatsAppConsent(employee)) {
    results.push(await sendWhatsAppTemplate({
      to: employee?.telefono,
      templateName: whatsapp.templates.employeeInvite,
      variables: [name, invite.code, invite.activationUrl || appBaseUrl()],
      template: 'employee_app_invite',
      correlationId,
      userId,
      tenantId,
      purpose: 'activacion_app_asistencia',
      flow: 'empleado_invitacion_app',
    }));
  } else {
    results.push(await auditDelivery({
      channel: 'whatsapp',
      provider: 'whatsapp_cloud_api',
      status: 'skipped',
      configured: whatsapp.configured,
      template: 'employee_app_invite',
      reason: 'consentimiento_whatsapp_requerido',
    }, {
      tenantId,
      userId,
      correlationId,
      recipient: employee?.telefono,
      purpose: 'activacion_app_asistencia',
      flow: 'empleado_invitacion_app',
    }));
  }

  return results;
}

async function sendTestEmail({ to, correlationId, userId, tenantId }) {
  return sendEmail({
    to,
    subject: 'Prueba SMTP Nomina-Ec',
    text: 'El canal SMTP de Nomina-Ec esta operativo para correos transaccionales.',
    html: '<p>El canal SMTP de Nomina-Ec esta operativo para correos transaccionales.</p>',
    template: 'smtp_test',
    correlationId,
    userId,
    tenantId,
    purpose: 'prueba_operativa_smtp',
    flow: 'configuracion_comunicaciones',
    required: true,
  });
}

module.exports = {
  communicationStatus,
  normalizePhone,
  sendEmail,
  sendEmailVerification,
  sendEmployeeInvite,
  sendPasswordReset,
  sendTestEmail,
  sendWhatsAppTemplate,
  hasWhatsAppConsent,
};
