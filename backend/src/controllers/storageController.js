const path = require('path');

const {
  decodeLocalStorageKey,
  getLocalObject,
  getLocalObjectMetadata,
  isLocalStorageAvailable,
  verifyLocalStorageToken,
} = require('../config/s3');

function safeFileName(key) {
  return path.basename(key).replace(/[^a-zA-Z0-9_.-]/g, '_') || 'documento';
}

async function descargarLocal(req, res) {
  try {
    if (!isLocalStorageAvailable()) {
      return res.status(404).json({
        error: 'LOCAL_STORAGE_NO_DISPONIBLE',
        message: 'El almacenamiento local no esta habilitado.',
        correlationId: req.correlationId,
      });
    }

    const { encodedKey } = req.params;
    const key = decodeLocalStorageKey(encodedKey);
    const isValidToken = verifyLocalStorageToken(encodedKey, req.query.token);

    if (!isValidToken) {
      return res.status(403).json({
        error: 'URL_LOCAL_EXPIRADA',
        message: 'El enlace de descarga expiro o no es valido.',
        correlationId: req.correlationId,
      });
    }

    const [buffer, metadata] = await Promise.all([
      getLocalObject(key),
      getLocalObjectMetadata(key),
    ]);

    res.set('Content-Type', metadata.contentType || 'application/octet-stream');
    res.set('Content-Length', String(buffer.length));
    res.set('Cache-Control', 'private, max-age=60');
    res.set('Content-Disposition', `attachment; filename="${safeFileName(key)}"`);
    return res.send(buffer);
  } catch (err) {
    const statusCode = err.code === 'ENOENT' ? 404 : 400;
    console.error('[LOCAL_STORAGE] Error al descargar archivo local', {
      code: err.code || 'LOCAL_STORAGE_DOWNLOAD_ERROR',
      statusCode,
      correlationId: req.correlationId,
      userId: null,
      message: err.message,
    });

    return res.status(statusCode).json({
      error: err.code === 'ENOENT' ? 'ARCHIVO_LOCAL_NO_ENCONTRADO' : 'DESCARGA_LOCAL_INVALIDA',
      message: err.message,
      correlationId: req.correlationId,
    });
  }
}

module.exports = {
  descargarLocal,
};
