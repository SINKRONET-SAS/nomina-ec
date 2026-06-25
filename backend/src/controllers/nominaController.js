// ============================================================
// PLAN HAIKY - Controlador de Nomina
// ============================================================
const db = require('../config/database');
const { calcularNominaMensual } = require('../services/calculoNominaService');
const { recordAudit } = require('../services/auditService');
const { assertTenantPayrollReady } = require('../services/operationalReadinessService');
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

    const anioNumber = Number(anio);
    const mesNumber = Number(mes);
    const readiness = await assertTenantPayrollReady({
      tenantId,
      anio: anioNumber,
      mes: mesNumber,
      mode: 'calculation',
    });

    const resultado = await calcularNominaMensual(tenantId, anioNumber, mesNumber, {
      userId: req.usuarioId,
      correlationId: req.correlationId,
      ipAddress: req.ip,
    });
    const erroresDetalle = Array.isArray(resultado.resultados)
      ? resultado.resultados.filter((row) => row.error)
      : [];

    if (erroresDetalle.length > 0) {
      await db.query(`
        UPDATE payroll_periods
        SET status = 'calculation_failed',
            calculated_at = NOW(),
            summary = COALESCE(summary, '{}'::jsonb) || jsonb_build_object(
              'lastCalculation', jsonb_build_object(
                'status', 'failed',
                'errores', $4::jsonb,
                'totalErrores', $5::int,
                'correlationId', $6::text,
                'batchId', $7::text,
                'at', NOW()
              )
            ),
            updated_at = NOW()
        WHERE tenant_id = $1 AND anio = $2 AND mes = $3
      `, [tenantId, anioNumber, mesNumber, JSON.stringify(erroresDetalle), erroresDetalle.length, req.correlationId || null, resultado.batch?.id || null]);

      return res.status(422).json({
        success: false,
        error: 'NOMINA_CALCULATION_FAILED',
        message: 'La nomina tiene errores por empleado. Corrige los bloqueos y recalcula antes de cerrar.',
        resultado: {
          ...resultado,
          exitosos: resultado.resultados.length - erroresDetalle.length,
          errores: erroresDetalle.length,
          erroresDetalle,
        },
        readiness,
        correlationId: req.correlationId,
      });
    }

    await db.query(`
      UPDATE payroll_periods
      SET status = CASE WHEN status IN ('open', 'novelties_loaded', 'reopened', 'calculation_failed') THEN 'calculated' ELSE status END,
          calculated_at = NOW(),
          summary = COALESCE(summary, '{}'::jsonb) || jsonb_build_object(
            'lastCalculation', jsonb_build_object(
              'status', 'calculated',
              'total', $4::int,
              'correlationId', $5::text,
              'batchId', $6::text,
              'at', NOW()
            )
          ),
          updated_at = NOW()
      WHERE tenant_id = $1 AND anio = $2 AND mes = $3
    `, [tenantId, anioNumber, mesNumber, resultado.total || 0, req.correlationId || null, resultado.batch?.id || null]);
    res.json({ success: true, resultado, readiness, correlationId: req.correlationId });
  } catch (err) {
    console.error('[NOMINA] Error calculando mes', {
      code: err.code || 'NOMINA_CALCULO_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    res.status(err.statusCode || 500).json({
      error: err.code || 'NOMINA_CALCULO_ERROR',
      message: err.message,
      details: err.details,
      correlationId: req.correlationId,
    });
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
      SELECT n.*, e.nombres, e.apellidos, e.cedula, COALESCE(jp.name, e.cargo) AS cargo, jp.code AS cargo_codigo
      FROM nominas n
      JOIN empleados e ON n.empleado_id = e.id
      LEFT JOIN job_positions jp
        ON jp.id = e.position_id
       AND jp.tenant_id = e.tenant_id
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

    const anioNumber = Number(anio);
    const mesNumber = Number(mes);
    const readiness = await assertTenantPayrollReady({
      tenantId,
      anio: anioNumber,
      mes: mesNumber,
      mode: 'close',
    });

    const result = await db.query(`
      UPDATE nominas
      SET estado = 'cerrada', cerrado_en = NOW(), updated_at = NOW()
      WHERE tenant_id = $1 AND anio = $2 AND mes = $3 AND estado = 'borrador'
      RETURNING id, detalle_calculo
    `, [tenantId, anioNumber, mesNumber]);

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
          summary = COALESCE(summary, '{}'::jsonb) || jsonb_build_object(
            'lastClose', jsonb_build_object(
              'total', $4::int,
              'beneficiosAplicados', $5::int,
              'beneficiosOmitidos', $6::int,
              'correlationId', $7::text,
              'at', NOW()
            )
          ),
          updated_at = NOW()
      WHERE tenant_id = $1 AND anio = $2 AND mes = $3
    `, [tenantId, anioNumber, mesNumber, result.rows.length, beneficiosAplicados, beneficiosOmitidos, req.correlationId || null]);

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
      readiness,
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
    res.status(err.statusCode || 500).json({
      error: err.code || 'NOMINA_CIERRE_ERROR',
      message: err.message,
      details: err.details,
      correlationId: req.correlationId,
    });
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

    const period = await db.query(`
      SELECT status
      FROM payroll_periods
      WHERE tenant_id = $1 AND anio = $2 AND mes = $3
      LIMIT 1
    `, [tenantId, Number(anio), Number(mes)]);

    if (period.rows[0]?.status !== 'closed') {
      return res.status(409).json({
        error: 'NOMINA_REAPERTURA_ESTADO_INVALIDO',
        message: 'Solo una nomina cerrada puede entrar a reapertura controlada.',
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
          summary = COALESCE(summary, '{}'::jsonb) || jsonb_build_object(
            'lastReopen', jsonb_build_object(
              'motivo', $4::text,
              'total', $5::int,
              'correlationId', $6::text,
              'at', NOW()
            )
          ),
          updated_at = NOW()
      WHERE tenant_id = $1 AND anio = $2 AND mes = $3
    `, [tenantId, Number(anio), Number(mes), String(motivo).trim(), result.rows.length, req.correlationId || null]);

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
      mensaje: `${result.rows.length} nominas en reapertura controlada`,
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
    res.status(err.statusCode || 500).json({
      error: err.code || 'NOMINA_REAPERTURA_ERROR',
      message: err.message,
      details: err.details,
      correlationId: req.correlationId,
    });
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
