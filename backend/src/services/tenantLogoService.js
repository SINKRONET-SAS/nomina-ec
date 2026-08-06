// ============================================================
// SKNOMINA - Servicio de logo del tenant (empresa)
// Referencia: sinkroniq-mobile profileLogoService.js
// ============================================================
const db = require('../config/database');
const AppError = require('../utils/AppError');
const { validateLogoDataUrl } = require('../utils/logoDataUrl');

async function uploadTenantLogo(tenantId, dataUrl) {
  if (!tenantId) {
    throw new AppError('Tenant requerido para subir logo.', {
      code: 'LOGO_TENANT_REQUERIDO',
      statusCode: 400,
    });
  }

  const { mimeType } = validateLogoDataUrl(dataUrl);
  const normalizedDataUrl = dataUrl.startsWith('data:') ? dataUrl : `data:${mimeType};base64,${dataUrl}`;

  await db.query(`
    UPDATE tenants
    SET configuracion = jsonb_set(
      COALESCE(configuracion, '{}'::jsonb),
      '{logoBase64}',
      $2::jsonb
    ),
    updated_at = NOW()
    WHERE id = $1
  `, [tenantId, JSON.stringify(normalizedDataUrl)]);

  return { success: true, mimeType };
}

async function removeTenantLogo(tenantId) {
  if (!tenantId) {
    throw new AppError('Tenant requerido para eliminar logo.', {
      code: 'LOGO_TENANT_REQUERIDO',
      statusCode: 400,
    });
  }

  await db.query(`
    UPDATE tenants
    SET configuracion = configuracion - 'logoBase64',
        updated_at = NOW()
    WHERE id = $1
  `, [tenantId]);

  return { success: true };
}

async function getTenantLogoBase64(tenantId) {
  const result = await db.query(`
    SELECT configuracion->>'logoBase64' AS logo_base64
    FROM tenants
    WHERE id = $1
  `, [tenantId]);

  return result.rows[0]?.logo_base64 || null;
}

module.exports = {
  uploadTenantLogo,
  removeTenantLogo,
  getTenantLogoBase64,
  validateLogoDataUrl,
};
