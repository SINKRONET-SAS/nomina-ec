// ============================================================
// PLAN HAIKY - Validador de Marcaciones con GPS
// ============================================================
const db = require('../config/database');
const { dateInEcuador, ensurePayrollPeriodForDate } = require('./monthlyPeriodService');
const { s3Upload } = require('../config/s3');
const AppError = require('../utils/AppError');
const { recordAudit } = require('./auditService');
const { resolveAttendanceReadiness } = require('./employeeAppInviteService');

async function validarMarcacion({
  empleadoId,
  tenantId,
  tipo,
  lat,
  lng,
  accuracy = null,
  fotoBase64,
  permitirFueraPerimetro = false,
  motivoFueraPerimetro = '',
  ip,
  ipAddress,
  correlationId,
  userId,
  source = 'web',
}) {
  const requestIp = ip || ipAddress || null;
  if (lat === undefined || lng === undefined || Number.isNaN(lat) || Number.isNaN(lng)) {
    throw new AppError('La geolocalizacion es obligatoria para registrar marcaciones', {
      code: 'GEOLOCALIZACION_REQUERIDA',
      statusCode: 400,
      correlationId,
      userId,
    });
  }

  const tenantResult = await db.query(
    'SELECT configuracion, ubicacion_lat, ubicacion_lng, radio_perimetro_metros FROM tenants WHERE id = $1',
    [tenantId]
  );

  if (tenantResult.rows.length === 0) {
    throw new AppError('Tenant no encontrado', {
      code: 'TENANT_NO_ENCONTRADO',
      statusCode: 404,
      correlationId,
      userId,
    });
  }

  const tenant = tenantResult.rows[0];
  const readinessResult = await resolveAttendanceReadiness(empleadoId, tenantId);
  const { readiness } = readinessResult;

  if (!readiness.ready) {
    throw new AppError('La asistencia no esta lista: RRHH debe completar unidad organizativa, zona y jornada.', {
      code: 'ATTENDANCE_NOT_READY',
      statusCode: 409,
      correlationId,
      userId,
      details: {
        empleadoId,
        blockers: readiness.blockers,
      },
    });
  }

  const workZone = readiness.workZone;
  const organizationUnit = readiness.organizationUnit;
  const workShift = readiness.workShift;
  const configuredRadius = tenant.configuracion?.radio_permitido_metros;
  const radioPermitido = Number(workZone?.radiusMeters || configuredRadius || tenant.radio_perimetro_metros || 100);
  const referenceLat = workZone?.latitude || tenant.ubicacion_lat;
  const referenceLng = workZone?.longitude || tenant.ubicacion_lng;
  let distancia = 0;
  let dentroPerimetro = true;
  const accuracyValue = accuracy == null ? null : Number(accuracy);

  if (
    accuracyValue != null
    && Number.isFinite(accuracyValue)
    && workZone?.minAccuracyMeters
    && accuracyValue > Number(workZone.minAccuracyMeters)
  ) {
    throw new AppError('La precision GPS no es suficiente para registrar asistencia en esta zona.', {
      code: 'MARCACION_PRECISION_GPS_INSUFICIENTE',
      statusCode: 409,
      correlationId,
      userId,
      details: {
        accuracyMeters: Math.round(accuracyValue),
        minAccuracyMeters: workZone.minAccuracyMeters,
      },
    });
  }

  if (referenceLat && referenceLng) {
    distancia = calcularDistanciaHaversine(
      Number(referenceLat),
      Number(referenceLng),
      lat,
      lng
    );
    dentroPerimetro = distancia <= radioPermitido;
  }

  if (!dentroPerimetro && !permitirFueraPerimetro) {
    throw new AppError('La marcación está fuera de la zona permitida y requiere aprobación explícita', {
      code: 'MARCACION_FUERA_PERIMETRO_REQUIERE_APROBACION',
      statusCode: 409,
      correlationId,
      userId,
      details: {
        empleadoId,
        distanciaMetros: Math.round(distancia),
        radioPermitidoMetros: radioPermitido,
      },
    });
  }

  if (!dentroPerimetro && permitirFueraPerimetro && !String(motivoFueraPerimetro || '').trim()) {
    throw new AppError('Indica el motivo para aceptar una marcación fuera de la zona permitida', {
      code: 'MARCACION_FUERA_PERIMETRO_SIN_MOTIVO',
      statusCode: 422,
      correlationId,
      userId,
    });
  }

  let fotoUrl = null;
  if (fotoBase64) {
    const fotoBuffer = Buffer.from(fotoBase64, 'base64');
    const key = `marcaciones/${tenantId}/${empleadoId}/${Date.now()}.jpg`;
    fotoUrl = await s3Upload(fotoBuffer, key, 'image/jpeg');
  }

  if (tipo === 'inicio_jornada') {
    const fechaOperacional = dateInEcuador(new Date());
    const ultima = await db.query(`
      SELECT tipo_marcacion
      FROM marcaciones
      WHERE empleado_id = $1
        AND tenant_id = $2
        AND operational_date = $3::date
      ORDER BY timestamp DESC
      LIMIT 1
    `, [empleadoId, tenantId, fechaOperacional]);

    if (ultima.rows.length > 0 && ultima.rows[0].tipo_marcacion === 'inicio_jornada') {
      throw new AppError('No se puede registrar un nuevo inicio sin un fin previo', {
        code: 'SECUENCIA_MARCACION_INVALIDA',
        statusCode: 409,
        correlationId,
        userId,
      });
    }
  }

  const fechaOperacional = dateInEcuador(new Date());
  const period = await ensurePayrollPeriodForDate({ tenantId, userId, fecha: fechaOperacional });
  if (period.status === 'closed') {
    throw new AppError('No se puede registrar asistencia en un periodo de nomina cerrado.', {
      code: 'ATTENDANCE_PERIOD_CLOSED',
      statusCode: 422,
      correlationId,
      userId,
      details: { periodoNomina: period.periodoNomina },
    });
  }

  const result = await db.query(`
    INSERT INTO marcaciones (
      empleado_id, tenant_id, period_id, operational_date, work_zone_id,
      organization_unit_id, work_shift_id, tipo_marcacion, timestamp,
      foto_url, latitud, longitud, accuracy_meters, dentro_perimetro,
      distancia_metros, ip_address, source, audit_correlation_id, metadata
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
    RETURNING id
  `, [
    empleadoId,
    tenantId,
    period.id,
    fechaOperacional,
    workZone?.id || null,
    organizationUnit?.id || null,
    workShift?.id || null,
    tipo,
    fotoUrl,
    lat,
    lng,
    Number.isFinite(accuracyValue) ? accuracyValue : null,
    dentroPerimetro,
    distancia,
    requestIp,
    source,
    correlationId || null,
    JSON.stringify({
      radioPermitido,
      workZoneId: workZone?.id || null,
      workZoneName: workZone?.name || null,
      organizationUnitId: organizationUnit?.id || null,
      organizationUnitName: organizationUnit?.name || null,
      workShiftId: workShift?.id || null,
      workShiftName: workShift?.name || null,
      periodId: period.id,
      periodoNomina: period.periodoNomina,
      operationalDate: fechaOperacional,
      accuracyMeters: Number.isFinite(accuracyValue) ? accuracyValue : null,
      perimeterSource: 'organization_unit_work_zone',
      permitirFueraPerimetro: Boolean(permitirFueraPerimetro),
      motivoFueraPerimetro: motivoFueraPerimetro || '',
    }),
  ]);

  const marcacionId = result.rows[0].id;

  await recordAudit({
    tenantId,
    userId,
    correlationId,
    action: 'registrar_marcacion',
    entity: 'marcaciones',
    entityId: marcacionId,
    newData: {
      empleadoId,
      tipo,
      dentroPerimetro,
      distancia,
      permitirFueraPerimetro: Boolean(permitirFueraPerimetro),
    },
    ipAddress: requestIp,
  });

  if (tipo === 'inicio_jornada' && dentroPerimetro) {
    await generarNovedadTardia(empleadoId, tenantId, correlationId, userId);
  }

  return {
    success: true,
    marcacionId,
    tipo_marcacion: tipo,
    timestamp: new Date().toISOString(),
    dentroPerimetro,
    distancia: distancia.toFixed(0),
    periodo_operacional: period.periodoNomina,
    fecha_operacional: fechaOperacional,
    zonaMarcacion: workZone ? {
      id: workZone.id,
      nombre: workZone.name,
      codigo: workZone.code,
      radioMetros: radioPermitido,
    } : null,
    fotoUrl,
  };
}

