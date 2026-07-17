// ============================================================
// SKNOMINA - Resolucion canonica de identidad empresarial
// ============================================================
const db = require('../config/database');
const AppError = require('../utils/AppError');

const COMPANY_CATALOG_TYPE = 'empresa_operativa';
const COMPANY_IDENTITY_SOURCE = `configuration_catalogs.${COMPANY_CATALOG_TYPE}`;

function normalizeObject(value) {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (err) {
    return {};
  }
}

function cleanText(value, fallback = '') {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ');
  return text || fallback;
}

function firstText(values, fallback = '') {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return fallback;
}

function hasRepresentativeIdentity(config = {}, tenantRow = {}) {
  const name = firstText([
    config.representanteLegal,
    config.representante_legal,
    config.legalRepresentative,
    tenantRow.representante_legal,
  ]);
  const identification = firstText([
    config.representanteLegalIdentificacion,
    config.representante_legal_identificacion,
    config.legalRepresentativeId,
    config.cedulaRepresentanteLegal,
    tenantRow.representante_legal_identificacion,
  ]);
  return Boolean(name && identification);
}

function companyCatalogPayloadFromRow(tenantRow = {}) {
  if (!Object.prototype.hasOwnProperty.call(tenantRow, 'company_operativa_payload')) return null;
  return normalizeObject(tenantRow.company_operativa_payload);
}

async function loadCompanyCatalogPayload({ tenantId, correlationId = null, userId = null } = {}) {
  if (!tenantId) {
    throw new AppError('Empresa requerida para resolver la identidad documental.', {
      code: 'COMPANY_IDENTITY_TENANT_REQUIRED',
      statusCode: 400,
      correlationId,
      userId,
    });
  }

  try {
    const result = await db.query(`
      SELECT payload
      FROM configuration_catalogs
      WHERE tenant_id = $1
        AND catalog_type = $2
        AND status = 'activo'
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1
    `, [tenantId, COMPANY_CATALOG_TYPE]);
    return normalizeObject(result.rows[0]?.payload);
  } catch (err) {
    console.error('[IDENTIDAD] Error consultando Datos de empresa', {
      code: err.code || 'COMPANY_IDENTITY_CATALOG_QUERY_FAILED',
      statusCode: err.statusCode || 503,
      correlationId,
      userId: userId || null,
      tenantId,
      message: err.message,
    });
    throw new AppError('No se pudo consultar la identidad documental de la empresa.', {
      code: 'COMPANY_IDENTITY_CATALOG_QUERY_FAILED',
      statusCode: 503,
      correlationId,
      userId,
      details: { tenantId },
    });
  }
}

function buildCompanyIdentity({ tenantRow = {}, legacyConfig = {}, catalogConfig = {} } = {}) {
  const config = {
    ...normalizeObject(legacyConfig),
    ...normalizeObject(catalogConfig),
  };
  const representative = firstText([
    config.representanteLegal,
    config.representante_legal,
    config.legalRepresentative,
    tenantRow.representante_legal,
  ], 'Representante legal/delegado autorizado');
  const representativeId = firstText([
    config.representanteLegalIdentificacion,
    config.representante_legal_identificacion,
    config.legalRepresentativeId,
    config.cedulaRepresentanteLegal,
    tenantRow.representante_legal_identificacion,
  ], 'no registrada');
  const representativeRole = firstText([
    config.representanteLegalCargo,
    config.representante_legal_cargo,
    config.legalRepresentativeTitle,
  ], 'Representante legal / delegado del empleador');
  const complete = representative !== 'Representante legal/delegado autorizado'
    && representativeId !== 'no registrada';

  return {
    ...tenantRow,
    configuracion: config,
    razon_social: firstText([config.razonSocial, config.razon_social, tenantRow.razon_social, tenantRow.razonSocial]),
    ruc: firstText([config.ruc, tenantRow.ruc]),
    direccion: firstText([config.direccion, config.direccionMatriz, config.direccion_matriz, tenantRow.direccion]),
    representante_legal: representative,
    representante_legal_identificacion: representativeId,
    representante_legal_cargo: representativeRole,
    logoBase64: config.logoBase64 || tenantRow.logoBase64 || null,
    companyIdentityComplete: complete,
  };
}

async function resolveCompanyIdentity({
  tenantId,
  tenantRow = {},
  correlationId = null,
  userId = null,
  queryCatalog = false,
} = {}) {
  const legacyConfig = normalizeObject(tenantRow.tenant_configuracion || tenantRow.configuracion || tenantRow.config);
  const rowCatalogConfig = companyCatalogPayloadFromRow(tenantRow);
  const catalogConfig = rowCatalogConfig || (queryCatalog
    ? await loadCompanyCatalogPayload({ tenantId, correlationId, userId })
    : {});
  const source = Object.keys(catalogConfig).length > 0
    ? COMPANY_IDENTITY_SOURCE
    : Object.keys(legacyConfig).length > 0
      ? 'tenants.configuracion'
      : 'fallback';
  const identity = buildCompanyIdentity({ tenantRow, legacyConfig, catalogConfig });
  identity.companyIdentitySource = source;
  identity.companyIdentityResolution = {
    source,
    complete: identity.companyIdentityComplete,
    catalogType: COMPANY_CATALOG_TYPE,
  };

  if (!identity.companyIdentityComplete) {
    console.warn('[IDENTIDAD] Datos de representante legal incompletos', {
      code: 'COMPANY_IDENTITY_INCOMPLETE',
      statusCode: 422,
      correlationId,
      userId: userId || null,
      tenantId: tenantId || tenantRow.id || null,
      source,
    });
  }

  return identity;
}

module.exports = {
  COMPANY_CATALOG_TYPE,
  COMPANY_IDENTITY_SOURCE,
  buildCompanyIdentity,
  hasRepresentativeIdentity,
  loadCompanyCatalogPayload,
  normalizeObject,
  resolveCompanyIdentity,
};
