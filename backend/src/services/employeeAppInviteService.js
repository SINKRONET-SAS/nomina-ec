const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/database');
const AppError = require('../utils/AppError');
const { generateToken } = require('../middleware/auth');
const { sendEmployeeInvite } = require('./communicationService');
const { CONSENT_SCOPES, LOPDP_VERSION } = require('./privacyConsentService');

const INVITE_STATUS = Object.freeze({
  PENDING: 'PENDING_INVITE',
  ACTIVE: 'ACTIVE',
  ACCEPTED: 'ACCEPTED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
  BLOCKED_CONFIG: 'BLOCKED_CONFIG',
});

const LINK_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  DISABLED: 'DISABLED',
});

const PRIVACY_VERSION = 'EAA26-1.0';
const INVITE_TTL_DAYS = Number.parseInt(process.env.EMPLOYEE_APP_INVITE_TTL_DAYS || '7', 10);

function normalizeInviteCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 32);
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function hashInviteCode(value) {
  const normalized = normalizeInviteCode(value);
  const secret = process.env.EMPLOYEE_INVITE_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('EMPLOYEE_INVITE_SECRET o JWT_SECRET es obligatorio para firmar codigos de invitacion.');
  }
  return crypto.createHash('sha256').update(`${secret}:${normalized}`).digest('hex');
}

function generateInviteCode(seed = 'NEC') {
  const prefix = String(seed || 'NEC')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4) || 'NEC';
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${random.slice(0, 4)}-${random.slice(4, 8)}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + Math.max(1, days || INVITE_TTL_DAYS));
  return next;
}

