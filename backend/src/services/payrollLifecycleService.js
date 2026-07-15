const db = require('../config/database');
const AppError = require('../utils/AppError');
const { recordAudit } = require('./auditService');
const { formatPeriodMarker, validatePeriod } = require('./monthlyPeriodService');

const FINAL_PAYROLL_STATES = new Set(['cerrada', 'pagada']);
const DISCARD_INTENTS = new Set(['correction', 'delete', 'recalculate']);

function normalizeReason(value) {
  const reason = String(value || '').trim();
  if (reason.length < 10 || reason.length > 500) {
    throw new AppError('Indica un motivo de 10 a 500 caracteres para conservar la trazabilidad.', {
      code: 'NOMINA_DESCARTE_MOTIVO_INVALIDO',
      statusCode: 422,
    });
  }
  return reason;
}

function normalizeIntent(value) {
  const intent = String(value || 'recalculate').trim().toLowerCase();
  if (!DISCARD_INTENTS.has(intent)) {
    throw new AppError('La intencion del descarte no es valida.', {
      code: 'NOMINA_DESCARTE_INTENCION_INVALIDA',
      statusCode: 422,
    });
  }
  return intent;
}

function assertDraftEditable(row = {}) {
  if (FINAL_PAYROLL_STATES.has(row.estado) || row.period_status === 'closed') {
    throw new AppError('El rol esta cerrado y no puede eliminarse ni corregirse como borrador.', {
      code: 'NOMINA_ROL_FINAL_INMUTABLE',
      statusCode: 409,
      details: { payrollId: row.id || null, estado: row.estado || null },
    });
  }
  if (row.estado !== 'borrador') {
    throw new AppError('Solo se pueden descartar roles en borrador.', {
      code: 'NOMINA_ROL_NO_EDITABLE',
      statusCode: 409,
      details: { payrollId: row.id || null, estado: row.estado || null },
    });
  }
}

async function resolveNextPeriodStatus(client, { tenantId, anio, mes }) {
  const result = await client.query(`
    SELECT COUNT(*)::int AS total
    FROM novedades_asistencia
    WHERE tenant_id = $1
      AND (
        periodo_nomina = $2
        OR (EXTRACT(YEAR FROM fecha) = $3 AND EXTRACT(MONTH FROM fecha) = $4)
      )
  `, [tenantId, formatPeriodMarker(anio, mes), anio, mes]);

  return Number(result.rows[0]?.total || 0) > 0 ? 'novelties_loaded' : 'open';
}

async function appendBatchDiscardMetadata(client, {
  tenantId,
  batchIds,
  payload,
}) {
  const uniqueBatchIds = [...new Set((batchIds || []).filter(Boolean).map(String))];
  if (uniqueBatchIds.length === 0) return 0;

  const result = await client.query(`
    UPDATE payroll_calculation_batches
    SET metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{discardHistory}',
      COALESCE(metadata->'discardHistory', '[]'::jsonb) || $3::jsonb,
      true
    )
    WHERE tenant_id = $1 AND id = ANY($2::uuid[])
    RETURNING id
  `, [tenantId, uniqueBatchIds, JSON.stringify([payload])]);

  return result.rows.length;
}

async function updatePeriodAfterDiscard(client, {
  tenantId,
  periodId,
  anio,
  mes,
  nextStatus,
  summary,
}) {
  const result = await client.query(`
    UPDATE payroll_periods
    SET status = $5,
        calculated_at = NULL,
        summary = COALESCE(summary, '{}'::jsonb) || jsonb_build_object(
          'lastCalculationDiscard', $6::jsonb
        ),
        updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2 AND anio = $3 AND mes = $4
    RETURNING id, anio, mes, status, calculated_at
  `, [periodId, tenantId, anio, mes, nextStatus, JSON.stringify(summary)]);

  return result.rows[0] || null;
}

