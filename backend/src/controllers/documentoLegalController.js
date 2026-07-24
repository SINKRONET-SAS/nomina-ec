// ============================================================
// SKNOMINA - Controlador de Documentos Legales
// ============================================================
const db = require('../config/database');
const { generarContrato, listContractTemplates } = require('../services/templateGenerator');
const {
  listTenantContractTemplates,
  updateTenantContractTemplate,
} = require('../services/contractTemplateCatalogService');
const { listEcuadorContractTypes } = require('../config/ecuadorContractTypes');
const { calcularLiquidacion } = require('../services/liquidacionService');
const { generateEquipmentDeliveryAct } = require('../services/equipmentDeliveryActService');
const {
  deleteOrphanLegalDocument,
  listOrphanLegalDocuments,
} = require('../services/orphanLegalDocumentService');
const { deleteGeneratedLegalDocument } = require('../services/generatedLegalDocumentDeletionService');
const { assertPdf, decodeBase64, policyDetails } = require('../services/documentUploadPolicy');
const {
  isLocalStorageEnabled,
  resolveStorageUrl,
  s3SignedUrl,
  s3Upload,
} = require('../config/s3');

const LEGAL_DOCUMENT_TYPES = new Map([
  ['contrato', 'Contrato generado'],
  ['contrato_firmado', 'Contrato firmado'],
  ['aviso_entrada_iess', 'Aviso de entrada IESS'],
  ['acta_entrega_dotacion', 'Acta de entrega de dotacion'],
  ['acta_entrega_dotacion_firmada', 'Acta de entrega de dotacion firmada'],
  ['acta_finiquito', 'Acta de finiquito'],
  ['rol_pago', 'Rol de pago'],
  ['certificado', 'Certificado'],
  ['otro_documento_laboral', 'Otro documento laboral'],
]);

function normalizeDocumentType(value) {
  const type = String(value || 'contrato_firmado').trim();
  if (LEGAL_DOCUMENT_TYPES.has(type)) return type;

  const err = new Error('El tipo de documento laboral no esta homologado.');
  err.code = 'DOCUMENTO_TIPO_INVALIDO';
  err.statusCode = 422;
  err.details = { allowedTypes: [...LEGAL_DOCUMENT_TYPES.keys()] };
  throw err;
}

function isLocalStoredDocument(url) {
  const text = String(url || '');
  return text.startsWith('local://') || text.includes('/api/storage/local/');
}

async function resolveLegalDocumentDownloadUrl(row) {
  const metadata = typeof row.metadata === 'object' && row.metadata ? row.metadata : {};
  if (metadata.storageKey && !isLocalStorageEnabled() && !isLocalStoredDocument(row.documento_url)) {
    return s3SignedUrl(metadata.storageKey);
  }
  return resolveStorageUrl(row.documento_url, metadata.storageKey);
}

