const db = require('../config/database');
const { validarMarcacion } = require('../services/marcacionValidator');
const routeVisitService = require('../services/routeVisitService');
const configurationService = require('../services/configurationService');
const { recordAudit } = require('../services/auditService');
const { getEmployeeHistory } = require('../services/employeeHistoryService');
const { ensurePayrollPeriodForDate } = require('../services/monthlyPeriodService');
const { ensureNoveltyTypeAllowed } = require('../services/payrollNoveltyService');
const {
  resolveAttendanceReadiness,
  resolveLinkedEmployee,
} = require('../services/employeeAppInviteService');

const MOBILE_ROUTE_ADMIN_ROLES = new Set(['owner', 'admin_rrhh', 'supervisor']);
const MOBILE_CONFIGURATION_ROLES = new Set(['owner', 'admin_rrhh']);

function allowedMobileAdminActions(role) {
  return {
    createWorkZones: MOBILE_CONFIGURATION_ROLES.has(role),
    createRouteSites: MOBILE_CONFIGURATION_ROLES.has(role),
    assignRoutes: MOBILE_ROUTE_ADMIN_ROLES.has(role),
  };
}

function normalizeAdminText(value, max = 160) {
  return String(value || '').trim().slice(0, max);
}

function normalizeAdminCode(value) {
  return normalizeAdminText(value, 80).toUpperCase().replace(/\s+/g, '_');
}

function parseAdminNumber(value, fallback = null) {
  if (value === null || typeof value === 'undefined' || value === '') return fallback;
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function mapMobileWorkZone(row = {}) {
  if (!row.id) return null;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    radiusMeters: Number(row.radius_meters || 0),
    minAccuracyMeters: Number(row.min_accuracy_meters || 0),
    requiresPhoto: Boolean(row.requires_photo),
    allowsOffline: Boolean(row.allows_offline),
    status: row.status,
  };
}

function mapMobileEmployee(row = {}) {
  return {
    id: row.id,
    cedula: row.cedula,
    name: `${row.apellidos || ''} ${row.nombres || ''}`.trim(),
    cargo: row.cargo || '',
    organizationUnitCode: row.unidad_organizativa_codigo || '',
    workZoneCode: row.zona_marcacion_codigo || '',
  };
}

async function listMobileRouteEmployees(tenantId) {
  const result = await db.query(`
    SELECT id, cedula, nombres, apellidos, cargo, unidad_organizativa_codigo, zona_marcacion_codigo
    FROM empleados
    WHERE tenant_id = $1
      AND activo = true
    ORDER BY apellidos, nombres
    LIMIT 200
  `, [tenantId]);
  return result.rows.map(mapMobileEmployee);
}

function normalizeWorkZonePayload(body = {}, user) {
  const code = normalizeAdminCode(body.code || body.codigo);
  const name = normalizeAdminText(body.name || body.nombre, 160);
  const latitude = parseAdminNumber(body.latitude ?? body.lat);
  const longitude = parseAdminNumber(body.longitude ?? body.lng);
  const radiusMeters = Math.round(parseAdminNumber(body.radiusMeters ?? body.radius_meters ?? body.radioMetros, 100));
  const minAccuracyMeters = Math.round(parseAdminNumber(body.minAccuracyMeters ?? body.min_accuracy_meters ?? body.precisionMinimaMetros, 50));

  if (!code || !name) {
    const err = new Error('Codigo y nombre de la zona son obligatorios.');
    err.code = 'MOBILE_WORK_ZONE_REQUIRED_FIELDS';
    err.statusCode = 400;
    throw err;
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    const err = new Error('Latitud y longitud de la zona son obligatorias.');
    err.code = 'MOBILE_WORK_ZONE_GPS_REQUIRED';
    err.statusCode = 400;
    throw err;
  }
  if (radiusMeters <= 0 || minAccuracyMeters <= 0) {
    const err = new Error('Radio y precision minima deben ser mayores a cero.');
    err.code = 'MOBILE_WORK_ZONE_RADIUS_INVALID';
    err.statusCode = 400;
    throw err;
  }

  return {
    code,
    name,
    latitude,
    longitude,
    radius_meters: radiusMeters,
    min_accuracy_meters: minAccuracyMeters,
    requires_photo: body.requiresPhoto ?? body.requires_photo ?? true,
    allows_offline: body.allowsOffline ?? body.allows_offline ?? false,
    status: normalizeAdminText(body.status || 'activo', 30).toLowerCase(),
    rules: {
      ...(body.rules && typeof body.rules === 'object' ? body.rules : {}),
      source: 'mobile_admin',
      createdByRole: user?.rol || null,
    },
  };
}

