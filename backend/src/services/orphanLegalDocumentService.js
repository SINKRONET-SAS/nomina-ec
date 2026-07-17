// ============================================================
// SKNOMINA - Gestion segura de documentos legales huerfanos
// ============================================================
const db = require('../config/database');
const AppError = require('../utils/AppError');
const { recordAudit } = require('./auditService');
const { s3Delete } = require('../config/s3');
const { storageKeyFromDocument } = require('./employeeDocumentCleanupService');

function documentView(row = {}) {
  const metadata = typeof row.metadata === 'object' && row.metadata ? row.metadata : {};
  return {
    id: row.id,
    tipo_documento: row.tipo_documento,
    firmado: Boolean(row.firmado),
    created_at: row.created_at,
    fileName: metadata.fileName || metadata.originalName || `documento-${row.id}.pdf`,
    sizeBytes: Number(metadata.sizeBytes || 0),
    storageKeyAvailable: Boolean(storageKeyFromDocument(row)),
  };
}

async function listOrphanLegalDocuments({ tenantId, limit = 100 } = {}) {
  if (!tenantId) {
    throw new AppError('Empresa requerida para consultar documentos huerfanos.', {
      code: 'ORPHAN_DOCUMENT_TENANT_REQUIRED',
      statusCode: 400,
    });
  }
  const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 100, 1), 500);
  const result = await db.query(`
    SELECT id, tipo_documento, documento_url, metadata, firmado, created_at
    FROM documentos_legales
    WHERE tenant_id = $1 AND empleado_id IS NULL
    ORDER BY created_at DESC
    LIMIT $2
  `, [tenantId, safeLimit]);
  return {
    documentos: (result.rows || []).map(documentView),
    total: result.rows?.length || 0,
    limit: safeLimit,
  };
}

async function deleteOrphanLegalDocument({ tenantId, documentId, correlationId = null, userId = null, ipAddress = null } = {}) {
  if (!tenantId || !documentId) {
    throw new AppError('Empresa y documento son requeridos para eliminar un huerfano.', {
      code: 'ORPHAN_DOCUMENT_DATA_REQUIRED',
      statusCode: 400,
      correlationId,
      userId,
    });
  }

  let client;
  try {
    client = await db.getClient(tenantId, userId);
    const result = await client.query(`
      SELECT id, tipo_documento, documento_url, metadata, empleado_id
      FROM documentos_legales
      WHERE id = $1 AND tenant_id = $2 AND empleado_id IS NULL
      FOR UPDATE
    `, [documentId, tenantId]);
    const document = result.rows[0];
    if (!document) {
      throw new AppError('El documento no existe, ya fue eliminado o esta vinculado a un empleado.', {
        code: 'ORPHAN_DOCUMENT_NOT_FOUND',
        statusCode: 404,
        correlationId,
        userId,
      });
    }

    const storageKey = storageKeyFromDocument(document);
    if (!storageKey) {
      throw new AppError('No se elimina el documento porque no tiene una clave de almacenamiento trazable.', {
        code: 'ORPHAN_DOCUMENT_STORAGE_KEY_MISSING',
        statusCode: 409,
        correlationId,
        userId,
        details: { documentId, tenantId },
      });
    }

    await s3Delete(storageKey);
    const deleted = await client.query(`
      DELETE FROM documentos_legales
      WHERE id = $1 AND tenant_id = $2 AND empleado_id IS NULL
      RETURNING id, tipo_documento
    `, [documentId, tenantId]);
    if (deleted.rows.length !== 1) {
      throw new AppError('El documento cambio de vinculacion durante la eliminacion.', {
        code: 'ORPHAN_DOCUMENT_LINK_CHANGED',
        statusCode: 409,
        correlationId,
        userId,
      });
    }
    await db.commit(client);
    client = null;

    await recordAudit({
      tenantId,
      userId,
      correlationId,
      action: 'documento_huerfano.eliminar',
      entity: 'documentos_legales',
      entityId: documentId,
      newData: { tipoDocumento: document.tipo_documento, storageKey },
      ipAddress,
    });
    return { id: documentId, storageKey, deleted: true };
  } catch (err) {
    if (client) {
      try {
        await db.rollback(client);
      } catch (rollbackError) {
        console.error('[DOCUMENTOS] Error revirtiendo eliminacion de huerfano', {
          code: rollbackError.code || 'ORPHAN_DOCUMENT_ROLLBACK_FAILED',
          statusCode: rollbackError.statusCode || 500,
          correlationId,
          userId: userId || null,
          message: rollbackError.message,
        });
      }
    }
    if (err instanceof AppError) throw err;
    console.error('[DOCUMENTOS] Error eliminando documento huerfano', {
      code: err.code || 'ORPHAN_DOCUMENT_DELETE_FAILED',
      statusCode: err.statusCode || 502,
      correlationId,
      userId: userId || null,
      message: err.message,
    });
    throw new AppError('No se pudo eliminar el documento huerfano.', {
      code: 'ORPHAN_DOCUMENT_DELETE_FAILED',
      statusCode: 502,
      correlationId,
      userId,
      details: { documentId, tenantId },
    });
  }
}

module.exports = {
  deleteOrphanLegalDocument,
  listOrphanLegalDocuments,
  documentView,
};