async function discardPayrollDraft({
  tenantId,
  payrollId,
  userId,
  correlationId = '',
  ipAddress = '',
  reason,
  intent = 'correction',
}) {
  const normalizedReason = normalizeReason(reason);
  const normalizedIntent = normalizeIntent(intent);
  let client = null;

  try {
    client = await db.getClient(tenantId, userId);
    const payrollResult = await client.query(`
      SELECT
        n.id,
        n.empleado_id,
        n.calculation_batch_id,
        n.anio,
        n.mes,
        n.estado,
        n.total_ingresos,
        n.total_deducciones,
        n.neto_recibir,
        pp.id AS period_id,
        pp.status AS period_status,
        (
          SELECT COUNT(*)::int
          FROM payroll_calculation_lines pcl
          WHERE pcl.tenant_id = n.tenant_id AND pcl.payroll_id = n.id
        ) AS calculation_lines
      FROM nominas n
      JOIN payroll_periods pp
        ON pp.tenant_id = n.tenant_id
       AND pp.anio = n.anio
       AND pp.mes = n.mes
      WHERE n.id = $1 AND n.tenant_id = $2
      FOR UPDATE OF n, pp
    `, [payrollId, tenantId]);

    if (payrollResult.rows.length === 0) {
      throw new AppError('Rol de pago no encontrado.', {
        code: 'NOMINA_ROL_NO_ENCONTRADO',
        statusCode: 404,
      });
    }

    const payroll = payrollResult.rows[0];
    assertDraftEditable(payroll);

    const deleted = await client.query(`
      DELETE FROM nominas
      WHERE id = $1 AND tenant_id = $2 AND estado = 'borrador'
      RETURNING id
    `, [payrollId, tenantId]);
    if (deleted.rows.length === 0) {
      throw new AppError('El rol cambio de estado antes de completar la accion.', {
        code: 'NOMINA_ROL_CONFLICTO_ESTADO',
        statusCode: 409,
      });
    }

    const discardedAt = new Date().toISOString();
    const discardEvidence = {
      scope: 'payroll',
      payrollId,
      empleadoId: payroll.empleado_id,
      reason: normalizedReason,
      intent: normalizedIntent,
      userId: userId || null,
      correlationId: correlationId || '',
      discardedAt,
    };
    await appendBatchDiscardMetadata(client, {
      tenantId,
      batchIds: [payroll.calculation_batch_id],
      payload: discardEvidence,
    });

    const nextStatus = await resolveNextPeriodStatus(client, {
      tenantId,
      anio: Number(payroll.anio),
      mes: Number(payroll.mes),
    });
    const period = await updatePeriodAfterDiscard(client, {
      tenantId,
      periodId: payroll.period_id,
      anio: Number(payroll.anio),
      mes: Number(payroll.mes),
      nextStatus,
      summary: discardEvidence,
    });

    await recordAudit({
      tenantId,
      userId,
      correlationId,
      action: 'nomina.borrador.descartar',
      entity: 'nominas',
      entityId: payrollId,
      previousData: {
        empleadoId: payroll.empleado_id,
        anio: payroll.anio,
        mes: payroll.mes,
        estado: payroll.estado,
        totalIngresos: payroll.total_ingresos,
        totalDeducciones: payroll.total_deducciones,
        netoRecibir: payroll.neto_recibir,
        calculationLines: payroll.calculation_lines,
      },
      newData: { ...discardEvidence, nextStatus },
      ipAddress,
      dbClient: client,
    });

    await db.commit(client);
    client = null;
    return {
      deleted: 1,
      payrollId,
      empleadoId: payroll.empleado_id,
      anio: Number(payroll.anio),
      mes: Number(payroll.mes),
      period,
      nextAction: normalizedIntent === 'correction' ? 'correct_sources' : 'recalculate',
    };
  } catch (err) {
    if (client) {
      await db.rollback(client).catch((rollbackErr) => {
        console.error('[NOMINA] Error revirtiendo descarte de borrador', {
          code: rollbackErr.code || 'NOMINA_BORRADOR_DESCARTE_ROLLBACK_ERROR',
          statusCode: 500,
          correlationId,
          userId: userId || null,
          message: rollbackErr.message,
        });
      });
    }
    throw err;
  }
}

