// ============================================================
// SKNOMINA - Catálogo tenant de plantillas de contrato
// ============================================================
const db = require('../config/database');
const AppError = require('../utils/AppError');
const { recordAudit } = require('./auditService');
const {
  DEFAULT_TEMPLATE_KEY,
  listContractTemplates,
  loadContractTemplate,
  resolveTemplateKey,
} = require('./templateGenerator');

const CONTRACT_TEMPLATE_CATALOG_TYPE = 'plantilla_contrato';
const CONTRACT_TEMPLATE_PARAMETER_SCHEMA = Object.freeze([
  {
    path: 'contract.serviceDescription',
    label: 'Descripción del servicio',
    type: 'string',
    maxLength: 500,
    legalReviewRequired: true,
  },
  {
    path: 'contract.estimatedDuration',
    label: 'Duración estimada',
    type: 'string',
    maxLength: 120,
    legalReviewRequired: true,
  },
  {
    path: 'contract.workCity',
    label: 'Ciudad de prestación',
    type: 'string',
    maxLength: 120,
    legalReviewRequired: true,
  },
  {
    path: 'contract.workProvince',
    label: 'Provincia de prestación',
    type: 'string',
    maxLength: 120,
    legalReviewRequired: true,
  },
  {
    path: 'contract.workAddress',
    label: 'Dirección de prestación',
    type: 'string',
    maxLength: 240,
    legalReviewRequired: true,
  },
]);

function cleanText(value, fallback = '') {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ');
  return text || fallback;
}

function safeObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (err) {
    console.error('[CONTRATOS] Payload de catálogo inválido', {
      code: 'CONTRATO_CATALOGO_PAYLOAD_INVALIDO',
      statusCode: 500,
      correlationId: null,
      userId: null,
      message: err.message,
    });
    return {};
  }
}

function normalizeParameterSchema(template) {
  const declared = Array.isArray(template.parameterSchema) ? template.parameterSchema : [];
  const source = declared.length > 0 ? declared : CONTRACT_TEMPLATE_PARAMETER_SCHEMA;
  return source
    .filter((item) => item && typeof item.path === 'string' && item.path.startsWith('contract.'))
    .map((item) => ({
      path: item.path,
      label: cleanText(item.label, item.path),
      type: item.type === 'number' ? 'number' : 'string',
      maxLength: Number(item.maxLength || 500),
      required: Boolean(item.required),
      legalReviewRequired: item.legalReviewRequired !== false,
    }));
}

function normalizeParameterValues(template, values = {}) {
  const input = safeObject(values);
  const schema = normalizeParameterSchema(template);
  const allowed = new Map(schema.map((item) => [item.path, item]));
  const normalized = {};
  const invalid = [];

  for (const [path, value] of Object.entries(input)) {
    const definition = allowed.get(path);
    if (!definition) {
      invalid.push({ path, reason: 'no_declarado' });
      continue;
    }
    if (definition.type === 'number') {
      const numberValue = Number(value);
      if (!Number.isFinite(numberValue)) invalid.push({ path, reason: 'numero_invalido' });
      else normalized[path] = numberValue;
      continue;
    }
    const text = cleanText(value);
    if (text.length > definition.maxLength) {
      invalid.push({ path, reason: 'longitud_excedida', maxLength: definition.maxLength });
    } else if (text) {
      normalized[path] = text;
    }
  }

  for (const definition of schema) {
    if (definition.required && !normalized[definition.path]) {
      invalid.push({ path: definition.path, reason: 'requerido' });
    }
  }

  if (invalid.length > 0) {
    throw new AppError('Los parámetros de la plantilla no cumplen la lista permitida.', {
      code: 'CONTRATO_PARAMETROS_INVALIDOS',
      statusCode: 422,
      details: { invalid, allowed: schema.map((item) => item.path) },
    });
  }

  return normalized;
}

function templatePayload(template, overrides = {}) {
  const payload = safeObject(overrides);
  return {
    sourceTemplateKey: template.templateKey,
    templateVersion: template.version,
    sourcePath: template.sourcePath,
    aliases: Array.isArray(payload.aliases) ? payload.aliases : [],
    parameterSchema: normalizeParameterSchema(template),
    parameterValues: normalizeParameterValues(template, payload.parameterValues || {}),
    sortOrder: Number.isFinite(Number(payload.sortOrder)) ? Number(payload.sortOrder) : 999,
    isDefault: Boolean(payload.isDefault),
  };
}

function rowPayload(row) {
  return safeObject(row?.payload);
}

