const db = require('../config/database');
const { validarMarcacion } = require('../services/marcacionValidator');
const { recordAudit } = require('../services/auditService');
const { persistExternalIdempotency } = require('../middleware/externalApiIdempotency');

async function sendApiResponse(req, res, statusCode, payload) {
  const body = {
    ...payload,
    correlationId: req.correlationId,
  };
  await persistExternalIdempotency(req, statusCode, body);
  return res.status(statusCode).json(body);
}

async function listEmployees(req, res) {
  try {
    const result = await db.query(`
      SELECT id, cedula, nombres, apellidos, cargo, fecha_ingreso, activo
      FROM empleados
      WHERE tenant_id = $1
      ORDER BY apellidos, nombres
      LIMIT 500
    `, [req.tenantId]);

    return res.json({
      success: true,
      data: result.rows,
      correlationId: req.correlationId,
    });
  } catch (err) {
    console.error('[API_V1] Error listando empleados', {
      code: err.code || 'API_EMPLOYEES_ERROR',
      statusCode: 500,
      correlationId: req.correlationId,
      userId: null,
      message: err.message,
    });
    return res.status(500).json({ error: 'API_EMPLOYEES_ERROR', message: 'No pudimos listar empleados.', correlationId: req.correlationId });
  }
}

async function createAttendanceMark(req, res) {
  try {
    const { empleadoId, tipo, lat, lng, fotoBase64, permitirFueraPerimetro, motivoFueraPerimetro } = req.body;
    if (!empleadoId || !tipo || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'API_ATTENDANCE_REQUIRED_FIELDS', message: 'empleadoId, tipo, lat y lng son requeridos.', correlationId: req.correlationId });
    }

    const marcacion = await validarMarcacion({
      empleadoId,
      tenantId: req.tenantId,
      tipo,
      lat: Number.parseFloat(lat),
      lng: Number.parseFloat(lng),
      fotoBase64,
      permitirFueraPerimetro: Boolean(permitirFueraPerimetro),
      motivoFueraPerimetro,
      ip: req.ip,
      correlationId: req.correlationId,
      userId: null,
    });

    await recordAudit({
      tenantId: req.tenantId,
      correlationId: req.correlationId,
      action: 'api_v1.attendance.write',
      entity: 'marcaciones',
      entityId: marcacion.id || null,
      newData: { empleadoId, tipo },
      ipAddress: req.ip,
      metadata: { apiClientId: req.apiClient.id, apiClientName: req.apiClient.name },
    });

    return sendApiResponse(req, res, 201, { success: true, data: marcacion });
  } catch (err) {
    console.error('[API_V1] Error registrando marcacion', {
      code: err.code || 'API_ATTENDANCE_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({ error: err.code || 'API_ATTENDANCE_ERROR', message: err.message, correlationId: req.correlationId });
  }
}

async function createNovelty(req, res) {
  try {
    const { empleadoId, tipoNovedad, fecha, minutos, motivo } = req.body;
    if (!empleadoId || !tipoNovedad || !fecha) {
      return res.status(400).json({ error: 'API_NOVELTY_REQUIRED_FIELDS', message: 'empleadoId, tipoNovedad y fecha son requeridos.', correlationId: req.correlationId });
    }

    const employee = await db.query('SELECT id FROM empleados WHERE id = $1 AND tenant_id = $2', [empleadoId, req.tenantId]);
    if (employee.rows.length === 0) {
      return res.status(404).json({ error: 'API_EMPLOYEE_NOT_FOUND', message: 'Empleado no encontrado para este tenant.', correlationId: req.correlationId });
    }

    const result = await db.query(`
      INSERT INTO novedades_asistencia (tenant_id, empleado_id, tipo_novedad, fecha, minutos, motivo, estado)
      VALUES ($1,$2,$3,$4,$5,$6,'pendiente')
      RETURNING *
    `, [req.tenantId, empleadoId, tipoNovedad, fecha, Number(minutos || 0), motivo || 'Carga API v1']);

    await recordAudit({
      tenantId: req.tenantId,
      correlationId: req.correlationId,
      action: 'api_v1.novelties.write',
      entity: 'novedades_asistencia',
      entityId: result.rows[0].id,
      newData: { empleadoId, tipoNovedad, fecha },
      ipAddress: req.ip,
      metadata: { apiClientId: req.apiClient.id, apiClientName: req.apiClient.name },
    });

    return sendApiResponse(req, res, 201, { success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[API_V1] Error creando novedad', {
      code: err.code || 'API_NOVELTY_ERROR',
      statusCode: 500,
      correlationId: req.correlationId,
      userId: null,
      message: err.message,
    });
    return res.status(500).json({ error: 'API_NOVELTY_ERROR', message: 'No pudimos crear la novedad.', correlationId: req.correlationId });
  }
}

async function listPayroll(req, res) {
  try {
    const { anio, mes } = req.params;
    const result = await db.query(`
      SELECT n.id, n.empleado_id, e.cedula, e.nombres, e.apellidos,
        n.anio, n.mes, n.total_ingresos, n.total_deducciones, n.neto_recibir, n.estado
      FROM nominas n
      JOIN empleados e ON e.id = n.empleado_id
      WHERE n.tenant_id = $1
        AND n.anio = $2
        AND n.mes = $3
      ORDER BY e.apellidos, e.nombres
      LIMIT 500
    `, [req.tenantId, Number(anio), Number(mes)]);

    return res.json({ success: true, data: result.rows, correlationId: req.correlationId });
  } catch (err) {
    console.error('[API_V1] Error listando nomina', {
      code: err.code || 'API_PAYROLL_ERROR',
      statusCode: 500,
      correlationId: req.correlationId,
      userId: null,
      message: err.message,
    });
    return res.status(500).json({ error: 'API_PAYROLL_ERROR', message: 'No pudimos listar la nomina.', correlationId: req.correlationId });
  }
}

function apiInfo(req, res) {
  return res.json({
    success: true,
    version: 'v1',
    client: {
      id: req.apiClient.id,
      name: req.apiClient.name,
      scopes: req.apiClient.scopes,
    },
    correlationId: req.correlationId,
  });
}

module.exports = {
  apiInfo,
  createAttendanceMark,
  createNovelty,
  listEmployees,
  listPayroll,
};
