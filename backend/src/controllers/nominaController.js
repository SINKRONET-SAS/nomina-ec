// ============================================================
// PLAN HAIKY - Controlador de Nomina
// ============================================================
const db = require('../config/database');
const { calcularNominaMensual } = require('../services/calculoNominaService');
const { recordAudit } = require('../services/auditService');
const {
  createNoveltyBatch,
  getPayrollPeriodState,
  openPayrollPeriod,
} = require('../services/monthlyPeriodService');

async function calcularMes(req, res) {
  try {
    const { tenantId } = req;
    const { anio, mes } = req.body;

    if (!anio || !mes) {
      return res.status(400).json({ error: 'Anio y mes requeridos', correlationId: req.correlationId });
    }

    const resultado = await calcularNominaMensual(tenantId, Number(anio), Number(mes));
    await db.query(`
      UPDATE payroll_periods
      SET status = CASE WHEN status IN ('open', 'novelties_loaded') THEN 'calculated' ELSE status END,
          calculated_at = NOW(),
          updated_at = NOW()
      WHERE tenant_id = $1 AND anio = $2 AND mes = $3
    `, [tenantId, Number(anio), Number(mes)]);
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

async function obtenerEstadoPeriodo(req, res) {
  try {
    const { tenantId } = req;
    const { anio, mes } = req.params;
    const state = await getPayrollPeriodState({ tenantId, anio, mes });
    return res.json({ success: true, state, correlationId: req.correlationId });
  } catch (err) {
    console.error('[NOMINA] Error obteniendo periodo', {
      code: err.code || 'NOMINA_PERIODO_GET_ERROR',
      statusCode: 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(400).json({ error: err.message, correlationId: req.correlationId });
  }
}

async function abrirPeriodo(req, res) {
  try {
    const period = await openPayrollPeriod({
      tenantId: req.tenantId,
      userId: req.usuarioId,
      correlationId: req.correlationId,
      ipAddress: req.ip,
      anio: req.body.anio,
      mes: req.body.mes,
    });
    return res.status(201).json({ success: true, period, correlationId: req.correlationId });
  } catch (err) {
    console.error('[NOMINA] Error abriendo periodo', {
      code: err.code || 'NOMINA_PERIODO_OPEN_ERROR',
      statusCode: 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(400).json({ error: err.message, correlationId: req.correlationId });
  }
}

async function crearLoteNovedades(req, res) {
  try {
    const result = await createNoveltyBatch({
      tenantId: req.tenantId,
      userId: req.usuarioId,
      correlationId: req.correlationId,
      ipAddress: req.ip,
      payload: req.body || {},
    });
    return res.status(result.replay ? 200 : 201).json({
      success: true,
      replay: result.replay,
      batch: result.batch,
      correlationId: req.correlationId,
    });
  } catch (err) {
    console.error('[NOMINA] Error creando lote de novedades', {
      code: err.code || 'NOMINA_NOVEDAD_BATCH_ERROR',
      statusCode: 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(400).json({ error: err.message, correlationId: req.correlationId });
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
      SELECT n.rol_pdf_url, n.anio, n.mes, e.nombres, e.apellidos, e.cedula
      FROM nominas n
      JOIN empleados e ON e.id = n.empleado_id
      WHERE n.id = $1 AND n.tenant_id = $2
    `, [id, tenantId]);

    if (result.rows.length === 0 || !result.rows[0].rol_pdf_url) {
      return res.status(404).json({
        error: 'NOMINA_PDF_NO_ENCONTRADO',
        message: 'El rol de pago todavia no tiene PDF generado.',
        correlationId: req.correlationId,
      });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      url: row.rol_pdf_url,
      fileName: `rol_pago_${row.cedula}_${row.anio}_${String(row.mes).padStart(2, '0')}.pdf`,
      contentType: 'application/pdf',
      storageContract: 'url_firmada_o_publica',
      encoding: 'url',
      correlationId: req.correlationId,
    });
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
      RETURNING id, detalle_calculo
    `, [tenantId, anio, mes]);

    const periodo = `${Number(anio)}-${String(Number(mes)).padStart(2, '0')}`;
    let beneficiosAplicados = 0;
    let beneficiosOmitidos = 0;

    for (const row of result.rows) {
      const benefits = Array.isArray(row.detalle_calculo?.beneficiosDescontados)
        ? row.detalle_calculo.beneficiosDescontados
        : [];
      for (const benefit of benefits) {
        const amount = Number(benefit.amount || 0);
        if (!Number.isFinite(amount) || amount <= 0) {
          beneficiosOmitidos += 1;
          continue;
        }

        const descuento = {
          periodo,
          anio: Number(anio),
          mes: Number(mes),
          nominaId: row.id,
          monto: amount,
        };
        const updateResult = await db.query(`
          UPDATE beneficios_empleados
          SET saldo_pendiente = GREATEST(0, saldo_pendiente - $3::numeric),
              estado = CASE
                WHEN GREATEST(0, saldo_pendiente - $3::numeric) = 0 THEN 'descontado'
                ELSE estado
              END,
              metadata = jsonb_set(
                COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('ultimoDescuento', $4::jsonb),
                '{descuentosNomina}',
                COALESCE(metadata->'descuentosNomina', '[]'::jsonb) || $5::jsonb,
                true
              ),
              updated_at = NOW()
          WHERE id = $1
            AND tenant_id = $2
            AND estado = 'aprobado'
            AND NOT (COALESCE(metadata->'descuentosNomina', '[]'::jsonb) @> $6::jsonb)
          RETURNING id
        `, [
          benefit.id,
          tenantId,
          amount,
          JSON.stringify(descuento),
          JSON.stringify([descuento]),
          JSON.stringify([{ periodo }]),
        ]);
        if (updateResult.rows.length > 0) {
          beneficiosAplicados += 1;
        } else {
          beneficiosOmitidos += 1;
        }
      }
    }

    await db.query(`
      UPDATE payroll_periods
      SET status = 'closed',
          closed_at = NOW(),
          updated_at = NOW()
      WHERE tenant_id = $1 AND anio = $2 AND mes = $3
    `, [tenantId, Number(anio), Number(mes)]);

    await recordAudit({
      tenantId,
      userId: usuarioId,
      correlationId: req.correlationId,
      action: 'cerrar_nomina',
      entity: 'nominas',
      newData: { anio, mes, total: result.rows.length, beneficiosAplicados, beneficiosOmitidos },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      mensaje: `${result.rows.length} nominas cerradas`,
      total: result.rows.length,
      beneficiosAplicados,
      beneficiosOmitidos,
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

    await db.query(`
      UPDATE payroll_periods
      SET status = 'reopened',
          closed_at = NULL,
          updated_at = NOW()
      WHERE tenant_id = $1 AND anio = $2 AND mes = $3
    `, [tenantId, Number(anio), Number(mes)]);

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
  obtenerEstadoPeriodo,
  abrirPeriodo,
  crearLoteNovedades,
  listarPorPeriodo,
  obtenerPorEmpleado,
  descargarRolPDF,
  cerrarMes,
  reabrirMes,
};