function toClientTemplate(template, row, { includeInactive = false } = {}) {
  const payload = rowPayload(row);
  const configured = Boolean(row);
  const active = configured ? row.status === 'activo' : true;
  if (!includeInactive && !active) return null;

  return {
    templateKey: template.templateKey,
    tipoContrato: template.contractType || 'indefinido',
    displayName: template.displayName,
    description: template.description,
    version: template.version,
    contractType: template.contractType || 'indefinido',
    contractTypeAcceptedEcuador: template.contractTypeAcceptedEcuador,
    appliesTo: template.appliesTo || [],
    probation: template.probation || { enabled: false },
    legalReviewRequired: template.legalReviewRequired !== false,
    sourcePath: template.sourcePath,
    active,
    enabled: active,
    isDefault: configured ? Boolean(payload.isDefault) : template.templateKey === DEFAULT_TEMPLATE_KEY,
    sortOrder: Number(payload.sortOrder ?? template.sortOrder ?? 999),
    configurationId: row?.id || null,
    configurationSource: configured ? 'tenant' : 'legacy-fallback',
    parameterSchema: payload.parameterSchema || normalizeParameterSchema(template),
    parameterValues: payload.parameterValues || {},
    validFrom: row?.valid_from || null,
    validTo: row?.valid_to || null,
  };
}

async function fetchTenantRows(tenantId) {
  if (!tenantId) return [];
  const result = await db.query(`
    SELECT id, code, status, valid_from, valid_to, payload, updated_at
    FROM configuration_catalogs
    WHERE tenant_id = $1 AND catalog_type = $2
    ORDER BY updated_at DESC, code
  `, [tenantId, CONTRACT_TEMPLATE_CATALOG_TYPE]);
  return result.rows;
}

async function listTenantContractTemplates(tenantId, { includeInactive = false } = {}) {
  const templates = listContractTemplates();
  const rows = await fetchTenantRows(tenantId);
  const rowByKey = new Map(rows.map((row) => [rowPayload(row).sourceTemplateKey || row.code, row]));
  const output = templates
    .map((template) => toClientTemplate(template, rowByKey.get(template.templateKey), { includeInactive }))
    .filter(Boolean)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.displayName.localeCompare(right.displayName, 'es'));

  if (output.length === 0 && !includeInactive) {
    throw new AppError('No hay plantillas de contrato activas para esta empresa. Configura al menos una plantilla.', {
      code: 'CONTRATO_SIN_PLANTILLAS_ACTIVAS',
      statusCode: 409,
    });
  }
  return output;
}

async function ensureTenantContractCatalog(tenantId, user, context = {}) {
  if (!tenantId) {
    throw new AppError('Empresa requerida para configurar plantillas de contrato.', {
      code: 'CONTRATO_CATALOGO_TENANT_REQUERIDO',
      statusCode: 403,
      userId: user?.id,
    });
  }

  const client = await db.getClient(tenantId, user?.id);
  try {
    const templates = listContractTemplates();
    for (const template of templates) {
      const payload = templatePayload(template, {
        sortOrder: template.sortOrder,
        isDefault: template.templateKey === DEFAULT_TEMPLATE_KEY,
      });
      await client.query(`
        INSERT INTO configuration_catalogs (
          tenant_id, scope, catalog_type, code, name, description, status,
          valid_from, payload, created_by, approved_by, approved_at
        )
        VALUES ($1, 'tenant', $2, $3, $4, $5, 'activo', CURRENT_DATE, $6, $7, $7, NOW())
        ON CONFLICT DO NOTHING
      `, [
        tenantId,
        CONTRACT_TEMPLATE_CATALOG_TYPE,
        template.templateKey,
        template.displayName || template.templateKey,
        template.description || '',
        JSON.stringify(payload),
        user?.id || null,
      ]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[CONTRATOS] Error inicializando catálogo tenant', {
      code: err.code || 'CONTRATO_CATALOGO_INIT_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: context.correlationId || null,
      userId: user?.id || null,
      message: err.message,
    });
    throw err;
  } finally {
    client.release();
  }
  return listTenantContractTemplates(tenantId, { includeInactive: true });
}

