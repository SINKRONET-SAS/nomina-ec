const db = require('../config/database');
const AppError = require('../utils/AppError');
const { roundMoney } = require('../utils/money');
const { recordAudit } = require('./auditService');
const { ensureNoveltyTypeAllowed } = require('./payrollNoveltyService');

const WRITABLE_PERIODS = new Set(['open', 'novelties_loaded', 'reopened', 'calculation_failed']);
const VALID_DECISIONS = new Set(['descontar', 'bonificar']);

function normalizePeriod(anio, mes) {
  const year = Number(anio);
  const month = Number(mes);
  if (!Number.isInteger(year) || year < 2020 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new AppError('El periodo del rol de anticipos no es valido.', { code: 'ROL_ANTICIPOS_PERIODO_INVALIDO', statusCode: 400 });
  }
  return { year, month, marker: `${year}-${String(month).padStart(2, '0')}` };
}

function normalizeDate(value, year, month) {
  const fallback = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  const date = String(value || fallback).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number(date.slice(0, 4)) !== year || Number(date.slice(5, 7)) !== month) {
    throw new AppError('La fecha de corte debe pertenecer al periodo seleccionado.', { code: 'ROL_ANTICIPOS_FECHA_INVALIDA', statusCode: 400 });
  }
  return date;
}

function normalizeLine(line, index, year, month) {
  const empleadoId = String(line.empleadoId ?? line.empleado_id ?? '').trim();
  const amount = roundMoney(Number(line.monto ?? line.amount));
  const tipoNovedad = String(line.tipoNovedad ?? line.tipo_novedad ?? 'bono_desempeno').trim().toLowerCase();
  const nombreBonificacion = String(line.nombreBonificacion ?? line.nombre_bonificacion ?? line.nombre ?? '').trim().slice(0, 160);
  if (!empleadoId) {
    throw new AppError(`El empleado de la fila ${index + 1} es requerido.`, { code: 'ROL_ANTICIPOS_EMPLEADO_REQUERIDO', statusCode: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError(`El monto de la fila ${index + 1} debe ser mayor a cero.`, { code: 'ROL_ANTICIPOS_MONTO_INVALIDO', statusCode: 400 });
  }
  if (!tipoNovedad || tipoNovedad.length > 80) {
    throw new AppError(`El tipo de novedad de la fila ${index + 1} no es valido.`, { code: 'ROL_ANTICIPOS_TIPO_NOVEDAD_INVALIDO', statusCode: 400 });
  }
  return { empleadoId, monto: amount, tipoNovedad, nombreBonificacion };
}

function normalizeRun(row, lines = []) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    payrollPeriodId: row.payroll_period_id,
    anio: Number(row.anio),
    mes: Number(row.mes),
    fechaCorte: row.fecha_corte,
    estado: row.estado,
    descripcion: row.descripcion || '',
    createdBy: row.created_by || null,
    approvedBy: row.approved_by || null,
    approvedAt: row.approved_at || null,
    closedAt: row.closed_at || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    total: lines.reduce((sum, line) => sum + Number(line.monto || 0), 0),
    lineas: lines,
  };
}

function normalizeLineRow(row) {
  return {
    id: row.id,
    roleId: row.role_id,
    empleadoId: row.empleado_id,
    empleadoNombre: [row.nombres, row.apellidos].filter(Boolean).join(' ') || row.empleado_id,
    cedula: row.cedula || '',
    monto: Number(row.monto || 0),
    tipoNovedad: row.tipo_novedad,
    nombreBonificacion: row.nombre_bonificacion || '',
    estado: row.estado,
    beneficioId: row.beneficio_id || null,
    bonificacionNovedadId: row.bonificacion_novedad_id || null,
    decididoPor: row.decidido_por || null,
    decididoEn: row.decidido_en || null,
  };
}

