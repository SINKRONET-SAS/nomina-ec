// ============================================================
// SKNOMINA - Controlador de Nómina
// ============================================================
const db = require('../config/database');
const { calcularNominaMensual } = require('../services/calculoNominaService');
const { recordAudit } = require('../services/auditService');
const { assertTenantPayrollReady } = require('../services/operationalReadinessService');
const {
  discardPayrollDraft,
  discardPayrollPeriodCalculation,
} = require('../services/payrollLifecycleService');
const { resolveStorageUrl } = require('../config/s3');
const {
  generatePayrollRolePdf,
  generatePayrollRolePeriodTransposedPdf,
} = require('../services/payrollRolePdfService');
const {
  closeEmptyPastPayrollPeriods,
  createNoveltyBatch,
  deleteNoveltyBatch,
  closeOperationalPayrollPeriod,
  generateAnnualPayrollPeriods,
  getPayrollPeriodState,
  listAnnualPayrollPeriods,
  openPayrollPeriod,
  updatePayrollPeriodDates,
} = require('../services/monthlyPeriodService');
const {
  sendRolPagoDisponible,
  sendRolPagoEmail,
} = require('../services/communicationService');

async function rollbackPayrollCalculation(tx, req, operation) {
  try {
    await db.rollback(tx);
  } catch (rollbackErr) {
    console.error(`[NOMINA] Error revirtiendo transacción de ${operation}`, {
      code: rollbackErr.code || 'NOMINA_CALCULO_ROLLBACK_ERROR',
      statusCode: 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: rollbackErr.message,
    });
  }
}

function sendPayrollCalculationError(req, res, err, operation) {
  console.error(`[NOMINA] Error en ${operation}`, {
    code: err.code || 'NOMINA_CALCULO_ERROR',
    statusCode: err.statusCode || 500,
    correlationId: req.correlationId,
    userId: req.usuarioId || null,
    message: err.message,
  });
  const statusCode = Number(err.statusCode || 500);
  const publicError = statusCode >= 400 && statusCode < 500;
  return res.status(statusCode).json({
    error: publicError ? (err.code || 'NOMINA_CALCULO_ERROR') : 'NOMINA_CALCULO_ERROR',
    message: publicError
      ? err.message
      : 'No pudimos completar el cálculo de nómina. Intenta nuevamente; si persiste, reporta el código de seguimiento.',
    details: publicError ? err.details : undefined,
    correlationId: req.correlationId,
  });
}

async function precalcularMes(req, res) {
  let tx = null;
  try {
    const { tenantId } = req;
    const { anio, mes } = req.body;

    if (!anio || !mes) {
      return res.status(400).json({ error: 'Año y mes requeridos', correlationId: req.correlationId });
    }

    const anioNumber = Number(anio);
    const mesNumber = Number(mes);
    const readiness = await assertTenantPayrollReady({
      tenantId,
      anio: anioNumber,
      mes: mesNumber,
      mode: 'calculation',
    });

    tx = await db.getClient(tenantId, req.usuarioId);
    const resultado = await calcularNominaMensual(tenantId, anioNumber, mesNumber, {
      userId: req.usuarioId,
      correlationId: req.correlationId,
      ipAddress: req.ip,
      dbClient: tx,
    });
    const erroresDetalle = Array.isArray(resultado.resultados)
      ? resultado.resultados.filter((row) => row.error)
      : [];

    await db.rollback(tx);
    tx = null;

    return res.json({
      success: true,
      message: erroresDetalle.length > 0
        ? 'El precálculo encontró empleados que requieren corrección. No se creó ningún rol.'
        : 'El precálculo terminó sin errores. No se creó ningún rol.',
      resultado: {
        ...resultado,
        batch: null,
        preview: true,
        persisted: false,
        exitosos: resultado.resultados.length - erroresDetalle.length,
        errores: erroresDetalle.length,
        erroresDetalle,
      },
      readiness,
      correlationId: req.correlationId,
    });
  } catch (err) {
    if (tx) await rollbackPayrollCalculation(tx, req, 'precálculo');
    return sendPayrollCalculationError(req, res, err, 'precálculo de nómina');
  }
}

