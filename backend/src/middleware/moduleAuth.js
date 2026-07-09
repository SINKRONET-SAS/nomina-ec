// ============================================================
// SKNOMINA - Middleware de autorizacion por modulo
// Verifica que el usuario tenga acceso al modulo solicitado.
// ============================================================

const db = require('../config/database');
const { resolveEffectivePermissions, UNRESTRICTED_ROLES } = require('../config/modules');

/**
 * Carga module_permissions del usuario desde la DB y lo cachea en req.usuario.
 * Solo consulta si no esta ya cacheado.
 */
async function loadModulePermissions(req) {
  if (req.usuario._modulePermissionsLoaded) return;

  const rol = String(req.usuario.rol || '').trim().toLowerCase();
  if (UNRESTRICTED_ROLES.has(rol)) {
    req.usuario._modulePermissionsLoaded = true;
    req.usuario.modulePermissions = null;
    return;
  }

  const result = await db.query(
    'SELECT module_permissions FROM usuarios WHERE id = $1',
    [req.usuario.id]
  );

  req.usuario.modulePermissions = result.rows[0]?.module_permissions || null;
  req.usuario._modulePermissionsLoaded = true;
}

/**
 * Middleware factory que verifica acceso a un modulo del sistema.
 * Debe usarse DESPUES de authenticateToken y requireRole.
 *
 * @param {string} moduleCode - Codigo del modulo (ej: 'nomina', 'documentos')
 * @returns {Function} Middleware Express
 */
function requireModule(moduleCode) {
  return async (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        error: 'NO_AUTORIZADO',
        message: 'Autenticacion requerida.',
        correlationId: req.correlationId,
      });
    }

    const rol = String(req.usuario.rol || '').trim().toLowerCase();

    // Roles irrestrictos siempre pasan
    if (UNRESTRICTED_ROLES.has(rol)) {
      return next();
    }

    try {
      await loadModulePermissions(req);
    } catch (err) {
      console.error(`[moduleAuth] Error cargando permisos de modulo para usuario ${req.usuario.id}:`, err.message);
      return res.status(500).json({
        error: 'ERROR_PERMISOS_MODULO',
        message: 'No se pudieron cargar los permisos de modulo.',
        correlationId: req.correlationId,
      });
    }

    const effective = resolveEffectivePermissions(rol, req.usuario.modulePermissions);

    if (!effective[moduleCode]) {
      return res.status(403).json({
        error: 'MODULO_NO_AUTORIZADO',
        message: `No tiene acceso al modulo "${moduleCode}". Contacte al administrador para solicitar permisos.`,
        module: moduleCode,
        correlationId: req.correlationId,
      });
    }

    return next();
  };
}

module.exports = { requireModule, loadModulePermissions };
