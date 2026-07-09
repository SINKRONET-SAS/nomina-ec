// ============================================================
// SKNOMINA - Controlador de permisos por modulo
// Permite consultar y actualizar module_permissions de un usuario.
// ============================================================

const db = require('../config/database');
const AppError = require('../utils/AppError');
const { recordAudit } = require('../services/auditService');
const {
  ALL_MODULES,
  MODULE_CODES,
  resolveEffectivePermissions,
  DEFAULT_MODULE_PERMISSIONS,
  UNRESTRICTED_ROLES,
} = require('../config/modules');

/**
 * GET /api/usuarios/:id/permisos-modulo
 * Devuelve modulos disponibles, defaults del rol y permisos efectivos.
 */
async function obtener(req, res, next) {
  try {
    const { id } = req.params;

    const result = await db.query(
      'SELECT id, rol, module_permissions, tenant_id FROM usuarios WHERE id = $1 AND activo = true',
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('USUARIO_NO_ENCONTRADO', 404, 'Usuario no encontrado o inactivo.');
    }

    const usuario = result.rows[0];

    // Verificar que el solicitante puede gestionar este usuario (mismo tenant)
    if (req.usuario.tenantId && usuario.tenant_id !== req.usuario.tenantId) {
      throw new AppError('PERMISO_DENEGADO', 403, 'No puede gestionar permisos de usuarios de otro tenant.');
    }

    const rol = String(usuario.rol || '').trim().toLowerCase();
    const overrides = usuario.module_permissions || null;
    const effective = resolveEffectivePermissions(rol, overrides);
    const defaults = UNRESTRICTED_ROLES.has(rol)
      ? MODULE_CODES.reduce((acc, code) => { acc[code] = true; return acc; }, {})
      : (DEFAULT_MODULE_PERMISSIONS[rol] || {});

    return res.json({
      userId: usuario.id,
      rol,
      modules: ALL_MODULES,
      defaults,
      overrides,
      effective,
      isUnrestricted: UNRESTRICTED_ROLES.has(rol),
      correlationId: req.correlationId,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * PUT /api/usuarios/:id/permisos-modulo
 * Actualiza module_permissions del usuario.
 * Body: { permissions: { empleados: true, nomina: false, ... } }
 */
async function actualizar(req, res, next) {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!permissions || typeof permissions !== 'object') {
      throw new AppError('PAYLOAD_INVALIDO', 400, 'Se requiere un objeto "permissions" con los modulos.');
    }

    // Validar que solo contenga codigos de modulo validos
    const invalidKeys = Object.keys(permissions).filter((k) => !MODULE_CODES.includes(k));
    if (invalidKeys.length > 0) {
      throw new AppError('MODULO_INVALIDO', 400, `Modulos no reconocidos: ${invalidKeys.join(', ')}`);
    }

    // Validar que los valores sean booleanos
    for (const [key, value] of Object.entries(permissions)) {
      if (typeof value !== 'boolean') {
        throw new AppError('VALOR_INVALIDO', 400, `El valor de "${key}" debe ser booleano (true/false).`);
      }
    }

    // Verificar usuario objetivo
    const userResult = await db.query(
      'SELECT id, rol, tenant_id, module_permissions FROM usuarios WHERE id = $1 AND activo = true',
      [id]
    );

    if (userResult.rows.length === 0) {
      throw new AppError('USUARIO_NO_ENCONTRADO', 404, 'Usuario no encontrado o inactivo.');
    }

    const targetUser = userResult.rows[0];
    const targetRole = String(targetUser.rol || '').trim().toLowerCase();

    // No se pueden modificar permisos de roles irrestrictos
    if (UNRESTRICTED_ROLES.has(targetRole)) {
      throw new AppError('PERMISO_DENEGADO', 403, `No se pueden modificar permisos de modulo del rol "${targetRole}".`);
    }

    // Verificar mismo tenant
    if (req.usuario.tenantId && targetUser.tenant_id !== req.usuario.tenantId) {
      throw new AppError('PERMISO_DENEGADO', 403, 'No puede gestionar permisos de usuarios de otro tenant.');
    }

    // Construir overrides: solo guardar las diferencias con los defaults
    const defaults = DEFAULT_MODULE_PERMISSIONS[targetRole] || {};
    const cleanOverrides = {};
    let hasOverrides = false;

    for (const code of MODULE_CODES) {
      if (typeof permissions[code] === 'boolean' && permissions[code] !== (defaults[code] || false)) {
        cleanOverrides[code] = permissions[code];
        hasOverrides = true;
      }
    }

    const newValue = hasOverrides ? cleanOverrides : null;
    const previousValue = targetUser.module_permissions;

    await db.query(
      'UPDATE usuarios SET module_permissions = $1, updated_at = NOW() WHERE id = $2',
      [newValue ? JSON.stringify(newValue) : null, id]
    );

    await recordAudit({
      action: 'module_permissions_update',
      entity: 'usuario',
      entityId: id,
      userId: req.usuario.id,
      tenantId: req.usuario.tenantId,
      metadata: {
        targetRole,
        previousOverrides: previousValue,
        newOverrides: newValue,
      },
      correlationId: req.correlationId,
      ipAddress: req.ip,
    });

    const effective = resolveEffectivePermissions(targetRole, newValue);

    return res.json({
      success: true,
      userId: id,
      rol: targetRole,
      overrides: newValue,
      effective,
      correlationId: req.correlationId,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { obtener, actualizar };
