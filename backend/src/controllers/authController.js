const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/database');
const { generateToken } = require('../middleware/auth');
const { verifyJwt } = require('../config/jwt');
const {
  sendEmailVerification,
  sendPasswordReset,
} = require('../services/communicationService');
const { CONSENT_SCOPES, LOPDP_VERSION } = require('../services/privacyConsentService');

const OWNER_LOPDP_VERSION = 'LOPDP-2026-06';
const AUTH_ROLE_PRIORITY = new Map([
  ['superadmin', 5],
  ['owner', 4],
  ['admin_rrhh', 3],
  ['supervisor', 2],
  ['empleado', 1],
]);

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

function rolePriority(role) {
  return AUTH_ROLE_PRIORITY.get(normalizeRole(role)) || 0;
}

function pickAuthenticatedUser(users) {
  return [...users].sort((a, b) => rolePriority(b.rol) - rolePriority(a.rol))[0];
}

function buildUserPayload(usuario) {
  return {
    id: usuario.id,
    tenantId: usuario.tenant_id,
    tenantRuc: usuario.tenant_ruc || null,
    tenantRazonSocial: usuario.tenant_razon_social || null,
    email: usuario.email,
    rol: normalizeRole(usuario.rol),
    nombres: usuario.nombres,
    apellidos: usuario.apellidos,
    emailVerificadoEn: usuario.email_verificado_en || null,
  };
}

function hashCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

function generateVerificationCode() {
  return String(crypto.randomInt(100000, 999999));
}

function hasAcceptedLopdpConsent(value) {
  if (value === true) return true;
  if (!value || typeof value !== 'object') return false;
  return Boolean(value.acceptedDataProcessing || value.lopdpConsent || value.accepted);
}

function normalizeTenantHint(body = {}) {
  const tenantId = String(body.tenantId || '').trim();
  const tenantRuc = String(body.tenantRuc || body.ruc || '').replace(/\D/g, '');
  return { tenantId, tenantRuc };
}

function publicTenantChoice(row) {
  return {
    tenantId: row.tenant_id,
    ruc: row.tenant_ruc || null,
    razonSocial: row.tenant_razon_social || null,
  };
}

async function insertConsentAudit(queryable, { tenantId, userId, consent, ipAddress, correlationId }) {
  await queryable.query(`
    INSERT INTO audit_logs (
      tenant_id, user_id, correlation_id, accion, entidad, entidad_id,
      datos_anteriores, datos_nuevos, ip_address, metadata
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
  `, [
    tenantId,
    userId,
    correlationId || 'registro-publico',
    'lopdp.consent.owner.register',
    'usuarios',
    userId,
    JSON.stringify({}),
    JSON.stringify({ accepted: true, version: consent?.version || OWNER_LOPDP_VERSION }),
    ipAddress || null,
    JSON.stringify({
      source: 'public-register',
      acceptedAt: consent?.acceptedAt || new Date().toISOString(),
      acceptedTerms: Boolean(consent?.acceptedTerms),
      acceptedPrivacy: Boolean(consent?.acceptedPrivacy),
      acceptedDataProcessing: hasAcceptedLopdpConsent(consent),
    }),
  ]);
}