async function assertPeriod(tx, tenantId, year, month) {
  const result = await tx.query(`
    SELECT id, status
    FROM payroll_periods
    WHERE tenant_id = $1 AND anio = $2 AND mes = $3
    FOR UPDATE
  `, [tenantId, year, month]);
  const period = result.rows[0];
  if (!period) {
    throw new AppError('Abre el periodo de nomina antes de generar un rol de anticipos.', { code: 'ROL_ANTICIPOS_PERIODO_NO_ENCONTRADO', statusCode: 409 });
  }
  if (!WRITABLE_PERIODS.has(period.status)) {
    throw new AppError('El periodo no esta disponible para generar roles de anticipos.', { code: 'ROL_ANTICIPOS_PERIODO_NO_WRITABLE', statusCode: 409, details: { status: period.status } });
  }
  return period;
}

async function getRun(tenantId, id) {
  const runResult = await db.query(`
    SELECT id, tenant_id, payroll_period_id, anio, mes, fecha_corte, estado, descripcion,
           created_by, approved_by, approved_at, closed_at, created_at, updated_at
    FROM roles_anticipos
    WHERE tenant_id = $1 AND id = $2
    LIMIT 1
  `, [tenantId, id]);
  if (runResult.rows.length === 0) {
    throw new AppError('El rol de anticipos no existe.', { code: 'ROL_ANTICIPOS_NO_ENCONTRADO', statusCode: 404 });
  }
  const linesResult = await db.query(`
    SELECT d.id, d.role_id, d.empleado_id, e.nombres, e.apellidos, e.cedula,
           d.monto, d.tipo_novedad, d.nombre_bonificacion, d.estado,
           d.beneficio_id, d.bonificacion_novedad_id, d.decidido_por, d.decidido_en
    FROM roles_anticipos_detalle d
    JOIN empleados e ON e.id = d.empleado_id AND e.tenant_id = d.tenant_id
    WHERE d.tenant_id = $1 AND d.role_id = $2
    ORDER BY e.apellidos, e.nombres, d.id
  `, [tenantId, id]);
  return normalizeRun(runResult.rows[0], linesResult.rows.map(normalizeLineRow));
}

async function listRuns(tenantId, filters = {}) {
  const params = [tenantId];
  const where = ['r.tenant_id = $1'];
  if (filters.anio) {
    params.push(Number(filters.anio));
    where.push(`r.anio = $${params.length}`);
  }
  if (filters.mes) {
    params.push(Number(filters.mes));
    where.push(`r.mes = $${params.length}`);
  }
  const result = await db.query(`
    SELECT r.id, r.tenant_id, r.payroll_period_id, r.anio, r.mes, r.fecha_corte, r.estado,
           r.descripcion, r.created_by, r.approved_by, r.approved_at, r.closed_at, r.created_at, r.updated_at
    FROM roles_anticipos r
    WHERE ${where.join(' AND ')}
    ORDER BY r.created_at DESC
  `, params);
  return Promise.all(result.rows.map((row) => getRun(tenantId, row.id)));
}

