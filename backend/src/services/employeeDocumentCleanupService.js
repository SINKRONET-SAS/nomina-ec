// ============================================================
// SKNOMINA - Depuración de documentos legales al retirar empleados
// ============================================================
const db = require('../config/database');
const {
  decodeLocalStorageKey,
  s3Delete,
} = require('../config/s3');

function storageKeyFromDocument(row = {}) {
  const metadata = typeof row.metadata === 'object' && row.metadata ? row.metadata : {};
  if (metadata.storageKey) return String(metadata.storageKey).trim();

  const url = String(row.documento_url || '');
  const localMatch = url.match(/\/api\/storage\/local\/([^/?]+)/);
  if (localMatch) {
    try {
      return decodeLocalStorageKey(localMatch[1]);
    } catch (err) {
      console.error('[DOCUMENTOS] Clave local de documento inválida durante depuración', {
        code: 'DOCUMENTO_STORAGE_KEY_LOCAL_INVALIDA',
        statusCode: 422,
        correlationId: null,
        userId: null,
        message: err.message,
      });
      return '';
    }
  }

  return '';
}

async function cleanupEmployeeLegalDocuments({ tenantId, employeeId, correlationId, userId }) {
  const result = await db.query(`
    SELECT id, documento_url, metadata, tipo_documento
    FROM documentos_legales
    WHERE tenant_id = $1 AND empleado_id = $2
    ORDER BY created_at ASC
  `, [tenantId, employeeId]);

  const documents = result.rows || [];
  const storageKeys = [...new Set(documents.map(storageKeyFromDocument).filter(Boolean))];
  if (documents.some((document) => !storageKeyFromDocument(document))) {
    const error = new Error('No se puede depurar el expediente porque existe un documento sin clave de almacenamiento trazable.');
    error.code = 'EMPLEADO_DOCUMENTO_STORAGE_KEY_AUSENTE';
    error.statusCode = 409;
    error.details = {
      tenantId,
      employeeId,
      documentIds: documents.filter((document) => !storageKeyFromDocument(document)).map((document) => document.id),
    };
    throw error;
  }

  for (const storageKey of storageKeys) {
    try {
      await s3Delete(storageKey);
    } catch (err) {
      const storageError = new Error(`No se pudo eliminar el objeto documental ${storageKey}.`);
      storageError.code = err.code || 'EMPLEADO_DOCUMENTO_STORAGE_DELETE_ERROR';
      storageError.statusCode = err.statusCode || 502;
      storageError.details = { storageKey, employeeId, tenantId };
      console.error('[DOCUMENTOS] Error eliminando objeto durante depuración de empleado', {
        code: storageError.code,
        statusCode: storageError.statusCode,
        correlationId,
        userId: userId || null,
        message: err.message,
        storageKey,
      });
      throw storageError;
    }
  }

  const deleted = await db.query(`
    DELETE FROM documentos_legales
    WHERE tenant_id = $1 AND empleado_id = $2
    RETURNING id, tipo_documento
  `, [tenantId, employeeId]);

  return {
    documentCount: deleted.rows?.length || 0,
    storageObjectCount: storageKeys.length,
    storageKeys,
  };
}

module.exports = {
  cleanupEmployeeLegalDocuments,
  storageKeyFromDocument,
};
