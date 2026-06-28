const db = require('../config/database');
const ExcelJS = require('exceljs');
const pdfmake = require('pdfmake/build/pdfmake');
pdfmake.vfs = require('pdfmake/build/vfs_fonts');
const AppError = require('../utils/AppError');
const { recordAudit } = require('./auditService');
const { dateInEcuador, ensurePayrollPeriodForDate } = require('./monthlyPeriodService');
const { calcularDistanciaHaversine, validateFotoBase64 } = require('./marcacionValidator');
const { s3Upload } = require('../config/s3');
const { assertNoOpenRouteVisit } = require('./routeRulesService');

const SITE_STATUSES = new Set(['activo', 'inactivo', 'archivado']);
const DAY_STATUSES = new Set(['planned', 'in_progress', 'completed', 'exception_pending', 'cancelled']);
const EXCEPTION_STATUSES = new Set(['pending_review', 'approved', 'rejected', 'resolved']);

function todayInEcuador() {
  return dateInEcuador(new Date());
}

function normalizeDate(value) {
  return String(value || todayInEcuador()).slice(0, 10);
}

function normalizeCode(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '_').slice(0, 80);
}

function normalizeText(value, max = 1000) {
  return String(value || '').trim().slice(0, max);
}

function parseNumber(value, fallback = null) {
  if (value === null || typeof value === 'undefined' || value === '') return fallback;
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function jsonParam(value) {
  return JSON.stringify(value || {});
}

function routeReportValue(value) {
  return value === null || typeof value === 'undefined' ? '' : value;
}

function mapRouteReportRow(row = {}) {
  return {
    fecha: routeReportValue(row.operational_date),
    cedula: routeReportValue(row.cedula),
    empleado: routeReportValue(row.empleado),
    cargo: routeReportValue(row.cargo),
    sitio: routeReportValue(row.sitio),
    estado: routeReportValue(row.estado_parada),
    noProgramada: Boolean(row.is_unplanned),
    llegada: routeReportValue(row.llegada),
    salida: routeReportValue(row.salida),
    dentroZona: row.dentro_zona !== false,
    distanciaMaximaMetros: Math.round(Number(row.distancia_maxima || 0)),
    excepciones: Number(row.excepciones || 0),
  };
}

function mapSite(row = {}) {
  if (!row.id) return null;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    clientName: row.client_name || '',
    address: row.address || '',
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    radiusMeters: Number(row.radius_meters || 0),
    minAccuracyMeters: Number(row.min_accuracy_meters || 0),
    requiresPhoto: Boolean(row.requires_photo),
    requiresQr: Boolean(row.requires_qr),
    allowsUnplanned: Boolean(row.allows_unplanned),
    status: row.status,
    organizationUnitId: row.organization_unit_id || null,
    organizationUnitName: row.organization_unit_name || null,
  };
}

function mapStop(row = {}) {
  return {
    id: row.stop_id || row.id,
    routeDayId: row.route_day_id,
    siteId: row.site_id || null,
    sequenceOrder: Number(row.sequence_order || 0),
    plannedStartTime: row.planned_start_time || '',
    plannedEndTime: row.planned_end_time || '',
    status: row.stop_status || row.status,
    isUnplanned: Boolean(row.is_unplanned),
    unplannedName: row.unplanned_name || '',
    unplannedAddress: row.unplanned_address || '',
    notes: row.notes || '',
    startedAt: row.started_at || null,
    completedAt: row.completed_at || null,
    omittedAt: row.omitted_at || null,
    omissionReason: row.omission_reason || '',
    site: row.site_id ? mapSite({
      id: row.site_id,
      code: row.site_code,
      name: row.site_name,
      client_name: row.client_name,
      address: row.site_address,
      latitude: row.site_latitude,
      longitude: row.site_longitude,
      radius_meters: row.radius_meters,
      min_accuracy_meters: row.min_accuracy_meters,
      requires_photo: row.requires_photo,
      requires_qr: row.requires_qr,
      allows_unplanned: row.allows_unplanned,
      status: row.site_status,
      organization_unit_id: row.site_organization_unit_id,
      organization_unit_name: row.site_organization_unit_name,
    }) : null,
    lastMark: row.last_mark_type ? {
      markType: row.last_mark_type,
      timestamp: row.last_mark_timestamp,
      status: row.last_mark_status,
      withinGeofence: Boolean(row.last_mark_within_geofence),
      distanceMeters: Number(row.last_mark_distance_meters || 0),
    } : null,
  };
}

function mapRouteDay(row = {}, stops = []) {
  if (!row.id) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    empleadoId: row.empleado_id,
    employeeName: row.employee_name || '',
    cargo: row.cargo || '',
    periodId: row.period_id || null,
    periodoNomina: row.periodo_nomina || '',
    operationalDate: row.operational_date,
    status: row.status,
    allowReorder: Boolean(row.allow_reorder),
    allowUnplanned: Boolean(row.allow_unplanned),
    source: row.source,
    stops,
    totals: {
      pending: stops.filter((stop) => stop.status === 'pending').length,
      inSite: stops.filter((stop) => stop.status === 'in_site').length,
      completed: stops.filter((stop) => stop.status === 'completed').length,
      exceptions: stops.filter((stop) => ['out_of_zone', 'exception_pending', 'omitted'].includes(stop.status)).length,
    },
  };
}

async function listRouteSites({ tenantId, status } = {}) {
  const params = [tenantId];
  let whereStatus = '';
  if (status) {
    params.push(status);
    whereStatus = ` AND rs.status = $${params.length}`;
  }
  const result = await db.query(`
    SELECT rs.*, ou.name AS organization_unit_name
    FROM route_sites rs
    LEFT JOIN organization_units ou
      ON ou.id = rs.organization_unit_id
     AND ou.tenant_id = rs.tenant_id
    WHERE rs.tenant_id = $1
      ${whereStatus}
    ORDER BY rs.status, rs.name
  `, params);
  return result.rows.map(mapSite);
}

async function ensureOrganizationUnit(tenantId, organizationUnitId, user) {
  if (!organizationUnitId) return null;
  const result = await db.query(`
    SELECT id, work_zone_id
    FROM organization_units
    WHERE tenant_id = $1
      AND id = $2
      AND status = 'activo'
    LIMIT 1
  `, [tenantId, organizationUnitId]);
  if (!result.rows[0]) {
    throw new AppError('La unidad organizativa seleccionada no existe o no esta activa.', {
      code: 'ROUTE_SITE_ORGANIZATION_UNIT_INVALID',
      statusCode: 400,
      userId: user?.id,
    });
  }
  return result.rows[0];
}

