// ============================================================
// PLAN HAIKY - Controlador de Marcaciones
// ============================================================
const db = require('../config/database');
const { validarMarcacion } = require('../services/marcacionValidator');

async function registrar(req, res) {
  try {
    const {
      empleadoId,
      tipo,
      lat,
      lng,
      fotoBase64,
      permitirFueraPerimetro,
      motivoFueraPerimetro,
    } = req.body;
    const { tenantId } = req;
    const ip = req.ip || req.connection.remoteAddress;

    if (!empleadoId || !tipo || lat === undefined || lng === undefined) {
      return res.status(400).json({
        error: 'Faltan campos requeridos (empleadoId, tipo, lat, lng)',
        correlationId: req.correlationId,
      });
    }

    if (!['inicio_jornada', 'fin_jornada', 'inicio_almuerzo', 'fin_almuerzo'].includes(tipo)) {
      return res.status(400).json({
        error: 'Tipo de marcacion invalido',
        correlationId: req.correlationId,
      });
    }

    const resultado = await validarMarcacion({
      empleadoId,
      tenantId,
      tipo,
      lat: Number.parseFloat(lat),
      lng: Number.parseFloat(lng),
      fotoBase64,
      permitirFueraPerimetro: Boolean(permitirFueraPerimetro),
      motivoFueraPerimetro,
      ip,
      correlationId: req.correlationId,
      userId: req.usuarioId,
    });

    res.status(201).json({ success: true, marcacion: resultado, correlationId: req.correlationId });
  } catch (err) {
    console.error('[MARCACIONES] Error registrando marcacion', {
      code: err.code || 'MARCACION_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    res.status(err.statusCode || 500).json({ error: err.message, correlationId: req.correlationId });
  }
}

async function listarPorEmpleado(req, res) {
  try {
    const { empleadoId } = req.params;
    const { tenantId } = req;
    const { desde, hasta } = req.query;

    let query = `
      SELECT *
      FROM marcaciones
      WHERE empleado_id = $1 AND tenant_id = $2
    `;
    const params = [empleadoId, tenantId];

    if (desde) {
      query += ` AND timestamp >= $${params.length + 1}`;
      params.push(desde);
    }
    if (hasta) {
      query += ` AND timestamp <= $${params.length + 1}`;
      params.push(hasta);
    }

    query += ' ORDER BY timestamp DESC';
    const result = await db.query(query, params);
    res.json({ success: true, marcaciones: result.rows, correlationId: req.correlationId });
  } catch (err) {
    console.error('[MARCACIONES] Error listando por empleado', {
      code: err.code || 'MARCACION_LIST_ERROR',
      statusCode: 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    res.status(500).json({ error: 'Error interno', correlationId: req.correlationId });
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

    res.json({ success: true, marcaciones: result.rows, correlationId: req.correlationId });
  } catch (err) {
    console.error('[MARCACIONES] Error listando marcaciones de hoy', {
      code: err.code || 'MARCACION_HOY_ERROR',
      statusCode: 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    res.status(500).json({ error: 'Error interno', correlationId: req.correlationId });
  }
}

module.exports = { registrar, listarPorEmpleado, listarHoy };
