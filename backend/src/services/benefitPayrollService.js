// BPR26 - Roles de pago de beneficios legales de Ecuador.
const ExcelJS = require('exceljs');
const pdfmake = require('pdfmake/build/pdfmake');
pdfmake.vfs = require('pdfmake/build/vfs_fonts');
const db = require('../config/database');
const AppError = require('../utils/AppError');
const { roundMoney } = require('../utils/money');
const { recordAudit } = require('./auditService');
const {
  getLegalParametersForTenant,
  assertLegalParametersReadyForProduction,
} = require('./legalParameterService');
const { getPayrollRows } = require('./payrollReportService');
const { buildLaborReportRows } = require('./laborReportService');

const BENEFIT_TYPES = Object.freeze({
  decimo_tercero: {
    label: 'Décimo tercero acumulado',
    conceptCode: 'decimo_tercero_acumulado',
    legalParameterKey: 'decimo_tercero',
    destination: 'empleado',
  },
  decimo_cuarto: {
    label: 'Décimo cuarto acumulado',
    conceptCode: 'decimo_cuarto_acumulado',
    legalParameterKey: 'decimo_cuarto',
    destination: 'empleado',
  },
  participacion_laboral: {
    label: 'Participación laboral / utilidades',
    conceptCode: 'participacion_laboral_pago',
    legalParameterKey: 'participacion_laboral',
    destination: 'empleado',
  },
  salario_digno: {
    label: 'Compensación de salario digno',
    conceptCode: 'salario_digno_compensacion',
    legalParameterKey: 'salario_digno',
    destination: 'empleado',
  },
  fondos_reserva: {
    label: 'Fondos de reserva / conciliación IESS',
    conceptCode: 'fondo_reserva_pago',
    legalParameterKey: 'fondo_reserva',
    destination: 'iess',
  },
});

const VALID_BENEFIT_TYPES = new Set(Object.keys(BENEFIT_TYPES));
const VALID_REGIONS = new Set(['costa_galapagos', 'sierra_amazonia']);
const ACTIVE_STATUSES = new Set(['borrador', 'aprobado', 'cerrado']);

function numberValue(value) {
  const parsed = Number.parseFloat(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeDate(value, fieldName, { required = true } = {}) {
  const raw = String(value || '').trim();
  if (!raw && !required) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new AppError(`La fecha ${fieldName} debe usar el formato AAAA-MM-DD.`, {
      code: 'ROL_BENEFICIO_FECHA_INVALIDA',
      statusCode: 400,
    });
  }
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw) {
    throw new AppError(`La fecha ${fieldName} no es válida.`, {
      code: 'ROL_BENEFICIO_FECHA_INVALIDA',
      statusCode: 400,
    });
  }
  return raw;
}

function isoDate(year, month, day) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function lastDayOfMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function normalizeYear(value) {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    throw new AppError('Selecciona un año entre 2020 y 2100.', {
      code: 'ROL_BENEFICIO_ANIO_INVALIDO',
      statusCode: 400,
    });
  }
  return year;
}

function normalizeBenefitType(value) {
  const type = String(value || '').trim().toLowerCase();
  if (!VALID_BENEFIT_TYPES.has(type)) {
    throw new AppError('Selecciona un beneficio legal válido para Ecuador.', {
      code: 'ROL_BENEFICIO_TIPO_INVALIDO',
      statusCode: 400,
    });
  }
  return type;
}

function normalizeRegion(value, type) {
  const region = String(value || '').trim().toLowerCase();
  if (type !== 'decimo_cuarto') return '';
  if (!VALID_REGIONS.has(region)) {
    throw new AppError('Selecciona la región Costa/Galápagos o Sierra/Amazonía para el décimo cuarto.', {
      code: 'ROL_BENEFICIO_REGION_REQUERIDA',
      statusCode: 400,
    });
  }
  return region;
}