function normalizeRouteStops(body = {}) {
  const sourceStops = Array.isArray(body.stops) ? body.stops : [];
  const stops = sourceStops.length > 0
    ? sourceStops
    : [{
        siteId: body.siteId || body.site_id,
        plannedStartTime: body.plannedStartTime || body.planned_start_time,
        plannedEndTime: body.plannedEndTime || body.planned_end_time,
        notes: body.notes,
      }];

  return stops
    .filter((stop) => stop.siteId || stop.site_id)
    .map((stop, index) => ({
      siteId: stop.siteId || stop.site_id,
      sequenceOrder: Number(stop.sequenceOrder || stop.sequence_order || index + 1),
      plannedStartTime: normalizeAdminText(stop.plannedStartTime || stop.planned_start_time, 5) || null,
      plannedEndTime: normalizeAdminText(stop.plannedEndTime || stop.planned_end_time, 5) || null,
      requiredEvidence: stop.requiredEvidence || stop.required_evidence || {},
      notes: normalizeAdminText(stop.notes, 500),
    }));
}

async function resolveTenantSummary(tenantId) {
  const result = await db.query(
    `SELECT id, ruc, razon_social
     FROM tenants
     WHERE id = $1
     LIMIT 1`,
    [tenantId]
  );

  if (!result.rows[0]) {
    return {
      id: tenantId,
      ruc: null,
      razonSocial: null,
    };
  }

  return {
    id: result.rows[0].id,
    ruc: result.rows[0].ruc || null,
    razonSocial: result.rows[0].razon_social || null,
  };
}

async function adminRutasResumen(req, res) {
  try {
    const fecha = String(req.query?.fecha || '').slice(0, 10) || undefined;
    const [workZones, routeSites, routeDays, employees] = await Promise.all([
      configurationService.listResource('workZones', req.usuario),
      routeVisitService.listRouteSites({ tenantId: req.tenantId, status: 'activo' }),
      routeVisitService.listRouteDays({ tenantId: req.tenantId, fecha }),
      listMobileRouteEmployees(req.tenantId),
    ]);

    return res.json({
      success: true,
      allowedActions: allowedMobileAdminActions(req.usuario?.rol),
      workZones: workZones.map(mapMobileWorkZone).filter(Boolean),
      routeSites,
      routeDays,
      employees,
      correlationId: req.correlationId,
    });
  } catch (err) {
    console.error('[MOBILE] Error consultando gestion de rutas', {
      code: err.code || 'MOBILE_ADMIN_ROUTES_SUMMARY_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'MOBILE_ADMIN_ROUTES_SUMMARY_ERROR',
      message: err.message || 'No pudimos consultar la gestion movil de rutas.',
      details: err.details,
      correlationId: req.correlationId,
    });
  }
}

async function crearZonaMarcacionMovil(req, res) {
  try {
    const payload = normalizeWorkZonePayload(req.body, req.usuario);
    const workZone = await configurationService.createResource('workZones', payload, req.usuario, {
      correlationId: req.correlationId,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      workZone: mapMobileWorkZone(workZone),
      correlationId: req.correlationId,
    });
  } catch (err) {
    console.error('[MOBILE] Error creando zona de marcacion', {
      code: err.code || 'MOBILE_WORK_ZONE_CREATE_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'MOBILE_WORK_ZONE_CREATE_ERROR',
      message: err.message || 'No pudimos crear la zona de marcacion.',
      details: err.details,
      correlationId: req.correlationId,
    });
  }
}

async function crearSitioRutaMovil(req, res) {
  try {
    const site = await routeVisitService.createRouteSite({
      tenantId: req.tenantId,
      payload: {
        ...req.body,
        metadata: {
          ...(req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {}),
          source: 'mobile_admin',
          createdByRole: req.usuario?.rol || null,
        },
      },
      user: req.usuario,
      context: { correlationId: req.correlationId, ipAddress: req.ip },
    });

    return res.status(201).json({ success: true, site, correlationId: req.correlationId });
  } catch (err) {
    console.error('[MOBILE] Error creando sitio de ruta', {
      code: err.code || 'MOBILE_ROUTE_SITE_CREATE_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'MOBILE_ROUTE_SITE_CREATE_ERROR',
      message: err.message || 'No pudimos crear el sitio de ruta.',
      details: err.details,
      correlationId: req.correlationId,
    });
  }
}

