// ============================================================
// SKNOMINA - Servicio de logo del tenant (empresa)
// Referencia: sinkroniq-mobile profileLogoService.js
// ============================================================
const db = require('../config/database');
const AppError = require('../utils/AppError');

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;
const LOGO_DATA_URL_REGEX = /^data:(image\/(png|jpeg|jpg));base64,(.+)$/i;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SOI = Buffer.from([0xff, 0xd8]);

function detectImageType(buf) {
  if (buf.length >= 8 && buf.slice(0, 8).equals(PNG_SIGNATURE)) return 'png';
  if (buf.length >= 2 && buf.slice(0, 2).equals(JPEG_SOI)) return 'jpeg';
  return null;
}

function validateLogoDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') {
    throw new AppError('Logo requerido como data URL base64.', {
      code: 'LOGO_DATA_URL_REQUERIDO',
      statusCode: 400,
    });
  }

  const match = dataUrl.match(LOGO_DATA_URL_REGEX);
  if (!match) {
    throw new AppError('Formato de logo invalido. Usa data:image/png;base64,... o data:image/jpeg;base64,...', {
      code: 'LOGO_FORMATO_INVALIDO',
      statusCode: 400,
    });
  }

  const mimeType = match[1].toLowerCase();
  const base64Content = match[3];
  const buffer = Buffer.from(base64Content, 'base64');

  if (buffer.length > MAX_LOGO_SIZE_BYTES) {
    throw new AppError(`El logo excede el tamano maximo de ${MAX_LOGO_SIZE_BYTES / 1024 / 1024}MB.`, {
      code: 'LOGO_TAMANO_EXCEDIDO',
      statusCode: 400,
    });
  }

  const detected = detectImageType(buffer);
  if (!detected) {
    throw new AppError('El archivo no es una imagen PNG o JPEG valida.', {
      code: 'LOGO_TIPO_NO_SOPORTADO',
      statusCode: 400,
    });
  }

  return { mimeType, buffer, base64Content, detected };
}

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