async function resolveTenantContractTemplate({ tenantId, templateKey, tipoContrato, userId, correlationId } = {}) {
  const rows = tenantId ? await fetchTenantRows(tenantId) : [];
  let resolvedKey = resolveTemplateKey({ templateKey, tipoContrato });
  if (tenantId && !templateKey && !tipoContrato && rows.length > 0) {
    const defaultRow = rows.find((row) => row.status === 'activo' && rowPayload(row).isDefault);
    resolvedKey = defaultRow ? (rowPayload(defaultRow).sourceTemplateKey || defaultRow.code) : DEFAULT_TEMPLATE_KEY;
  }
  const template = loadContractTemplate({ templateKey: resolvedKey });
  if (!tenantId) return { template, configuration: null };

  const configured = rows.find((row) => (rowPayload(row).sourceTemplateKey || row.code) === template.templateKey);
  if (rows.length > 0 && (!configured || configured.status !== 'activo')) {
    throw new AppError(`La plantilla '${template.displayName || template.templateKey}' no está activa para esta empresa.`, {
      code: 'CONTRATO_TEMPLATE_INACTIVO',
      statusCode: 409,
      correlationId,
      userId,
      details: { templateKey: template.templateKey },
    });
  }

  const payload = rowPayload(configured);
  if (configured && payload.templateVersion && payload.templateVersion !== template.version) {
    const updatedPayload = { ...payload, templateVersion: template.version, sourcePath: template.sourcePath };
    await db.query(
      `UPDATE configuration_catalogs SET payload = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(updatedPayload), configured.id],
    );
    configured.payload = JSON.stringify(updatedPayload);
  }

  return { template, configuration: configured ? toClientTemplate(template, configured, { includeInactive: true }) : null };
}

async function updateTenantContractTemplate(tenantId, templateKey, input, user, context = {}) {
  const role = String(user?.rol || '').toLowerCase();
  if (!['owner', 'admin_rrhh', 'superadmin'].includes(role)) {
    throw new AppError('No tiene permisos para configurar plantillas de contrato.', {
      code: 'CONTRATO_CATALOGO_PERMISSION_DENIED',
      statusCode: 403,
      userId: user?.id,
    });
  }

  const resolvedKey = resolveTemplateKey({ templateKey });
  const template = loadContractTemplate({ templateKey: resolvedKey });
  const requestedEnabled = typeof input?.enabled === 'boolean' ? input.enabled : Boolean(input?.active);
  const requestedDefault = Boolean(input?.isDefault);
  if (!requestedEnabled && requestedDefault) {
    throw new AppError('Una plantilla inactiva no puede ser predeterminada.', {
      code: 'CONTRATO_DEFAULT_INACTIVO',
      statusCode: 422,
      userId: user?.id,
    });
  }

  await ensureTenantContractCatalog(tenantId, user, context);
  const client = await db.getClient(tenantId, user?.id);
  try {
    const currentResult = await client.query(`
      SELECT id, status, payload
      FROM configuration_catalogs
      WHERE tenant_id = $1 AND catalog_type = $2 AND code = $3
      FOR UPDATE
    `, [tenantId, CONTRACT_TEMPLATE_CATALOG_TYPE, resolvedKey]);
    const current = currentResult.rows[0];
    if (!current) {
      throw new AppError('La plantilla no está registrada en el catálogo de la empresa.', {
        code: 'CONTRATO_CATALOGO_TEMPLATE_NOT_FOUND',
        statusCode: 404,
        userId: user?.id,
      });
    }

    const currentPayload = rowPayload(current);
    const parameterValues = normalizeParameterValues(template, input?.parameterValues || currentPayload.parameterValues || {});
    if (!requestedEnabled && Boolean(currentPayload.isDefault)) {
      const alternative = await client.query(`
        SELECT code
        FROM configuration_catalogs
        WHERE tenant_id = $1 AND catalog_type = $2 AND status = 'activo' AND code <> $3
        LIMIT 1
      `, [tenantId, CONTRACT_TEMPLATE_CATALOG_TYPE, resolvedKey]);
      if (alternative.rows.length === 0) {
        throw new AppError('No puedes desactivar la única plantilla activa de la empresa.', {
          code: 'CONTRATO_ULTIMA_PLANTILLA_ACTIVA',
          statusCode: 409,
          userId: user?.id,
        });
      }
    }

    if (requestedDefault) {
      await client.query(`
        UPDATE configuration_catalogs
        SET payload = payload || '{"isDefault": false}'::jsonb, updated_at = NOW()
        WHERE tenant_id = $1 AND catalog_type = $2 AND code <> $3
      `, [tenantId, CONTRACT_TEMPLATE_CATALOG_TYPE, resolvedKey]);
    }

    const nextPayload = {
      ...currentPayload,
      sourceTemplateKey: template.templateKey,
      templateVersion: template.version,
      sourcePath: template.sourcePath,
      parameterSchema: normalizeParameterSchema(template),
      parameterValues,
      sortOrder: Number.isFinite(Number(input?.sortOrder)) ? Number(input.sortOrder) : Number(currentPayload.sortOrder || 999),
      isDefault: requestedDefault,
    };
    const result = await client.query(`
      UPDATE configuration_catalogs
      SET status = $1,
          payload = $2,
          approved_by = $3,
          approved_at = NOW(),
          updated_at = NOW()
      WHERE id = $4
      RETURNING id, code, status, valid_from, valid_to, payload, updated_at
    `, [requestedEnabled ? 'activo' : 'inactivo', JSON.stringify(nextPayload), user?.id || null, current.id]);
    await client.query('COMMIT');

    await recordAudit({
      tenantId,
      userId: user?.id || null,
      correlationId: context.correlationId,
      action: 'contrato.plantilla.configurada',
      entity: 'configuration_catalogs',
      entityId: current.id,
      previousData: { status: current.status, payload: currentPayload },
      newData: result.rows[0],
      ipAddress: context.ipAddress,
    });
    return toClientTemplate(template, result.rows[0], { includeInactive: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[CONTRATOS] Error actualizando catálogo tenant', {
      code: err.code || 'CONTRATO_CATALOGO_UPDATE_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: context.correlationId || null,
      userId: user?.id || null,
      message: err.message,
    });
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  CONTRACT_TEMPLATE_CATALOG_TYPE,
  CONTRACT_TEMPLATE_PARAMETER_SCHEMA,
  listTenantContractTemplates,
  ensureTenantContractCatalog,
  resolveTenantContractTemplate,
  normalizeParameterValues,
  normalizeParameterSchema,
  updateTenantContractTemplate,
};