async function createRun(tenantId, payload = {}, user, context = {}) {
  const { year, month, marker } = normalizePeriod(payload.anio ?? payload.year, payload.mes ?? payload.month);
  const fechaCorte = normalizeDate(payload.fechaCorte ?? payload.fecha_corte, year, month);
  const sourceLines = payload.lineas ?? payload.lines ?? payload.detalles ?? payload.items;
  if (!Array.isArray(sourceLines) || sourceLines.length === 0 || sourceLines.length > 1000) {
    throw new AppError('El rol de anticipos debe incluir entre 1 y 1000 empleados.', { code: 'ROL_ANTICIPOS_LINEAS_INVALIDAS', statusCode: 400 });
  }
  const lines = sourceLines.map((line, index) => normalizeLine(line, index, year, month));
  if (new Set(lines.map((line) => line.empleadoId)).size !== lines.length) {
    throw new AppError('No puedes repetir un empleado dentro del mismo rol de anticipos.', { code: 'ROL_ANTICIPOS_EMPLEADO_DUPLICADO', statusCode: 400 });
  }
  for (const tipoNovedad of new Set(lines.map((line) => line.tipoNovedad))) {
    await ensureNoveltyTypeAllowed({ tenantId, tipoNovedad, anio: year, mes: month, userId: user.id });
  }

  const tx = await db.getClient(tenantId, user.id);
  try {
    const period = await assertPeriod(tx, tenantId, year, month);
    const employeeResult = await tx.query(`
      SELECT id
      FROM empleados
      WHERE tenant_id = $1 AND activo = true AND id = ANY($2::uuid[])
    `, [tenantId, lines.map((line) => line.empleadoId)]);
    const employeeIds = new Set(employeeResult.rows.map((row) => row.id));
    const missing = lines.filter((line) => !employeeIds.has(line.empleadoId)).map((line) => line.empleadoId);
    if (missing.length > 0) {
      throw new AppError('Uno o mas empleados no existen o estan inactivos en la empresa.', { code: 'ROL_ANTICIPOS_EMPLEADO_INVALIDO', statusCode: 422, details: { empleados: missing } });
    }
    const runResult = await tx.query(`
      INSERT INTO roles_anticipos (tenant_id, payroll_period_id, anio, mes, fecha_corte, descripcion, created_by, metadata)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id, tenant_id, payroll_period_id, anio, mes, fecha_corte, estado, descripcion, created_by, created_at, updated_at
    `, [tenantId, period.id, year, month, fechaCorte, String(payload.descripcion || '').trim().slice(0, 240), user.id, JSON.stringify({ source: 'rol_anticipos', periodoNomina: marker, correlationId: context.correlationId || null })]);
    const run = runResult.rows[0];
    for (const line of lines) {
      await tx.query(`
        INSERT INTO roles_anticipos_detalle (role_id, tenant_id, empleado_id, monto, tipo_novedad, nombre_bonificacion, metadata)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `, [run.id, tenantId, line.empleadoId, line.monto, line.tipoNovedad, line.nombreBonificacion, JSON.stringify({ source: 'rol_anticipos', periodoNomina: marker })]);
    }
    await db.commit(tx);
    await recordAudit({ tenantId, userId: user.id, correlationId: context.correlationId, action: 'nomina.rol_anticipos.creado', entity: 'roles_anticipos', entityId: run.id, newData: { anio: year, mes: month, totalLineas: lines.length }, ipAddress: context.ipAddress });
    return getRun(tenantId, run.id);
  } catch (err) {
    await db.rollback(tx);
    throw err;
  }
}

