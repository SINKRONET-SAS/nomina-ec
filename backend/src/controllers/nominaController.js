// ============================================================
// PLAN HAIKY - Controlador de Nomina
// ============================================================
const db = require('../config/database');
const { calcularNominaMensual } = require('../services/calculoNominaService');
const { recordAudit } = require('../services/auditService');

async function calcularMes(req, res) {
  try {
    const { tenantId } = req;
    const { anio, mes } = req.body;

    if (!anio || !mes) {
      return res.status(400).json({ error: 'Anio y mes requeridos', correlationId: req.correlationId });
    }

    const resultado = await calcularNominaMensual(tenantId, Number(anio), Number(mes));
    res.json({ success: true, resultado, correlationId: req.correlationId });
  } catch (err) {
    console.error('[NOMINA] Error calculando mes', {
      code: err.code || 'NOMINA_CALCULO_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    res.status(err.statusCode || 500).json({ error: err.message, correlationId: req.correlationId });
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

    res.json({ success: true, nominas: result.rows, correlationId: req.correlationId });
  } catch (err) {
    console.error('[NOMINA] Error listando periodo', {
      code: err.code || 'NOMINA_LIST_ERROR',
      statusCode: 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    res.status(500).json({ error: 'Error interno', correlationId: req.correlationId });
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
      return res.status(404).json({ error: 'Nomina no encontrada', correlationId: req.correlationId });
    }

    res.json({ success: true, nomina: result.rows[0], correlationId: req.correlationId });
  } catch (err) {
    console.error('[NOMINA] Error obteniendo por empleado', {
      code: err.code || 'NOMINA_GET_ERROR',
      statusCode: 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    res.status(500).json({ error: 'Error interno', correlationId: req.correlationId });
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
      return res.status(404).json({ error: 'PDF no encontrado', correlationId: req.correlationId });
    }

    res.json({ success: true, url: result.rows[0].rol_pdf_url, correlationId: req.correlationId });
  } catch (err) {
    console.error('[NOMINA] Error descargando rol PDF', {
      code: err.code || 'NOMINA_PDF_ERROR',
      statusCode: 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    res.status(500).json({ error: 'Error interno', correlationId: req.correlationId });
  }
}

async function cerrarMes(req, res) {
  try {
    const { tenantId, usuarioId } = req;
    const { anio, mes } = req.body;

    if (!anio || !mes) {
      return res.status(400).json({ error: 'Anio y mes requeridos', correlationId: req.correlationId });
    }

    const result = await db.query(`
      UPDATE nominas
      SET estado = 'cerrada', cerrado_en = NOW(), updated_at = NOW()
      WHERE tenant_id = $1 AND anio = $2 AND mes = $3 AND estado = 'borrador'
      RETURNING id
    `, [tenantId, anio, mes]);

    await recordAudit({
      tenantId,
      userId: usuarioId,
      correlationId: req.correlationId,
      action: 'cerrar_nomina',
      entity: 'nominas',
      newData: { anio, mes, total: result.rows.length },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      mensaje: `${result.rows.length} nominas cerradas`,
      total: result.rows.length,
      correlationId: req.correlationId,
    });
  } catch (err) {
    console.error('[NOMINA] Error cerrando mes', {
      code: err.code || 'NOMINA_CIERRE_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    res.status(err.statusCode || 500).json({ error: err.message, correlationId: req.correlationId });
  }
}

async function reabrirMes(req, res) {
  try {
    const { tenantId, usuarioId } = req;
    const { anio, mes, motivo } = req.body;

    if (!anio || !mes) {
      return res.status(400).json({ error: 'Anio y mes requeridos', correlationId: req.correlationId });
    }

    if (!motivo || String(motivo).trim().length < 10) {
      return res.status(422).json({
        error: 'Indica un motivo claro para reabrir la nómina.',
        correlationId: req.correlationId,
      });
    }

    const result = await db.query(`
      UPDATE nominas
      SET estado = 'borrador', cerrado_en = NULL, updated_at = NOW()
      WHERE tenant_id = $1 AND anio = $2 AND mes = $3 AND estado = 'cerrada'
      RETURNING id
    `, [tenantId, anio, mes]);

    await recordAudit({
      tenantId,
      userId: usuarioId,
      correlationId: req.correlationId,
      action: 'reabrir_nomina',
      entity: 'nominas',
      newData: { anio, mes, total: result.rows.length, motivo: String(motivo).trim() },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      mensaje: `${result.rows.length} nominas reabiertas`,
      total: result.rows.length,
      correlationId: req.correlationId,
    });
  } catch (err) {
    console.error('[NOMINA] Error reabriendo mes', {
      code: err.code || 'NOMINA_REAPERTURA_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    res.status(err.statusCode || 500).json({ error: err.message, correlationId: req.correlationId });
  }
}

module.exports = {
  calcularMes,
  listarPorPeriodo,
  obtenerPorEmpleado,
  descargarRolPDF,
  cerrarMes,
  reabrirMes,
};