async function asignarRutaMovil(req, res) {
  try {
    const stops = normalizeRouteStops(req.body);
    const employeeId = req.body?.employeeId || req.body?.empleadoId || req.body?.empleado_id;
    if (!employeeId) {
      return res.status(400).json({
        error: 'MOBILE_ROUTE_EMPLOYEE_REQUIRED',
        message: 'Selecciona un empleado para asignar la ruta.',
        correlationId: req.correlationId,
      });
    }
    if (stops.length === 0) {
      return res.status(400).json({
        error: 'MOBILE_ROUTE_STOPS_REQUIRED',
        message: 'La ruta debe incluir al menos un sitio activo.',
        correlationId: req.correlationId,
      });
    }

    const route = await routeVisitService.createRouteDay({
      tenantId: req.tenantId,
      payload: {
        empleadoId: employeeId,
        fecha: req.body?.fecha || req.body?.operationalDate || req.body?.operational_date,
        stops,
        allowReorder: req.body?.allowReorder !== false,
        allowUnplanned: req.body?.allowUnplanned !== false,
        source: 'mobile',
        metadata: {
          ...(req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {}),
          source: 'mobile_admin',
          createdByRole: req.usuario?.rol || null,
        },
      },
      user: req.usuario,
      context: { correlationId: req.correlationId, ipAddress: req.ip, source: 'mobile' },
    });

    return res.status(201).json({ success: true, route, correlationId: req.correlationId });
  } catch (err) {
    console.error('[MOBILE] Error asignando ruta movil', {
      code: err.code || 'MOBILE_ROUTE_ASSIGN_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'MOBILE_ROUTE_ASSIGN_ERROR',
      message: err.message || 'No pudimos asignar la ruta desde la app movil.',
      details: err.details,
      correlationId: req.correlationId,
    });
  }
}

async function resolveEmployee(req) {
  const { employee, linkSource } = await resolveLinkedEmployee({
    tenantId: req.tenantId,
    userId: req.usuarioId,
    email: req.usuario.email,
    role: req.usuario.rol,
    requireExplicitLink: true,
  });
  const readinessResult = await resolveAttendanceReadiness(employee.id, req.tenantId);
  const readiness = readinessResult.readiness;
  const workZone = readiness.workZone;
  const organizationUnit = readiness.organizationUnit;
  const workShift = readiness.workShift;

  return {
    ...employee,
    app_link_source: linkSource,
    readiness,
    zona_marcacion: workZone ? {
      id: workZone.id,
      codigo: workZone.code,
      nombre: workZone.name,
      radio_metros: workZone.radiusMeters,
      precision_minima_metros: workZone.minAccuracyMeters,
    } : null,
    unidad_organizativa: organizationUnit ? {
      id: organizationUnit.id,
      codigo: organizationUnit.code,
      nombre: organizationUnit.name,
      tipo: organizationUnit.type,
    } : null,
    jornada: workShift ? {
      id: workShift.id,
      codigo: workShift.code,
      nombre: workShift.name,
      inicio: workShift.startTime,
      fin: workShift.endTime,
      tolerancia_minutos: workShift.toleranceMinutes,
      dias_laborables: workShift.workDays,
      aviso_legal: workShift.legalNotice,
    } : null,
  };
}

async function perfil(req, res) {
  try {
    const employee = await resolveEmployee(req);
    const tenant = await resolveTenantSummary(req.tenantId);
    return res.json({
      success: true,
      employee,
      tenant,
      user: { email: req.usuario.email, rol: req.usuario.rol },
      correlationId: req.correlationId,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.code || 'MOBILE_EMPLOYEE_NOT_FOUND', message: err.message, details: err.details, correlationId: req.correlationId });
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
    return res.status(err.statusCode || 500).json({ error: err.code || 'MOBILE_ATTENDANCE_ERROR', message: err.message, details: err.details, correlationId: req.correlationId });
  }
}

