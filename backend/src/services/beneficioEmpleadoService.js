const db = require('../config/database');
const AppError = require('../utils/AppError');
const { roundMoney } = require('../utils/money');
const { recordAudit } = require('./auditService');

const VALID_TYPES = new Set(['anticipo', 'prestamo']);
const VALID_STATUSES = new Set(['pendiente', 'aprobado', 'descontado', 'anulado']);

function normalizeBenefit(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    empleadoId: row.empleado_id,
    empleadoNombre: row.empleado_nombre || null,
    cedula: row.cedula || null,
    tipo: row.tipo,
    descripcion: row.descripcion,
    montoTotal: Number(row.monto_total || 0),
    saldoPendiente: Number(row.saldo_pendiente || 0),
    cuotaMensual: Number(row.cuota_mensual || 0),
    anioInicio: Number(row.anio_inicio),
    mesInicio: Number(row.mes_inicio),
    estado: row.estado,
    aprobadoPor: row.aprobado_por || null,
    aprobadoEn: row.aprobado_en || null,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertPeriod(anio, mes) {
  const year = Number(anio);
  const month = Number(mes);
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new AppError('El periodo del beneficio no es valido.', {
      code: 'BENEFICIO_PERIODO_INVALIDO',
      statusCode: 400,
    });
  }
  return { year, month };
}

function normalizePayload(payload) {
  const tipo = String(payload.tipo || '').trim().toLowerCase();
  if (!VALID_TYPES.has(tipo)) {
    throw new AppError('El tipo de beneficio debe ser anticipo o prestamo.', {
      code: 'BENEFICIO_TIPO_INVALIDO',
      statusCode: 400,
    });
  }

  const { year, month } = assertPeriod(payload.anioInicio ?? payload.anio_inicio, payload.mesInicio ?? payload.mes_inicio);
  const montoTotal = roundMoney(Number(payload.montoTotal ?? payload.monto_total));
  const saldoPendiente = roundMoney(Number(payload.saldoPendiente ?? payload.saldo_pendiente ?? montoTotal));
  const cuotaMensual = roundMoney(Number(payload.cuotaMensual ?? payload.cuota_mensual ?? montoTotal));

  if (!Number.isFinite(montoTotal) || montoTotal <= 0) {
    throw new AppError('El monto del beneficio debe ser mayor a cero.', {
      code: 'BENEFICIO_MONTO_INVALIDO',
      statusCode: 400,
    });
  }

  if (!Number.isFinite(cuotaMensual) || cuotaMensual <= 0) {
    throw new AppError('La cuota mensual debe ser mayor a cero.', {
      code: 'BENEFICIO_CUOTA_INVALIDA',
      statusCode: 400,
    });
  }

  if (cuotaMensual > montoTotal) {
    throw new AppError('La cuota mensual no puede ser mayor al monto total.', {
      code: 'BENEFICIO_CUOTA_EXCEDE_MONTO',
      statusCode: 400,
    });
  }

  return {
    empleadoId: payload.empleadoId || payload.empleado_id,
    tipo,
    descripcion: String(payload.descripcion || '').trim(),
    montoTotal,
    saldoPendiente: Math.min(saldoPendiente, montoTotal),
    cuotaMensual,
    anioInicio: year,
    mesInicio: month,
    estado: VALID_STATUSES.has(String(payload.estado || '').trim()) ? String(payload.estado).trim() : 'pendiente',
    metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {},
  };
}

async function assertEmployeeInTenant(tenantId, empleadoId) {
  const result = await db.query(
    'SELECT id FROM empleados WHERE id = $1 AND tenant_id = $2 AND activo = true',
    [empleadoId, tenantId]
  );
  if (result.rows.length === 0) {
    throw new AppError('Empleado no encontrado para la empresa activa.', {
      code: 'BENEFICIO_EMPLEADO_NO_ENCONTRADO',
      statusCode: 404,
    });
  }
}