async function insertDefaultConsentPreferences(queryable, { tenantId, userId, consent, source }) {
  const acceptedOptional = new Set(['payphone_billing']);
  if (consent?.whatsappNotifications || consent?.whatsapp) acceptedOptional.add('whatsapp_notifications');
  if (consent?.productAnalytics || consent?.analytics) acceptedOptional.add('product_analytics');

  for (const definition of CONSENT_SCOPES) {
    const active = definition.defaultActive || acceptedOptional.has(definition.scope);
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
        consent?.version || LOPDP_VERSION,
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

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const tenantHint = normalizeTenantHint(req.body);

    if (!email || !password) {
      return res.status(400).json({
        error: 'AUTH_CAMPOS_REQUERIDOS',
        message: 'Email y contraseña requeridos.',
        correlationId: req.correlationId,
      });
    }

    const params = [email];
    const tenantFilters = [];
    if (tenantHint.tenantId) {
      params.push(tenantHint.tenantId);
      tenantFilters.push(`u.tenant_id = $${params.length}`);
    }
    if (tenantHint.tenantRuc) {
      params.push(tenantHint.tenantRuc);
      tenantFilters.push(`regexp_replace(COALESCE(t.ruc, ''), '\\D', '', 'g') = $${params.length}`);
    }

    const result = await db.query(
      `SELECT
         u.id, u.tenant_id, u.email, u.rol, u.nombres, u.apellidos,
         u.password_hash, u.activo, u.email_verificado_en, u.created_at,
         t.ruc AS tenant_ruc,
         t.razon_social AS tenant_razon_social
       FROM usuarios u
       LEFT JOIN tenants t ON t.id = u.tenant_id
       WHERE lower(u.email) = lower($1)
         AND u.activo = true
         ${tenantFilters.length > 0 ? `AND ${tenantFilters.join(' AND ')}` : ''}
       ORDER BY u.created_at DESC`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'AUTH_CREDENCIALES_INVALIDAS',
        message: 'Credenciales inválidas.',
        correlationId: req.correlationId,
      });
    }

    const matchingUsers = [];
    for (const row of result.rows) {
      if (await bcrypt.compare(password, row.password_hash)) {
        matchingUsers.push(row);
      }
    }

    if (matchingUsers.length === 0) {
      return res.status(401).json({
        error: 'AUTH_CREDENCIALES_INVALIDAS',
        message: 'Credenciales inválidas.',
        correlationId: req.correlationId,
      });
    }

    const superadminMatch = matchingUsers.find((row) => normalizeRole(row.rol) === 'superadmin');

    if (matchingUsers.length > 1 && !tenantHint.tenantId && !tenantHint.tenantRuc && !superadminMatch) {
      return res.status(409).json({
        error: 'AUTH_TENANT_REQUIRED',
        message: 'Este correo existe en mas de una empresa. Ingresa el RUC de la empresa para continuar.',
        tenants: matchingUsers.map(publicTenantChoice),
        correlationId: req.correlationId,
      });
    }

    const usuario = superadminMatch || pickAuthenticatedUser(matchingUsers);
    await db.query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1', [usuario.id]);

    const token = generateToken(usuario);
    const user = buildUserPayload(usuario);

    return res.json({ success: true, token, usuario: user, user });
  } catch (err) {
    return next(err);
  }
}