async function registrarMarcacionMovil(req, res) {
  try {
    const employee = await resolveEmployee(req);
    const { tipo, lat, lng, accuracy, fotoBase64, permitirFueraPerimetro, motivoFueraPerimetro } = req.body;
    if (!tipo || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'MOBILE_MARK_REQUIRED_FIELDS', message: 'Tipo, latitud y longitud son requeridos.', correlationId: req.correlationId });
    }

    const marcacion = await validarMarcacion({
      empleadoId: employee.id,
      tenantId: req.tenantId,
      tipo,
      lat,
      lng,
      accuracy,
      fotoBase64,
      permitirFueraPerimetro,
      motivoFueraPerimetro,
      ipAddress: req.ip,
      userId: req.usuarioId,
      correlationId: req.correlationId,
      source: 'mobile',
    });

    return res.status(201).json({ success: true, marcacion, employee, correlationId: req.correlationId });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.code || 'MOBILE_MARK_ERROR', message: err.message, details: err.details, correlationId: req.correlationId });
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
    return res.status(err.statusCode || 500).json({ error: err.code || 'MOBILE_PAYROLL_ERROR', message: err.message, details: err.details, correlationId: req.correlationId });
  }
}

async function historial(req, res) {
  try {
    const employee = await resolveEmployee(req);
    const history = await getEmployeeHistory({
      tenantId: req.tenantId,
      empleadoId: employee.id,
      limit: req.query.limit,
    });
    return res.json({ success: true, employee, history, correlationId: req.correlationId });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      error: err.code || 'MOBILE_HISTORY_ERROR',
      message: err.message,
      details: err.details,
      correlationId: req.correlationId,
    });
  }
}

async function solicitarPermiso(req, res) {
  try {
    const employee = await resolveEmployee(req);
    const fechaInicio = String(req.body?.fechaInicio || req.body?.fecha || '').slice(0, 10);
    const fechaFin = String(req.body?.fechaFin || fechaInicio).slice(0, 10);
    const motivo = String(req.body?.motivo || '').trim();
    const remunerado = req.body?.remunerado !== false;
    const minutos = Math.max(0, Math.round(Number(req.body?.minutos || 480)));
    const tipoNovedad = remunerado ? 'permiso_con_sueldo' : 'permiso_sin_sueldo';

    if (!fechaInicio || !fechaFin || !motivo) {
      return res.status(400).json({
        error: 'PERMISO_DATOS_REQUERIDOS',
        message: 'Fecha de inicio, fecha de fin y motivo son requeridos.',
        correlationId: req.correlationId,
      });
    }

    const dates = buildDateRange(fechaInicio, fechaFin);
    if (dates.length === 0 || dates.length > 31) {
      return res.status(422).json({
        error: 'PERMISO_RANGO_INVALIDO',
        message: 'El permiso debe cubrir entre 1 y 31 dias consecutivos.',
        correlationId: req.correlationId,
      });
    }

    const created = [];
    for (const fecha of dates) {
      const period = await ensurePayrollPeriodForDate({
        tenantId: req.tenantId,
        userId: req.usuarioId,
        fecha,
      });
      if (period.status === 'closed') {
        return res.status(422).json({
          error: 'PERIODO_CERRADO',
          message: 'No se puede solicitar permisos en un periodo cerrado.',
          correlationId: req.correlationId,
        });
      }
      await ensureNoveltyTypeAllowed({
        tenantId: req.tenantId,
        tipoNovedad,
        anio: Number(period.periodoNomina.slice(0, 4)),
        mes: Number(period.periodoNomina.slice(5, 7)),
        userId: req.usuarioId,
      });

      const inserted = await db.query(`
        INSERT INTO novedades_asistencia (
          empleado_id, tenant_id, period_id, periodo_nomina, fecha, tipo_novedad, minutos, monto, justificacion
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,0,$8)
        ON CONFLICT (empleado_id, fecha, tipo_novedad) DO UPDATE SET
          minutos = EXCLUDED.minutos,
          justificacion = EXCLUDED.justificacion,
          estado = 'pendiente',
          updated_at = NOW()
        RETURNING id, empleado_id, fecha, tipo_novedad, minutos, monto, estado, justificacion
      `, [
        employee.id,
        req.tenantId,
        period.id,
        period.periodoNomina,
        fecha,
        tipoNovedad,
        minutos,
        `[Solicitud mobile] ${motivo}`,
      ]);
      created.push(inserted.rows[0]);
    }

    await recordAudit({
      tenantId: req.tenantId,
      userId: req.usuarioId,
      correlationId: req.correlationId,
      action: 'mobile.permisos.solicitar',
      entity: 'novedades_asistencia',
      entityId: created[0]?.id || null,
      newData: {
        empleadoId: employee.id,
        fechaInicio,
        fechaFin,
        tipoNovedad,
        total: created.length,
      },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      permiso: {
        tipoNovedad,
        remunerado,
        totalDias: created.length,
        novedades: created,
      },
      correlationId: req.correlationId,
    });
  } catch (err) {
    console.error('[MOBILE] Error solicitando permiso', {
      code: err.code || 'MOBILE_PERMISSION_REQUEST_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'MOBILE_PERMISSION_REQUEST_ERROR',
      message: err.message || 'No pudimos registrar la solicitud de permiso.',
      details: err.details,
      correlationId: req.correlationId,
    });
  }
}