function defaultPaymentDate(type, year, region) {
  if (type === 'decimo_tercero') return isoDate(year, 12, 24);
  if (type === 'decimo_cuarto' && region === 'costa_galapagos') return isoDate(year, 3, 15);
  if (type === 'decimo_cuarto' && region === 'sierra_amazonia') return isoDate(year, 8, 15);
  return '';
}

function resolveBenefitPeriod(type, year, region) {
  if (type === 'decimo_tercero') {
    return { desde: isoDate(year - 1, 12, 1), hasta: isoDate(year, 11, 30) };
  }
  if (type === 'decimo_cuarto' && region === 'costa_galapagos') {
    return { desde: isoDate(year - 1, 3, 1), hasta: isoDate(year, 2, lastDayOfMonth(year, 2)) };
  }
  if (type === 'decimo_cuarto' && region === 'sierra_amazonia') {
    return { desde: isoDate(year - 1, 8, 1), hasta: isoDate(year, 7, 31) };
  }
  return { desde: isoDate(year, 1, 1), hasta: isoDate(year, 12, 31) };
}

function normalizePayload(payload = {}, legalParameters = {}) {
  const tipoBeneficio = normalizeBenefitType(payload.tipoBeneficio ?? payload.tipo_beneficio);
  const anio = normalizeYear(payload.anio ?? payload.year);
  const region = normalizeRegion(payload.region, tipoBeneficio);
  const period = resolveBenefitPeriod(tipoBeneficio, anio, region);
  const fechaPago = normalizeDate(
    payload.fechaPago ?? payload.fecha_pago ?? defaultPaymentDate(tipoBeneficio, anio, region),
    'de pago',
    { required: tipoBeneficio === 'decimo_tercero' || tipoBeneficio === 'decimo_cuarto' },
  );
  const payroll = legalParameters.payroll || {};
  const sbuPago = tipoBeneficio === 'decimo_cuarto'
    ? numberValue(payload.sbuPago ?? payload.salarioBasicoOficialPago ?? payroll.unifiedBaseSalary)
    : null;
  const sbuProvision = tipoBeneficio === 'decimo_cuarto'
    ? numberValue(payload.sbuProvision ?? payroll.unifiedBaseSalary)
    : null;
  if (tipoBeneficio === 'decimo_cuarto' && sbuPago <= 0) {
    throw new AppError('Configura el SBU/SMV oficial vigente a la fecha de pago.', {
      code: 'ROL_BENEFICIO_SBU_REQUERIDO',
      statusCode: 422,
    });
  }
  if (tipoBeneficio === 'decimo_cuarto' && sbuPago !== sbuProvision && String(payload.observacion || '').trim().length < 10) {
    throw new AppError('Explica el cambio del SBU/SMV para dejar trazabilidad del ajuste.', {
      code: 'ROL_BENEFICIO_SBU_JUSTIFICACION_REQUERIDA',
      statusCode: 422,
    });
  }
  const utilidadLiquida = numberValue(payload.utilidadLiquida ?? payload.utilidad_liquida);
  const salarioDignoMensual = numberValue(payload.salarioDignoMensual ?? payload.salario_digno_mensual);
  const utilidadCompensacion = numberValue(payload.utilidadCompensacion ?? payload.utilidad_compensacion);
  if (tipoBeneficio === 'participacion_laboral' && utilidadLiquida < 0) {
    throw new AppError('La utilidad líquida anual no puede ser negativa.', { code: 'ROL_BENEFICIO_UTILIDAD_INVALIDA', statusCode: 422 });
  }
  if (tipoBeneficio === 'salario_digno' && (salarioDignoMensual <= 0 || utilidadCompensacion < 0)) {
    throw new AppError('Ingresa el salario digno mensual oficial y la utilidad disponible para compensación.', { code: 'ROL_BENEFICIO_SALARIO_DIGNO_PARAMETROS_INVALIDOS', statusCode: 422 });
  }
  if (!fechaPago) {
    throw new AppError('Ingresa la fecha operativa de pago para este beneficio.', { code: 'ROL_BENEFICIO_FECHA_PAGO_REQUERIDA', statusCode: 422 });
  }
  return {
    tipoBeneficio,
    anio,
    region,
    fechaPago,
    periodoDesde: period.desde,
    periodoHasta: period.hasta,
    descripcion: String(payload.descripcion || '').trim().slice(0, 240),
    observacion: String(payload.observacion || '').trim().slice(0, 500),
    sbuPago,
    sbuProvision,
    utilidadLiquida,
    salarioDignoMensual,
    utilidadCompensacion,
  };
}