async function register(req, res, next) {
  try {
    const { email, password, rol, nombres, apellidos } = req.body;
    const requestedTenantId = String(req.body?.tenantId || '').trim();
    const tenantId = req.usuario?.rol === 'superadmin'
      ? requestedTenantId
      : req.usuario?.tenantId;

    if (!tenantId || !email || !password || !rol) {
      return res.status(400).json({
        error: 'AUTH_CAMPOS_REQUERIDOS',
        message: 'Faltan campos requeridos.',
        correlationId: req.correlationId,
      });
    }

    if (!['owner', 'admin_rrhh', 'supervisor', 'empleado'].includes(rol)) {
      return res.status(400).json({
        error: 'AUTH_ROL_INVALIDO',
        message: 'Rol inválido.',
        correlationId: req.correlationId,
      });
    }

    if (req.usuario?.rol === 'owner' && rol === 'owner') {
      return res.status(403).json({
        error: 'AUTH_OWNER_NO_PUEDE_CREAR_OWNER',
        message: 'Un OWNER no puede crear otro OWNER.',
        correlationId: req.correlationId,
      });
    }

    const existe = await db.query(
      'SELECT id FROM usuarios WHERE tenant_id = $1 AND lower(email) = lower($2)',
      [tenantId, email]
    );

    if (existe.rows.length > 0) {
      return res.status(409).json({
        error: 'AUTH_EMAIL_DUPLICADO',
        message: 'El email ya está registrado.',
        correlationId: req.correlationId,
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO usuarios (tenant_id, email, password_hash, rol, nombres, apellidos)
       VALUES ($1, lower($2), $3, $4, $5, $6)
       RETURNING *`,
      [tenantId, email, passwordHash, rol, nombres || '', apellidos || '']
    );

    const verificationCode = generateVerificationCode();
    await db.query(
      `INSERT INTO email_verification_tokens (usuario_id, token_hash, expira_en)
       VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
      [result.rows[0].id, hashCode(verificationCode)]
    );
    const delivery = await sendEmailVerification({
      to: result.rows[0].email,
      code: verificationCode,
      name: result.rows[0].nombres,
      correlationId: req.correlationId,
      userId: result.rows[0].id,
      tenantId: result.rows[0].tenant_id,
    });

    const user = buildUserPayload(result.rows[0]);
    return res.status(201).json({ success: true, usuario: user, user, nextStep: 'email-verification', delivery });
  } catch (err) {
    return next(err);
  }
}

async function publicRegister(req, res, next) {
  const client = await db.pool.connect();

  try {
    const {
      razonSocial,
      nombreComercial,
      ruc,
      email,
      password,
      nombres,
      apellidos,
      planId = 'TRIAL',
      acceptedTerms,
      acceptedPrivacy,
      lopdpConsent,
    } = req.body;

    if (!razonSocial || !email || !password || !nombres) {
      return res.status(400).json({
        error: 'REGISTRO_CAMPOS_REQUERIDOS',
        message: 'Razón social, email, contraseña y nombres son requeridos.',
        correlationId: req.correlationId,
      });
    }

    if (!acceptedTerms || !acceptedPrivacy || !hasAcceptedLopdpConsent(lopdpConsent)) {
      return res.status(400).json({
        error: 'REGISTRO_CONSENTIMIENTO_REQUERIDO',
        message: 'Debe aceptar términos y política de privacidad.',
        correlationId: req.correlationId,
      });
    }

    await client.query('BEGIN');

    const tenantResult = await client.query(
      `INSERT INTO tenants (ruc, razon_social, nombre_comercial, configuracion)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        ruc ? String(ruc).trim() : null,
        String(razonSocial).trim(),
        nombreComercial ? String(nombreComercial).trim() : null,
        JSON.stringify({
          registroPublico: true,
          acceptedTerms: true,
          acceptedPrivacy: true,
          lopdpConsent: lopdpConsent || null,
          lopdpConsentVersion: lopdpConsent?.version || OWNER_LOPDP_VERSION,
          lopdpConsentRecordedAt: new Date().toISOString(),
        }),
      ]
    );

    const tenant = tenantResult.rows[0];
    const passwordHash = await bcrypt.hash(password, 10);
    const userResult = await client.query(
      `INSERT INTO usuarios (tenant_id, email, password_hash, rol, nombres, apellidos)
       VALUES ($1, lower($2), $3, 'owner', $4, $5)
       RETURNING *`,
      [tenant.id, email, passwordHash, nombres, apellidos || '']
    );

    await insertConsentAudit(client, {
      tenantId: tenant.id,
      userId: userResult.rows[0].id,
      consent: lopdpConsent,
      ipAddress: req.ip,
      correlationId: req.correlationId,
    });
    await insertDefaultConsentPreferences(client, {
      tenantId: tenant.id,
      userId: userResult.rows[0].id,
      consent: lopdpConsent,
      source: 'public-register',
    });

    const requestedPlan = String(planId || 'TRIAL').trim().toUpperCase();
    const planCheck = await client.query(
      'SELECT id FROM planes_comerciales WHERE id = $1 AND activo = true',
      [requestedPlan]
    );
    const selectedPlanId = planCheck.rows[0]?.id || 'TRIAL';

    await client.query(
      `INSERT INTO suscripciones (tenant_id, plan_id, estado, vence_en, metadata)
       VALUES ($1, $2, 'trial', NOW() + INTERVAL '14 days', $3)`,
      [tenant.id, selectedPlanId, JSON.stringify({ source: 'public-register' })]
    );

    const verificationCode = generateVerificationCode();
    await client.query(
      `INSERT INTO email_verification_tokens (usuario_id, token_hash, expira_en)
       VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
      [userResult.rows[0].id, hashCode(verificationCode)]
    );

    const token = generateToken(userResult.rows[0]);
    const user = buildUserPayload(userResult.rows[0]);

    await client.query('COMMIT');

    const delivery = await sendEmailVerification({
      to: userResult.rows[0].email,
      code: verificationCode,
      name: userResult.rows[0].nombres,
      correlationId: req.correlationId,
      userId: userResult.rows[0].id,
      tenantId: tenant.id,
    });

    return res.status(201).json({
      success: true,
      token,
      usuario: user,
      user,
      tenant: {
        id: tenant.id,
        razonSocial: tenant.razon_social,
        nombreComercial: tenant.nombre_comercial,
      },
      nextStep: 'email-verification',
      delivery,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({
        error: 'REGISTRO_DUPLICADO',
        message: 'Ya existe una empresa o usuario con esos datos.',
        correlationId: req.correlationId,
      });
    }
    return next(err);
  } finally {
    client.release();
  }
}

async function refreshToken(req, res, next) {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'AUTH_TOKEN_REQUERIDO',
        message: 'Token requerido.',
        correlationId: req.correlationId,
      });
    }

    const decoded = verifyJwt(token);
    const result = await db.query(
      `SELECT
         u.id, u.tenant_id, u.email, u.rol, u.nombres, u.apellidos,
         u.password_hash, u.activo, u.email_verificado_en, u.created_at,
         t.ruc AS tenant_ruc,
         t.razon_social AS tenant_razon_social
       FROM usuarios u
       LEFT JOIN tenants t ON t.id = u.tenant_id
       WHERE u.id = $1 AND u.activo = true`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'AUTH_USUARIO_INACTIVO',
        message: 'Usuario no encontrado o inactivo.',
        correlationId: req.correlationId,
      });
    }

    const usuario = result.rows[0];
    const newToken = generateToken(usuario);
    const user = buildUserPayload(usuario);

    return res.json({ success: true, token: newToken, usuario: user, user });
  } catch (err) {
    if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRADO' : 'TOKEN_INVALIDO',
        message: err.name === 'TokenExpiredError' ? 'Token expirado.' : 'Token invalido.',
        correlationId: req.correlationId,
      });
    }
    if (
      err.code === 'ETIMEDOUT'
      || err.code === 'ECONNRESET'
      || err.message?.includes('Connection terminated due to connection timeout')
    ) {
      return res.status(503).json({
        error: 'AUTH_REFRESH_DB_UNAVAILABLE',
        message: 'No pudimos refrescar la sesion por un problema temporal de base de datos.',
        correlationId: req.correlationId,
      });
    }
    return next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'AUTH_EMAIL_REQUERIDO',
        message: 'Email requerido.',
        correlationId: req.correlationId,
      });
    }

    const result = await db.query(
      'SELECT id, tenant_id, email, nombres FROM usuarios WHERE lower(email) = lower($1) AND activo = true ORDER BY created_at DESC LIMIT 1',
      [email]
    );

    if (result.rows.length > 0) {
      const code = generateVerificationCode();
      await db.query(
        `INSERT INTO password_reset_tokens (usuario_id, token_hash, expira_en)
         VALUES ($1, $2, NOW() + INTERVAL '30 minutes')`,
        [result.rows[0].id, hashCode(code)]
      );

      await sendPasswordReset({
        to: result.rows[0].email,
        code,
        name: result.rows[0].nombres,
        correlationId: req.correlationId,
        userId: result.rows[0].id,
        tenantId: result.rows[0].tenant_id,
      });
    }

    return res.json({
      success: true,
      message: 'Si el correo existe, enviaremos instrucciones de recuperación.',
    });
  } catch (err) {
    return next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { email, code, password } = req.body;

    if (!email || !code || !password) {
      return res.status(400).json({
        error: 'AUTH_RESET_CAMPOS_REQUERIDOS',
        message: 'Email, código y nueva contraseña son requeridos.',
        correlationId: req.correlationId,
      });
    }

    const result = await db.query(
      `SELECT prt.id AS token_id, u.id AS usuario_id
       FROM password_reset_tokens prt
       JOIN usuarios u ON u.id = prt.usuario_id
       WHERE lower(u.email) = lower($1)
         AND prt.token_hash = $2
         AND prt.usado_en IS NULL
         AND prt.expira_en > NOW()
       ORDER BY prt.created_at DESC
       LIMIT 1`,
      [email, hashCode(code)]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: 'AUTH_RESET_TOKEN_INVALIDO',
        message: 'Código inválido o expirado.',
        correlationId: req.correlationId,
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await db.query('UPDATE usuarios SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
      passwordHash,
      result.rows[0].usuario_id,
    ]);
    await db.query('UPDATE password_reset_tokens SET usado_en = NOW() WHERE id = $1', [
      result.rows[0].token_id,
    ]);

    return res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
  } catch (err) {
    return next(err);
  }
}