function buildActivationUrl(code) {
  const base = String(process.env.MOBILE_APP_ACTIVATION_URL || 'nominaec://employee/activate').trim();
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}code=${encodeURIComponent(code)}`;
}

function invitePublicPayload(row, code = null) {
  if (!row) return null;
  return {
    id: row.id,
    empleadoId: row.empleado_id,
    email: row.email,
    status: row.status,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    revokedAt: row.revoked_at,
    resendCount: Number(row.invite_resend_count || 0),
    privacyNoticeVersion: row.privacy_notice_version || PRIVACY_VERSION,
    code,
    activationUrl: code ? buildActivationUrl(code) : null,
    qrPayload: code ? buildActivationUrl(code) : null,
  };
}

function buildReadiness(row = {}, { requireEmail = false } = {}) {
  const blockers = [];
  if (requireEmail && !normalizeEmail(row.email_personal)) blockers.push('email_personal_requerido');
  if (!String(row.departamento || '').trim()) blockers.push('departamento_requerido');
  if (!row.organization_unit_id) blockers.push('unidad_organizativa_sin_match');
  if (row.organization_unit_id && !row.work_zone_id) blockers.push('unidad_organizativa_sin_zona');
  if (!row.work_shift_id) blockers.push('jornada_base_no_configurada');
  if (!Number.isFinite(Number(row.jornada_horas_mensuales)) || Number(row.jornada_horas_mensuales) <= 0) {
    blockers.push('jornada_mensual_empleado_requerida');
  }

  return {
    ready: blockers.length === 0,
    blockers,
    organizationUnit: row.organization_unit_id ? {
      id: row.organization_unit_id,
      code: row.organization_unit_code,
      name: row.organization_unit_name,
      type: row.organization_unit_type,
    } : null,
    workZone: row.work_zone_id ? {
      id: row.work_zone_id,
      code: row.work_zone_code,
      name: row.work_zone_name,
      latitude: row.latitude,
      longitude: row.longitude,
      radiusMeters: Number(row.radius_meters || 0),
      minAccuracyMeters: Number(row.min_accuracy_meters || 0),
      requiresPhoto: Boolean(row.requires_photo),
    } : null,
    workShift: row.work_shift_id ? {
      id: row.work_shift_id,
      code: row.work_shift_code,
      name: row.work_shift_name,
      startTime: row.start_time,
      endTime: row.end_time,
      toleranceMinutes: Number(row.tolerance_minutes || 0),
      calendarRules: row.calendar_rules || {},
      workDays: Array.isArray(row.calendar_rules?.workDays) ? row.calendar_rules.workDays : [],
      legalNotice: row.calendar_rules?.legalNotice || null,
    } : null,
  };
}

function employeeReadinessSelect(whereClause) {
  return `
    SELECT
      e.id,
      e.tenant_id,
      e.cedula,
      e.nombres,
      e.apellidos,
      e.cargo,
      e.departamento,
      e.telefono,
      e.email_personal,
      e.fecha_ingreso,
      e.sueldo_bruto_mensual,
      e.whatsapp_consent_at,
      e.unidad_organizativa_codigo,
      e.jornada_codigo,
      e.zona_marcacion_codigo,
      e.jornada_horas_mensuales,
      ou.id AS organization_unit_id,
      ou.code AS organization_unit_code,
      ou.name AS organization_unit_name,
      ou.unit_type AS organization_unit_type,
      wz.id AS work_zone_id,
      wz.code AS work_zone_code,
      wz.name AS work_zone_name,
      wz.latitude,
      wz.longitude,
      wz.radius_meters,
      wz.min_accuracy_meters,
      wz.requires_photo,
      ws.id AS work_shift_id,
      ws.code AS work_shift_code,
      ws.name AS work_shift_name,
      ws.start_time,
      ws.end_time,
      ws.tolerance_minutes,
      ws.calendar_rules
    FROM empleados e
    LEFT JOIN LATERAL (
      SELECT ou.*
      FROM organization_units ou
      WHERE ou.tenant_id = e.tenant_id
        AND ou.status = 'activo'
        AND (ou.valid_to IS NULL OR ou.valid_to >= CURRENT_DATE)
        AND (
          LOWER(ou.code) = LOWER(NULLIF(e.unidad_organizativa_codigo, ''))
          OR LOWER(ou.name) = LOWER(NULLIF(e.unidad_organizativa_codigo, ''))
          OR LOWER(ou.cost_center_code) = LOWER(NULLIF(e.unidad_organizativa_codigo, ''))
          OR
          LOWER(ou.code) = LOWER(e.departamento)
          OR LOWER(ou.name) = LOWER(e.departamento)
          OR LOWER(ou.cost_center_code) = LOWER(e.departamento)
        )
      ORDER BY ou.updated_at DESC, ou.created_at DESC
      LIMIT 1
    ) ou ON true
    LEFT JOIN LATERAL (
      SELECT wz.*
      FROM work_zones wz
      WHERE wz.tenant_id = e.tenant_id
        AND wz.status = 'activo'
        AND (wz.valid_to IS NULL OR wz.valid_to >= CURRENT_DATE)
        AND (
          wz.id = ou.work_zone_id
          OR LOWER(wz.code) = LOWER(NULLIF(e.zona_marcacion_codigo, ''))
          OR LOWER(wz.name) = LOWER(NULLIF(e.zona_marcacion_codigo, ''))
        )
      ORDER BY
        CASE WHEN wz.id = ou.work_zone_id THEN 0 ELSE 1 END,
        wz.updated_at DESC,
        wz.created_at DESC
      LIMIT 1
    ) wz ON true
    LEFT JOIN LATERAL (
      SELECT ws.*
      FROM work_shifts ws
      WHERE ws.tenant_id = e.tenant_id
        AND ws.status = 'activo'
        AND (ws.valid_to IS NULL OR ws.valid_to >= CURRENT_DATE)
        AND (
          ws.id::text = ou.metadata->>'workShiftId'
          OR LOWER(ws.code) = LOWER(NULLIF(e.jornada_codigo, ''))
          OR LOWER(ws.name) = LOWER(NULLIF(e.jornada_codigo, ''))
          OR (
            COALESCE(ou.metadata->>'workShiftId', '') = ''
            AND COALESCE(NULLIF(e.jornada_codigo, ''), '') = ''
            AND (
              SELECT COUNT(*)
              FROM work_shifts ws_count
              WHERE ws_count.tenant_id = e.tenant_id
                AND ws_count.status = 'activo'
                AND (ws_count.valid_to IS NULL OR ws_count.valid_to >= CURRENT_DATE)
            ) = 1
          )
        )
      ORDER BY
        CASE WHEN ws.id::text = ou.metadata->>'workShiftId' THEN 0 ELSE 1 END,
        ws.updated_at DESC,
        ws.created_at DESC
      LIMIT 1
    ) ws ON true
    ${whereClause}
  `;
}

async function resolveAttendanceReadiness(empleadoId, tenantId, queryable = db) {
  const result = await queryable.query(employeeReadinessSelect(`
    WHERE e.id = $1
      AND e.tenant_id = $2
      AND e.activo = true
    LIMIT 1
  `), [empleadoId, tenantId]);

  const employee = result.rows[0];
  if (!employee) {
    throw new AppError('Empleado activo no encontrado para asistencia.', {
      code: 'EMPLEADO_ASISTENCIA_NO_ENCONTRADO',
      statusCode: 404,
    });
  }

  return {
    employee,
    readiness: buildReadiness(employee),
  };
}

async function assertEmployeeReadyForInvite(empleadoId, tenantId, queryable = db) {
  const result = await queryable.query(employeeReadinessSelect(`
    WHERE e.id = $1
      AND e.tenant_id = $2
      AND e.activo = true
    LIMIT 1
  `), [empleadoId, tenantId]);
  const employee = result.rows[0];

  if (!employee) {
    throw new AppError('Empleado activo no encontrado.', {
      code: 'EMPLOYEE_APP_EMPLOYEE_NOT_FOUND',
      statusCode: 404,
    });
  }

  const readiness = buildReadiness(employee, { requireEmail: true });
  if (!readiness.ready) {
    throw new AppError('Completa email, unidad organizativa, zona y jornada antes de invitar al empleado.', {
      code: 'EMPLOYEE_APP_CONFIG_BLOCKED',
      statusCode: 409,
      details: {
        empleadoId,
        blockers: readiness.blockers,
      },
    });
  }

  return { employee, readiness };
}

async function insertAudit(queryable, {
  tenantId,
  userId,
  correlationId,
  action,
  entity,
  entityId = null,
  previousData = {},
  newData = {},
  ipAddress = null,
  metadata = {},
}) {
  await queryable.query(`
    INSERT INTO audit_logs (
      tenant_id, user_id, correlation_id, accion, entidad, entidad_id,
      datos_anteriores, datos_nuevos, ip_address, metadata
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
  `, [
    tenantId,
    userId,
    correlationId,
    action,
    entity,
    entityId,
    JSON.stringify(previousData || {}),
    JSON.stringify(newData || {}),
    ipAddress,
    JSON.stringify(metadata || {}),
  ]);
}

async function syncEmployeeActivationConsents(queryable, {
  tenantId,
  userId,
  source = 'employee-mobile-activation',
}) {
  for (const definition of CONSENT_SCOPES) {
    const active = definition.defaultActive;
    await queryable.query(
      `INSERT INTO consent_preferences (
         tenant_id, user_id, scope, active, given_at, withdrawn_at, source, version, metadata
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (user_id, scope) DO UPDATE SET
         active = EXCLUDED.active,
         given_at = EXCLUDED.given_at,
         withdrawn_at = EXCLUDED.withdrawn_at,
         source = EXCLUDED.source,
         version = EXCLUDED.version,
         metadata = consent_preferences.metadata || EXCLUDED.metadata,
         updated_at = NOW()`,
      [
        tenantId,
        userId,
        definition.scope,
        active,
        active ? new Date() : null,
        active ? null : new Date(),
        source,
        LOPDP_VERSION,
        JSON.stringify({
          source,
          legalBasis: definition.legalBasis,
          required: definition.required,
          withdrawable: definition.withdrawable,
        }),
      ]
    );
  }
}

async function listEmployeeAppInvitations({ tenantId }) {
  await expirePendingEmployeeInvites({ tenantId });

  const result = await db.query(`
    WITH latest_invite AS (
      SELECT DISTINCT ON (tenant_id, empleado_id)
        id, tenant_id, empleado_id, email, status, expires_at, accepted_at,
        revoked_at, invite_resend_count, created_at
      FROM employee_app_invites
      WHERE tenant_id = $1
      ORDER BY tenant_id, empleado_id, created_at DESC
    ),
    active_link AS (
      SELECT DISTINCT ON (tenant_id, empleado_id)
        id, tenant_id, empleado_id, user_id, status, activated_at, last_seen_at
      FROM employee_app_links
      WHERE tenant_id = $1
        AND status = 'ACTIVE'
      ORDER BY tenant_id, empleado_id, activated_at DESC
    )
    ${employeeReadinessSelect(`
      LEFT JOIN latest_invite li ON li.tenant_id = e.tenant_id AND li.empleado_id = e.id
      LEFT JOIN active_link al ON al.tenant_id = e.tenant_id AND al.empleado_id = e.id
      WHERE e.tenant_id = $1
        AND e.activo = true
      ORDER BY e.apellidos, e.nombres
    `)
      .replace('SELECT\n      e.id,', `SELECT
      e.id,`)
      .replace('ws.tolerance_minutes', `ws.tolerance_minutes,
      li.id AS invite_id,
      li.email AS invite_email,
      li.status AS invite_status,
      li.expires_at AS invite_expires_at,
      li.accepted_at AS invite_accepted_at,
      li.revoked_at AS invite_revoked_at,
      li.invite_resend_count AS invite_resend_count,
      al.id AS link_id,
      al.user_id AS app_user_id,
      al.status AS link_status,
      al.activated_at AS link_activated_at,
      al.last_seen_at AS link_last_seen_at`)}
  `, [tenantId]);

  return result.rows.map((row) => ({
    empleado: {
      id: row.id,
      cedula: row.cedula,
      nombres: row.nombres,
      apellidos: row.apellidos,
      cargo: row.cargo,
      departamento: row.departamento,
      emailPersonal: row.email_personal,
      telefono: row.telefono,
    },
    readiness: buildReadiness(row, { requireEmail: true }),
    invite: row.invite_id ? {
      id: row.invite_id,
      email: row.invite_email,
      status: row.invite_status,
      expiresAt: row.invite_expires_at,
      acceptedAt: row.invite_accepted_at,
      revokedAt: row.invite_revoked_at,
      resendCount: Number(row.invite_resend_count || 0),
    } : null,
    link: row.link_id ? {
      id: row.link_id,
      userId: row.app_user_id,
      status: row.link_status,
      activatedAt: row.link_activated_at,
      lastSeenAt: row.link_last_seen_at,
    } : null,
  }));
}

async function expirePendingEmployeeInvites({ tenantId, queryable = db } = {}) {
  const params = [INVITE_STATUS.EXPIRED, INVITE_STATUS.PENDING];
  let whereTenant = '';
  if (tenantId) {
    params.push(tenantId);
    whereTenant = `AND tenant_id = $${params.length}`;
  }

  const result = await queryable.query(`
    UPDATE employee_app_invites
    SET status = $1,
        updated_at = NOW(),
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('expiredBy', 'E2E26')
    WHERE status = $2
      AND expires_at <= NOW()
      ${whereTenant}
    RETURNING id, tenant_id, empleado_id
  `, params);

  return result.rows;
}

async function generateUniqueInviteCode(queryable, employee) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = generateInviteCode(employee.departamento || employee.nombres || 'NEC');
    const exists = await queryable.query(
      'SELECT id FROM employee_app_invites WHERE invite_code_hash = $1 AND status = $2 LIMIT 1',
      [hashInviteCode(code), INVITE_STATUS.PENDING]
    );
    if (exists.rows.length === 0) return code;
  }

  throw new AppError('No se pudo generar un codigo unico de activacion.', {
    code: 'EMPLOYEE_APP_INVITE_CODE_UNAVAILABLE',
    statusCode: 500,
  });
}

async function createEmployeeInvitation({ tenantId, empleadoId, userId, correlationId, ipAddress }) {
  const client = await db.getClient(tenantId, userId);
  try {
    const { employee, readiness } = await assertEmployeeReadyForInvite(empleadoId, tenantId, client);
    const code = await generateUniqueInviteCode(client, employee);
    const expiresAt = addDays(new Date(), INVITE_TTL_DAYS);
    const email = normalizeEmail(employee.email_personal);

    const existing = await client.query(`
      SELECT *
      FROM employee_app_invites
      WHERE tenant_id = $1
        AND empleado_id = $2
        AND status = $3
      LIMIT 1
    `, [tenantId, empleadoId, INVITE_STATUS.PENDING]);

    const payload = [
      email,
      hashInviteCode(code),
      expiresAt,
      userId || null,
      PRIVACY_VERSION,
      JSON.stringify({ readiness, issuedBy: 'EAA26' }),
    ];

    const inviteResult = existing.rows[0]
      ? await client.query(`
          UPDATE employee_app_invites
          SET email = $1,
              invite_code_hash = $2,
              expires_at = $3,
              invited_by_user_id = $4,
              invite_resend_count = invite_resend_count + 1,
              privacy_notice_version = $5,
              metadata = $6,
              updated_at = NOW()
          WHERE id = $7
          RETURNING *
        `, [...payload, existing.rows[0].id])
      : await client.query(`
          INSERT INTO employee_app_invites (
            tenant_id, empleado_id, email, invite_code_hash, expires_at,
            invited_by_user_id, privacy_notice_version, metadata
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          RETURNING *
        `, [tenantId, empleadoId, ...payload]);

    await insertAudit(client, {
      tenantId,
      userId,
      correlationId,
      action: existing.rows[0] ? 'employee_app_invite.refresh' : 'employee_app_invite.create',
      entity: 'employee_app_invites',
      entityId: inviteResult.rows[0].id,
      newData: { empleadoId, expiresAt, status: INVITE_STATUS.PENDING },
      ipAddress,
    });

    await db.commit(client);
    const invite = invitePublicPayload(inviteResult.rows[0], code);
    invite.delivery = await sendEmployeeInvite({
      employee,
      invite,
      correlationId,
      userId,
    });
    return invite;
  } catch (err) {
    await db.rollback(client);
    throw err;
  }
}

async function resendEmployeeInvitation({ tenantId, inviteId, userId, correlationId, ipAddress }) {
  const client = await db.getClient(tenantId, userId);
  try {
    await expirePendingEmployeeInvites({ tenantId, queryable: client });

    const existing = await client.query(`
      SELECT i.*, e.nombres, e.apellidos, e.departamento, e.email_personal, e.telefono, e.whatsapp_consent_at
      FROM employee_app_invites i
      JOIN empleados e ON e.id = i.empleado_id AND e.tenant_id = i.tenant_id
      WHERE i.id = $1
        AND i.tenant_id = $2
      LIMIT 1
    `, [inviteId, tenantId]);

    if (!existing.rows[0]) {
      throw new AppError('Invitacion no encontrada.', {
        code: 'EMPLOYEE_APP_INVITE_NOT_FOUND',
        statusCode: 404,
      });
    }

    if (existing.rows[0].status === INVITE_STATUS.ACCEPTED) {
      throw new AppError('La invitacion ya fue aceptada.', {
        code: 'EMPLOYEE_APP_INVITE_ALREADY_ACCEPTED',
        statusCode: 409,
      });
    }

    const { readiness } = await assertEmployeeReadyForInvite(existing.rows[0].empleado_id, tenantId, client);
    const code = await generateUniqueInviteCode(client, existing.rows[0]);
    const expiresAt = addDays(new Date(), INVITE_TTL_DAYS);

    const updated = await client.query(`
      UPDATE employee_app_invites
      SET email = $1,
          invite_code_hash = $2,
          status = $3,
          expires_at = $4,
          invited_by_user_id = $5,
          invite_resend_count = invite_resend_count + 1,
          revoked_at = NULL,
          revoked_by_user_id = NULL,
          metadata = $6,
          updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `, [
      normalizeEmail(existing.rows[0].email_personal),
      hashInviteCode(code),
      INVITE_STATUS.PENDING,
      expiresAt,
      userId || null,
      JSON.stringify({ readiness, resentBy: 'EAA26' }),
      inviteId,
    ]);

    await insertAudit(client, {
      tenantId,
      userId,
      correlationId,
      action: 'employee_app_invite.resend',
      entity: 'employee_app_invites',
      entityId: inviteId,
      newData: { expiresAt, status: INVITE_STATUS.PENDING },
      ipAddress,
    });

    await db.commit(client);
    const invite = invitePublicPayload(updated.rows[0], code);
    invite.delivery = await sendEmployeeInvite({
      employee: existing.rows[0],
      invite,
      correlationId,
      userId,
    });
    return invite;
  } catch (err) {
    await db.rollback(client);
    throw err;
  }
}

async function revokeEmployeeInvitation({ tenantId, inviteId, userId, correlationId, ipAddress }) {
  const result = await db.query(`
    UPDATE employee_app_invites
    SET status = $1,
        revoked_at = NOW(),
        revoked_by_user_id = $2,
        updated_at = NOW()
    WHERE id = $3
      AND tenant_id = $4
      AND status = $5
    RETURNING *
  `, [INVITE_STATUS.REVOKED, userId || null, inviteId, tenantId, INVITE_STATUS.PENDING]);

  if (!result.rows[0]) {
    throw new AppError('No encontramos una invitacion pendiente para revocar.', {
      code: 'EMPLOYEE_APP_INVITE_NOT_PENDING',
      statusCode: 404,
    });
  }

  await insertAudit(db, {
    tenantId,
    userId,
    correlationId,
    action: 'employee_app_invite.revoke',
    entity: 'employee_app_invites',
    entityId: inviteId,
    newData: { status: INVITE_STATUS.REVOKED },
    ipAddress,
  });

  return invitePublicPayload(result.rows[0]);
}

async function resolveLinkedEmployee({ tenantId, userId, email, role, requireExplicitLink = true }) {
  const linked = await db.query(`
    SELECT
      e.id, e.cedula, e.nombres, e.apellidos, e.cargo, e.departamento, e.email_personal,
      l.id AS app_link_id, l.status AS app_link_status
    FROM employee_app_links l
    JOIN empleados e
      ON e.id = l.empleado_id
      AND e.tenant_id = l.tenant_id
      AND e.activo = true
    WHERE l.tenant_id = $1
      AND l.user_id = $2
      AND l.status = $3
    ORDER BY l.activated_at DESC
    LIMIT 1
  `, [tenantId, userId, LINK_STATUS.ACTIVE]);

  if (linked.rows[0]) {
    await db.query(
      'UPDATE employee_app_links SET last_seen_at = NOW(), updated_at = NOW() WHERE id = $1',
      [linked.rows[0].app_link_id]
    );
    return { employee: linked.rows[0], linkSource: 'employee_app_link' };
  }

  if (requireExplicitLink && String(role || '').toLowerCase() === 'empleado') {
    throw new AppError('Activa tu acceso de empleado antes de registrar asistencia.', {
      code: 'MOBILE_EMPLOYEE_LINK_REQUIRED',
      statusCode: 409,
    });
  }

  const fallback = await db.query(`
    SELECT id, cedula, nombres, apellidos, cargo, departamento, email_personal
    FROM empleados
    WHERE tenant_id = $1
      AND activo = true
      AND LOWER(email_personal) = LOWER($2)
    LIMIT 1
  `, [tenantId, email]);

  if (!fallback.rows[0]) {
    throw new AppError('No encontramos un empleado activo vinculado a este usuario movil.', {
      code: 'MOBILE_EMPLOYEE_NOT_FOUND',
      statusCode: 404,
    });
  }

  return { employee: fallback.rows[0], linkSource: 'email_fallback' };
}

async function acceptEmployeeInvitation(payload = {}, requestMeta = {}) {
  const normalizedCode = normalizeInviteCode(payload.inviteCode || payload.codigo || payload.code);
  const normalizedEmail = normalizeEmail(payload.email);
  const password = String(payload.password || '');
  const acceptedPrivacy = Boolean(payload.acceptedPrivacy || payload.aceptaPrivacidad);
  const lopdpConsent = Boolean(payload.lopdpConsent || payload.acceptedDataProcessing);
  const geolocationConsent = Boolean(payload.geolocationConsent || payload.acceptedGeolocation);

  if (!normalizedCode || !normalizedEmail || !password) {
    throw new AppError('Codigo, email y contrasena son requeridos.', {
      code: 'EMPLOYEE_APP_ACCEPT_REQUIRED_FIELDS',
      statusCode: 400,
    });
  }

  if (password.length < 8) {
    throw new AppError('La contrasena debe tener al menos 8 caracteres.', {
      code: 'EMPLOYEE_APP_PASSWORD_TOO_SHORT',
      statusCode: 422,
    });
  }

  if (!acceptedPrivacy || !lopdpConsent || !geolocationConsent) {
    throw new AppError('Debes aceptar privacidad, tratamiento de datos y geolocalizacion para usar la app de asistencia.', {
      code: 'EMPLOYEE_APP_CONSENT_REQUIRED',
      statusCode: 422,
    });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const inviteResult = await client.query(`
      SELECT
        i.*,
        e.cedula,
        e.nombres,
        e.apellidos,
        e.email_personal,
        e.activo
      FROM employee_app_invites i
      JOIN empleados e ON e.id = i.empleado_id AND e.tenant_id = i.tenant_id
      WHERE i.invite_code_hash = $1
        AND i.status = $2
        AND i.expires_at > NOW()
      LIMIT 1
    `, [hashInviteCode(normalizedCode), INVITE_STATUS.PENDING]);

    const invite = inviteResult.rows[0];
    if (!invite || !invite.activo) {
      throw new AppError('No pudimos activar la invitacion. Revisa el codigo o solicita uno nuevo a RRHH.', {
        code: 'EMPLOYEE_APP_INVITE_INVALID',
        statusCode: 400,
      });
    }

    if (normalizeEmail(invite.email || invite.email_personal) !== normalizedEmail) {
      throw new AppError('No pudimos activar la invitacion. Revisa el codigo o solicita uno nuevo a RRHH.', {
        code: 'EMPLOYEE_APP_INVITE_INVALID',
        statusCode: 400,
      });
    }

    if (payload.cedula && String(payload.cedula).replace(/\D/g, '') !== String(invite.cedula || '').replace(/\D/g, '')) {
      throw new AppError('No pudimos activar la invitacion. Revisa el codigo o solicita uno nuevo a RRHH.', {
        code: 'EMPLOYEE_APP_INVITE_INVALID',
        statusCode: 400,
      });
    }

    const { readiness } = await resolveAttendanceReadiness(invite.empleado_id, invite.tenant_id, client);
    if (!readiness.ready) {
      throw new AppError('RRHH debe completar unidad, zona y jornada antes de activar esta app.', {
        code: 'EMPLOYEE_APP_CONFIG_BLOCKED',
        statusCode: 409,
        details: { blockers: readiness.blockers },
      });
    }

    let userResult = await client.query(
      'SELECT * FROM usuarios WHERE tenant_id = $1 AND LOWER(email) = LOWER($2) LIMIT 1',
      [invite.tenant_id, normalizedEmail]
    );
    let usuario = userResult.rows[0];

    if (usuario) {
      if (usuario.rol !== 'empleado') {
        throw new AppError('El correo ya pertenece a un usuario administrativo. Usa otro correo o solicita soporte.', {
          code: 'EMPLOYEE_APP_EMAIL_ROLE_CONFLICT',
          statusCode: 409,
        });
      }

      const passwordOk = await bcrypt.compare(password, usuario.password_hash);
      if (!passwordOk) {
        throw new AppError('No pudimos activar la invitacion. Revisa el codigo o solicita uno nuevo a RRHH.', {
          code: 'EMPLOYEE_APP_INVITE_INVALID',
          statusCode: 400,
        });
      }
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      userResult = await client.query(`
        INSERT INTO usuarios (tenant_id, email, password_hash, rol, nombres, apellidos, email_verificado_en)
        VALUES ($1, lower($2), $3, 'empleado', $4, $5, NOW())
        RETURNING *
      `, [invite.tenant_id, normalizedEmail, passwordHash, invite.nombres || '', invite.apellidos || '']);
      usuario = userResult.rows[0];
    }

    await client.query(`
      UPDATE employee_app_links
      SET status = $1,
          disabled_at = NOW(),
          updated_at = NOW()
      WHERE tenant_id = $2
        AND (empleado_id = $3 OR user_id = $4)
        AND status = $5
    `, [LINK_STATUS.DISABLED, invite.tenant_id, invite.empleado_id, usuario.id, LINK_STATUS.ACTIVE]);

    const linkResult = await client.query(`
      INSERT INTO employee_app_links (
        tenant_id, empleado_id, user_id, privacy_notice_version, consent_snapshot, device_hint_hash
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
    `, [
      invite.tenant_id,
      invite.empleado_id,
      usuario.id,
      PRIVACY_VERSION,
      JSON.stringify({
        acceptedPrivacy,
        lopdpConsent,
        geolocationConsent,
        acceptedAt: new Date().toISOString(),
        source: 'mobile_activation',
      }),
      payload.deviceHint ? hashInviteCode(payload.deviceHint) : null,
    ]);
    await syncEmployeeActivationConsents(client, {
      tenantId: invite.tenant_id,
      userId: usuario.id,
    });

    await client.query(`
      UPDATE employee_app_invites
      SET status = $1,
          accepted_at = NOW(),
          accepted_by_user_id = $2,
          privacy_notice_version = $3,
          updated_at = NOW()
      WHERE id = $4
    `, [INVITE_STATUS.ACCEPTED, usuario.id, PRIVACY_VERSION, invite.id]);

    await insertAudit(client, {
      tenantId: invite.tenant_id,
      userId: usuario.id,
      correlationId: requestMeta.correlationId,
      action: 'employee_app_invite.accept',
      entity: 'employee_app_links',
      entityId: linkResult.rows[0].id,
      newData: { empleadoId: invite.empleado_id, userId: usuario.id },
      ipAddress: requestMeta.ipAddress || null,
    });

    await client.query('COMMIT');

    const token = generateToken(usuario);
    return {
      success: true,
      token,
      usuario: {
        id: usuario.id,
        tenantId: usuario.tenant_id,
        email: usuario.email,
        rol: usuario.rol,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
      },
      employee: {
        id: invite.empleado_id,
        nombres: invite.nombres,
        apellidos: invite.apellidos,
        cedula: invite.cedula,
      },
      link: {
        id: linkResult.rows[0].id,
        status: linkResult.rows[0].status,
      },
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  INVITE_STATUS,
  LINK_STATUS,
  PRIVACY_VERSION,
  acceptEmployeeInvitation,
  buildReadiness,
  createEmployeeInvitation,
  employeeReadinessSelect,
  expirePendingEmployeeInvites,
  hashInviteCode,
  listEmployeeAppInvitations,
  normalizeInviteCode,
  resendEmployeeInvitation,
  resolveAttendanceReadiness,
  resolveLinkedEmployee,
  revokeEmployeeInvitation,
};
