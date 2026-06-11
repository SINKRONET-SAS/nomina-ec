// ============================================================
// PLAN HAIKY - Controlador de Documentos Legales
// ============================================================
const db = require('../config/database');
const { generarContrato } = require('../services/templateGenerator');
const { calcularLiquidacion } = require('../services/liquidacionService');

async function generarContratoCtrl(req, res) {
  try {
    const { empleadoId, tipoContrato } = req.body;
    const { tenantId } = req;
    
    if (!empleadoId || !tipoContrato) {
      return res.status(400).json({ error: 'empleadoId y tipoContrato requeridos' });
    }
    
    // Obtener empleado
    const empResult = await db.query(
      'SELECT * FROM empleados WHERE id = $1 AND tenant_id = $2',
      [empleadoId, tenantId]
    );
    
    if (empResult.rows.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    
    // Obtener tenant
    const tenantResult = await db.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
    
    const resultado = await generarContrato(empResult.rows[0], tenantResult.rows[0], tipoContrato);
    
    res.status(201).json({ success: true, documento: resultado });
  } catch (err) {
    console.error('[DOCUMENTOS] Error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function generarFiniquito(req, res) {
  try {
    const { empleadoId, causaTerminacion } = req.body;
    const { tenantId } = req;
    
    if (!empleadoId || !causaTerminacion) {
      return res.status(400).json({ error: 'empleadoId y causaTerminacion requeridos' });
    }
    
    const resultado = await calcularLiquidacion(empleadoId, tenantId, causaTerminacion);
    
    res.json({ success: true, liquidacion: resultado });
  } catch (err) {
    console.error('[DOCUMENTOS] Error:', err);
    if (err.message.includes('VIOLACION_REGLA_IRRENUNCIABLE')) {
      return res.status(403).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
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
    res.json({ success: true, documentos: result.rows });
  } catch (err) {
    console.error('[DOCUMENTOS] Error:', err);
    res.status(500).json({ error: 'Error interno' });
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
      return res.status(404).json({ error: 'Documento no encontrado' });
    }
    
    res.json({ success: true, url: result.rows[0].documento_url });
  } catch (err) {
    console.error('[DOCUMENTOS] Error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = {
  generarContrato: generarContratoCtrl,
  generarFiniquito,
  listar,
  descargar
};