function normalizeDetail(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (err) {
    console.error('[ROL_BENEFICIOS] Detalle de nómina no es JSON válido', {
      code: 'ROL_BENEFICIO_DETALLE_INVALIDO',
      statusCode: 422,
      correlationId: process.env.CORRELATION_ID || 'rol-beneficios',
      userId: null,
      message: err.message,
    });
    return {};
  }
}

function sumRowsByEmployee(rows = [], { mode, region } = {}) {
  const employees = new Map();
  for (const row of rows) {
    const detail = normalizeDetail(row.detalle_calculo);
    const employeeId = String(row.empleado_id || '').trim();
    if (!employeeId) continue;
    const current = employees.get(employeeId) || {
      empleadoId: employeeId,
      cedula: row.cedula || '',
      nombres: row.nombres || '',
      apellidos: row.apellidos || '',
      region: String(row.region_decimo_cuarto || '').trim().toLowerCase(),
      modalidadDecimoTercero: String(detail.decimoTerceroModalidad || row.modalidad_decimo_tercero || 'acumulado').toLowerCase(),
      modalidadDecimoCuarto: String(detail.decimoCuartoModalidad || row.modalidad_decimo_cuarto || 'acumulado').toLowerCase(),
      modalidadFondoReserva: String(detail.fondoReservaModalidad || row.modalidad_fondo_reserva || 'mensual').toLowerCase(),
      dias: 0,
      provision: 0,
      basePago: 0,
      sbuProvisionTotal: 0,
      sbuProvisionMonths: 0,
      destino: BENEFIT_TYPES[mode].destination,
    };
    if (mode === 'decimo_cuarto' && current.region !== region) continue;
    if (mode === 'decimo_tercero' && current.modalidadDecimoTercero === 'mensual') continue;
    if (mode === 'decimo_cuarto' && current.modalidadDecimoCuarto === 'mensual') continue;
    if (mode === 'fondos_reserva' && current.modalidadFondoReserva !== 'iess_directo') continue;

    current.dias = Math.min(360, current.dias + Math.max(0, Number(row.dias_trabajados || 0)));
    current.provision = roundMoney(current.provision + (
      mode === 'decimo_tercero' ? numberValue(detail.provisionDecimoTercero)
        : mode === 'decimo_cuarto' ? numberValue(detail.provisionDecimoCuarto)
          : numberValue(detail.fondoReservaDepositadoIess)
    ));
    current.basePago = roundMoney(current.basePago + numberValue(detail.ingresosBase));
    if (mode === 'decimo_cuarto' && numberValue(detail.provisionDecimoCuarto) > 0) {
      current.sbuProvisionTotal += numberValue(detail.provisionDecimoCuarto) * 12;
      current.sbuProvisionMonths += 1;
    }
    employees.set(employeeId, current);
  }
  return [...employees.values()];
}

