// ============================================================
// PLAN HAIKY - Controlador de Nómina
// ============================================================
const db = require('../config/database');
const { calcularNominaMensual } = require('../services/calculoNominaService');

async function calcularMes(req, res) {
  try {
    const { tenantId } = req;
    const { anio, mes } = req.body;
    
    if (!anio || !mes) {
      return res.status(400).json({ error: 'Año y mes requeridos' });
    }
    
    const resultado = await calcularNominaMensual(tenantId, anio, mes);
    
    res.json({ success: true, resultado });
  } catch (err) {
    console.error('[NOMINA] Error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function listarPorPeriodo(req, res) {
  try {
    const { anio, mes } = req.params;
    const { tenantId } = req;
    
    const result = await db.query(`
      SELECT n.*, e.nombres, e.apellidos, e.cedula, e.cargo
      FROM nominas n
      JOIN empleados e ON n.empleado_id = e.id
      WHERE n.tenant_id = $1 AND n.anio = $2 AND n.mes = $3
      ORDER BY e.apellidos, e.nombres
    `, [tenantId, anio, mes]);
    
    res.json({ success: true, nominas: result.rows });
  } catch (err) {
    console.error('[NOMINA] Error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

async function obtenerPorEmpleado(req, res) {
  try {
    const { empleadoId, anio, mes } = req.params;
    const { tenantId } = req;
    
    const result = await db.query(`
      SELECT n.*, e.nombres, e.apellidos, e.cedula
      FROM nominas n
      JOIN empleados e ON n.empleado_id = e.id
      WHERE n.tenant_id = $1 AND n.empleado_id = $2 AND n.anio = $3 AND n.mes = $4
    `, [tenantId, empleadoId, anio, mes]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nómina no encontrada' });
    }
    
    res.json({ success: true, nomina: result.rows[0] });
  } catch (err) {
    console.error('[NOMINA] Error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

async function descargarRolPDF(req, res) {
  try {
    const { id } = req.params;
    const { tenantId } = req;
    
    const result = await db.query(`
      SELECT rol_pdf_url FROM nominas WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);
    
    if (result.rows.length === 0 || !result.rows[0].rol_pdf_url) {
      return res.status(404).json({ error: 'PDF no encontrado' });
    }
    
    res.json({ success: true, url: result.rows[0].rol_pdf_url });
  } catch (err) {
    console.error('[NOMINA] Error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

async function cerrarMes(req, res) {
  try {
    const { tenantId } = req;
    const { anio, mes } = req.body;
    
    if (!anio || !mes) {
      return res.status(400).json({ error: 'Año y mes requeridos' });
    }
    
    // Marcar todas las nóminas del período como cerradas
    const result = await db.query(`
      UPDATE nominas
      SET cerrada = true, fecha_cierre = NOW()
      WHERE tenant_id = $1 AND anio = $2 AND mes = $3 AND cerrada = false
      RETURNING id
    `, [tenantId, anio, mes]);
    
    res.json({
      success: true,
      mensaje: `${result.rows.length} nóminas cerradas`,
      total: result.rows.length
    });
  } catch (err) {
    console.error('[NOMINA] Error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { calcularMes, listarPorPeriodo, obtenerPorEmpleado, descargarRolPDF, cerrarMes };

