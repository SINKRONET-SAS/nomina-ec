// ============================================================
// PLAN HAIKY - Controlador de Reportes
// ============================================================
const { generarXML_ATS } = require('../services/sriAtsGenerator');
const { generarXML_SAE } = require('../services/iessSaeGenerator');
const { generarArchivoBanco } = require('../services/bancoAebGenerator');
const db = require('../config/database');

async function generarATS(req, res) {
  try {
    const { tenantId } = req;
    const { anio, mes } = req.body;
    
    if (!anio || !mes) {
      return res.status(400).json({ error: 'Año y mes requeridos' });
    }
    
    const resultado = await generarXML_ATS(tenantId, anio, mes);
    
    res.json({ success: true, reporte: resultado });
  } catch (err) {
    console.error('[REPORTES] Error ATS:', err);
    res.status(500).json({ error: err.message });
  }
}

async function generarSAE(req, res) {
  try {
    const { tenantId } = req;
    const { anio, mes } = req.body;
    
    if (!anio || !mes) {
      return res.status(400).json({ error: 'Año y mes requeridos' });
    }
    
    const resultado = await generarXML_SAE(tenantId, anio, mes);
    
    res.json({ success: true, reporte: resultado });
  } catch (err) {
    console.error('[REPORTES] Error SAE:', err);
    res.status(500).json({ error: err.message });
  }
}

async function generarArchivoBancoCtrl(req, res) {
  try {
    const { tenantId } = req;
    const { anio, mes, banco } = req.body;
    
    if (!anio || !mes) {
      return res.status(400).json({ error: 'Año y mes requeridos' });
    }
    
    const resultado = await generarArchivoBanco(tenantId, anio, mes, banco);
    
    res.json({ success: true, reporte: resultado });
  } catch (err) {
    console.error('[REPORTES] Error Banco:', err);
    res.status(500).json({ error: err.message });
  }
}

async function reporteAsistencia(req, res) {
  try {
    const { anio, mes } = req.params;
    const { tenantId } = req;
    
    const result = await db.query(`
      SELECT
        e.id as empleado_id,
        e.cedula,
        e.nombres || ' ' || e.apellidos as nombre,
        COUNT(DISTINCT DATE(m.timestamp)) as dias_trabajados,
        SUM(CASE WHEN m.tipo_marcacion = 'inicio_jornada' THEN 1 ELSE 0 END) as marcaciones_inicio,
        SUM(CASE WHEN m.tipo_marcacion = 'fin_jornada' THEN 1 ELSE 0 END) as marcaciones_fin,
        COUNT(n.id) as novedades,
        COALESCE(SUM(CASE WHEN n.tipo_novedad = 'tardia' THEN n.minutos ELSE 0 END), 0) as minutos_tardia,
        COALESCE(SUM(CASE WHEN n.tipo_novedad = 'hora_extra_50' THEN n.minutos ELSE 0 END), 0) as minutos_extra_50,
        COALESCE(SUM(CASE WHEN n.tipo_novedad = 'hora_extra_100' THEN n.minutos ELSE 0 END), 0) as minutos_extra_100
      FROM empleados e
      LEFT JOIN marcaciones m ON e.id = m.empleado_id
        AND EXTRACT(YEAR FROM m.timestamp) = $2
        AND EXTRACT(MONTH FROM m.timestamp) = $3
      LEFT JOIN novedades_asistencia n ON e.id = n.empleado_id
        AND EXTRACT(YEAR FROM n.fecha) = $2
        AND EXTRACT(MONTH FROM n.fecha) = $3
        AND n.estado = 'aprobado'
      WHERE e.tenant_id = $1 AND e.activo = true
      GROUP BY e.id, e.cedula, e.nombres, e.apellidos
      ORDER BY e.apellidos, e.nombres
    `, [tenantId, anio, mes]);
    
    res.json({ success: true, reporte: result.rows });
  } catch (err) {
    console.error('[REPORTES] Error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = {
  generarATS,
  generarSAE,
  generarArchivoBanco: generarArchivoBancoCtrl,
  reporteAsistencia
};

