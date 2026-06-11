# Crear controladores de nómina, documentos y reportes
nomina_controller = '''// ============================================================
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
'''

with open('backend/src/controllers/nominaController.js', 'w') as f:
    f.write(nomina_controller)

documento_legal_controller = '''// ============================================================
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
'''

with open('backend/src/controllers/documentoLegalController.js', 'w') as f:
    f.write(documento_legal_controller)

reporte_controller = '''// ============================================================
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
'''

with open('backend/src/controllers/reporteController.js', 'w') as f:
    f.write(reporte_controller)

print("✓ Controladores de nómina, documentos y reportes creados")
 # Result 
✓ Controladores de nómina, documentos y reportes creados
