// ============================================================
// Nomina-Ec - Controlador de Novedades
// ============================================================
const db = require('../config/database');
const { recordAudit } = require('../services/auditService');
const { ensurePayrollPeriodForDate, formatPeriodMarker, validatePeriod } = require('../services/monthlyPeriodService');
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

    const empleado = await db.query(
      'SELECT id FROM empleados WHERE id = $1 AND tenant_id = $2 AND activo = true',
      [empleadoId, tenantId]
    );
    if (empleado.rows.length === 0) {
      return res.status(404).json({
        error: 'EMPLEADO_NO_ENCONTRADO',
        message: 'Empleado no encontrado para el tenant actual.',
        correlationId: req.correlationId,
      });
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

async function resolverPeriodo(req, res) {
  try {
    const { tenantId, usuarioId } = req;
    const { anio, mes } = validatePeriod(req.body?.anio, req.body?.mes);
    const decision = String(req.body?.decision || 'aprobar').trim().toLowerCase();
    const motivo = String(req.body?.motivo || '').trim();
    const periodoNomina = formatPeriodMarker(anio, mes);

    if (!['aprobar', 'rechazar'].includes(decision)) {
      return res.status(400).json({
        error: 'DECISION_NOVEDADES_INVALIDA',
        message: 'La decision debe ser aprobar o rechazar.',
        correlationId: req.correlationId,
      });
    }

    const estado = decision === 'aprobar' ? 'aprobado' : 'rechazado';
    const estadoSql = estado === 'aprobado' ? "'aprobado'" : "'rechazado'";
    const justificacion = estado === 'rechazado' ? motivo : null;
    if (estado === 'rechazado' && motivo.length < 5) {
      return res.status(422).json({
        error: 'MOTIVO_RECHAZO_REQUERIDO',
        message: 'Indica un motivo claro para rechazar novedades del periodo.',
        correlationId: req.correlationId,
      });
    }

    const result = await db.query(`
      UPDATE novedades_asistencia
      SET estado = ${estadoSql},
          aprobado_por = $1,
          justificacion = COALESCE($4::text, justificacion),
          updated_at = NOW()
      WHERE tenant_id = $2
        AND estado = 'pendiente'
        AND (
          periodo_nomina = $3
          OR (EXTRACT(YEAR FROM fecha) = $5 AND EXTRACT(MONTH FROM fecha) = $6)
        )
      RETURNING id, empleado_id, tipo_novedad, fecha, estado
    `, [usuarioId || null, tenantId, periodoNomina, justificacion, anio, mes]);

    await recordAudit({
      tenantId,
      userId: usuarioId,
      correlationId: req.correlationId,
      action: `novedades.periodo.${estado}`,
      entity: 'novedades_asistencia',
      newData: {
        anio,
        mes,
        periodoNomina,
        decision,
        total: result.rows.length,
      },
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      periodoNomina,
      decision,
      estado,
      total: result.rows.length,
      novedades: result.rows,
      correlationId: req.correlationId,
    });
  } catch (err) {
    console.error('[NOVEDADES] Error resolviendo periodo', {
      code: err.code || 'NOVEDADES_PERIODO_RESOLVE_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'NOVEDADES_PERIODO_RESOLVE_ERROR',
      message: err.message,
      correlationId: req.correlationId,
    });
  }
}

function normalizeAmount(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) / 100 : 0;
}

module.exports = {
  listar,
  listarPendientes,
  crear,
  aprobar,
  rechazar,
  resolverPeriodo,
};

