const db = require('../config/database');
const { validarMarcacion } = require('../services/marcacionValidator');

async function resolveEmployee(req) {
  const result = await db.query(`
    SELECT id, cedula, nombres, apellidos, cargo, departamento, email_personal
    FROM empleados
    WHERE tenant_id = $1
      AND activo = true
      AND LOWER(email_personal) = LOWER($2)
    LIMIT 1
  `, [req.tenantId, req.usuario.email]);

  if (result.rows.length === 0) {
    const err = new Error('No encontramos un empleado activo vinculado a este usuario movil.');
    err.statusCode = 404;
    throw err;
  }

  return result.rows[0];
}

async function perfil(req, res) {
  try {
    const employee = await resolveEmployee(req);
    return res.json({
      success: true,
      employee,
      user: { email: req.usuario.email, rol: req.usuario.rol },
      correlationId: req.correlationId,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: 'MOBILE_EMPLOYEE_NOT_FOUND', message: err.message, correlationId: req.correlationId });
  }
}

async function resumenAsistencia(req, res) {
  try {
    const employee = await resolveEmployee(req);
    const marks = await db.query(`
      SELECT id, tipo_marcacion, timestamp, dentro_perimetro, distancia_metros, foto_url
      FROM marcaciones
      WHERE tenant_id = $1 AND empleado_id = $2
      ORDER BY timestamp DESC
      LIMIT 20
    `, [req.tenantId, employee.id]);

    const novelties = await db.query(`
      SELECT id, fecha, tipo_novedad, minutos, estado, justificacion
      FROM novedades_asistencia
      WHERE tenant_id = $1 AND empleado_id = $2
      ORDER BY fecha DESC
      LIMIT 10
    `, [req.tenantId, employee.id]);

    return res.json({
      success: true,
      employee,
      marcaciones: marks.rows,
      novedades: novelties.rows,
      correlationId: req.correlationId,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: 'MOBILE_ATTENDANCE_ERROR', message: err.message, correlationId: req.correlationId });
  }
}

async function registrarMarcacionMovil(req, res) {
  try {
    const employee = await resolveEmployee(req);
    const { tipo, lat, lng, fotoBase64, permitirFueraPerimetro, motivoFueraPerimetro } = req.body;
    if (!tipo || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'MOBILE_MARK_REQUIRED_FIELDS', message: 'Tipo, latitud y longitud son requeridos.', correlationId: req.correlationId });
    }

    const marcacion = await validarMarcacion({
      empleadoId: employee.id,
      tenantId: req.tenantId,
      tipo,
      lat,
      lng,
      fotoBase64,
      permitirFueraPerimetro,
      motivoFueraPerimetro,
      ipAddress: req.ip,
      userId: req.usuarioId,
      correlationId: req.correlationId,
    });

    return res.status(201).json({ success: true, marcacion, employee, correlationId: req.correlationId });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: 'MOBILE_MARK_ERROR', message: err.message, correlationId: req.correlationId });
  }
}

async function rolPago(req, res) {
  try {
    const employee = await resolveEmployee(req);
    const { anio, mes } = req.params;
    const result = await db.query(`
      SELECT id, anio, mes, dias_trabajados, sueldo_bruto, total_ingresos,
        total_deducciones, neto_recibir, estado, cerrado_en
      FROM nominas
      WHERE tenant_id = $1 AND empleado_id = $2 AND anio = $3 AND mes = $4
      LIMIT 1
    `, [req.tenantId, employee.id, Number(anio), Number(mes)]);

    return res.json({ success: true, employee, nomina: result.rows[0] || null, correlationId: req.correlationId });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: 'MOBILE_PAYROLL_ERROR', message: err.message, correlationId: req.correlationId });
  }
}

module.exports = {
  perfil,
  registrarMarcacionMovil,
  resumenAsistencia,
  rolPago,
  resolveEmployee,
};