async function requestEmailVerification(req, res, next) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'AUTH_EMAIL_REQUERIDO',
        message: 'Email requerido.',
        correlationId: req.correlationId,
      });
    }

    const result = await db.query(
      'SELECT id, tenant_id, email, nombres FROM usuarios WHERE lower(email) = lower($1) AND activo = true ORDER BY created_at DESC LIMIT 1',
      [email]
    );

    if (result.rows.length > 0) {
      const code = generateVerificationCode();
      await db.query(
        `INSERT INTO email_verification_tokens (usuario_id, token_hash, expira_en)
         VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
        [result.rows[0].id, hashCode(code)]
      );

      await sendEmailVerification({
        to: result.rows[0].email,
        code,
        name: result.rows[0].nombres,
        correlationId: req.correlationId,
        userId: result.rows[0].id,
        tenantId: result.rows[0].tenant_id,
      });
    }

    return res.json({
      success: true,
      message: 'Si el correo existe, enviaremos el código de verificación.',
    });
  } catch (err) {
    return next(err);
  }
}

async function confirmEmailVerification(req, res, next) {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        error: 'AUTH_VERIFICACION_CAMPOS_REQUERIDOS',
        message: 'Email y código son requeridos.',
        correlationId: req.correlationId,
      });
    }

    const result = await db.query(
      `SELECT evt.id AS token_id, u.id AS usuario_id
       FROM email_verification_tokens evt
       JOIN usuarios u ON u.id = evt.usuario_id
       WHERE lower(u.email) = lower($1)
         AND evt.token_hash = $2
         AND evt.confirmado_en IS NULL
         AND evt.expira_en > NOW()
       ORDER BY evt.created_at DESC
       LIMIT 1`,
      [email, hashCode(code)]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: 'AUTH_VERIFICACION_INVALIDA',
        message: 'Código inválido o expirado.',
        correlationId: req.correlationId,
      });
    }

    await db.query('UPDATE usuarios SET email_verificado_en = NOW(), updated_at = NOW() WHERE id = $1', [
      result.rows[0].usuario_id,
    ]);
    await db.query('UPDATE email_verification_tokens SET confirmado_en = NOW() WHERE id = $1', [
      result.rows[0].token_id,
    ]);

    return res.json({ success: true, message: 'Correo verificado correctamente.' });
  } catch (err) {
    return next(err);
  }
}

async function emailVerificationStatus(req, res) {
  return res.json({
    success: true,
    data: { verified: Boolean(req.usuario?.emailVerificadoEn) },
  });
}

async function sessionContext(req, res, next) {
  try {
    const result = await db.query(
      `SELECT
         u.id, u.tenant_id, u.email, u.rol, u.nombres, u.apellidos, u.email_verificado_en,
         t.ruc AS tenant_ruc,
         t.razon_social AS tenant_razon_social,
         owner_user.nombres AS owner_nombres,
         owner_user.apellidos AS owner_apellidos
       FROM usuarios u
       LEFT JOIN tenants t ON t.id = u.tenant_id
       LEFT JOIN LATERAL (
         SELECT o.nombres, o.apellidos
         FROM usuarios o
         WHERE o.tenant_id = u.tenant_id
           AND o.rol = 'owner'
           AND o.activo = true
         ORDER BY o.created_at ASC
         LIMIT 1
       ) owner_user ON true
       WHERE u.id = $1 AND u.activo = true
       LIMIT 1`,
      [req.usuarioId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'AUTH_USUARIO_INACTIVO',
        message: 'Usuario no encontrado o inactivo.',
        correlationId: req.correlationId,
      });
    }

    const usuario = result.rows[0];
    const user = buildUserPayload(usuario);

    return res.json({
      success: true,
      user,
      usuario: user,
      tenant: {
        id: usuario.tenant_id,
        ruc: usuario.tenant_ruc || null,
        razonSocial: usuario.tenant_razon_social || null,
        ownerName: [usuario.owner_nombres, usuario.owner_apellidos].filter(Boolean).join(' ').trim() || null,
      },
      correlationId: req.correlationId,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  login,
  register,
  publicRegister,
  refreshToken,
  forgotPassword,
  resetPassword,
  requestEmailVerification,
  confirmEmailVerification,
  emailVerificationStatus,
  sessionContext,
};