function buildBenefitLines(type, rows, options) {
  if (type === 'participacion_laboral' || type === 'salario_digno') {
    const reportCode = type === 'participacion_laboral'
      ? 'LABORAL_PARTICIPACION_UTILIDADES'
      : 'LABORAL_SALARIO_DIGNO';
    const reportRows = buildLaborReportRows(rows, reportCode, options.anio, {
      utilidadLiquida: options.utilidadLiquida,
      salarioDignoMensual: options.salarioDignoMensual,
      utilidadCompensacion: options.utilidadCompensacion,
    });
    return reportRows.map((row) => {
      const amount = type === 'participacion_laboral' ? numberValue(row.participacionTotal) : numberValue(row.compensacionSalarioDigno);
      return {
        empleadoId: row.empleadoId,
        cedula: row.cedula,
        empleado: row.empleado,
        dias: Math.trunc(numberValue(row.diasTrabajados)),
        provision: 0,
        ajuste: amount,
        pago: amount,
        basePago: type === 'participacion_laboral' ? numberValue(row.utilidadLiquida) : numberValue(row.objetivoAnual),
        sbuProvision: null,
        sbuPago: null,
        modalidad: 'pago_anual',
        destino: 'empleado',
        metadata: { reportCode, source: 'labor_report_service', reportRow: row },
      };
    }).filter((line) => line.pago > 0);
  }

  return sumRowsByEmployee(rows, { mode: type, region: options.region }).map((row) => {
    const target = type === 'decimo_cuarto'
      ? roundMoney(options.sbuPago * row.dias / 360)
      : row.provision;
    const adjustment = roundMoney(target - row.provision);
    return {
      empleadoId: row.empleadoId,
      cedula: row.cedula,
      empleado: `${row.apellidos} ${row.nombres}`.trim(),
      dias: row.dias,
      provision: row.provision,
      ajuste: adjustment,
      pago: roundMoney(row.provision + adjustment),
      basePago: row.basePago,
      sbuProvision: type === 'decimo_cuarto' && row.sbuProvisionMonths > 0
        ? roundMoney(row.sbuProvisionTotal / row.sbuProvisionMonths)
        : null,
      sbuPago: type === 'decimo_cuarto' ? options.sbuPago : null,
      modalidad: type === 'fondos_reserva' ? row.modalidadFondoReserva : 'acumulado',
      destino: type === 'fondos_reserva' ? 'iess' : 'empleado',
      metadata: {
        source: 'nominas.detalle_calculo',
        momentoProvision: 'provision_mensual',
        momentoAjuste: adjustment === 0 ? null : 'ajuste_provision_beneficio',
        momentoPago: 'pago_rol',
      },
    };
  }).filter((line) => line.pago > 0 || line.ajuste !== 0);
}

async function loadPayrollRowsForPeriod(tenantId, period, filters = {}) {
  const from = new Date(`${period.desde}T00:00:00.000Z`);
  const until = new Date(`${period.hasta}T00:00:00.000Z`);
  const rows = [];
  for (let cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1)); cursor <= until; cursor.setUTCMonth(cursor.getUTCMonth() + 1)) {
    const monthRows = await getPayrollRows(tenantId, cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, { ...filters, requireClosed: true });
    rows.push(...monthRows);
  }
  return rows;
}

function normalizeRun(row, lines = []) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    tipoBeneficio: row.tipo_beneficio,
    tipoBeneficioLabel: BENEFIT_TYPES[row.tipo_beneficio]?.label || row.tipo_beneficio,
    anio: Number(row.anio),
    region: row.region || '',
    fechaPago: row.fecha_pago,
    periodoDesde: row.periodo_desde,
    periodoHasta: row.periodo_hasta,
    estado: row.estado,
    descripcion: row.descripcion || '',
    parametros: row.parametros || {},
    totalProvision: Number(row.total_provision || 0),
    totalAjuste: Number(row.total_ajuste || 0),
    totalPago: Number(row.total_pago || 0),
    createdAt: row.created_at || null,
    approvedAt: row.approved_at || null,
    closedAt: row.closed_at || null,
    lineas: lines,
  };
}

function normalizeLine(row) {
  return {
    id: row.id,
    roleId: row.role_id,
    empleadoId: row.empleado_id,
    empleado: `${row.apellidos || ''} ${row.nombres || ''}`.trim() || row.empleado_id,
    cedula: row.cedula || '',
    dias: Number(row.dias || 0),
    montoProvision: Number(row.monto_provision || 0),
    montoAjuste: Number(row.monto_ajuste || 0),
    montoPago: Number(row.monto_pago || 0),
    basePago: Number(row.base_pago || 0),
    sbuProvision: row.sbu_provision === null ? null : Number(row.sbu_provision || 0),
    sbuPago: row.sbu_pago === null ? null : Number(row.sbu_pago || 0),
    modalidad: row.modalidad || '',
    destino: row.destino || 'empleado',
    estado: row.estado,
    metadata: row.metadata || {},
  };
}

