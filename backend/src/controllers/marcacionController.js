// ============================================================
// PLAN HAIKY - Controlador de Marcaciones
// ============================================================
const db = require('../config/database');
const { validarMarcacion } = require('../services/marcacionValidator');

async function registrar(req, res) {
  try {
    const { empleadoId, tipo, lat, lng, fotoBase64 } = req.body;
    const { tenantId } = req;
    const ip = req.ip || req.connection.remoteAddress;
    
    if (!empleadoId || !tipo || !lat || !lng) {
      return res.status(400).json({ error: 'Faltan campos requeridos (empleadoId, tipo, lat, lng)' });
    }
    
    if (!['inicio_jornada', 'fin_jornada', 'inicio_colacion', 'fin_colacion'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de marcación inválido' });
    }
    
    const resultado = await validarMarcacion({
      empleadoId,
      tenantId,
      tipo,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      fotoBase64,
      ip
    });
    
    res.status(201).json({ success: true, marcacion: resultado });
  } catch (err) {
    console.error('[MARCACIONES] Error:', err);
    if (err.message.includes('VIOLACION_REGLA_IRRENUNCIABLE')) {
      return res.status(403).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
}

async function listarPorEmpleado(req, res) {
  try {
    const { empleadoId } = req.params;
    const { tenantId } = req;
    const { desde, hasta } = req.query;
    
    let query = `
      SELECT * FROM marcaciones
      WHERE empleado_id = $1 AND tenant_id = $2
    `;
    const params = [empleadoId, tenantId];
    
    if (desde) {
      query += ` AND timestamp >= $3`;
      params.push(desde);
    }
    if (hasta) {
      query += ` AND timestamp <= $${params.length + 1}`;
      params.push(hasta);
    }
    
    query += ` ORDER BY timestamp DESC`;
    
    const result = await db.query(query, params);
    res.json({ success: true, marcaciones: result.rows });
  } catch (err) {
    console.error('[MARCACIONES] Error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

async function listarHoy(req, res) {
  try {
    const { tenantId } = req;
    
    const result = await db.query(`
      SELECT m.*, e.nombres, e.apellidos, e.cedula
      FROM marcaciones m
      JOIN empleados e ON m.empleado_id = e.id
      WHERE m.tenant_id = $1 AND DATE(m.timestamp) = CURRENT_DATE
      ORDER BY m.timestamp DESC
    `, [tenantId]);
    
    res.json({ success: true, marcaciones: result.rows });
  } catch (err) {
    console.error('[MARCACIONES] Error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { registrar, listarPorEmpleado, listarHoy };

