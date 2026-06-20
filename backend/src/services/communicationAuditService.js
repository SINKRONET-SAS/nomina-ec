const crypto = require('crypto');
const db = require('../config/database');

const DEFAULT_RETENTION_DAYS = 365;

function retentionDays() {
  const value = Number.parseInt(process.env.COMMUNICATION_RETENTION_DAYS || `${DEFAULT_RETENTION_DAYS}`, 10);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_RETENTION_DAYS;
}

function hashSecret() {
  return process.env.COMMUNICATION_EVENT_HASH_SECRET
    || process.env.EMPLOYEE_INVITE_SECRET
    || process.env.JWT_SECRET
    || 'nomina-ec-local-communication-audit';
}

function normalizeRecipient(value) {
  return String(value || '').trim().toLowerCase();
}

function hashValue(value) {
  const normalized = normalizeRecipient(value);
  if (!normalized) return '';
  return crypto
    .createHmac('sha256', hashSecret())
    .update(normalized)
    .digest('hex');
}

function recipientHint(channel, recipient) {
  const normalized = normalizeRecipient(recipient);
  if (!normalized) return '';

  if (channel === 'email' && normalized.includes('@')) {
    return normalized.split('@').pop().slice(0, 120);
  }

  if (channel === 'whatsapp') return 'telefono';
  return 'destinatario';
}

function safeMetadata(metadata = {}) {
  const allowed = {};
  const source = metadata && typeof metadata === 'object' ? metadata : {};
  ['purpose', 'flow', 'required', 'configured', 'reason', 'error', 'missing'].forEach((key) => {
    if (source[key] !== undefined && source[key] !== null) {
      allowed[key] = Array.isArray(source[key])
        ? source[key].map((item) => String(item).slice(0, 120))
        : String(source[key]).slice(0, 240);
    }
  });
  return allowed;
}

async function recordCommunicationEvent(event = {}) {
  try {
    const retention = retentionDays();
    const channel = String(event.channel || '').slice(0, 30);
    const provider = String(event.provider || '').slice(0, 60);
    const template = String(event.template || '').slice(0, 80);
    const status = String(event.status || '').slice(0, 40);
    const recipient = event.recipient || '';

    if (!channel || !provider || !template || !status) {
      console.error('[COMUNICACIONES] Evento incompleto omitido', {
        code: 'COMMUNICATION_EVENT_INVALID',
        statusCode: 422,
        correlationId: event.correlationId || null,
        userId: event.userId || null,
        channel,
        provider,
        template,
        status,
      });
      return null;
    }

    const insertEvent = () => db.query(`
      INSERT INTO communication_events (
        tenant_id, user_id, correlation_id, channel, provider, template, status,
        recipient_hash, recipient_hint, message_id_hash, retention_until, metadata
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, NOW() + ($11::int * INTERVAL '1 day'), $12
      )
      RETURNING id
    `, [
      event.tenantId || null,
      event.userId || null,
      String(event.correlationId || 'sin-correlacion').slice(0, 120),
      channel,
      provider,
      template,
      status,
      hashValue(recipient),
      recipientHint(channel, recipient),
      hashValue(event.messageId || ''),
      retention,
      JSON.stringify(safeMetadata(event.metadata)),
    ]);
    const result = event.tenantId
      ? await db.runWithTenantContext({
        tenantId: event.tenantId,
        userId: event.userId || null,
      }, insertEvent)
      : await insertEvent();

    return result.rows[0] || null;
  } catch (err) {
    console.error('[COMUNICACIONES] No se pudo registrar auditoria de comunicacion', {
      code: err.code || 'COMMUNICATION_EVENT_LOG_ERROR',
      statusCode: 500,
      correlationId: event.correlationId || null,
      userId: event.userId || null,
      message: err.message,
      template: event.template || null,
      channel: event.channel || null,
    });
    return null;
  }
}

async function listCommunicationEvents({ tenantId = null, limit = 40 } = {}) {
  const cappedLimit = Math.min(Math.max(Number.parseInt(limit || '40', 10), 1), 100);
  const result = await db.query(`
    SELECT
      id,
      tenant_id,
      user_id,
      correlation_id,
      channel,
      provider,
      template,
      status,
      recipient_hint,
      retention_until,
      metadata,
      created_at
    FROM communication_events
    WHERE ($1::uuid IS NULL OR tenant_id = $1)
    ORDER BY created_at DESC
    LIMIT $2
  `, [tenantId || null, cappedLimit]);

  return result.rows.map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    correlationId: row.correlation_id,
    channel: row.channel,
    provider: row.provider,
    template: row.template,
    status: row.status,
    recipientHint: row.recipient_hint,
    retentionUntil: row.retention_until,
    metadata: row.metadata || {},
    createdAt: row.created_at,
  }));
}

module.exports = {
  listCommunicationEvents,
  recordCommunicationEvent,
};