function normalizeSitePayload(payload = {}, previous = {}) {
  const values = {
    code: normalizeCode(payload.code ?? previous.code),
    name: normalizeText(payload.name ?? previous.name, 160),
    client_name: normalizeText(payload.clientName ?? payload.client_name ?? previous.client_name, 160),
    address: normalizeText(payload.address ?? previous.address, 500),
    latitude: parseNumber(payload.latitude ?? payload.lat ?? previous.latitude),
    longitude: parseNumber(payload.longitude ?? payload.lng ?? previous.longitude),
    radius_meters: Math.round(parseNumber(payload.radiusMeters ?? payload.radius_meters ?? previous.radius_meters, 120)),
    min_accuracy_meters: Math.round(parseNumber(payload.minAccuracyMeters ?? payload.min_accuracy_meters ?? previous.min_accuracy_meters, 80)),
    requires_photo: Boolean(payload.requiresPhoto ?? payload.requires_photo ?? previous.requires_photo ?? false),
    requires_qr: Boolean(payload.requiresQr ?? payload.requires_qr ?? previous.requires_qr ?? false),
    allows_unplanned: payload.allowsUnplanned === false || payload.allows_unplanned === false ? false : Boolean(payload.allowsUnplanned ?? payload.allows_unplanned ?? previous.allows_unplanned ?? true),
    status: normalizeText(payload.status ?? previous.status ?? 'activo', 30).toLowerCase(),
    valid_from: normalizeDate(payload.validFrom ?? payload.valid_from ?? previous.valid_from),
    valid_to: payload.validTo || payload.valid_to || previous.valid_to || null,
    metadata: payload.metadata || previous.metadata || {},
    organization_unit_id: payload.organizationUnitId || payload.organization_unit_id || previous.organization_unit_id || null,
    work_zone_id: payload.workZoneId || payload.work_zone_id || previous.work_zone_id || null,
  };

  if (!values.code || !values.name) {
    throw new AppError('Codigo y nombre del sitio son obligatorios.', {
      code: 'ROUTE_SITE_REQUIRED_FIELDS',
      statusCode: 400,
    });
  }
  if (!Number.isFinite(values.latitude) || !Number.isFinite(values.longitude)) {
    throw new AppError('Latitud y longitud del sitio son obligatorias.', {
      code: 'ROUTE_SITE_GPS_REQUIRED',
      statusCode: 400,
    });
  }
  if (!SITE_STATUSES.has(values.status)) {
    throw new AppError('Estado de sitio no permitido.', {
      code: 'ROUTE_SITE_STATUS_INVALID',
      statusCode: 400,
    });
  }
  if (values.radius_meters <= 0 || values.min_accuracy_meters <= 0) {
    throw new AppError('Radio y precision del sitio deben ser mayores a cero.', {
      code: 'ROUTE_SITE_RADIUS_INVALID',
      statusCode: 400,
    });
  }

  return values;
}

async function createRouteSite({ tenantId, payload, user, context = {} }) {
  const values = normalizeSitePayload(payload);
  const unit = await ensureOrganizationUnit(tenantId, values.organization_unit_id, user);
  if (!values.work_zone_id && unit?.work_zone_id) values.work_zone_id = unit.work_zone_id;

  const result = await db.query(`
    INSERT INTO route_sites (
      tenant_id, organization_unit_id, work_zone_id, code, name, client_name,
      address, latitude, longitude, radius_meters, min_accuracy_meters,
      requires_photo, requires_qr, allows_unplanned, status, valid_from,
      valid_to, metadata, created_by
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
    RETURNING *
  `, [
    tenantId,
    values.organization_unit_id,
    values.work_zone_id,
    values.code,
    values.name,
    values.client_name,
    values.address,
    values.latitude,
    values.longitude,
    values.radius_meters,
    values.min_accuracy_meters,
    values.requires_photo,
    values.requires_qr,
    values.allows_unplanned,
    values.status,
    values.valid_from,
    values.valid_to ? normalizeDate(values.valid_to) : null,
    jsonParam(values.metadata),
    user?.id || null,
  ]);

  await recordAudit({
    tenantId,
    userId: user?.id,
    correlationId: context.correlationId,
    action: 'route_site.create',
    entity: 'route_sites',
    entityId: result.rows[0].id,
    newData: result.rows[0],
    ipAddress: context.ipAddress,
  });

  return mapSite(result.rows[0]);
}

async function updateRouteSite({ tenantId, siteId, payload, user, context = {} }) {
  const current = await db.query('SELECT * FROM route_sites WHERE tenant_id = $1 AND id = $2', [tenantId, siteId]);
  if (!current.rows[0]) {
    throw new AppError('Sitio de visita no encontrado.', { code: 'ROUTE_SITE_NOT_FOUND', statusCode: 404, userId: user?.id });
  }
  const values = normalizeSitePayload(payload, current.rows[0]);
  const unit = await ensureOrganizationUnit(tenantId, values.organization_unit_id, user);
  if (!values.work_zone_id && unit?.work_zone_id) values.work_zone_id = unit.work_zone_id;

  const result = await db.query(`
    UPDATE route_sites
    SET organization_unit_id = $1,
        work_zone_id = $2,
        code = $3,
        name = $4,
        client_name = $5,
        address = $6,
        latitude = $7,
        longitude = $8,
        radius_meters = $9,
        min_accuracy_meters = $10,
        requires_photo = $11,
        requires_qr = $12,
        allows_unplanned = $13,
        status = $14,
        valid_from = $15,
        valid_to = $16,
        metadata = $17,
        updated_at = NOW()
    WHERE tenant_id = $18 AND id = $19
    RETURNING *
  `, [
    values.organization_unit_id,
    values.work_zone_id,
    values.code,
    values.name,
    values.client_name,
    values.address,
    values.latitude,
    values.longitude,
    values.radius_meters,
    values.min_accuracy_meters,
    values.requires_photo,
    values.requires_qr,
    values.allows_unplanned,
    values.status,
    values.valid_from,
    values.valid_to ? normalizeDate(values.valid_to) : null,
    jsonParam(values.metadata),
    tenantId,
    siteId,
  ]);

  await recordAudit({
    tenantId,
    userId: user?.id,
    correlationId: context.correlationId,
    action: 'route_site.update',
    entity: 'route_sites',
    entityId: siteId,
    previousData: current.rows[0],
    newData: result.rows[0],
    ipAddress: context.ipAddress,
  });

  return mapSite(result.rows[0]);
}