function buildDateRange(fechaInicio, fechaFin) {
  const start = new Date(`${fechaInicio}T00:00:00.000Z`);
  const end = new Date(`${fechaFin}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];
  const dates = [];
  const cursor = new Date(start);
  while (cursor <= end && dates.length <= 31) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

async function rutaHoy(req, res) {
  try {
    const employee = await resolveEmployee(req);
    const route = await routeVisitService.getRouteDay({
      tenantId: req.tenantId,
      empleadoId: employee.id,
      fecha: req.query.fecha,
    });
    return res.json({
      success: true,
      employee,
      route,
      message: route ? null : 'No tienes ruta asignada para hoy. Puedes registrar jornada si tu empresa lo permite.',
      correlationId: req.correlationId,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.code || 'MOBILE_ROUTE_ERROR', message: err.message, details: err.details, correlationId: req.correlationId });
  }
}

async function registrarLlegadaRuta(req, res) {
  try {
    const employee = await resolveEmployee(req);
    const result = await routeVisitService.registerRouteVisit({
      tenantId: req.tenantId,
      empleadoId: employee.id,
      stopId: req.params.stopId,
      markType: 'arrival',
      payload: req.body,
      user: req.usuario,
      context: { correlationId: req.correlationId, ipAddress: req.ip },
    });
    return res.status(201).json({ success: true, ...result, employee, correlationId: req.correlationId });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.code || 'MOBILE_ROUTE_ARRIVAL_ERROR', message: err.message, details: err.details, correlationId: req.correlationId });
  }
}

async function registrarSalidaRuta(req, res) {
  try {
    const employee = await resolveEmployee(req);
    const result = await routeVisitService.registerRouteVisit({
      tenantId: req.tenantId,
      empleadoId: employee.id,
      stopId: req.params.stopId,
      markType: 'departure',
      payload: req.body,
      user: req.usuario,
      context: { correlationId: req.correlationId, ipAddress: req.ip },
    });
    return res.status(201).json({ success: true, ...result, employee, correlationId: req.correlationId });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.code || 'MOBILE_ROUTE_DEPARTURE_ERROR', message: err.message, details: err.details, correlationId: req.correlationId });
  }
}

async function registrarVisitaNoProgramada(req, res) {
  try {
    const employee = await resolveEmployee(req);
    const result = await routeVisitService.registerUnplannedVisit({
      tenantId: req.tenantId,
      empleadoId: employee.id,
      payload: req.body,
      user: req.usuario,
      context: { correlationId: req.correlationId, ipAddress: req.ip },
    });
    return res.status(201).json({ success: true, ...result, employee, correlationId: req.correlationId });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.code || 'MOBILE_ROUTE_UNPLANNED_ERROR', message: err.message, details: err.details, correlationId: req.correlationId });
  }
}

async function omitirParadaRuta(req, res) {
  try {
    const employee = await resolveEmployee(req);
    const result = await routeVisitService.omitRouteStop({
      tenantId: req.tenantId,
      empleadoId: employee.id,
      stopId: req.params.stopId,
      reason: req.body?.reason || req.body?.motivo,
      user: req.usuario,
      context: { correlationId: req.correlationId, ipAddress: req.ip },
    });
    return res.json({ success: true, ...result, employee, correlationId: req.correlationId });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.code || 'MOBILE_ROUTE_OMIT_ERROR', message: err.message, details: err.details, correlationId: req.correlationId });
  }
}

module.exports = {
  adminRutasResumen,
  asignarRutaMovil,
  crearSitioRutaMovil,
  crearZonaMarcacionMovil,
  perfil,
  omitirParadaRuta,
  registrarMarcacionMovil,
  registrarLlegadaRuta,
  registrarSalidaRuta,
  registrarVisitaNoProgramada,
  resumenAsistencia,
  historial,
  rolPago,
  rutaHoy,
  solicitarPermiso,
  resolveEmployee,
};
