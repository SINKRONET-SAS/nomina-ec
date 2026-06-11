// ============================================================
// PLAN HAIKY - Controlador de Novedades
// ============================================================
const db = require('../config/database');

async function listar(req, res) {
  try {
    const { tenantId } = req;
    const { estado, tipo, mes, anio } = req.query;
    
    let query = `
      SELECT na.*, e.nombres, e.apellidos, e.cedula
      FROM novedades_asistencia na
      JOIN empleados e ON na.empleado_id = e.id
      WHERE na.tenant_id = $1
    `;
    const params = [tenantId];
    
    if (estado) {
      query += ` AND na.estado = $${params.length + 1}`;
      params.push(estado);
    }
    if (tipo) {
      query += ` AND na.tipo_novedad = $${params.length + 1}`;
      params.push(tipo);
    }
    if (mes && anio) {
      query += ` AND EXTRACT(MONTH FROM na.fecha) = $${params.length + 1} AND EXTRACT(YEAR FROM na.fecha) = $${params.length + 2}`;
      params.push(mes, anio);
    }
    
    query += ` ORDER BY na.fecha DESC, e.apellidos`;
    
    const result = await db.query(query, params);
    res.json({ success: true, novedades: result.rows });
  } catch (err) {
    console.error('[NOVEDADES] Error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

async function listarPendientes(req, res) {
  try {
    const { tenantId } = req;
    
    const result = await db.query(`
      SELECT na.*, e.nombres, e.apellidos, e.cedula
      FROM novedades_asistencia na
      JOIN empleados e ON na.empleado_id = e.id
      WHERE na.tenant_id = $1 AND na.estado = 'pendiente'
      ORDER BY na.fecha DESC
    `, [tenantId]);
    
    res.json({ success: true, novedades: result.rows });
  } catch (err) {
    console.error('[NOVEDADES] Error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

async function crear(req, res) {
  try {
    const { tenantId, usuarioId } = req;
    const { empleadoId, fecha, tipoNovedad, minutos, justificacion } = req.body;
    
    if (!empleadoId || !fecha || !tipoNovedad) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }
    
    const result = await db.query(`
      INSERT INTO novedades_asistencia (
        empleado_id, tenant_id, fecha, tipo_novedad, minutos, justificacion
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, empleado_id, fecha, tipo_novedad, minutos, estado
    `, [empleadoId, tenantId, fecha, tipoNovedad, minutos || 0, justificacion || '']);
    
    res.status(201).json({ success: true, novedad: result.rows[0] });
  } catch (err) {
    console.error('[NOVEDADES] Error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

async function aprobar(req, res) {
  try {
    const { id } = req.params;
    const { tenantId, usuarioId } = req;
    
    const result = await db.query(`
      UPDATE novedades_asistencia
      SET estado = 'aprobado', aprobado_por = $1, updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
      RETURNING id, estado, aprobado_por
    `, [usuarioId, id, tenantId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Novedad no encontrada' });
    }
    
    res.json({ success: true, novedad: result.rows[0] });
  } catch (err) {
    console.error('[NOVEDADES] Error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

async function rechazar(req, res) {
  try {
    const { id } = req.params;
    const { tenantId, usuarioId } = req;
    const { motivo } = req.body;
    
    const result = await db.query(`
      UPDATE novedades_asistencia
      SET estado = 'rechazado', aprobado_por = $1, justificacion = $2, updated_at = NOW()
      WHERE id = $3 AND tenant_id = $4
      RETURNING id, estado
    `, [usuarioId, motivo || '', id, tenantId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Novedad no encontrada' });
    }
    
    res.json({ success: true, novedad: result.rows[0] });
  } catch (err) {
    console.error('[NOVEDADES] Error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { listar, listarPendientes, crear, aprobar, rechazar };