async function deleteRouteSite({ tenantId, siteId, user, context = {} }) {
  const current = await db.query('SELECT * FROM route_sites WHERE tenant_id = $1 AND id = $2', [tenantId, siteId]);
  if (!current.rows[0]) {
    throw new AppError('Sitio de visita no encontrado.', { code: 'ROUTE_SITE_NOT_FOUND', statusCode: 404, userId: user?.id });
  }
  const usage = await db.query(`
    SELECT
      (SELECT COUNT(*)::int FROM route_stops WHERE tenant_id = $1 AND site_id = $2) AS stops,
      (SELECT COUNT(*)::int FROM route_visit_marks WHERE tenant_id = $1 AND site_id = $2) AS marks
  `, [tenantId, siteId]);
  if (Number(usage.rows[0].stops || 0) > 0 || Number(usage.rows[0].marks || 0) > 0) {
    throw new AppError('No se puede eliminar el sitio porque ya tiene rutas o visitas. Dejalo inactivo.', {
      code: 'ROUTE_SITE_IN_USE',
      statusCode: 409,
      userId: user?.id,
      details: usage.rows[0],
    });
  }

  await db.query('DELETE FROM route_sites WHERE tenant_id = $1 AND id = $2', [tenantId, siteId]);
  await recordAudit({
    tenantId,
    userId: user?.id,
    correlationId: context.correlationId,
    action: 'route_site.delete',
    entity: 'route_sites',
    entityId: siteId,
    previousData: current.rows[0],
    ipAddress: context.ipAddress,
  });
  return { deleted: true, id: siteId };
}

async function ensureEmployee(tenantId, empleadoId, queryable = db) {
  const result = await queryable.query(`
    SELECT id, nombres, apellidos, cargo
    FROM empleados
    WHERE tenant_id = $1
      AND id = $2
      AND activo = true
    LIMIT 1
  `, [tenantId, empleadoId]);
  if (!result.rows[0]) {
    throw new AppError('Empleado activo no encontrado para ruta.', {
      code: 'ROUTE_EMPLOYEE_NOT_FOUND',
      statusCode: 404,
    });
  }
  return result.rows[0];
}

async function ensureSite(tenantId, siteId, queryable = db) {
  const result = await queryable.query(`
    SELECT *
    FROM route_sites
    WHERE tenant_id = $1
      AND id = $2
      AND status = 'activo'
      AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)
    LIMIT 1
  `, [tenantId, siteId]);
  if (!result.rows[0]) {
    throw new AppError('Sitio de visita no encontrado o inactivo.', {
      code: 'ROUTE_SITE_INVALID',
      statusCode: 400,
    });
  }
  return result.rows[0];
}

async function fetchStops(routeDayId, tenantId, queryable = db) {
  const result = await queryable.query(`
    SELECT
      rs.id AS stop_id,
      rs.route_day_id,
      rs.site_id,
      rs.sequence_order,
      rs.planned_start_time,
      rs.planned_end_time,
      rs.status AS stop_status,
      rs.is_unplanned,
      rs.unplanned_name,
      rs.unplanned_address,
      rs.notes,
      rs.started_at,
      rs.completed_at,
      rs.omitted_at,
      rs.omission_reason,
      site.code AS site_code,
      site.name AS site_name,
      site.client_name,
      site.address AS site_address,
      site.latitude AS site_latitude,
      site.longitude AS site_longitude,
      site.radius_meters,
      site.min_accuracy_meters,
      site.requires_photo,
      site.requires_qr,
      site.allows_unplanned,
      site.status AS site_status,
      site.organization_unit_id AS site_organization_unit_id,
      ou.name AS site_organization_unit_name,
      last_mark.mark_type AS last_mark_type,
      last_mark.server_timestamp AS last_mark_timestamp,
      last_mark.status AS last_mark_status,
      last_mark.within_geofence AS last_mark_within_geofence,
      last_mark.distance_meters AS last_mark_distance_meters
    FROM route_stops rs
    LEFT JOIN route_sites site
      ON site.id = rs.site_id
     AND site.tenant_id = rs.tenant_id
    LEFT JOIN organization_units ou
      ON ou.id = site.organization_unit_id
     AND ou.tenant_id = site.tenant_id
    LEFT JOIN LATERAL (
      SELECT mark_type, server_timestamp, status, within_geofence, distance_meters
      FROM route_visit_marks rvm
      WHERE rvm.tenant_id = rs.tenant_id
        AND rvm.route_stop_id = rs.id
      ORDER BY rvm.server_timestamp DESC
      LIMIT 1
    ) last_mark ON true
    WHERE rs.tenant_id = $1
      AND rs.route_day_id = $2
    ORDER BY rs.sequence_order, rs.created_at
  `, [tenantId, routeDayId]);
  return result.rows.map(mapStop);
}

async function getRouteDay({ tenantId, empleadoId, fecha = null, queryable = db }) {
  const operationalDate = normalizeDate(fecha);
  const result = await queryable.query(`
    SELECT
      rd.*,
      pp.anio || '-' || LPAD(pp.mes::text, 2, '0') AS periodo_nomina,
      e.nombres || ' ' || e.apellidos AS employee_name,
      e.cargo
    FROM route_days rd
    JOIN empleados e
      ON e.id = rd.empleado_id
     AND e.tenant_id = rd.tenant_id
    LEFT JOIN payroll_periods pp
      ON pp.id = rd.period_id
     AND pp.tenant_id = rd.tenant_id
    WHERE rd.tenant_id = $1
      AND rd.empleado_id = $2
      AND rd.operational_date = $3::date
    LIMIT 1
  `, [tenantId, empleadoId, operationalDate]);
  const row = result.rows[0];
  if (!row) return null;
  const stops = await fetchStops(row.id, tenantId, queryable);
  return mapRouteDay(row, stops);
}