async function getRun(tenantId, id) {
  const runResult = await db.query(`
    SELECT id, tenant_id, tipo_beneficio, anio, region, fecha_pago, periodo_desde, periodo_hasta,
           estado, descripcion, parametros, total_provision, total_ajuste, total_pago,
           created_at, approved_at, closed_at
    FROM roles_beneficios
    WHERE tenant_id = $1 AND id = $2
    LIMIT 1
  `, [tenantId, id]);
  if (!runResult.rows[0]) throw new AppError('El rol de beneficios no existe.', { code: 'ROL_BENEFICIO_NO_ENCONTRADO', statusCode: 404 });
  const linesResult = await db.query(`
    SELECT d.*, e.nombres, e.apellidos, e.cedula
    FROM roles_beneficios_detalle d
    JOIN empleados e ON e.id = d.empleado_id AND e.tenant_id = d.tenant_id
    WHERE d.tenant_id = $1 AND d.role_id = $2
    ORDER BY e.apellidos, e.nombres, d.id
  `, [tenantId, id]);
  return normalizeRun(runResult.rows[0], linesResult.rows.map(normalizeLine));
}

async function listRuns(tenantId, filters = {}) {
  const params = [tenantId];
  const where = ['r.tenant_id = $1'];
  if (filters.anio) {
    params.push(Number(filters.anio));
    where.push(`r.anio = $${params.length}`);
  }
  if (filters.tipoBeneficio || filters.tipo) {
    params.push(String(filters.tipoBeneficio || filters.tipo).trim().toLowerCase());
    where.push(`r.tipo_beneficio = $${params.length}`);
  }
  if (filters.estado) {
    params.push(String(filters.estado).trim().toLowerCase());
    where.push(`r.estado = $${params.length}`);
  }
  const result = await db.query(`
    SELECT r.id, r.tenant_id, r.tipo_beneficio, r.anio, r.region, r.fecha_pago, r.periodo_desde,
           r.periodo_hasta, r.estado, r.descripcion, r.parametros, r.total_provision,
           r.total_ajuste, r.total_pago, r.created_at, r.approved_at, r.closed_at
    FROM roles_beneficios r
    WHERE ${where.join(' AND ')}
    ORDER BY r.fecha_pago DESC, r.created_at DESC
  `, params);
  return Promise.all(result.rows.map((row) => getRun(tenantId, row.id)));
}