async function discardPayrollPeriodCalculation({
  tenantId,
  anio,
  mes,
  userId,
  correlationId = '',
  ipAddress = '',
  reason,
}) {
  const normalizedReason = normalizeReason(reason);
  const periodInput = validatePeriod(anio, mes);
  let client = null;

  try {
    client = await db.getClient(tenantId, userId);
    const periodResult = await client.query(`
      SELECT id, status
      FROM payroll_periods
      WHERE tenant_id = $1 AND anio = $2 AND mes = $3
      FOR UPDATE
    `, [tenantId, periodInput.anio, periodInput.mes]);
    if (periodResult.rows.length === 0) {
      throw new AppError('El periodo de nomina no existe.', {
        code: 'NOMINA_PERIODO_NO_ENCONTRADO',
        statusCode: 404,
      });
    }
    if (periodResult.rows[0].status === 'closed') {
      throw new AppError('El periodo esta cerrado y su calculo no puede descartarse.', {
        code: 'NOMINA_PERIODO_FINAL_INMUTABLE',
        statusCode: 409,
      });
    }

    const payrollResult = await client.query(`
      SELECT id, empleado_id, calculation_batch_id, estado,
        total_ingresos, total_deducciones, neto_recibir
      FROM nominas
      WHERE tenant_id = $1 AND anio = $2 AND mes = $3
      ORDER BY id
      FOR UPDATE
    `, [tenantId, periodInput.anio, periodInput.mes]);
    if (payrollResult.rows.length === 0) {
      throw new AppError('No hay roles en borrador para descartar en este periodo.', {
        code: 'NOMINA_PERIODO_SIN_BORRADORES',
        statusCode: 409,
      });
    }
    const nonDraft = payrollResult.rows.filter((row) => row.estado !== 'borrador');
    if (nonDraft.length > 0) {
      throw new AppError('El periodo contiene roles cerrados o pagados y no puede descartarse.', {
        code: 'NOMINA_PERIODO_CONTIENE_ROLES_FINALES',
        statusCode: 409,
        details: { payrollIds: nonDraft.map((row) => row.id) },
      });
    }

    const deleted = await client.query(`
      DELETE FROM nominas
      WHERE tenant_id = $1 AND anio = $2 AND mes = $3 AND estado = 'borrador'
      RETURNING id
    `, [tenantId, periodInput.anio, periodInput.mes]);
    const discardedAt = new Date().toISOString();
    const discardEvidence = {
      scope: 'period',
      anio: periodInput.anio,
      mes: periodInput.mes,
      total: deleted.rows.length,
      reason: normalizedReason,
      intent: 'recalculate',
      userId: userId || null,
      correlationId: correlationId || '',
      discardedAt,
    };
    const batchesUpdated = await appendBatchDiscardMetadata(client, {
      tenantId,
      batchIds: payrollResult.rows.map((row) => row.calculation_batch_id),
      payload: discardEvidence,
    });
    const nextStatus = await resolveNextPeriodStatus(client, {
      tenantId,
      anio: periodInput.anio,
      mes: periodInput.mes,
    });
    const period = await updatePeriodAfterDiscard(client, {
      tenantId,
      periodId: periodResult.rows[0].id,
      anio: periodInput.anio,
      mes: periodInput.mes,
      nextStatus,
      summary: discardEvidence,
    });

    await recordAudit({
      tenantId,
      userId,
      correlationId,
      action: 'nomina.calculo_periodo.descartar',
      entity: 'payroll_periods',
      entityId: periodResult.rows[0].id,
      previousData: {
        status: periodResult.rows[0].status,
        payrollIds: payrollResult.rows.map((row) => row.id),
        total: payrollResult.rows.length,
      },
      newData: { ...discardEvidence, nextStatus, batchesUpdated },
      ipAddress,
      dbClient: client,
    });

    await db.commit(client);
    client = null;
    return {
      deleted: deleted.rows.length,
      batchesUpdated,
      anio: periodInput.anio,
      mes: periodInput.mes,
      period,
      nextAction: 'correct_sources_and_recalculate',
    };
  } catch (err) {
    if (client) {
      await db.rollback(client).catch((rollbackErr) => {
        console.error('[NOMINA] Error revirtiendo descarte del periodo', {
          code: rollbackErr.code || 'NOMINA_PERIODO_DESCARTE_ROLLBACK_ERROR',
          statusCode: 500,
          correlationId,
          userId: userId || null,
          message: rollbackErr.message,
        });
      });
    }
    throw err;
  }
}

module.exports = {
  discardPayrollDraft,
  discardPayrollPeriodCalculation,
  normalizeIntent,
  normalizeReason,
};