async function listRouteDays({ tenantId, fecha = null, empleadoId = null, status = null } = {}) {
  const params = [tenantId];
  const conditions = ['rd.tenant_id = $1'];
  if (fecha) {
    params.push(normalizeDate(fecha));
    conditions.push(`rd.operational_date = $${params.length}::date`);
  }
  if (empleadoId) {
    params.push(empleadoId);
    conditions.push(`rd.empleado_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`rd.status = $${params.length}`);
  }
  const result = await db.query(`
    SELECT
      rd.*,
      pp.anio || '-' || LPAD(pp.mes::text, 2, '0') AS periodo_nomina,
      e.nombres || ' ' || e.apellidos AS employee_name,
      e.cargo,
      COUNT(rs.id)::int AS stops_total,
      COUNT(rs.id) FILTER (WHERE rs.status = 'completed')::int AS stops_completed,
      COUNT(rs.id) FILTER (WHERE rs.status IN ('out_of_zone', 'exception_pending', 'omitted'))::int AS stops_exceptions
    FROM route_days rd
    JOIN empleados e
      ON e.id = rd.empleado_id
     AND e.tenant_id = rd.tenant_id
    LEFT JOIN payroll_periods pp
      ON pp.id = rd.period_id
     AND pp.tenant_id = rd.tenant_id
    LEFT JOIN route_stops rs
      ON rs.route_day_id = rd.id
     AND rs.tenant_id = rd.tenant_id
    WHERE ${conditions.join(' AND ')}
    GROUP BY rd.id, pp.anio, pp.mes, e.nombres, e.apellidos, e.cargo
    ORDER BY rd.operational_date DESC, e.apellidos, e.nombres
    LIMIT 120
  `, params);
  return result.rows.map((row) => ({
    ...mapRouteDay(row, []),
    totals: {
      total: Number(row.stops_total || 0),
      completed: Number(row.stops_completed || 0),
      exceptions: Number(row.stops_exceptions || 0),
    },
  }));
}

async function createRouteDay({ tenantId, payload, user, context = {} }) {
  const empleadoId = payload.empleadoId || payload.empleado_id;
  const operationalDate = normalizeDate(payload.fecha || payload.operationalDate || payload.operational_date);
  const stops = Array.isArray(payload.stops) ? payload.stops : [];
  if (!empleadoId) {
    throw new AppError('Selecciona un empleado para asignar la ruta.', { code: 'ROUTE_DAY_EMPLOYEE_REQUIRED', statusCode: 400, userId: user?.id });
  }
  if (stops.length === 0) {
    throw new AppError('La ruta debe incluir al menos una tienda o parada.', { code: 'ROUTE_DAY_STOPS_REQUIRED', statusCode: 400, userId: user?.id });
  }

  const client = await db.getClient(tenantId, user?.id);
  try {
    await ensureEmployee(tenantId, empleadoId, client);
    const period = await ensurePayrollPeriodForDate({ tenantId, userId: user?.id, fecha: operationalDate, queryable: client });
    if (period.status === 'closed') {
      throw new AppError('No se puede asignar ruta en un periodo de nomina cerrado.', { code: 'ROUTE_DAY_PERIOD_CLOSED', statusCode: 422, userId: user?.id });
    }

    const existing = await client.query(`
      SELECT id
      FROM route_days
      WHERE tenant_id = $1 AND empleado_id = $2 AND operational_date = $3::date
      LIMIT 1
    `, [tenantId, empleadoId, operationalDate]);

    let routeDay;
    if (existing.rows[0]) {
      const usage = await client.query('SELECT COUNT(*)::int AS count FROM route_visit_marks WHERE tenant_id = $1 AND route_day_id = $2', [tenantId, existing.rows[0].id]);
      if (Number(usage.rows[0].count || 0) > 0) {
        throw new AppError('La ruta ya tiene visitas registradas. Crea otra fecha o revisa las excepciones.', {
          code: 'ROUTE_DAY_ALREADY_USED',
          statusCode: 409,
          userId: user?.id,
        });
      }
      await client.query('DELETE FROM route_stops WHERE tenant_id = $1 AND route_day_id = $2', [tenantId, existing.rows[0].id]);
      const updated = await client.query(`
        UPDATE route_days
        SET period_id = $1,
            status = 'planned',
            allow_reorder = $2,
            allow_unplanned = $3,
            metadata = $4,
            updated_at = NOW()
        WHERE tenant_id = $5 AND id = $6
        RETURNING *
      `, [
        period.id,
        payload.allowReorder !== false,
        payload.allowUnplanned !== false,
        jsonParam(payload.metadata || {}),
        tenantId,
        existing.rows[0].id,
      ]);
      routeDay = updated.rows[0];
    } else {
      const inserted = await client.query(`
        INSERT INTO route_days (
          tenant_id, empleado_id, period_id, operational_date, status,
          allow_reorder, allow_unplanned, source, metadata, created_by
        )
        VALUES ($1,$2,$3,$4,'planned',$5,$6,'pwa',$7,$8)
        RETURNING *
      `, [
        tenantId,
        empleadoId,
        period.id,
        operationalDate,
        payload.allowReorder !== false,
        payload.allowUnplanned !== false,
        jsonParam(payload.metadata || {}),
        user?.id || null,
      ]);
      routeDay = inserted.rows[0];
    }

    for (const [index, stop] of stops.entries()) {
      const siteId = stop.siteId || stop.site_id;
      await ensureSite(tenantId, siteId, client);
      await client.query(`
        INSERT INTO route_stops (
          tenant_id, route_day_id, site_id, sequence_order,
          planned_start_time, planned_end_time, required_evidence, notes
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `, [
        tenantId,
        routeDay.id,
        siteId,
        Number(stop.sequenceOrder || stop.sequence_order || index + 1),
        stop.plannedStartTime || stop.planned_start_time || null,
        stop.plannedEndTime || stop.planned_end_time || null,
        jsonParam(stop.requiredEvidence || {}),
        normalizeText(stop.notes, 500),
      ]);
    }

    await client.query(`
      INSERT INTO audit_logs (
        tenant_id, user_id, correlation_id, accion, entidad, entidad_id,
        datos_anteriores, datos_nuevos, ip_address, metadata
      )
      VALUES ($1,$2,$3,'route_day.upsert','route_days',$4,'{}'::jsonb,$5,$6,'{}'::jsonb)
    `, [tenantId, user?.id || null, context.correlationId, routeDay.id, jsonParam({ empleadoId, operationalDate, stops: stops.length }), context.ipAddress || null]);

    await db.commit(client);
    return getRouteDay({ tenantId, empleadoId, fecha: operationalDate });
  } catch (err) {
    await db.rollback(client);
    throw err;
  }
}

async function ensureJourneyStarted({ tenantId, empleadoId, operationalDate, queryable, userId, correlationId }) {
  const result = await queryable.query(`
    SELECT tipo_marcacion
    FROM marcaciones
    WHERE tenant_id = $1
      AND empleado_id = $2
      AND operational_date = $3::date
    ORDER BY timestamp DESC
    LIMIT 1
  `, [tenantId, empleadoId, operationalDate]);
  const lastType = result.rows[0]?.tipo_marcacion;
  if (!lastType || lastType === 'fin_jornada') {
    throw new AppError('Inicia la jornada antes de registrar visitas de ruta.', {
      code: 'ROUTE_VISIT_REQUIRES_ACTIVE_SHIFT',
      statusCode: 409,
      userId,
      correlationId,
      details: { lastType: lastType || null },
    });
  }
}

async function fetchStopForEmployee({ tenantId, empleadoId, stopId, queryable }) {
  const result = await queryable.query(`
    SELECT
      rs.*,
      rd.empleado_id,
      rd.period_id,
      rd.operational_date,
      rd.allow_unplanned,
      rd.status AS route_day_status,
      site.name AS site_name,
      site.latitude AS site_latitude,
      site.longitude AS site_longitude,
      site.radius_meters,
      site.min_accuracy_meters,
      site.requires_photo,
      site.requires_qr,
      site.allows_unplanned
    FROM route_stops rs
    JOIN route_days rd
      ON rd.id = rs.route_day_id
     AND rd.tenant_id = rs.tenant_id
    LEFT JOIN route_sites site
      ON site.id = rs.site_id
     AND site.tenant_id = rs.tenant_id
    WHERE rs.tenant_id = $1
      AND rs.id = $2
      AND rd.empleado_id = $3
    LIMIT 1
  `, [tenantId, stopId, empleadoId]);
  if (!result.rows[0]) {
    throw new AppError('Parada de ruta no encontrada para este empleado.', {
      code: 'ROUTE_STOP_NOT_FOUND',
      statusCode: 404,
    });
  }
  return result.rows[0];
}

async function uploadVisitEvidence({ tenantId, empleadoId, stopId, fotoBase64, evidenceUrl, required, correlationId, userId }) {
  if (evidenceUrl) return evidenceUrl;
  if (!fotoBase64) {
    if (required) {
      throw new AppError('Esta tienda requiere evidencia fotografica para registrar la visita.', {
        code: 'ROUTE_VISIT_PHOTO_REQUIRED',
        statusCode: 422,
        correlationId,
        userId,
      });
    }
    return null;
  }
  const photo = validateFotoBase64(fotoBase64, { correlationId, userId });
  const key = `rutas/${tenantId}/${empleadoId}/${stopId}/${Date.now()}.${photo.extension}`;
  return s3Upload(photo.buffer, key, photo.contentType);
}

function calculateGeofence(stop, lat, lng) {
  if (!stop.site_id || lat === undefined || lng === undefined) {
    return { distanceMeters: 0, withinGeofence: true, radioMetros: null };
  }
  const distanceMeters = calcularDistanciaHaversine(
    Number(stop.site_latitude),
    Number(stop.site_longitude),
    Number(lat),
    Number(lng)
  );
  const radioMetros = Number(stop.radius_meters || 120);
  return { distanceMeters, withinGeofence: distanceMeters <= radioMetros, radioMetros };
}

function requireVisitCoordinates(payload, userId) {
  const lat = parseNumber(payload.lat ?? payload.latitude);
  const lng = parseNumber(payload.lng ?? payload.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new AppError('GPS requerido para registrar visitas.', {
      code: 'ROUTE_VISIT_GPS_REQUIRED',
      statusCode: 400,
      userId,
    });
  }
  return { lat, lng };
}

async function createRouteException(client, payload) {
  const result = await client.query(`
    INSERT INTO route_exceptions (
      tenant_id, empleado_id, route_day_id, route_stop_id, visit_mark_id,
      period_id, operational_date, exception_type, status, reason, metadata
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending_review',$9,$10)
    RETURNING *
  `, [
    payload.tenantId,
    payload.empleadoId,
    payload.routeDayId || null,
    payload.routeStopId || null,
    payload.visitMarkId || null,
    payload.periodId || null,
    payload.operationalDate,
    payload.exceptionType,
    payload.reason || '',
    jsonParam(payload.metadata || {}),
  ]);
  return result.rows[0];
}

async function registerRouteVisit({ tenantId, empleadoId, stopId, markType, payload = {}, user, context = {} }) {
  if (!['arrival', 'departure'].includes(markType)) {
    throw new AppError('Tipo de marca de visita no permitido.', { code: 'ROUTE_VISIT_MARK_TYPE_INVALID', statusCode: 400, userId: user?.id });
  }

  const client = await db.getClient(tenantId, user?.id);
  try {
    const stop = await fetchStopForEmployee({ tenantId, empleadoId, stopId, queryable: client });
    const operationalDate = normalizeDate(stop.operational_date);
    await ensureJourneyStarted({ tenantId, empleadoId, operationalDate, queryable: client, userId: user?.id, correlationId: context.correlationId });
    const period = await ensurePayrollPeriodForDate({ tenantId, userId: user?.id, fecha: operationalDate, queryable: client });
    if (period.status === 'closed') {
      throw new AppError('No se puede registrar visita en un periodo de nomina cerrado.', { code: 'ROUTE_VISIT_PERIOD_CLOSED', statusCode: 422, userId: user?.id });
    }

    if (markType === 'arrival') {
      if (!['pending', 'out_of_zone', 'exception_pending'].includes(stop.status)) {
        throw new AppError('Esta parada no esta pendiente de llegada.', { code: 'ROUTE_STOP_NOT_PENDING', statusCode: 409, userId: user?.id });
      }
      await assertNoOpenRouteVisit({ tenantId, empleadoId, operationalDate, queryable: client, userId: user?.id, correlationId: context.correlationId });
    } else if (stop.status !== 'in_site') {
      throw new AppError('Registra la llegada antes de registrar la salida de la tienda.', { code: 'ROUTE_STOP_NOT_IN_SITE', statusCode: 409, userId: user?.id });
    }

    const { lat, lng } = requireVisitCoordinates(payload, user?.id);
    const accuracy = parseNumber(payload.accuracy ?? payload.accuracyMeters);
    const geo = calculateGeofence(stop, lat, lng);
    const poorAccuracy = stop.min_accuracy_meters && accuracy && accuracy > Number(stop.min_accuracy_meters);
    const markStatus = !geo.withinGeofence || poorAccuracy ? 'out_of_zone' : 'valid';
    const evidenceUrl = await uploadVisitEvidence({
      tenantId,
      empleadoId,
      stopId,
      fotoBase64: payload.fotoBase64,
      evidenceUrl: payload.evidenceUrl,
      required: Boolean(stop.requires_photo),
      correlationId: context.correlationId,
      userId: user?.id,
    });

    const mark = await client.query(`
      INSERT INTO route_visit_marks (
        tenant_id, empleado_id, route_day_id, route_stop_id, site_id, period_id,
        operational_date, mark_type, device_timestamp, latitude, longitude,
        accuracy_meters, within_geofence, distance_meters, status, evidence_url,
        comment, source, audit_correlation_id, metadata
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'mobile',$18,$19)
      RETURNING *
    `, [
      tenantId,
      empleadoId,
      stop.route_day_id,
      stop.id,
      stop.site_id || null,
      period.id,
      operationalDate,
      markType,
      payload.deviceTimestamp || null,
      lat,
      lng,
      Number.isFinite(accuracy) ? accuracy : null,
      geo.withinGeofence && !poorAccuracy,
      geo.distanceMeters,
      markStatus,
      evidenceUrl,
      normalizeText(payload.comment || payload.comentario, 500),
      context.correlationId || null,
      jsonParam({
        radioMetros: geo.radioMetros,
        accuracyMeters: Number.isFinite(accuracy) ? accuracy : null,
        poorAccuracy: Boolean(poorAccuracy),
        siteName: stop.site_name || stop.unplanned_name || '',
      }),
    ]);

    if (markType === 'arrival') {
      await client.query(`
        UPDATE route_stops
        SET status = 'in_site',
            started_at = COALESCE(started_at, NOW()),
            updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2
      `, [tenantId, stop.id]);
      await client.query(`
        UPDATE route_days
        SET status = 'in_progress',
            updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2 AND status = 'planned'
      `, [tenantId, stop.route_day_id]);
    } else {
      await client.query(`
        UPDATE route_stops
        SET status = 'completed',
            completed_at = NOW(),
            updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2
      `, [tenantId, stop.id]);
    }

    let exception = null;
    if (markStatus !== 'valid') {
      exception = await createRouteException(client, {
        tenantId,
        empleadoId,
        routeDayId: stop.route_day_id,
        routeStopId: stop.id,
        visitMarkId: mark.rows[0].id,
        periodId: period.id,
        operationalDate,
        exceptionType: poorAccuracy ? 'gps_accuracy_low' : 'out_of_geofence',
        reason: poorAccuracy ? 'Precision GPS insuficiente para el sitio.' : 'Marcacion fuera del radio del sitio.',
        metadata: {
          distanceMeters: Math.round(geo.distanceMeters),
          radiusMeters: geo.radioMetros,
          accuracyMeters: Number.isFinite(accuracy) ? Math.round(accuracy) : null,
        },
      });
      await client.query("UPDATE route_days SET status = 'exception_pending', updated_at = NOW() WHERE tenant_id = $1 AND id = $2", [tenantId, stop.route_day_id]);
    }

    await client.query(`
      INSERT INTO audit_logs (
        tenant_id, user_id, correlation_id, accion, entidad, entidad_id,
        datos_anteriores, datos_nuevos, ip_address, metadata
      )
      VALUES ($1,$2,$3,$4,'route_visit_marks',$5,'{}'::jsonb,$6,$7,'{}'::jsonb)
    `, [
      tenantId,
      user?.id || null,
      context.correlationId,
      markType === 'arrival' ? 'route_visit.arrival' : 'route_visit.departure',
      mark.rows[0].id,
      jsonParam({ stopId, markType, status: markStatus, exceptionId: exception?.id || null }),
      context.ipAddress || null,
    ]);

    await db.commit(client);
    return {
      mark: mark.rows[0],
      exception,
      route: await getRouteDay({ tenantId, empleadoId, fecha: operationalDate }),
    };
  } catch (err) {
    await db.rollback(client);
    throw err;
  }
}

async function registerUnplannedVisit({ tenantId, empleadoId, payload = {}, user, context = {} }) {
  const operationalDate = normalizeDate(payload.fecha || payload.operationalDate);
  const client = await db.getClient(tenantId, user?.id);
  try {
    await ensureEmployee(tenantId, empleadoId, client);
    await ensureJourneyStarted({ tenantId, empleadoId, operationalDate, queryable: client, userId: user?.id, correlationId: context.correlationId });
    await assertNoOpenRouteVisit({ tenantId, empleadoId, operationalDate, queryable: client, userId: user?.id, correlationId: context.correlationId });
    const period = await ensurePayrollPeriodForDate({ tenantId, userId: user?.id, fecha: operationalDate, queryable: client });
    if (period.status === 'closed') {
      throw new AppError('No se puede registrar visita en un periodo de nomina cerrado.', { code: 'ROUTE_VISIT_PERIOD_CLOSED', statusCode: 422, userId: user?.id });
    }
    const reason = normalizeText(payload.reason || payload.motivo, 500);
    if (!reason) {
      throw new AppError('Indica el motivo de la visita no programada.', { code: 'ROUTE_UNPLANNED_REASON_REQUIRED', statusCode: 422, userId: user?.id });
    }
    const { lat, lng } = requireVisitCoordinates(payload, user?.id);
    const accuracy = parseNumber(payload.accuracy ?? payload.accuracyMeters);

    const routeResult = await client.query(`
      INSERT INTO route_days (
        tenant_id, empleado_id, period_id, operational_date, status,
        allow_reorder, allow_unplanned, source, metadata, created_by
      )
      VALUES ($1,$2,$3,$4,'in_progress',true,true,'mobile',$5,$6)
      ON CONFLICT (tenant_id, empleado_id, operational_date) DO UPDATE SET
        status = CASE WHEN route_days.status = 'planned' THEN 'in_progress' ELSE route_days.status END,
        allow_unplanned = true,
        updated_at = NOW()
      RETURNING *
    `, [tenantId, empleadoId, period.id, operationalDate, jsonParam({ createdFrom: 'unplanned_visit' }), user?.id || null]);

    const order = await client.query('SELECT COALESCE(MAX(sequence_order), 0) + 1 AS next_order FROM route_stops WHERE tenant_id = $1 AND route_day_id = $2', [tenantId, routeResult.rows[0].id]);
    const stopResult = await client.query(`
      INSERT INTO route_stops (
        tenant_id, route_day_id, site_id, sequence_order, status,
        is_unplanned, unplanned_name, unplanned_address, notes, started_at
      )
      VALUES ($1,$2,NULL,$3,'in_site',true,$4,$5,$6,NOW())
      RETURNING *
    `, [
      tenantId,
      routeResult.rows[0].id,
      Number(order.rows[0].next_order || 1),
      normalizeText(payload.siteName || payload.nombreSitio || 'Visita no programada', 160),
      normalizeText(payload.address || payload.direccion, 500),
      reason,
    ]);

    const markResult = await client.query(`
      INSERT INTO route_visit_marks (
        tenant_id, empleado_id, route_day_id, route_stop_id, period_id,
        operational_date, mark_type, device_timestamp, latitude, longitude,
        accuracy_meters, within_geofence, distance_meters, status, comment,
        source, audit_correlation_id, metadata
      )
      VALUES ($1,$2,$3,$4,$5,$6,'arrival',$7,$8,$9,$10,true,0,'pending_review',$11,'mobile',$12,$13)
      RETURNING *
    `, [
      tenantId,
      empleadoId,
      routeResult.rows[0].id,
      stopResult.rows[0].id,
      period.id,
      operationalDate,
      payload.deviceTimestamp || null,
      lat,
      lng,
      Number.isFinite(accuracy) ? accuracy : null,
      reason,
      context.correlationId || null,
      jsonParam({ unplanned: true, reason }),
    ]);

    const exception = await createRouteException(client, {
      tenantId,
      empleadoId,
      routeDayId: routeResult.rows[0].id,
      routeStopId: stopResult.rows[0].id,
      visitMarkId: markResult.rows[0].id,
      periodId: period.id,
      operationalDate,
      exceptionType: 'unplanned_visit',
      reason,
      metadata: { siteName: stopResult.rows[0].unplanned_name },
    });

    await client.query("UPDATE route_days SET status = 'exception_pending', updated_at = NOW() WHERE tenant_id = $1 AND id = $2", [tenantId, routeResult.rows[0].id]);
    await client.query(`
      INSERT INTO audit_logs (
        tenant_id, user_id, correlation_id, accion, entidad, entidad_id,
        datos_anteriores, datos_nuevos, ip_address, metadata
      )
      VALUES ($1,$2,$3,'route_visit.unplanned','route_stops',$4,'{}'::jsonb,$5,$6,'{}'::jsonb)
    `, [tenantId, user?.id || null, context.correlationId, stopResult.rows[0].id, jsonParam({ reason, exceptionId: exception.id }), context.ipAddress || null]);

    await db.commit(client);
    return {
      stop: stopResult.rows[0],
      mark: markResult.rows[0],
      exception,
      route: await getRouteDay({ tenantId, empleadoId, fecha: operationalDate }),
    };
  } catch (err) {
    await db.rollback(client);
    throw err;
  }
}

async function omitRouteStop({ tenantId, empleadoId, stopId, reason, user, context = {} }) {
  const text = normalizeText(reason, 500);
  if (!text) {
    throw new AppError('Indica el motivo para omitir la visita.', { code: 'ROUTE_STOP_OMIT_REASON_REQUIRED', statusCode: 422, userId: user?.id });
  }
  const client = await db.getClient(tenantId, user?.id);
  try {
    const stop = await fetchStopForEmployee({ tenantId, empleadoId, stopId, queryable: client });
    if (stop.status === 'in_site') {
      throw new AppError('No puedes omitir una visita abierta. Registra la salida primero.', { code: 'ROUTE_STOP_OPEN_CANNOT_OMIT', statusCode: 409, userId: user?.id });
    }
    if (stop.status === 'completed') {
      throw new AppError('No puedes omitir una visita ya completada.', { code: 'ROUTE_STOP_COMPLETED_CANNOT_OMIT', statusCode: 409, userId: user?.id });
    }
    await client.query(`
      UPDATE route_stops
      SET status = 'omitted',
          omitted_at = NOW(),
          omission_reason = $1,
          updated_at = NOW()
      WHERE tenant_id = $2 AND id = $3
    `, [text, tenantId, stop.id]);
    const exception = await createRouteException(client, {
      tenantId,
      empleadoId,
      routeDayId: stop.route_day_id,
      routeStopId: stop.id,
      periodId: stop.period_id,
      operationalDate: normalizeDate(stop.operational_date),
      exceptionType: 'omitted_visit',
      reason: text,
      metadata: { siteName: stop.site_name || stop.unplanned_name || '' },
    });
    await client.query("UPDATE route_days SET status = 'exception_pending', updated_at = NOW() WHERE tenant_id = $1 AND id = $2", [tenantId, stop.route_day_id]);
    await client.query(`
      INSERT INTO audit_logs (
        tenant_id, user_id, correlation_id, accion, entidad, entidad_id,
        datos_anteriores, datos_nuevos, ip_address, metadata
      )
      VALUES ($1,$2,$3,'route_stop.omit','route_stops',$4,'{}'::jsonb,$5,$6,'{}'::jsonb)
    `, [tenantId, user?.id || null, context.correlationId, stop.id, jsonParam({ reason: text, exceptionId: exception.id }), context.ipAddress || null]);
    await db.commit(client);
    return { exception, route: await getRouteDay({ tenantId, empleadoId, fecha: stop.operational_date }) };
  } catch (err) {
    await db.rollback(client);
    throw err;
  }
}

async function listRouteExceptions({ tenantId, status = null, fecha = null } = {}) {
  const params = [tenantId];
  const conditions = ['rex.tenant_id = $1'];
  if (status) {
    params.push(status);
    conditions.push(`rex.status = $${params.length}`);
  }
  if (fecha) {
    params.push(normalizeDate(fecha));
    conditions.push(`rex.operational_date = $${params.length}::date`);
  }
  const result = await db.query(`
    SELECT
      rex.*,
      e.nombres || ' ' || e.apellidos AS employee_name,
      COALESCE(site.name, rs.unplanned_name, '') AS site_name
    FROM route_exceptions rex
    JOIN empleados e ON e.id = rex.empleado_id AND e.tenant_id = rex.tenant_id
    LEFT JOIN route_stops rs ON rs.id = rex.route_stop_id AND rs.tenant_id = rex.tenant_id
    LEFT JOIN route_sites site ON site.id = rs.site_id AND site.tenant_id = rs.tenant_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY rex.created_at DESC
    LIMIT 120
  `, params);
  return result.rows;
}

async function reviewRouteException({ tenantId, exceptionId, payload, user, context = {} }) {
  const status = normalizeText(payload.status || 'resolved', 30);
  if (!EXCEPTION_STATUSES.has(status)) {
    throw new AppError('Estado de excepcion no permitido.', { code: 'ROUTE_EXCEPTION_STATUS_INVALID', statusCode: 400, userId: user?.id });
  }
  const result = await db.query(`
    UPDATE route_exceptions
    SET status = $1,
        resolution = $2,
        reviewed_by = $3,
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE tenant_id = $4 AND id = $5
    RETURNING *
  `, [status, normalizeText(payload.resolution, 1000), user?.id || null, tenantId, exceptionId]);
  if (!result.rows[0]) {
    throw new AppError('Excepcion de ruta no encontrada.', { code: 'ROUTE_EXCEPTION_NOT_FOUND', statusCode: 404, userId: user?.id });
  }
  await recordAudit({
    tenantId,
    userId: user?.id,
    correlationId: context.correlationId,
    action: 'route_exception.review',
    entity: 'route_exceptions',
    entityId: exceptionId,
    newData: result.rows[0],
    ipAddress: context.ipAddress,
  });
  return result.rows[0];
}

async function getRouteReportRows({ tenantId, fechaInicio, fechaFin }) {
  const from = normalizeDate(fechaInicio);
  const to = normalizeDate(fechaFin || fechaInicio || from);
  const result = await db.query(`
    SELECT
      rd.operational_date,
      e.cedula,
      e.nombres || ' ' || e.apellidos AS empleado,
      e.cargo,
      COALESCE(site.name, rs.unplanned_name, '') AS sitio,
      rs.status AS estado_parada,
      rs.is_unplanned,
      MIN(CASE WHEN rvm.mark_type = 'arrival' THEN rvm.server_timestamp END) AS llegada,
      MAX(CASE WHEN rvm.mark_type = 'departure' THEN rvm.server_timestamp END) AS salida,
      BOOL_AND(COALESCE(rvm.within_geofence, true)) AS dentro_zona,
      MAX(COALESCE(rvm.distance_meters, 0)) AS distancia_maxima,
      COUNT(rex.id)::int AS excepciones
    FROM route_days rd
    JOIN empleados e ON e.id = rd.empleado_id AND e.tenant_id = rd.tenant_id
    JOIN route_stops rs ON rs.route_day_id = rd.id AND rs.tenant_id = rd.tenant_id
    LEFT JOIN route_sites site ON site.id = rs.site_id AND site.tenant_id = rs.tenant_id
    LEFT JOIN route_visit_marks rvm ON rvm.route_stop_id = rs.id AND rvm.tenant_id = rs.tenant_id
    LEFT JOIN route_exceptions rex ON rex.route_stop_id = rs.id AND rex.tenant_id = rs.tenant_id
    WHERE rd.tenant_id = $1
      AND rd.operational_date BETWEEN $2::date AND $3::date
    GROUP BY rd.operational_date, e.cedula, e.nombres, e.apellidos, e.cargo, sitio, rs.status, rs.is_unplanned, rs.sequence_order
    ORDER BY rd.operational_date, empleado, rs.sequence_order
  `, [tenantId, from, to]);

  return {
    fechaInicio: from,
    fechaFin: to,
    total: result.rows.length,
    rows: result.rows.map(mapRouteReportRow),
  };
}

function routeReportHeaders() {
  return [
    ['fecha', 'Fecha'],
    ['cedula', 'Cedula'],
    ['empleado', 'Empleado'],
    ['cargo', 'Cargo'],
    ['sitio', 'Sitio'],
    ['estado', 'Estado'],
    ['noProgramada', 'No programada'],
    ['llegada', 'Llegada'],
    ['salida', 'Salida'],
    ['dentroZona', 'Dentro de zona'],
    ['distanciaMaximaMetros', 'Distancia maxima m'],
    ['excepciones', 'Excepciones'],
  ];
}

function routeReportCell(row, key) {
  if (key === 'noProgramada' || key === 'dentroZona') return row[key] ? 'SI' : 'NO';
  return row[key] ?? '';
}

async function exportRouteReportCsv({ tenantId, fechaInicio, fechaFin }) {
  const report = await getRouteReportRows({ tenantId, fechaInicio, fechaFin });
  const headers = ['fecha', 'cedula', 'empleado', 'cargo', 'sitio', 'estado', 'no_programada', 'llegada', 'salida', 'dentro_zona', 'distancia_maxima_m', 'excepciones'];
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = [
    headers.join(','),
    ...report.rows.map((row) => routeReportHeaders().map(([key]) => routeReportCell(row, key)).map(escape).join(',')),
  ];
  return lines.join('\n');
}

async function exportRouteReportXlsx({ tenantId, fechaInicio, fechaFin }) {
  const report = await getRouteReportRows({ tenantId, fechaInicio, fechaFin });
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SKNOMINA';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Rutas de campo');
  sheet.columns = routeReportHeaders().map(([key, header]) => ({
    header,
    key,
    width: key === 'empleado' || key === 'sitio' ? 28 : 18,
  }));
  sheet.addRows(report.rows.map((row) => Object.fromEntries(
    routeReportHeaders().map(([key]) => [key, routeReportCell(row, key)])
  )));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function createPdfBuffer(docDefinition) {
  return new Promise((resolve) => {
    pdfmake.createPdf(docDefinition).getBuffer((buffer) => resolve(Buffer.from(buffer)));
  });
}

async function exportRouteReportPdf({ tenantId, fechaInicio, fechaFin }) {
  const report = await getRouteReportRows({ tenantId, fechaInicio, fechaFin });
  const headers = routeReportHeaders();
  const body = [
    headers.map(([, header]) => ({ text: header, bold: true, fillColor: '#e2e8f0' })),
    ...report.rows.map((row) => headers.map(([key]) => String(routeReportCell(row, key)))),
  ];
  return createPdfBuffer({
    pageOrientation: 'landscape',
    pageMargins: [24, 32, 24, 32],
    content: [
      { text: 'Reporte de rutas de campo', style: 'title' },
      { text: `Periodo: ${report.fechaInicio} a ${report.fechaFin}`, margin: [0, 0, 0, 10] },
      {
        table: {
          headerRows: 1,
          widths: [48, 58, 100, 70, 100, 58, 50, 72, 72, 48, 56, 48],
          body,
        },
        layout: 'lightHorizontalLines',
      },
    ],
    styles: {
      title: { fontSize: 16, bold: true, margin: [0, 0, 0, 6] },
    },
    defaultStyle: { fontSize: 7 },
  });
}

module.exports = {
  createRouteDay,
  createRouteSite,
  deleteRouteSite,
  exportRouteReportPdf,
  exportRouteReportCsv,
  exportRouteReportXlsx,
  getRouteDay,
  getRouteReportRows,
  listRouteDays,
  listRouteExceptions,
  listRouteSites,
  omitRouteStop,
  registerRouteVisit,
  registerUnplannedVisit,
  reviewRouteException,
  updateRouteSite,
};