async function createRun(tenantId, payload, user, context = {}) {
  const requestedYear = normalizeYear(payload?.anio ?? payload?.year);
  const legalParameters = await getLegalParametersForTenant(tenantId, requestedYear);
  assertLegalParametersReadyForProduction(legalParameters, {
    year: requestedYear,
    tenantId,
    operation: 'generar_rol_beneficios',
    userId: user?.id,
  });
  const normalized = normalizePayload(payload, legalParameters);
  const period = { desde: normalized.periodoDesde, hasta: normalized.periodoHasta };
  const monthlyRows = await loadPayrollRowsForPeriod(tenantId, period);
  const lines = buildBenefitLines(normalized.tipoBeneficio, monthlyRows, normalized);
  if (lines.length === 0) {
    throw new AppError('No hay líneas pagables para los empleados y parámetros seleccionados. Revisa modalidad, roles cerrados y valores oficiales.', {
      code: 'ROL_BENEFICIO_SIN_LINEAS',
      statusCode: 422,
    });
  }
  const totals = lines.reduce((acc, line) => ({
    provision: roundMoney(acc.provision + line.provision),
    ajuste: roundMoney(acc.ajuste + line.ajuste),
    pago: roundMoney(acc.pago + line.pago),
  }), { provision: 0, ajuste: 0, pago: 0 });
  const tx = await db.getClient(tenantId, user.id);
  try {
    const duplicate = await tx.query(`
      SELECT id FROM roles_beneficios
      WHERE tenant_id = $1 AND tipo_beneficio = $2 AND anio = $3 AND region = $4
        AND estado IN ('borrador','aprobado','cerrado')
      FOR UPDATE
    `, [tenantId, normalized.tipoBeneficio, normalized.anio, normalized.region]);
    if (duplicate.rows[0]) {
      throw new AppError('Ya existe un rol de este beneficio, año y región. Revisa el borrador existente antes de generar otro.', {
        code: 'ROL_BENEFICIO_DUPLICADO',
        statusCode: 409,
        details: { roleId: duplicate.rows[0].id },
      });
    }
    const runResult = await tx.query(`
      INSERT INTO roles_beneficios (
        tenant_id, tipo_beneficio, anio, region, fecha_pago, periodo_desde, periodo_hasta,
        descripcion, parametros, total_provision, total_ajuste, total_pago, created_by, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING id, tenant_id, tipo_beneficio, anio, region, fecha_pago, periodo_desde, periodo_hasta,
                estado, descripcion, parametros, total_provision, total_ajuste, total_pago, created_at
    `, [
      tenantId,
      normalized.tipoBeneficio,
      normalized.anio,
      normalized.region,
      normalized.fechaPago,
      normalized.periodoDesde,
      normalized.periodoHasta,
      normalized.descripcion,
      JSON.stringify({ ...normalized, source: 'benefit_payroll_service' }),
      totals.provision,
      totals.ajuste,
      totals.pago,
      user.id,
      JSON.stringify({ correlationId: context.correlationId || null, sourceVersion: 'BPR26' }),
    ]);
    const role = runResult.rows[0];
    for (const line of lines) {
      await tx.query(`
        INSERT INTO roles_beneficios_detalle (
          role_id, tenant_id, empleado_id, dias, monto_provision, monto_ajuste, monto_pago,
          base_pago, sbu_provision, sbu_pago, modalidad, destino, metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      `, [
        role.id, tenantId, line.empleadoId, line.dias, line.provision, line.ajuste, line.pago,
        line.basePago, line.sbuProvision, line.sbuPago, line.modalidad, line.destino,
        JSON.stringify({ ...line.metadata, conceptCode: BENEFIT_TYPES[normalized.tipoBeneficio].conceptCode, legalParameterKey: BENEFIT_TYPES[normalized.tipoBeneficio].legalParameterKey }),
      ]);
    }
    await db.commit(tx);
    await recordAudit({
      tenantId,
      userId: user.id,
      correlationId: context.correlationId,
      action: 'nomina.rol_beneficio.creado',
      entity: 'roles_beneficios',
      entityId: role.id,
      newData: { tipoBeneficio: normalized.tipoBeneficio, anio: normalized.anio, region: normalized.region, totalLineas: lines.length, totalPago: totals.pago },
      ipAddress: context.ipAddress,
    });
    return getRun(tenantId, role.id);
  } catch (err) {
    await db.rollback(tx);
    if (err.code === '23505') {
      throw new AppError('Ya existe un rol activo para este beneficio, año y región.', { code: 'ROL_BENEFICIO_DUPLICADO', statusCode: 409, correlationId: context.correlationId, userId: user?.id });
    }
    throw err;
  }
}

async function approveRun(tenantId, id, user, context = {}) {
  const tx = await db.getClient(tenantId, user.id);
  try {
    const result = await tx.query('SELECT * FROM roles_beneficios WHERE tenant_id = $1 AND id = $2 FOR UPDATE', [tenantId, id]);
    const role = result.rows[0];
    if (!role) throw new AppError('El rol de beneficios no existe.', { code: 'ROL_BENEFICIO_NO_ENCONTRADO', statusCode: 404 });
    if (role.estado !== 'borrador') throw new AppError('Solo puedes aprobar un rol de beneficios en borrador.', { code: 'ROL_BENEFICIO_ESTADO_INVALIDO', statusCode: 409 });
    await tx.query(`UPDATE roles_beneficios SET estado = 'aprobado', approved_by = $3, approved_at = NOW(), updated_at = NOW() WHERE tenant_id = $1 AND id = $2`, [tenantId, id, user.id]);
    await tx.query(`UPDATE roles_beneficios_detalle SET estado = 'aprobado' WHERE tenant_id = $1 AND role_id = $2 AND estado = 'pendiente'`, [tenantId, id]);
    await db.commit(tx);
    await recordAudit({ tenantId, userId: user.id, correlationId: context.correlationId, action: 'nomina.rol_beneficio.aprobado', entity: 'roles_beneficios', entityId: id, ipAddress: context.ipAddress });
    return getRun(tenantId, id);
  } catch (err) {
    await db.rollback(tx);
    throw err;
  }
}