async function resolveWorkZoneForEmployee(empleadoId, tenantId) {
  const { readiness } = await resolveAttendanceReadiness(empleadoId, tenantId);
  if (!readiness.workZone) return null;
  return {
    id: readiness.workZone.id,
    code: readiness.workZone.code,
    name: readiness.workZone.name,
    latitude: readiness.workZone.latitude,
    longitude: readiness.workZone.longitude,
    radius_meters: readiness.workZone.radiusMeters,
    min_accuracy_meters: readiness.workZone.minAccuracyMeters,
  };
}

function calcularDistanciaHaversine(lat1, lon1, lat2, lon2) {
  const radius = 6371e3;
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2)
    + Math.cos(phi1) * Math.cos(phi2)
    * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return radius * c;
}

async function generarNovedadTardia(empleadoId, tenantId, correlationId, userId) {
  const tenant = await db.query('SELECT configuracion FROM tenants WHERE id = $1', [tenantId]);
  const config = tenant.rows[0]?.configuracion || {};
  const horaInicio = config.horario_laboral?.inicio || '08:00';
  const tolerancia = config.tolerancia_minutos_tardia || 5;
  const marcacion = await db.query(`
    SELECT timestamp
    FROM marcaciones
    WHERE empleado_id = $1
      AND tipo_marcacion = 'inicio_jornada'
    ORDER BY timestamp DESC
    LIMIT 1
  `, [empleadoId]);

  if (marcacion.rows.length === 0) {
    console.error('[NOVEDAD] No existe marcacion reciente para evaluar atraso', {
      code: 'MARCACION_RECIENTE_NO_ENCONTRADA',
      statusCode: 404,
      correlationId,
      userId,
      empleadoId,
    });
    return;
  }

  const fechaMarcacion = new Date(marcacion.rows[0].timestamp);
  const [hours, minutes] = horaInicio.split(':').map(Number);
  const horaLimite = new Date(fechaMarcacion);
  horaLimite.setHours(hours, minutes + tolerancia, 0, 0);

  if (fechaMarcacion > horaLimite) {
    const minutosAtraso = Math.round((fechaMarcacion - horaLimite) / 60000);
    const fechaNovedad = dateInEcuador(fechaMarcacion);
    const period = await ensurePayrollPeriodForDate({ tenantId, userId, fecha: fechaNovedad });
    if (period.status === 'closed') {
      console.error('[NOVEDAD] Periodo cerrado para atraso automatico', {
        code: 'NOVEDAD_PERIODO_CERRADO',
        statusCode: 422,
        correlationId,
        userId,
        empleadoId,
        periodoNomina: period.periodoNomina,
      });
      return;
    }
    await db.query(`
      INSERT INTO novedades_asistencia (empleado_id, tenant_id, period_id, periodo_nomina, fecha, tipo_novedad, minutos, estado)
      VALUES ($1,$2,$3,$4,$5,'atraso',$6,'pendiente')
      ON CONFLICT DO NOTHING
    `, [empleadoId, tenantId, period.id, period.periodoNomina, fechaNovedad, minutosAtraso]);
  }
}

module.exports = { validarMarcacion, calcularDistanciaHaversine, resolveWorkZoneForEmployee };