async function approveRun(tenantId, id, user, context = {}) {
  const tx = await db.getClient(tenantId, user.id);
  try {
    const current = await tx.query('SELECT * FROM roles_anticipos WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [id, tenantId]);
    if (!current.rows[0]) throw new AppError('El rol de anticipos no existe.', { code: 'ROL_ANTICIPOS_NO_ENCONTRADO', statusCode: 404 });
    if (current.rows[0].estado !== 'borrador') throw new AppError('Solo puedes aprobar un rol en borrador.', { code: 'ROL_ANTICIPOS_ESTADO_INVALIDO', statusCode: 409 });
    await assertPeriod(tx, tenantId, current.rows[0].anio, current.rows[0].mes);
    await tx.query(`UPDATE roles_anticipos SET estado = 'aprobado', approved_by = $3, approved_at = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2`, [id, tenantId, user.id]);
    await tx.query(`UPDATE roles_anticipos_detalle SET estado = 'aprobado', updated_at = NOW() WHERE role_id = $1 AND tenant_id = $2 AND estado = 'pendiente'`, [id, tenantId]);
    await db.commit(tx);
    await recordAudit({ tenantId, userId: user.id, correlationId: context.correlationId, action: 'nomina.rol_anticipos.aprobado', entity: 'roles_anticipos', entityId: id, ipAddress: context.ipAddress });
    return getRun(tenantId, id);
  } catch (err) {
    await db.rollback(tx);
    throw err;
  }
}

async function decideLine(tenantId, roleId, lineId, decision, user, context = {}) {
  const normalizedDecision = String(decision || '').trim().toLowerCase();
  if (!VALID_DECISIONS.has(normalizedDecision)) {
    throw new AppError('La decision debe ser descontar o bonificar.', { code: 'ROL_ANTICIPOS_DECISION_INVALIDA', statusCode: 400 });
  }
  const tx = await db.getClient(tenantId, user.id);
  try {
    const runResult = await tx.query('SELECT * FROM roles_anticipos WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [roleId, tenantId]);
    const run = runResult.rows[0];
    if (!run) throw new AppError('El rol de anticipos no existe.', { code: 'ROL_ANTICIPOS_NO_ENCONTRADO', statusCode: 404 });
    if (run.estado !== 'aprobado') throw new AppError('Aprueba el rol antes de resolver sus lineas.', { code: 'ROL_ANTICIPOS_NO_APROBADO', statusCode: 409 });
    await assertPeriod(tx, tenantId, run.anio, run.mes);
    const lineResult = await tx.query(`
      SELECT d.*, e.nombres, e.apellidos, e.cedula
      FROM roles_anticipos_detalle d
      JOIN empleados e ON e.id = d.empleado_id AND e.tenant_id = d.tenant_id
      WHERE d.id = $1 AND d.role_id = $2 AND d.tenant_id = $3
      FOR UPDATE
    `, [lineId, roleId, tenantId]);
    const line = lineResult.rows[0];
    if (!line) throw new AppError('La linea del rol de anticipos no existe.', { code: 'ROL_ANTICIPOS_LINEA_NO_ENCONTRADA', statusCode: 404 });
    if (['descontar', 'bonificar'].includes(line.estado)) {
      if (line.estado !== normalizedDecision) throw new AppError('La linea ya fue resuelta con otra decision.', { code: 'ROL_ANTICIPOS_LINEA_YA_RESUELTA', statusCode: 409 });
      await db.commit(tx);
      return getRun(tenantId, roleId);
    }
    if (line.estado !== 'aprobado') throw new AppError('La linea no esta aprobada para resolverse.', { code: 'ROL_ANTICIPOS_LINEA_NO_APROBADA', statusCode: 409 });
    await ensureNoveltyTypeAllowed({ tenantId, tipoNovedad: line.tipo_novedad, anio: run.anio, mes: run.mes, userId: user.id });

    let beneficioId = null;
    let bonificacionNovedadId = null;
    if (normalizedDecision === 'descontar') {
      const existingBenefit = await tx.query(`SELECT id FROM beneficios_empleados WHERE tenant_id = $1 AND metadata->>'advanceRoleLineId' = $2 LIMIT 1`, [tenantId, line.id]);
      if (existingBenefit.rows[0]) {
        beneficioId = existingBenefit.rows[0].id;
      } else {
        const benefit = await tx.query(`
          INSERT INTO beneficios_empleados (tenant_id, empleado_id, tipo, descripcion, monto_total, saldo_pendiente, cuota_mensual, anio_inicio, mes_inicio, estado, aprobado_por, aprobado_en, metadata, created_by)
          VALUES ($1,$2,'anticipo',$3,$4,$4,$4,$5,$6,'aprobado',$7,NOW(),$8,$7)
          RETURNING id
        `, [tenantId, line.empleado_id, line.nombre_bonificacion || `Anticipo del rol ${run.anio}-${String(run.mes).padStart(2, '0')}`, line.monto, run.anio, run.mes, user.id, JSON.stringify({ source: 'rol_anticipos', advanceRoleId: roleId, advanceRoleLineId: line.id })]);
        beneficioId = benefit.rows[0].id;
      }
    } else {
      const existingNovelty = await tx.query(`SELECT id FROM novedades_asistencia WHERE tenant_id = $1 AND metadata->>'advanceRoleLineId' = $2 LIMIT 1`, [tenantId, line.id]);
      if (existingNovelty.rows[0]) {
        bonificacionNovedadId = existingNovelty.rows[0].id;
      } else {
        const conflict = await tx.query(`SELECT id FROM novedades_asistencia WHERE empleado_id = $1 AND fecha = $2::date AND tipo_novedad = $3 LIMIT 1`, [line.empleado_id, run.fecha_corte, line.tipo_novedad]);
        if (conflict.rows[0]) throw new AppError('Ya existe una novedad del mismo tipo para el empleado y fecha de corte.', { code: 'ROL_ANTICIPOS_NOVEDAD_DUPLICADA', statusCode: 409 });
        const novelty = await tx.query(`
          INSERT INTO novedades_asistencia (empleado_id, tenant_id, period_id, periodo_nomina, fecha, tipo_novedad, minutos, monto, justificacion, estado, aprobado_por, aprobado_en, metadata)
          VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8,'aprobado',$9,NOW(),$10)
          RETURNING id
        `, [line.empleado_id, tenantId, run.payroll_period_id, `${run.anio}-${String(run.mes).padStart(2, '0')}`, run.fecha_corte, line.tipo_novedad, line.monto, line.nombre_bonificacion || `Bonificacion del rol de anticipos ${run.anio}-${String(run.mes).padStart(2, '0')}`, user.id, JSON.stringify({ source: 'rol_anticipos_bonificacion', advanceRoleId: roleId, advanceRoleLineId: line.id, nombreBonificacion: line.nombre_bonificacion || null })]);
        bonificacionNovedadId = novelty.rows[0].id;
      }
    }
    await tx.query(`
      UPDATE roles_anticipos_detalle
      SET estado = $4, beneficio_id = $5, bonificacion_novedad_id = $6, decidido_por = $7, decidido_en = NOW(), updated_at = NOW()
      WHERE id = $1 AND role_id = $2 AND tenant_id = $3
    `, [lineId, roleId, tenantId, normalizedDecision, beneficioId, bonificacionNovedadId, user.id]);
    await db.commit(tx);
    await recordAudit({ tenantId, userId: user.id, correlationId: context.correlationId, action: `nomina.rol_anticipos.linea.${normalizedDecision}`, entity: 'roles_anticipos_detalle', entityId: lineId, newData: { roleId, beneficioId, bonificacionNovedadId }, ipAddress: context.ipAddress });
    return getRun(tenantId, roleId);
  } catch (err) {
    await db.rollback(tx);
    throw err;
  }
}

async function closeRun(tenantId, id, user, context = {}) {
  const tx = await db.getClient(tenantId, user.id);
  try {
    const result = await tx.query('SELECT estado FROM roles_anticipos WHERE id = $1 AND tenant_id = $2 FOR UPDATE', [id, tenantId]);
    if (!result.rows[0]) throw new AppError('El rol de anticipos no existe.', { code: 'ROL_ANTICIPOS_NO_ENCONTRADO', statusCode: 404 });
    if (result.rows[0].estado !== 'aprobado') throw new AppError('Solo puedes cerrar un rol aprobado.', { code: 'ROL_ANTICIPOS_ESTADO_INVALIDO', statusCode: 409 });
    const pending = await tx.query(`SELECT COUNT(*)::int AS total FROM roles_anticipos_detalle WHERE tenant_id = $1 AND role_id = $2 AND estado = 'aprobado'`, [tenantId, id]);
    if (Number(pending.rows[0]?.total || 0) > 0) throw new AppError('Resuelve cada linea como descuento o bonificacion antes de cerrar.', { code: 'ROL_ANTICIPOS_LINEAS_PENDIENTES', statusCode: 409 });
    await tx.query(`UPDATE roles_anticipos SET estado = 'cerrado', closed_at = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
    await db.commit(tx);
    await recordAudit({ tenantId, userId: user.id, correlationId: context.correlationId, action: 'nomina.rol_anticipos.cerrado', entity: 'roles_anticipos', entityId: id, ipAddress: context.ipAddress });
    return getRun(tenantId, id);
  } catch (err) {
    await db.rollback(tx);
    throw err;
  }
}

module.exports = { listRuns, getRun, createRun, approveRun, decideLine, closeRun };
