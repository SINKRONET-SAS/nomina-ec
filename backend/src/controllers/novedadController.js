// ============================================================
// PLAN HAIKY - Controlador de Novedades
// ============================================================
const db = require('../config/database');
const { ensurePayrollPeriodForDate } = require('../services/monthlyPeriodService');
const { ensureNoveltyTypeAllowed, normalizeNoveltyCode } = require('../services/payrollNoveltyService');

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
    const { empleadoId, fecha, tipoNovedad, minutos, monto, justificacion } = req.body;
    
    if (!empleadoId || !fecha || !tipoNovedad) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }
    
    const normalizedTipo = normalizeNoveltyCode(tipoNovedad);
    const period = await ensurePayrollPeriodForDate({ tenantId, userId: usuarioId, fecha });
    const noveltyConfig = await ensureNoveltyTypeAllowed({
      tenantId,
      tipoNovedad: normalizedTipo,
      anio: Number(period.periodoNomina.slice(0, 4)),
      mes: Number(period.periodoNomina.slice(5, 7)),
      userId: usuarioId,
    });
    const montoNovedad = normalizeAmount(monto);
    if (noveltyConfig.calculationMode === 'amount' && montoNovedad <= 0 && noveltyConfig.payrollImpact !== 'informativo') {
      return res.status(422).json({ error: 'La novedad requiere un monto mayor a cero segun su forma de calculo.' });
    }
    if (period.status === 'closed') {
      return res.status(422).json({ error: 'No se puede registrar novedades en un periodo cerrado' });
    }

    const result = await db.query(`
      INSERT INTO novedades_asistencia (
        empleado_id, tenant_id, period_id, periodo_nomina, fecha, tipo_novedad, minutos, monto, justificacion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, empleado_id, fecha, tipo_novedad, minutos, monto, estado
    `, [empleadoId, tenantId, period.id, period.periodoNomina, fecha, normalizedTipo, minutos || 0, montoNovedad, justificacion || '']);
    
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

function normalizeAmount(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) / 100 : 0;
}

module.exports = { listar, listarPendientes, crear, aprobar, rechazar };