async function closeRun(tenantId, id, user, context = {}) {
  const tx = await db.getClient(tenantId, user.id);
  try {
    const result = await tx.query('SELECT * FROM roles_beneficios WHERE tenant_id = $1 AND id = $2 FOR UPDATE', [tenantId, id]);
    const role = result.rows[0];
    if (!role) throw new AppError('El rol de beneficios no existe.', { code: 'ROL_BENEFICIO_NO_ENCONTRADO', statusCode: 404 });
    if (role.estado !== 'aprobado') throw new AppError('Solo puedes cerrar un rol de beneficios aprobado.', { code: 'ROL_BENEFICIO_ESTADO_INVALIDO', statusCode: 409 });
    const pending = await tx.query(`SELECT COUNT(*)::int AS total FROM roles_beneficios_detalle WHERE tenant_id = $1 AND role_id = $2 AND estado <> 'aprobado'`, [tenantId, id]);
    if (Number(pending.rows[0]?.total || 0) > 0) throw new AppError('El rol tiene líneas sin aprobar.', { code: 'ROL_BENEFICIO_LINEAS_PENDIENTES', statusCode: 409 });
    await tx.query(`UPDATE roles_beneficios SET estado = 'cerrado', closed_at = NOW(), updated_at = NOW() WHERE tenant_id = $1 AND id = $2`, [tenantId, id]);
    await db.commit(tx);
    await recordAudit({ tenantId, userId: user.id, correlationId: context.correlationId, action: 'nomina.rol_beneficio.cerrado', entity: 'roles_beneficios', entityId: id, ipAddress: context.ipAddress });
    return getRun(tenantId, id);
  } catch (err) {
    await db.rollback(tx);
    throw err;
  }
}

function csvSafe(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

async function buildWorkbook(tenantId, id) {
  const role = await getRun(tenantId, id);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SKNOMINA';
  const sheet = workbook.addWorksheet('Rol de beneficios');
  sheet.columns = [
    { header: 'Empleado', key: 'empleado', width: 34 },
    { header: 'Cédula', key: 'cedula', width: 14 },
    { header: 'Días', key: 'dias', width: 10 },
    { header: 'Provisión mensual acumulada', key: 'montoProvision', width: 26, style: { numFmt: '$#,##0.00' } },
    { header: 'Ajuste legal', key: 'montoAjuste', width: 18, style: { numFmt: '$#,##0.00' } },
    { header: 'Pago del rol', key: 'montoPago', width: 18, style: { numFmt: '$#,##0.00' } },
    { header: 'SBU/SMV provisión', key: 'sbuProvision', width: 20, style: { numFmt: '$#,##0.00' } },
    { header: 'SBU/SMV pago', key: 'sbuPago', width: 16, style: { numFmt: '$#,##0.00' } },
    { header: 'Destino', key: 'destino', width: 14 },
    { header: 'Modalidad', key: 'modalidad', width: 18 },
  ];
  role.lineas.forEach((line) => sheet.addRow(line));
  sheet.getRow(1).font = { bold: true };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columns.length } };
  const audit = workbook.addWorksheet('Auditoría');
  audit.columns = [{ header: 'Campo', key: 'campo', width: 34 }, { header: 'Valor', key: 'valor', width: 110 }];
  [
    ['Tipo de beneficio', role.tipoBeneficioLabel],
    ['Año', role.anio],
    ['Región', role.region || 'No aplica'],
    ['Fecha de pago', role.fechaPago],
    ['Periodo de origen', `${role.periodoDesde} - ${role.periodoHasta}`],
    ['Provisión acumulada', role.totalProvision],
    ['Ajuste legal', role.totalAjuste],
    ['Pago del rol', role.totalPago],
    ['Parámetros', JSON.stringify(role.parametros)],
    ['Momento contable', 'provision_mensual → ajuste_provision_beneficio → pago_rol'],
    ['Estado', role.estado],
  ].forEach(([campo, valor]) => audit.addRow({ campo, valor }));
  audit.getRow(1).font = { bold: true };
  return { role, buffer: Buffer.from(await workbook.xlsx.writeBuffer()), fileName: `rol_beneficios_${role.tipoBeneficio}_${role.anio}${role.region ? `_${role.region}` : ''}.xlsx` };
}