async function generarContratoCtrl(req, res) {
  try {
    const { empleadoId, tipoContrato, templateKey } = req.body;
    const { tenantId } = req;
    
    if (!empleadoId || (!tipoContrato && !templateKey)) {
      return res.status(400).json({ error: 'empleadoId y tipoContrato o templateKey requeridos', correlationId: req.correlationId });
    }
    
    // Obtener empleado
    const empResult = await db.query(
      'SELECT * FROM empleados WHERE id = $1 AND tenant_id = $2',
      [empleadoId, tenantId]
    );
    
    if (empResult.rows.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado', correlationId: req.correlationId });
    }
    
    // Obtener tenant
    const tenantResult = await db.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
    if (tenantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant no encontrado', correlationId: req.correlationId });
    }
    
    const resultado = await generarContrato(
      empResult.rows[0],
      tenantResult.rows[0],
      tipoContrato || templateKey,
      {
        templateKey,
        resolveTenantCatalog: true,
        parameters: req.body?.parameterValues || req.body?.parameters || {},
        correlationId: req.correlationId,
        userId: req.usuarioId || req.usuario?.id || null,
      },
    );
    
    res.status(201).json({ success: true, documento: resultado, correlationId: req.correlationId });
  } catch (err) {
    console.error('[DOCUMENTOS] Error generando contrato', {
      code: err.code || 'DOCUMENTO_CONTRATO_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    res.status(err.statusCode || 500).json({ error: err.message, correlationId: req.correlationId });
  }
}

async function generarFiniquito(req, res) {
  try {
    const { empleadoId, causaTerminacion } = req.body;
    const { tenantId } = req;
    
    if (!empleadoId || !causaTerminacion) {
      return res.status(400).json({ error: 'empleadoId y causaTerminacion requeridos', correlationId: req.correlationId });
    }
    
    const resultado = await calcularLiquidacion(empleadoId, tenantId, causaTerminacion);
    
    res.json({ success: true, liquidacion: resultado, correlationId: req.correlationId });
  } catch (err) {
    console.error('[DOCUMENTOS] Error generando finiquito', {
      code: err.code || 'DOCUMENTO_FINIQUITO_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    if (err.message.includes('VIOLACION_REGLA_IRRENUNCIABLE')) {
      return res.status(403).json({ error: err.message, correlationId: req.correlationId });
    }
    res.status(err.statusCode || 500).json({ error: err.message, correlationId: req.correlationId });
  }
}

async function adjuntarDocumento(req, res) {
  try {
    const { empleadoId, tipoDocumento = 'contrato_firmado', nombreArchivo = 'documento-laboral.pdf', mimeType = 'application/pdf', contenidoBase64 } = req.body || {};
    const { tenantId } = req;
    const normalizedType = normalizeDocumentType(tipoDocumento);

    if (!empleadoId || !contenidoBase64) {
      return res.status(400).json({ error: 'empleadoId y contenidoBase64 son requeridos', correlationId: req.correlationId });
    }

    if (mimeType !== 'application/pdf') {
      return res.status(400).json({ error: 'Solo se permiten documentos PDF firmados.', correlationId: req.correlationId });
    }

    const employee = await db.query('SELECT id, cedula FROM empleados WHERE id = $1 AND tenant_id = $2', [empleadoId, tenantId]);
    if (employee.rows.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado', correlationId: req.correlationId });
    }

    const buffer = decodeBase64(contenidoBase64, { label: 'El PDF firmado' });
    const fileInfo = assertPdf(buffer, { label: 'El PDF firmado' });

    const safeName = String(nombreArchivo || 'contrato-firmado.pdf').replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 120);
    const key = 'documentos/' + tenantId + '/' + empleadoId + '/firmados/' + Date.now() + '_' + safeName;
    const url = await s3Upload(buffer, key, mimeType);

    const result = await db.query(`
      INSERT INTO documentos_legales (tenant_id, empleado_id, tipo_documento, documento_url, metadata, firmado)
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING *
    `, [
      tenantId,
      empleadoId,
      normalizedType,
      url,
      JSON.stringify({
        source: 'adjunto_manual_rrhh',
        documentKind: normalizedType,
        displayName: LEGAL_DOCUMENT_TYPES.get(normalizedType),
         fileName: safeName,
         mimeType,
         storageKey: key,
         ...fileInfo,
         uploadPolicy: policyDetails(),
         uploadedBy: req.usuarioId || null,
      }),
    ]);

    return res.status(201).json({ success: true, documento: result.rows[0], correlationId: req.correlationId });
  } catch (err) {
    console.error('[DOCUMENTOS] Error adjuntando documento firmado', {
      code: err.code || 'DOCUMENTO_ADJUNTO_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({ error: err.code || 'DOCUMENTO_ADJUNTO_ERROR', message: err.message, correlationId: req.correlationId });
  }
}

async function listarPlantillasContrato(req, res) {
  try {
    const templates = req.tenantId
      ? await listTenantContractTemplates(req.tenantId)
      : listContractTemplates();
    return res.json({ success: true, templates, correlationId: req.correlationId });
  } catch (err) {
    console.error('[DOCUMENTOS] Error listando plantillas de contrato', {
      code: err.code || 'DOCUMENTO_CONTRATO_TEMPLATES_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'DOCUMENTO_CONTRATO_TEMPLATES_ERROR',
      message: err.message,
      correlationId: req.correlationId,
    });
  }
}

async function listarHuerfanos(req, res) {
  try {
    const data = await listOrphanLegalDocuments({
      tenantId: req.tenantId,
      limit: req.query.limit,
    });
    return res.json({ success: true, ...data, correlationId: req.correlationId });
  } catch (err) {
    console.error('[DOCUMENTOS] Error listando documentos huerfanos', {
      code: err.code || 'ORPHAN_DOCUMENT_LIST_FAILED',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'ORPHAN_DOCUMENT_LIST_FAILED',
      message: err.message,
      correlationId: req.correlationId,
    });
  }
}

async function eliminarHuerfano(req, res) {
  try {
    const data = await deleteOrphanLegalDocument({
      tenantId: req.tenantId,
      documentId: req.params.id,
      correlationId: req.correlationId,
      userId: req.usuarioId || req.usuario?.id || null,
      ipAddress: req.ip,
    });
    return res.json({ success: true, ...data, correlationId: req.correlationId });
  } catch (err) {
    console.error('[DOCUMENTOS] Error eliminando documento huerfano', {
      code: err.code || 'ORPHAN_DOCUMENT_DELETE_FAILED',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'ORPHAN_DOCUMENT_DELETE_FAILED',
      message: err.message,
      correlationId: req.correlationId,
    });
  }
}

async function eliminarGenerado(req, res) {
  try {
    const result = await deleteGeneratedLegalDocument({
      tenantId: req.tenantId,
      documentId: req.params.id,
      correlationId: req.correlationId,
      userId: req.usuarioId || req.usuario?.id || null,
      ipAddress: req.ip,
    });
    return res.json({ success: true, ...result, correlationId: req.correlationId });
  } catch (err) {
    console.error('[DOCUMENTOS] Error eliminando documento generado', {
      code: err.code || 'DOCUMENTO_GENERADO_DELETE_FAILED',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'DOCUMENTO_GENERADO_DELETE_FAILED',
      message: err.message,
      correlationId: req.correlationId,
    });
  }
}

async function configurarPlantillasContrato(req, res) {
  try {
    const templates = await listTenantContractTemplates(req.tenantId, { includeInactive: true });
    return res.json({ success: true, templates, correlationId: req.correlationId });
  } catch (err) {
    console.error('[DOCUMENTOS] Error consultando configuración de plantillas', {
      code: err.code || 'DOCUMENTO_CONTRATO_CONFIG_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'DOCUMENTO_CONTRATO_CONFIG_ERROR',
      message: err.message,
      correlationId: req.correlationId,
    });
  }
}

async function actualizarPlantillaContrato(req, res) {
  try {
    const template = await updateTenantContractTemplate(
      req.tenantId,
      req.params.templateKey,
      req.body || {},
      req.usuario,
      {
        correlationId: req.correlationId,
        ipAddress: req.ip,
      },
    );
    return res.json({ success: true, template, correlationId: req.correlationId });
  } catch (err) {
    console.error('[DOCUMENTOS] Error actualizando plantilla de contrato', {
      code: err.code || 'DOCUMENTO_CONTRATO_UPDATE_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'DOCUMENTO_CONTRATO_UPDATE_ERROR',
      message: err.message,
      correlationId: req.correlationId,
    });
  }
}

async function listarTiposContratoEcuador(req, res) {
  try {
    return res.json({
      success: true,
      contractTypes: listEcuadorContractTypes(),
      correlationId: req.correlationId,
    });
  } catch (err) {
    console.error('[DOCUMENTOS] Error listando tipos de contrato Ecuador', {
      code: err.code || 'DOCUMENTO_CONTRATO_TIPOS_ECUADOR_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'DOCUMENTO_CONTRATO_TIPOS_ECUADOR_ERROR',
      message: err.message,
      correlationId: req.correlationId,
    });
  }
}

async function generarActaEntregaDotacion(req, res) {
  try {
    const {
      empleadoId,
      fechaEntrega,
      items,
      observaciones,
      entregadoPor,
    } = req.body || {};
    const { tenantId } = req;

    const resultado = await generateEquipmentDeliveryAct({
      tenantId,
      empleadoId,
      fechaEntrega,
      items,
      observaciones,
      entregadoPor,
      correlationId: req.correlationId,
      userId: req.usuarioId || req.usuario?.id || null,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      acta: resultado.acta,
      documento: resultado.documento,
      url: resultado.url,
      correlationId: req.correlationId,
    });
  } catch (err) {
    console.error('[DOCUMENTOS] Error generando acta de entrega de dotacion', {
      code: err.code || 'DOCUMENTO_ACTA_DOTACION_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'DOCUMENTO_ACTA_DOTACION_ERROR',
      message: err.message,
      correlationId: req.correlationId,
    });
  }
}

async function listar(req, res) {
  try {
    const { tenantId } = req;
    const {
      empleadoId,
      tipo,
      search,
      firmado,
      limit: rawLimit,
      offset: rawOffset,
    } = req.query;
    
    let query = `
      SELECT d.*, e.nombres, e.apellidos, e.cedula, COUNT(*) OVER() AS total_documentos
      FROM documentos_legales d
      LEFT JOIN empleados e ON d.empleado_id = e.id
      WHERE d.tenant_id = $1
    `;
    const params = [tenantId];
    
    if (empleadoId) {
      query += ` AND d.empleado_id = $${params.length + 1}`;
      params.push(empleadoId);
    }
    if (tipo) {
      const tipos = String(tipo).split(',').map((item) => item.trim()).filter(Boolean);
      if (tipos.length > 1) {
        query += ` AND d.tipo_documento::text = ANY($${params.length + 1}::text[])`;
        params.push(tipos);
      } else if (tipos.length === 1) {
        query += ` AND d.tipo_documento::text = $${params.length + 1}`;
        params.push(tipos[0]);
      }
    }
    
    const normalizedSearch = String(search || '').trim();
    if (normalizedSearch) {
      query += ` AND (
        COALESCE(e.nombres, '') ILIKE $${params.length + 1}
        OR COALESCE(e.apellidos, '') ILIKE $${params.length + 1}
        OR COALESCE(e.cedula, '') ILIKE $${params.length + 1}
        OR d.tipo_documento::text ILIKE $${params.length + 1}
        OR COALESCE(d.metadata::text, '') ILIKE $${params.length + 1}
      )`;
      params.push(`%${normalizedSearch}%`);
    }
    if (firmado === 'true' || firmado === 'false') {
      query += ` AND d.firmado = $${params.length + 1}`;
      params.push(firmado === 'true');
    }

    const limit = Math.min(Math.max(Number.parseInt(rawLimit || '1000', 10) || 1000, 1), 1000);
    const offset = Math.max(Number.parseInt(rawOffset || '0', 10) || 0, 0);
    query += ` ORDER BY d.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await db.query(query, params);
    res.json({
      success: true,
      documentos: result.rows,
      total: Number(result.rows[0]?.total_documentos || 0),
      limit,
      offset,
      hasMore: result.rows.length === limit,
      correlationId: req.correlationId,
    });
  } catch (err) {
    console.error('[DOCUMENTOS] Error listando documentos', {
      code: err.code || 'DOCUMENTO_LIST_ERROR',
      statusCode: 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    res.status(500).json({ error: 'Error interno', correlationId: req.correlationId });
  }
}

async function descargar(req, res) {
  try {
    const { id } = req.params;
    const { tenantId } = req;
    
    const result = await db.query(`
      SELECT documento_url, metadata FROM documentos_legales
      WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Documento no encontrado', correlationId: req.correlationId });
    }
    const row = result.rows[0];
    const metadata = typeof row.metadata === 'object' && row.metadata ? row.metadata : {};
    const url = await resolveLegalDocumentDownloadUrl(row);

    res.json({
      success: true,
      url,
      fileName: metadata.fileName || `documento-${id}.pdf`,
      correlationId: req.correlationId,
    });
  } catch (err) {
    console.error('[DOCUMENTOS] Error descargando documento', {
      code: err.code || 'DOCUMENTO_DOWNLOAD_ERROR',
      statusCode: 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    res.status(500).json({ error: 'Error interno', correlationId: req.correlationId });
  }
}

module.exports = {
  generarContrato: generarContratoCtrl,
  listarPlantillasContrato,
  configurarPlantillasContrato,
  actualizarPlantillaContrato,
  listarTiposContratoEcuador,
  generarFiniquito,
  generarActaEntregaDotacion,
  listarHuerfanos,
  eliminarHuerfano,
  eliminarGenerado,
  listar,
  descargar,
  adjuntarDocumento
};
