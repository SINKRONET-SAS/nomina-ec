// ============================================================
// SKNOMINA - Ciclo de vida de suscripciones
// Renovacion automatica y notificacion de vencimiento proximo
// ============================================================
const db = require('../config/database');
const logger = require('../utils/logger');
const { sendEmail } = require('./communicationService');
const { normalizePlanMetadata } = require('./planTrialService');

const RENEWAL_LOOKAHEAD_HOURS = 24;
const EXPIRY_NOTICE_DAYS = 7;
const MAX_NOTICES_PER_CYCLE = 1;

function addBillingPeriod(baseDate, billingPeriod) {
  const next = new Date(baseDate);
  if (String(billingPeriod).toLowerCase() === 'annual') {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

function resolveBillingPeriod(subscription) {
  const metadata = normalizePlanMetadata(subscription.metadata);
  return String(metadata.billingPeriod || 'monthly').toLowerCase();
}

function formatDateEc(date) {
  if (!date) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Guayaquil',
  }).format(new Date(date));
}

async function processAutoRenewals(correlationId = 'cron-subscription-renewal') {
  const result = await db.query(
    `SELECT s.*, p.nombre AS plan_nombre
     FROM suscripciones s
     JOIN planes_comerciales p ON p.id = s.plan_id
     WHERE s.renovacion_automatica = true
       AND s.estado = 'active'
       AND s.vence_en IS NOT NULL
       AND s.vence_en <= NOW() + INTERVAL '${RENEWAL_LOOKAHEAD_HOURS} hours'
       AND s.vence_en > NOW() - INTERVAL '30 days'`
  );

  const renewed = [];
  for (const sub of result.rows) {
    try {
      const billingPeriod = resolveBillingPeriod(sub);
      const currentExpiry = new Date(sub.vence_en);
      const nextExpiry = addBillingPeriod(currentExpiry, billingPeriod);

      const prevMetadata = normalizePlanMetadata(sub.metadata);
      const renewalMetadata = {
        ...prevMetadata,
        lastRenewalAt: new Date().toISOString(),
        renewedFromVenceEn: sub.vence_en,
        renewalCorrelationId: correlationId,
        billingPeriod,
      };

      await db.query(
        `UPDATE suscripciones
         SET vence_en = $2,
             metadata = $3,
             updated_at = NOW()
         WHERE tenant_id = $1`,
        [sub.tenant_id, nextExpiry, JSON.stringify(renewalMetadata)]
      );

      logger.info({
        code: 'CRON_SUBSCRIPTION_RENEWED',
        correlationId,
        tenantId: sub.tenant_id,
        planId: sub.plan_id,
        previousExpiry: sub.vence_en,
        nextExpiry: nextExpiry.toISOString(),
        billingPeriod,
      }, `Suscripcion renovada automaticamente para tenant ${sub.tenant_id}`);

      renewed.push({
        tenantId: sub.tenant_id,
        planId: sub.plan_id,
        nextExpiry: nextExpiry.toISOString(),
      });
    } catch (err) {
      logger.error({
        code: err.code || 'CRON_SUBSCRIPTION_RENEWAL_ERROR',
        statusCode: err.statusCode || 500,
        correlationId,
        tenantId: sub.tenant_id,
        userId: null,
      }, err.message || 'Error renovando suscripcion');
    }
  }

  return { renewed: renewed.length, details: renewed };
}

async function notifyExpiringSubscriptions(correlationId = 'cron-subscription-expiry-notify') {
  const result = await db.query(
    `SELECT s.*, p.nombre AS plan_nombre,
       owner.email AS owner_email, owner.id AS owner_user_id
     FROM suscripciones s
     JOIN planes_comerciales p ON p.id = s.plan_id
     JOIN tenants t ON t.id = s.tenant_id AND t.activo = true
     LEFT JOIN LATERAL (
       SELECT u.id, u.email
       FROM usuarios u
       WHERE u.tenant_id = t.id AND u.rol = 'owner' AND u.activo = true
       ORDER BY u.created_at ASC
       LIMIT 1
     ) owner ON true
     WHERE s.renovacion_automatica = false
       AND s.estado = 'active'
       AND s.vence_en IS NOT NULL
       AND s.vence_en BETWEEN NOW() AND NOW() + INTERVAL '${EXPIRY_NOTICE_DAYS} days'`
  );

  const notified = [];
  for (const sub of result.rows) {
    if (!sub.owner_email) {
      logger.info({
        code: 'CRON_SUBSCRIPTION_EXPIRY_NO_OWNER',
        correlationId,
        tenantId: sub.tenant_id,
      }, 'Sin email de owner para notificar vencimiento');
      continue;
    }

    const metadata = normalizePlanMetadata(sub.metadata);
    const lastNoticeAt = metadata.lastExpiryNoticeAt;
    if (lastNoticeAt) {
      const hoursSinceLastNotice = (Date.now() - new Date(lastNoticeAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastNotice < 24 * MAX_NOTICES_PER_CYCLE) {
        continue;
      }
    }

    try {
      const venceEn = new Date(sub.vence_en);
      const diasRestantes = Math.max(0, Math.ceil((venceEn.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

      await sendEmail({
        to: sub.owner_email,
        subject: `Tu suscripcion SKNOMINA vence en ${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''}`,
        text: [
          `Hola,`,
          ``,
          `Tu suscripcion al plan ${sub.plan_nombre || sub.plan_id} de SKNOMINA vence el ${formatDateEc(sub.vence_en)}.`,
          ``,
          `Para mantener el acceso a todas las funcionalidades, renueva tu plan antes de la fecha de vencimiento.`,
          ``,
          `Si ya realizaste el pago, puedes ignorar este mensaje.`,
          ``,
          `Saludos,`,
          `El equipo de SKNOMINA`,
        ].join('\n'),
        correlationId,
        userId: sub.owner_user_id || null,
        tenantId: sub.tenant_id,
        purpose: 'subscription_expiry_notice',
        flow: 'billing',
      });

      await db.query(
        `UPDATE suscripciones
         SET metadata = metadata || $2::jsonb,
             updated_at = NOW()
         WHERE tenant_id = $1`,
        [
          sub.tenant_id,
          JSON.stringify({
            lastExpiryNoticeAt: new Date().toISOString(),
            lastExpiryNoticeDias: diasRestantes,
          }),
        ]
      );

      logger.info({
        code: 'CRON_SUBSCRIPTION_EXPIRY_NOTICE',
        correlationId,
        tenantId: sub.tenant_id,
        ownerEmail: sub.owner_email,
        diasRestantes,
        venceEn: sub.vence_en,
      }, `Notificacion de vencimiento enviada a ${sub.owner_email}`);

      notified.push({
        tenantId: sub.tenant_id,
        ownerEmail: sub.owner_email,
        diasRestantes,
      });
    } catch (err) {
      logger.error({
        code: err.code || 'CRON_SUBSCRIPTION_EXPIRY_NOTICE_ERROR',
        statusCode: err.statusCode || 500,
        correlationId,
        tenantId: sub.tenant_id,
        userId: null,
      }, err.message || 'Error enviando notificacion de vencimiento');
    }
  }

  return { notified: notified.length, details: notified };
}

module.exports = {
  addBillingPeriod,
  formatDateEc,
  notifyExpiringSubscriptions,
  processAutoRenewals,
  resolveBillingPeriod,
};
