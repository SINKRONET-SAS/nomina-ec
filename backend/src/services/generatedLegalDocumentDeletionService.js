// ============================================================
// SKNOMINA - Eliminacion segura de documentos legales generados
// ============================================================
const db = require('../config/database');
const AppError = require('../utils/AppError');
const { recordAudit } = require('./auditService');
const { s3Delete } = require('../config/s3');
const { storageKeyFromDocument } = require('./employeeDocumentCleanupService');

const GENERATED_DOCUMENT_TYPES = new Set(['contrato', 'acta_finiquito', 'acta_entrega_dotacion']);

function assertGeneratedDocument(document, { correlationId, userId } = {}) {
  if (!GENERATED_DOCUMENT_TYPES.has(String(document.tipo_documento || ''))) {
    throw new AppError('Solo se pueden eliminar contratos y actas generadas desde el sistema.', {
      code: 'DOCUMENTO_GENERADO_TIPO_NO_PERMITIDO', statusCode: 422, correlationId, userId,
      details: { tipoDocumento: document.tipo_documento },
    });
  }
  if (document.firmado) {
    throw new AppError('No se puede eliminar un documento firmado o adjunto al expediente.', {
      code: 'DOCUMENTO_GENERADO_FIRMADO_NO_ELIMINABLE', statusCode: 409, correlationId, userId,
      details: { documentId: document.id, tipoDocumento: document.tipo_documento },
    });
  }
}

async function deleteGeneratedLegalDocument({ tenantId, documentId, correlationId = null, userId = null, ipAddress = null } = {}) {
  if (!tenantId || !documentId) {
    throw new AppError('Empresa y documento son requeridos para eliminar un documento generado.', {
      code: 'DOCUMENTO_GENERADO_DATOS_REQUERIDOS', statusCode: 400, correlationId, userId,
    });
  }

  let client;
  try {
    client = await db.getClient(tenantId, userId);
    const documentResult = await client.query(`
      SELECT id, tenant_id, empleado_id, tipo_documento, documento_url, metadata, firmado
      FROM documentos_legales
      WHERE id = $1 AND tenant_id = $2
      FOR UPDATE
    `, [documentId, tenantId]);
    const document = documentResult.rows[0];
    if (!document) {
      throw new AppError('El documento no existe o no pertenece a la empresa actual.', {
        code: 'DOCUMENTO_GENERADO_NO_ENCONTRADO', statusCode: 404, correlationId, userId,
      });
    }
    assertGeneratedDocument(document, { correlationId, userId });

    let deliveryAct = null;
    if (document.tipo_documento === 'acta_entrega_dotacion') {
      const actResult = await client.query(`
        SELECT id, devuelto
        FROM acta_entrega_equipos
        WHERE documento_legal_id = $1 AND tenant_id = $2
        FOR UPDATE
      `, [documentId, tenantId]);
      deliveryAct = actResult.rows[0] || null;
      if (deliveryAct?.devuelto) {
        throw new AppError('No se puede eliminar un acta de dotacion cuyos bienes ya fueron devueltos.', {
          code: 'ACTA_DOTACION_DEVUELTA_NO_ELIMINABLE', statusCode: 409, correlationId, userId,
          details: { documentId, actaId: deliveryAct.id },
        });
      }
    }

    const storageKey = storageKeyFromDocument(document);
    if (!storageKey) {
      throw new AppError('No se elimina el documento porque no tiene una clave de almacenamiento trazable.', {
        code: 'DOCUMENTO_GENERADO_STORAGE_KEY_MISSING', statusCode: 409, correlationId, userId,
        details: { documentId, tenantId },
      });
    }
    await s3Delete(storageKey);

    let deletedDeliveryActId = null;
    if (deliveryAct) {
      const deletedActResult = await client.query(`
        DELETE FROM acta_entrega_equipos
        WHERE id = $1 AND tenant_id = $2 AND devuelto = false
        RETURNING id
      `, [deliveryAct.id, tenantId]);
      if (deletedActResult.rows.length !== 1) {
        throw new AppError('El acta de dotacion cambio de estado durante la eliminacion.', {
          code: 'ACTA_DOTACION_ESTADO_CAMBIADO', statusCode: 409, correlationId, userId,
          details: { documentId, actaId: deliveryAct.id },
        });
      }
      deletedDeliveryActId = deliveryAct.id;
    }

    const deletedDocumentResult = await client.query(`
      DELETE FROM documentos_legales
      WHERE id = $1 AND tenant_id = $2 AND firmado = false
      RETURNING id, tipo_documento, empleado_id
    `, [documentId, tenantId]);
    if (deletedDocumentResult.rows.length !== 1) {
      throw new AppError('El documento cambio de estado durante la eliminacion.', {
        code: 'DOCUMENTO_GENERADO_ESTADO_CAMBIADO', statusCode: 409, correlationId, userId,
      });
    }
    await db.commit(client);
    client = null;

    await recordAudit({
      tenantId, userId, correlationId, action: 'documento.generado.eliminar',
      entity: 'documentos_legales', entityId: documentId,
      previousData: { tipoDocumento: document.tipo_documento, empleadoId: document.empleado_id, firmado: document.firmado },
      newData: { deleted: true, storageKey, deliveryActId: deletedDeliveryActId },
      ipAddress, metadata: { documentKind: document.tipo_documento },
    });
    return { id: documentId, tipoDocumento: document.tipo_documento, storageKey, deleted: true, deliveryActId: deletedDeliveryActId };
  } catch (err) {
    if (client) {
      try { await db.rollback(client); } catch (rollbackError) {
        console.error('[DOCUMENTOS] Error revirtiendo eliminacion de documento generado', {
          code: rollbackError.code || 'DOCUMENTO_GENERADO_ROLLBACK_FAILED', statusCode: rollbackError.statusCode || 500,
          correlationId, userId: userId || null, message: rollbackError.message,
        });
      }
    }
    if (err instanceof AppError) throw err;
    console.error('[DOCUMENTOS] Error eliminando documento generado', {
      code: err.code || 'DOCUMENTO_GENERADO_DELETE_FAILED', statusCode: err.statusCode || 502,
      correlationId, userId: userId || null, message: err.message,
    });
    throw new AppError('No se pudo eliminar el documento generado.', {
      code: err.code || 'DOCUMENTO_GENERADO_DELETE_FAILED', statusCode: err.statusCode || 502,
      correlationId, userId, details: { documentId, tenantId },
    });
  }
}

module.exports = { deleteGeneratedLegalDocument, GENERATED_DOCUMENT_TYPES };
