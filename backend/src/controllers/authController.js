const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/database');
const { generateToken } = require('../middleware/auth');
const { verifyJwt } = require('../config/jwt');
const {
  sendEmailVerification,
  sendPasswordReset,
} = require('../services/communicationService');

function buildUserPayload(usuario) {
  return {
    id: usuario.id,
    tenantId: usuario.tenant_id,
    email: usuario.email,
    rol: usuario.rol,
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

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'AUTH_CAMPOS_REQUERIDOS',
        message: 'Email y contraseña requeridos.',
        correlationId: req.correlationId,
      });
    }

    const result = await db.query(
      'SELECT * FROM usuarios WHERE lower(email) = lower($1) AND activo = true ORDER BY created_at DESC LIMIT 1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'AUTH_CREDENCIALES_INVALIDAS',
        message: 'Credenciales inválidas.',
        correlationId: req.correlationId,
      });
    }

    const usuario = result.rows[0];
    const validPassword = await bcrypt.compare(password, usuario.password_hash);
    if (!validPassword) {
      return res.status(401).json({
        error: 'AUTH_CREDENCIALES_INVALIDAS',
        message: 'Credenciales inválidas.',
        correlationId: req.correlationId,
      });
    }

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
    const { tenantId, email, password, rol, nombres, apellidos } = req.body;

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

    if (!acceptedTerms || !acceptedPrivacy) {
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
    const result = await db.query('SELECT * FROM usuarios WHERE id = $1 AND activo = true', [
      decoded.userId,
    ]);

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
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'TOKEN_EXPIRADO',
        message: 'Token expirado.',
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
};
