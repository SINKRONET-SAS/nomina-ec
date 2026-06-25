// ============================================================
// Nomina-Ec - Controlador de Auditoria
// ============================================================
const db = require('../config/database');

async function listar(req, res) {
  try {
    const { tenantId, usuario } = req;
    const { entidad, accion, desde, hasta, limit = 100 } = req.query;
    const params = [];
    const conditions = [];

    if (usuario.rol !== 'superadmin') {
      params.push(tenantId);
      conditions.push(`tenant_id = $${params.length}`);
    }

    if (entidad) {
      params.push(entidad);
      conditions.push(`entidad = $${params.length}`);
    }

    if (accion) {
      params.push(accion);
      conditions.push(`accion = $${params.length}`);
    }

    if (desde) {
      params.push(desde);
      conditions.push(`created_at >= $${params.length}`);
    }

    if (hasta) {
      params.push(hasta);
      conditions.push(`created_at <= $${params.length}`);
    }

    params.push(Math.min(Number.parseInt(limit, 10) || 100, 500));
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await db.query(`
      SELECT *
      FROM audit_logs
      ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length}
    `, params);

    res.json({ success: true, auditLogs: result.rows, correlationId: req.correlationId });
  } catch (err) {
    console.error('[AUDITORIA] Error listando auditoria', {
      code: err.code || 'AUDIT_LIST_ERROR',
      statusCode: 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    res.status(500).json({ error: 'Error interno', correlationId: req.correlationId });
  }
}

module.exports = { listar };