async function listBenefits(tenantId, filters = {}) {
  const estado = filters.estado ? String(filters.estado).trim().toLowerCase() : '';
  const tipo = filters.tipo ? String(filters.tipo).trim().toLowerCase() : '';
  const empleadoId = filters.empleadoId ? String(filters.empleadoId).trim() : '';
  const buscar = String(filters.buscar ?? filters.search ?? '').trim();
  const page = Math.max(1, Number.parseInt(filters.page, 10) || 1);
  const requestedPageSize = Number.parseInt(filters.pageSize, 10) || 10;
  const pageSize = [10, 25, 50, 100].includes(requestedPageSize) ? requestedPageSize : 10;

  if (estado && !VALID_STATUSES.has(estado)) {
    throw new AppError('El estado solicitado no es valido.', {
      code: 'BENEFICIO_ESTADO_INVALIDO_FILTRO',
      statusCode: 400,
    });
  }
  if (tipo && !VALID_TYPES.has(tipo)) {
    throw new AppError('El tipo solicitado no es valido.', {
      code: 'BENEFICIO_TIPO_INVALIDO_FILTRO',
      statusCode: 400,
    });
  }

  const params = [tenantId];
  const clauses = ['b.tenant_id = $1'];
  const addParam = (value, clause) => {
    params.push(value);
    clauses.push(clause.replace('$PARAM', `$${params.length}`));
  };

  if (estado) addParam(estado, 'b.estado = $PARAM');
  if (tipo) addParam(tipo, 'b.tipo = $PARAM');
  if (empleadoId) addParam(empleadoId, 'b.empleado_id = $PARAM');
  if (buscar) {
    addParam(`%${buscar}%`, `(e.nombres ILIKE $PARAM OR e.apellidos ILIKE $PARAM OR e.cedula ILIKE $PARAM OR COALESCE(b.descripcion, '') ILIKE $PARAM)`);
  }

  const where = clauses.join(' AND ');
  const countResult = await db.query(`
    SELECT COUNT(*)::int AS total
    FROM beneficios_empleados b
    JOIN empleados e ON e.id = b.empleado_id
    WHERE ${where}
  `, params);

  const totalItems = Number(countResult.rows[0]?.total || 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const effectivePage = Math.min(page, totalPages);
  const offset = (effectivePage - 1) * pageSize;
  const dataParams = [...params, pageSize, offset];
  const result = await db.query(`
    SELECT b.*, e.nombres || ' ' || e.apellidos AS empleado_nombre, e.cedula
    FROM beneficios_empleados b
    JOIN empleados e ON e.id = b.empleado_id
    WHERE ${where}
    ORDER BY b.created_at DESC, b.id DESC
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
  `, dataParams);

  const totalsResult = await db.query(`
    SELECT estado, COALESCE(SUM(saldo_pendiente), 0) AS saldo
    FROM beneficios_empleados
    WHERE tenant_id = $1
    GROUP BY estado
  `, [tenantId]);
  const totals = Object.fromEntries([...VALID_STATUSES].map((status) => [status, 0]));
  totalsResult.rows.forEach((row) => {
    totals[row.estado] = Number(row.saldo || 0);
  });

  return {
    items: result.rows.map(normalizeBenefit),
    pagination: { page: effectivePage, pageSize, totalItems, totalPages },
    totals,
  };
}

async function createBenefit(tenantId, payload, user, context = {}) {
  const values = normalizePayload(payload);
  if (!values.empleadoId) {
    throw new AppError('Seleccione un empleado para registrar el beneficio.', {
      code: 'BENEFICIO_EMPLEADO_REQUERIDO',
      statusCode: 400,
      userId: user.id,
    });
  }

  await assertEmployeeInTenant(tenantId, values.empleadoId);
  const result = await db.query(`
    INSERT INTO beneficios_empleados (
      tenant_id, empleado_id, tipo, descripcion, monto_total, saldo_pendiente,
      cuota_mensual, anio_inicio, mes_inicio, estado, metadata, created_by
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING *
  `, [
    tenantId,
    values.empleadoId,
    values.tipo,
    values.descripcion,
    values.montoTotal,
    values.saldoPendiente,
    values.cuotaMensual,
    values.anioInicio,
    values.mesInicio,
    values.estado,
    JSON.stringify(values.metadata),
    user.id,
  ]);

  await recordAudit({
    tenantId,
    userId: user.id,
    correlationId: context.correlationId,
    action: 'beneficios.crear',
    entity: 'beneficios_empleados',
    entityId: result.rows[0].id,
    newData: result.rows[0],
    ipAddress: context.ipAddress,
  });

  return normalizeBenefit(result.rows[0]);
}

async function updateBenefit(tenantId, id, payload, user, context = {}) {
  const previous = await db.query(
    'SELECT * FROM beneficios_empleados WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  if (previous.rows.length === 0) {
    throw new AppError('Beneficio no encontrado.', {
      code: 'BENEFICIO_NO_ENCONTRADO',
      statusCode: 404,
      userId: user.id,
    });
  }

  const values = normalizePayload({
    ...previous.rows[0],
    ...payload,
    empleadoId: payload.empleadoId || payload.empleado_id || previous.rows[0].empleado_id,
    anioInicio: payload.anioInicio ?? payload.anio_inicio ?? previous.rows[0].anio_inicio,
    mesInicio: payload.mesInicio ?? payload.mes_inicio ?? previous.rows[0].mes_inicio,
    montoTotal: payload.montoTotal ?? payload.monto_total ?? previous.rows[0].monto_total,
    saldoPendiente: payload.saldoPendiente ?? payload.saldo_pendiente ?? previous.rows[0].saldo_pendiente,
    cuotaMensual: payload.cuotaMensual ?? payload.cuota_mensual ?? previous.rows[0].cuota_mensual,
  });
  await assertEmployeeInTenant(tenantId, values.empleadoId);

  const shouldApprove = values.estado === 'aprobado' && previous.rows[0].estado !== 'aprobado';
  const result = await db.query(`
    UPDATE beneficios_empleados
    SET empleado_id = $3,
        tipo = $4,
        descripcion = $5,
        monto_total = $6,
        saldo_pendiente = $7,
        cuota_mensual = $8,
        anio_inicio = $9,
        mes_inicio = $10,
        estado = $11,
        aprobado_por = CASE WHEN $12::boolean THEN $13 ELSE aprobado_por END,
        aprobado_en = CASE WHEN $12::boolean THEN NOW() ELSE aprobado_en END,
        metadata = $14,
        updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
    RETURNING *
  `, [
    id,
    tenantId,
    values.empleadoId,
    values.tipo,
    values.descripcion,
    values.montoTotal,
    values.saldoPendiente,
    values.cuotaMensual,
    values.anioInicio,
    values.mesInicio,
    values.estado,
    shouldApprove,
    user.id,
    JSON.stringify(values.metadata),
  ]);

  await recordAudit({
    tenantId,
    userId: user.id,
    correlationId: context.correlationId,
    action: 'beneficios.actualizar',
    entity: 'beneficios_empleados',
    entityId: id,
    previousData: previous.rows[0],
    newData: result.rows[0],
    ipAddress: context.ipAddress,
  });

  return normalizeBenefit(result.rows[0]);
}

async function deleteBenefit(tenantId, id, user, context = {}) {
  const previous = await db.query(
    'SELECT * FROM beneficios_empleados WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  if (previous.rows.length === 0) {
    throw new AppError('Beneficio no encontrado.', {
      code: 'BENEFICIO_NO_ENCONTRADO',
      statusCode: 404,
      userId: user.id,
    });
  }

  const row = previous.rows[0];
  if (row.estado === 'aprobado') {
    throw new AppError('No se puede eliminar un beneficio aprobado. Anúlelo primero.', {
      code: 'BENEFICIO_APROBADO_NO_ELIMINABLE',
      statusCode: 400,
      userId: user.id,
    });
  }

  await db.query('DELETE FROM beneficios_empleados WHERE id = $1 AND tenant_id = $2', [id, tenantId]);

  await recordAudit({
    tenantId,
    userId: user.id,
    correlationId: context.correlationId,
    action: 'beneficios.eliminar',
    entity: 'beneficios_empleados',
    entityId: id,
    previousData: row,
    ipAddress: context.ipAddress,
  });
}

async function approveBenefit(tenantId, id, user, context = {}) {
  const previous = await db.query(
    'SELECT * FROM beneficios_empleados WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  if (previous.rows.length === 0) {
    throw new AppError('Beneficio no encontrado.', {
      code: 'BENEFICIO_NO_ENCONTRADO',
      statusCode: 404,
      userId: user.id,
    });
  }

  if (previous.rows[0].estado !== 'pendiente') {
    throw new AppError('Solo se pueden aprobar beneficios en estado pendiente.', {
      code: 'BENEFICIO_ESTADO_INVALIDO_APROBAR',
      statusCode: 400,
      userId: user.id,
    });
  }

  await assertEmployeeInTenant(tenantId, previous.rows[0].empleado_id);

  const result = await db.query(`
    UPDATE beneficios_empleados
    SET estado = 'aprobado',
        aprobado_por = $3,
        aprobado_en = NOW(),
        updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
    RETURNING *
  `, [id, tenantId, user.id]);

  await recordAudit({
    tenantId,
    userId: user.id,
    correlationId: context.correlationId,
    action: 'beneficios.aprobar',
    entity: 'beneficios_empleados',
    entityId: id,
    previousData: previous.rows[0],
    newData: result.rows[0],
    ipAddress: context.ipAddress,
  });

  return normalizeBenefit(result.rows[0]);
}

async function annulBenefit(tenantId, id, user, context = {}) {
  const previous = await db.query(
    'SELECT * FROM beneficios_empleados WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  if (previous.rows.length === 0) {
    throw new AppError('Beneficio no encontrado.', {
      code: 'BENEFICIO_NO_ENCONTRADO',
      statusCode: 404,
      userId: user.id,
    });
  }

  if (previous.rows[0].estado === 'anulado') {
    throw new AppError('El beneficio ya está anulado.', {
      code: 'BENEFICIO_YA_ANULADO',
      statusCode: 400,
      userId: user.id,
    });
  }

  const result = await db.query(`
    UPDATE beneficios_empleados
    SET estado = 'anulado',
        updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
    RETURNING *
  `, [id, tenantId]);

  await recordAudit({
    tenantId,
    userId: user.id,
    correlationId: context.correlationId,
    action: 'beneficios.anular',
    entity: 'beneficios_empleados',
    entityId: id,
    previousData: previous.rows[0],
    newData: result.rows[0],
    ipAddress: context.ipAddress,
  });

  return normalizeBenefit(result.rows[0]);
}

async function getApprovedDeductions(tenantId, empleadoId, anio, mes, options = {}) {
  assertPeriod(anio, mes);
  const executor = options.dbClient || db;
  const result = await executor.query(`
    SELECT b.id, b.tipo, b.descripcion, b.saldo_pendiente, b.cuota_mensual, b.metadata
    FROM beneficios_empleados b
    WHERE b.tenant_id = $1
      AND b.empleado_id = $2
      AND b.estado = 'aprobado'
      AND b.saldo_pendiente > 0
      AND (b.anio_inicio < $3 OR (b.anio_inicio = $3 AND b.mes_inicio <= $4))
      AND (
        COALESCE(b.metadata->>'source', '') <> 'rol_anticipos'
        OR EXISTS (
          SELECT 1
          FROM roles_anticipos_detalle d
          JOIN roles_anticipos r
            ON r.id = d.role_id
           AND r.tenant_id = d.tenant_id
          WHERE d.tenant_id = b.tenant_id
            AND d.beneficio_id = b.id
            AND r.estado <> 'anulado'
            AND d.estado IN ('descontar', 'bonificar_descontar')
        )
      )
    ORDER BY b.anio_inicio, b.mes_inicio, b.created_at
  `, [tenantId, empleadoId, anio, mes]);

  const items = result.rows.map((row) => {
    const amount = roundMoney(Math.min(Number(row.saldo_pendiente), Number(row.cuota_mensual)));
    const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
    const source = String(metadata.source || '').trim();
    return {
      id: row.id,
      tipo: row.tipo,
      descripcion: row.descripcion,
      amount,
      source,
      sourceLabel: source === 'rol_anticipos'
        ? 'Rol de anticipos'
        : (source || 'Registro manual'),
      metadata,
    };
  });

  return {
    anticipos: roundMoney(items.filter((item) => item.tipo === 'anticipo').reduce((total, item) => total + item.amount, 0)),
    prestamos: roundMoney(items.filter((item) => item.tipo === 'prestamo').reduce((total, item) => total + item.amount, 0)),
    items,
  };
}

module.exports = {
  listBenefits,
  createBenefit,
  updateBenefit,
  deleteBenefit,
  approveBenefit,
  annulBenefit,
  getApprovedDeductions,
};