async function calcularMes(req, res) {
  let tx = null;
  try {
    const { tenantId } = req;
    const { anio, mes } = req.body;

    if (!anio || !mes) {
      return res.status(400).json({ error: 'Año y mes requeridos', correlationId: req.correlationId });
    }

    const anioNumber = Number(anio);
    const mesNumber = Number(mes);
    const readiness = await assertTenantPayrollReady({
      tenantId,
      anio: anioNumber,
      mes: mesNumber,
      mode: 'calculation',
    });

    tx = await db.getClient(tenantId, req.usuarioId);
    const resultado = await calcularNominaMensual(tenantId, anioNumber, mesNumber, {
      userId: req.usuarioId,
      correlationId: req.correlationId,
      ipAddress: req.ip,
      dbClient: tx,
    });
    const erroresDetalle = Array.isArray(resultado.resultados)
      ? resultado.resultados.filter((row) => row.error)
      : [];

    if (erroresDetalle.length > 0) {
      await tx.query(`
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

      await db.commit(tx);
      tx = null;
      return res.status(422).json({
        success: false,
        error: 'NOMINA_CALCULATION_FAILED',
        message: 'La nómina tiene errores por empleado. Corrige los bloqueos y recalcula antes de cerrar.',
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

    await tx.query(`
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
    await db.commit(tx);
    tx = null;
    res.json({ success: true, resultado, readiness, correlationId: req.correlationId });
  } catch (err) {
    if (tx) await rollbackPayrollCalculation(tx, req, 'cálculo');
    return sendPayrollCalculationError(req, res, err, 'cálculo de nómina');
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

async function listarPeriodosAnuales(req, res) {
  try {
    const result = await listAnnualPayrollPeriods({
      tenantId: req.tenantId,
      anio: req.params.anio,
    });
    return res.json({ success: true, ...result, correlationId: req.correlationId });
  } catch (err) {
    console.error('[NOMINA] Error listando periodos anuales', {
      code: err.code || 'NOMINA_PERIODOS_ANUALES_LIST_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 400).json({
      error: err.code || 'NOMINA_PERIODOS_ANUALES_LIST_ERROR',
      message: err.message,
      details: err.details,
      correlationId: req.correlationId,
    });
  }
}

async function generarPeriodosAnuales(req, res) {
  try {
    const result = await generateAnnualPayrollPeriods({
      tenantId: req.tenantId,
      userId: req.usuarioId,
      correlationId: req.correlationId,
      ipAddress: req.ip,
      anio: req.body?.anio,
    });
    return res.status(201).json({ success: true, ...result, correlationId: req.correlationId });
  } catch (err) {
    console.error('[NOMINA] Error generando periodos anuales', {
      code: err.code || 'NOMINA_PERIODOS_ANUALES_GENERATE_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 400).json({
      error: err.code || 'NOMINA_PERIODOS_ANUALES_GENERATE_ERROR',
      message: err.message,
      details: err.details,
      correlationId: req.correlationId,
    });
  }
}

async function actualizarFechasPeriodo(req, res) {
  try {
    const period = await updatePayrollPeriodDates({
      tenantId: req.tenantId,
      userId: req.usuarioId,
      correlationId: req.correlationId,
      ipAddress: req.ip,
      anio: req.params?.anio,
      mes: req.params?.mes,
      fechaDesde: req.body?.fechaDesde || req.body?.fecha_desde,
      fechaHasta: req.body?.fechaHasta || req.body?.fecha_hasta,
    });
    return res.json({ success: true, period, correlationId: req.correlationId });
  } catch (err) {
    console.error('[NOMINA] Error actualizando fechas de periodo', {
      code: err.code || 'NOMINA_PERIODO_FECHAS_UPDATE_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 400).json({
      error: err.code || 'NOMINA_PERIODO_FECHAS_UPDATE_ERROR',
      message: err.message,
      details: err.details,
      correlationId: req.correlationId,
    });
  }
}

async function cerrarPeriodosAnterioresVacios(req, res) {
  try {
    const result = await closeEmptyPastPayrollPeriods({
      tenantId: req.tenantId,
      userId: req.usuarioId,
      correlationId: req.correlationId,
      ipAddress: req.ip,
      anio: req.body?.anio,
      hastaMes: req.body?.hastaMes,
      motivo: req.body?.motivo,
    });
    return res.json({ success: true, ...result, correlationId: req.correlationId });
  } catch (err) {
    console.error('[NOMINA] Error cerrando periodos anteriores vacios', {
      code: err.code || 'NOMINA_PERIODOS_ANTERIORES_VACIOS_CLOSE_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 400).json({
      error: err.code || 'NOMINA_PERIODOS_ANTERIORES_VACIOS_CLOSE_ERROR',
      message: err.message,
      details: err.details,
      correlationId: req.correlationId,
    });
  }
}

async function cerrarPeriodoOperativo(req, res) {
  try {
    const period = await closeOperationalPayrollPeriod({
      tenantId: req.tenantId,
      userId: req.usuarioId,
      correlationId: req.correlationId,
      ipAddress: req.ip,
      anio: req.body?.anio,
      mes: req.body?.mes,
      motivo: req.body?.motivo,
    });
    return res.json({ success: true, period, correlationId: req.correlationId });
  } catch (err) {
    console.error('[NOMINA] Error cerrando periodo operativo', {
      code: err.code || 'NOMINA_PERIODO_OPERATIVO_CLOSE_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 400).json({
      error: err.code || 'NOMINA_PERIODO_OPERATIVO_CLOSE_ERROR',
      message: err.message,
      details: err.details,
      correlationId: req.correlationId,
    });
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
    const anioNumber = Number(anio);
    const mesNumber = Number(mes);
    if (!Number.isInteger(anioNumber) || !Number.isInteger(mesNumber) || mesNumber < 1 || mesNumber > 12) {
      return res.status(400).json({
        error: 'NOMINA_PERIODO_INVALIDO',
        message: 'El periodo de nómina debe incluir año numérico y mes entre 1 y 12.',
        correlationId: req.correlationId,
      });
    }

    const result = await db.query(`
      SELECT n.*, e.nombres, e.apellidos, e.cedula, COALESCE(jp.name, e.cargo) AS cargo, jp.code AS cargo_codigo
      FROM nominas n
      JOIN empleados e ON n.empleado_id = e.id
      LEFT JOIN job_positions jp
        ON jp.id = e.position_id
       AND jp.tenant_id = e.tenant_id
      WHERE n.tenant_id = $1 AND n.anio = $2 AND n.mes = $3
      ORDER BY e.apellidos, e.nombres
    `, [tenantId, anioNumber, mesNumber]);

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
      return res.status(404).json({ error: 'Nómina no encontrada', correlationId: req.correlationId });
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

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'NOMINA_NO_ENCONTRADA',
        message: 'Nómina no encontrada.',
        correlationId: req.correlationId,
      });
    }

    const row = result.rows[0];
    let url = row.rol_pdf_url;
    let generatedRole = null;
    if (!url || String(url).startsWith('demo://')) {
      generatedRole = await generatePayrollRolePdf({
        tenantId,
        payrollId: id,
        userId: req.usuarioId || null,
      });
      url = generatedRole.url;
    }

    res.json({
      success: true,
      url: resolveStorageUrl(url),
      fileName: `rol_pago_${row.cedula}_${row.anio}_${String(row.mes).padStart(2, '0')}.pdf`,
      contentType: 'application/pdf',
      generated: Boolean(generatedRole),
      storageContract: 'url_firmada_o_publica',
      encoding: 'url',
      correlationId: req.correlationId,
    });
  } catch (err) {
    console.error('[NOMINA] Error descargando rol PDF', {
      code: err.code || 'NOMINA_PDF_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    res.status(err.statusCode || 500).json({
      error: err.code || 'NOMINA_PDF_ERROR',
      message: err.message || 'Error interno',
      correlationId: req.correlationId,
    });
  }
}

async function enviarRolPagoEmail(req, res) {
  try {
    const { id } = req.params;
    const { tenantId } = req;
    const result = await db.query(`
      SELECT
        n.id,
        n.empleado_id,
        n.tenant_id,
        n.anio,
        n.mes,
        n.estado,
        e.nombres,
        e.apellidos,
        e.cedula,
        e.email_personal
      FROM nominas n
      JOIN empleados e ON e.id = n.empleado_id AND e.tenant_id = n.tenant_id
      WHERE n.id = $1 AND n.tenant_id = $2
      LIMIT 1
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'NOMINA_NO_ENCONTRADA',
        message: 'Nómina no encontrada.',
        correlationId: req.correlationId,
      });
    }

    const row = result.rows[0];
    if (row.estado !== 'cerrada') {
      return res.status(409).json({
        error: 'NOMINA_ROL_NO_CERRADO',
        message: 'Solo se puede enviar por email un rol de pago cerrado.',
        correlationId: req.correlationId,
      });
    }

    if (!row.email_personal) {
      return res.status(422).json({
        error: 'EMPLEADO_EMAIL_REQUERIDO',
        message: 'El empleado no tiene correo personal registrado para recibir el rol de pago.',
        correlationId: req.correlationId,
      });
    }

    const pdf = await generatePayrollRolePdf({
      tenantId,
      payrollId: id,
      userId: req.usuarioId || null,
      includeBuffer: true,
    });
    const delivery = await sendRolPagoEmail({
      employee: row,
      payroll: row,
      pdf,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
    });

    await recordAudit({
      tenantId,
      userId: req.usuarioId,
      correlationId: req.correlationId,
      action: 'nomina.rol_pago.email_enviar',
      entity: 'nominas',
      entityId: id,
      newData: {
        empleadoId: row.empleado_id,
        anio: row.anio,
        mes: row.mes,
        deliveryStatus: delivery.status,
        provider: delivery.provider,
        fileName: pdf.fileName,
      },
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      delivery: {
        status: delivery.status,
        provider: delivery.provider,
        messageId: delivery.messageId || null,
      },
      fileName: pdf.fileName,
      correlationId: req.correlationId,
    });
  } catch (err) {
    console.error('[NOMINA] Error enviando rol de pago por email', {
      code: err.code || 'NOMINA_ROL_EMAIL_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'NOMINA_ROL_EMAIL_ERROR',
      message: err.message || 'No pudimos enviar el rol de pago por email.',
      details: err.details,
      correlationId: req.correlationId,
    });
  }
}

async function descargarRolesTranspuestosPDF(req, res) {
  try {
    const { anio, mes } = req.params;
    const { tenantId } = req;
    const generatedRole = await generatePayrollRolePeriodTransposedPdf({
      tenantId,
      anio,
      mes,
      userId: req.usuarioId || null,
    });

    res.json({
      success: true,
      url: resolveStorageUrl(generatedRole.url),
      fileName: generatedRole.fileName,
      contentType: generatedRole.contentType,
      totalEmpleados: generatedRole.totalEmpleados,
      generated: true,
      storageContract: 'url_firmada_o_publica',
      encoding: 'url',
      correlationId: req.correlationId,
    });
  } catch (err) {
    console.error('[NOMINA] Error descargando roles transpuestos PDF', {
      code: err.code || 'NOMINA_ROLES_TRANSPUESTOS_PDF_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    res.status(err.statusCode || 500).json({
      error: err.code || 'NOMINA_ROLES_TRANSPUESTOS_PDF_ERROR',
      message: err.message || 'Error interno',
      correlationId: req.correlationId,
    });
  }
}

async function cerrarMes(req, res) {
  let tx = null;
  try {
    const { tenantId, usuarioId } = req;
    const { anio, mes } = req.body;

    if (!anio || !mes) {
      return res.status(400).json({ error: 'Año y mes requeridos', correlationId: req.correlationId });
    }

    const anioNumber = Number(anio);
    const mesNumber = Number(mes);
    const readiness = await assertTenantPayrollReady({
      tenantId,
      anio: anioNumber,
      mes: mesNumber,
      mode: 'close',
    });

    tx = await db.getClient(tenantId, usuarioId);
    const periodLock = await tx.query(`
      SELECT id, status
      FROM payroll_periods
      WHERE tenant_id = $1 AND anio = $2 AND mes = $3
      FOR UPDATE
    `, [tenantId, anioNumber, mesNumber]);

    if (periodLock.rows[0]?.status !== 'calculated') {
      await db.rollback(tx);
      tx = null;
      return res.status(409).json({
        error: 'NOMINA_PERIODO_NO_CALCULADO',
        message: 'Calcula la nómina antes de cerrar el periodo.',
        correlationId: req.correlationId,
      });
    }

    const result = await tx.query(`
      UPDATE nominas
      SET estado = 'cerrada', cerrado_en = NOW(), updated_at = NOW()
      WHERE tenant_id = $1 AND anio = $2 AND mes = $3 AND estado = 'borrador'
      RETURNING id, empleado_id, tenant_id, anio, mes, detalle_calculo
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
        const updateResult = await tx.query(`
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

    await tx.query(`
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

    const employeesResult = result.rows.length > 0
      ? await tx.query(`
        SELECT id, tenant_id, nombres, apellidos, email_personal
        FROM empleados
        WHERE tenant_id = $1 AND id = ANY($2::uuid[])
      `, [tenantId, result.rows.map((row) => row.empleado_id)])
      : { rows: [] };

    await db.commit(tx);
    tx = null;

    await recordAudit({
      tenantId,
      userId: usuarioId,
      correlationId: req.correlationId,
      action: 'cerrar_nomina',
      entity: 'nominas',
      newData: { anio, mes, total: result.rows.length, beneficiosAplicados, beneficiosOmitidos },
      ipAddress: req.ip,
    });

    const employeeById = new Map(employeesResult.rows.map((employee) => [String(employee.id), employee]));
    const communicationResults = [];

    for (const payroll of result.rows) {
      const employee = employeeById.get(String(payroll.empleado_id));
      if (!employee) continue;
      try {
        const delivery = await sendRolPagoDisponible({
          employee,
          payroll,
          correlationId: req.correlationId,
          userId: usuarioId,
        });
        communicationResults.push({
          payrollId: payroll.id,
          employeeId: employee.id,
          status: delivery.status,
          provider: delivery.provider,
        });
      } catch (deliveryErr) {
        console.error('[NOMINA] No se pudo notificar rol de pago disponible', {
          code: deliveryErr.code || 'ROL_PAGO_NOTIFICACION_ERROR',
          statusCode: deliveryErr.statusCode || 500,
          correlationId: req.correlationId,
          userId: usuarioId || null,
          empleadoId: employee.id,
          message: deliveryErr.message,
        });
        communicationResults.push({
          payrollId: payroll.id,
          employeeId: employee.id,
          status: 'failed',
          provider: 'smtp',
          error: deliveryErr.code || 'ROL_PAGO_NOTIFICACION_ERROR',
        });
      }
    }

    const enviados = communicationResults.filter((r) => r.status === 'sent').length;
    const omitidos = communicationResults.filter((r) => r.status === 'skipped').length;
    const errores = communicationResults.filter((r) => r.status === 'failed').length;
    const skippedEmails = communicationResults
      .filter((r) => r.status === 'skipped')
      .map((r) => r.employeeId);

    res.json({
      success: true,
      mensaje: `${result.rows.length} nóminas cerradas`,
      total: result.rows.length,
      beneficiosAplicados,
      beneficiosOmitidos,
      notificacionesRolPago: {
        enviados,
        omitidos,
        errores,
        detalle: communicationResults,
        empleadosSinNotificacion: skippedEmails,
      },
      readiness,
      correlationId: req.correlationId,
    });
  } catch (err) {
    if (tx) {
      await db.rollback(tx).catch((rollbackErr) => {
        console.error('[NOMINA] Error revirtiendo transaccion de cierre', {
          code: rollbackErr.code || 'NOMINA_CIERRE_ROLLBACK_ERROR',
          statusCode: 500,
          correlationId: req.correlationId,
          userId: req.usuarioId || null,
          message: rollbackErr.message,
        });
      });
    }
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
  return res.status(409).json({
    error: 'NOMINA_CERRADA_INMUTABLE',
    message: 'La nómina cerrada conserva su respaldo original. Registra la corrección como ajuste en un período abierto.',
    nextAction: 'registrar_ajuste_periodo_abierto',
    correlationId: req.correlationId,
  });
}

async function eliminarLoteNovedades(req, res) {
  try {
    const result = await deleteNoveltyBatch({
      tenantId: req.tenantId,
      userId: req.usuarioId,
      batchId: req.params.batchId,
      correlationId: req.correlationId,
      ipAddress: req.ip,
    });
    return res.json({ success: true, deleted: result.deleted, correlationId: req.correlationId });
  } catch (err) {
    console.error('[NOMINA] Error eliminando lote', {
      code: err.code || 'NOMINA_BATCH_DELETE_ERROR',
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 400).json({
      error: err.code || err.message,
      message: err.message,
      details: err.details,
      correlationId: req.correlationId,
    });
  }
}

async function descartarCalculoPeriodo(req, res) {
  try {
    const result = await discardPayrollPeriodCalculation({
      tenantId: req.tenantId,
      anio: req.body?.anio,
      mes: req.body?.mes,
      userId: req.usuarioId,
      correlationId: req.correlationId,
      ipAddress: req.ip,
      reason: req.body?.motivo,
    });
    return res.json({
      success: true,
      message: `${result.deleted} roles en borrador fueron descartados. Ya puedes corregir novedades y recalcular.`,
      result,
      correlationId: req.correlationId,
    });
  } catch (err) {
    console.error('[NOMINA] Error descartando calculo del periodo', {
      code: err.code || 'NOMINA_PERIODO_DESCARTE_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'NOMINA_PERIODO_DESCARTE_ERROR',
      message: err.message,
      details: err.details,
      correlationId: req.correlationId,
    });
  }
}

async function eliminarBorrador(req, res) {
  try {
    const result = await discardPayrollDraft({
      tenantId: req.tenantId,
      payrollId: req.params.id,
      userId: req.usuarioId,
      correlationId: req.correlationId,
      ipAddress: req.ip,
      reason: req.body?.motivo,
      intent: req.body?.intencion,
    });
    return res.json({
      success: true,
      message: result.nextAction === 'correct_sources'
        ? 'Borrador descartado. Corrige las novedades del empleado y vuelve a calcular.'
        : 'Borrador eliminado. El periodo quedo disponible para recalculo.',
      result,
      correlationId: req.correlationId,
    });
  } catch (err) {
    console.error('[NOMINA] Error eliminando rol borrador', {
      code: err.code || 'NOMINA_BORRADOR_DESCARTE_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'NOMINA_BORRADOR_DESCARTE_ERROR',
      message: err.message,
      details: err.details,
      correlationId: req.correlationId,
    });
  }
}

module.exports = {
  precalcularMes,
  calcularMes,
  obtenerEstadoPeriodo,
  abrirPeriodo,
  listarPeriodosAnuales,
  generarPeriodosAnuales,
  actualizarFechasPeriodo,
  cerrarPeriodosAnterioresVacios,
  cerrarPeriodoOperativo,
  crearLoteNovedades,
  eliminarLoteNovedades,
  listarPorPeriodo,
  obtenerPorEmpleado,
  descargarRolPDF,
  enviarRolPagoEmail,
  descargarRolesTranspuestosPDF,
  cerrarMes,
  reabrirMes,
  descartarCalculoPeriodo,
  eliminarBorrador,
};
