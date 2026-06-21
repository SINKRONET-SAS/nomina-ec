// ============================================================
// PLAN HAIKY - Controlador de Documentos Legales
// ============================================================
const db = require('../config/database');
const { generarContrato } = require('../services/templateGenerator');
const { calcularLiquidacion } = require('../services/liquidacionService');
const { s3Upload } = require('../config/s3');

async function generarContratoCtrl(req, res) {
  try {
    const { empleadoId, tipoContrato } = req.body;
    const { tenantId } = req;
    
    if (!empleadoId || !tipoContrato) {
      return res.status(400).json({ error: 'empleadoId y tipoContrato requeridos', correlationId: req.correlationId });
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
    
    const resultado = await generarContrato(empResult.rows[0], tenantResult.rows[0], tipoContrato);
    
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
    const { empleadoId, tipoDocumento = 'contrato', nombreArchivo = 'contrato-firmado.pdf', mimeType = 'application/pdf', contenidoBase64 } = req.body || {};
    const { tenantId } = req;

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

    const cleanBase64 = String(contenidoBase64).replace(/^data:application\/pdf;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    if (buffer.length === 0 || buffer.length > 8 * 1024 * 1024) {
      return res.status(400).json({ error: 'El PDF firmado debe pesar hasta 8 MB.', correlationId: req.correlationId });
    }

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
      tipoDocumento,
      url,
      JSON.stringify({
        source: 'adjunto_manual_rrhh',
        fileName: safeName,
        mimeType,
        storageKey: key,
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

async function listar(req, res) {
  try {
    const { tenantId } = req;
    const { empleadoId, tipo } = req.query;
    
    let query = `
      SELECT d.*, e.nombres, e.apellidos, e.cedula
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
      query += ` AND d.tipo_documento = $${params.length + 1}`;
      params.push(tipo);
    }
    
    query += ` ORDER BY d.created_at DESC`;
    
    const result = await db.query(query, params);
    res.json({ success: true, documentos: result.rows, correlationId: req.correlationId });
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
      SELECT documento_url FROM documentos_legales
      WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Documento no encontrado', correlationId: req.correlationId });
    }
    
    res.json({ success: true, url: result.rows[0].documento_url, correlationId: req.correlationId });
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
  generarFiniquito,
  listar,
  descargar,
  adjuntarDocumento
};