function pdfBufferFromDefinition(definition) {
  return new Promise((resolve, reject) => {
    try {
      pdfmake.createPdf(definition).getBuffer((buffer) => resolve(Buffer.from(buffer)));
    } catch (err) {
      reject(err);
    }
  });
}

async function buildPdf(tenantId, id) {
  const role = await getRun(tenantId, id);
  const body = [
    [{ text: 'Empleado', bold: true }, { text: 'Cédula', bold: true }, { text: 'Provisión', bold: true }, { text: 'Ajuste', bold: true }, { text: 'Pago', bold: true }, { text: 'Destino', bold: true }],
    ...role.lineas.map((line) => [line.empleado, line.cedula, `$${line.montoProvision.toFixed(2)}`, `$${line.montoAjuste.toFixed(2)}`, `$${line.montoPago.toFixed(2)}`, line.destino]),
  ];
  const definition = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    content: [
      { text: `ROL DE PAGO · ${role.tipoBeneficioLabel.toUpperCase()}`, style: 'title' },
      { text: `Ejercicio ${role.anio} · Pago: ${role.fechaPago} · Periodo: ${role.periodoDesde} a ${role.periodoHasta}`, margin: [0, 0, 0, 12] },
      { text: 'La provisión mensual, el ajuste legal y el pago se muestran por separado. Este documento no modifica los roles mensuales históricos.', style: 'note', margin: [0, 0, 0, 12] },
      { table: { headerRows: 1, widths: ['*', 80, 80, 70, 70, 70], body }, layout: 'lightHorizontalLines' },
      { text: `Totales · Provisión: $${role.totalProvision.toFixed(2)} · Ajuste: $${role.totalAjuste.toFixed(2)} · Pago: $${role.totalPago.toFixed(2)}`, bold: true, margin: [0, 14, 0, 0] },
    ],
    styles: { title: { fontSize: 16, bold: true, color: '#0f766e', margin: [0, 0, 0, 8] }, note: { fontSize: 8, color: '#475569' } },
    defaultStyle: { fontSize: 8 },
  };
  return { role, buffer: await pdfBufferFromDefinition(definition), fileName: `rol_beneficios_${role.tipoBeneficio}_${role.anio}.pdf` };
}

function buildCsv(role) {
  const headers = ['empleado', 'cedula', 'dias', 'montoProvision', 'montoAjuste', 'montoPago', 'sbuProvision', 'sbuPago', 'destino', 'modalidad'];
  const rows = role.lineas.map((line) => headers.map((header) => csvSafe(line[header])).join(','));
  return `\ufeff${[headers.join(','), ...rows].join('\r\n')}`;
}

module.exports = {
  BENEFIT_TYPES,
  VALID_BENEFIT_TYPES,
  VALID_REGIONS,
  normalizePayload,
  resolveBenefitPeriod,
  defaultPaymentDate,
  buildBenefitLines,
  sumRowsByEmployee,
  listRuns,
  getRun,
  createRun,
  approveRun,
  closeRun,
  buildWorkbook,
  buildPdf,
  pdfBufferFromDefinition,
  buildCsv,
};
