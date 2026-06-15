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
    const limit = Math.min(Number.parseInt(req.query.limit || '50', 10) || 50, 200);
    const [summary, marks] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(DISTINCT empleado_id)::int AS empleados_marcados,
          SUM(CASE WHEN tipo_marcacion = 'inicio_jornada' THEN 1 ELSE 0 END)::int AS inicios_jornada,
          SUM(CASE WHEN tipo_marcacion = 'fin_jornada' THEN 1 ELSE 0 END)::int AS fines_jornada
        FROM marcaciones
        WHERE tenant_id = $1
          AND timestamp >= CURRENT_DATE
          AND timestamp < CURRENT_DATE + INTERVAL '1 day'
      `, [tenantId]),
      db.query(`
        SELECT m.*, e.nombres, e.apellidos, e.cedula
        FROM marcaciones m
        JOIN empleados e ON m.empleado_id = e.id
        WHERE m.tenant_id = $1
          AND m.timestamp >= CURRENT_DATE
          AND m.timestamp < CURRENT_DATE + INTERVAL '1 day'
        ORDER BY m.timestamp DESC
        LIMIT $2
      `, [tenantId, limit]),
    ]);

    res.json({
      success: true,
      marcaciones: marks.rows,
      metrics: summary.rows[0] || { total: 0, empleados_marcados: 0, inicios_jornada: 0, fines_jornada: 0 },
      limit,
      correlationId: req.correlationId,
    });
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
