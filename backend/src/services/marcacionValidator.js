// ============================================================
// PLAN HAIKY - Validador de Marcaciones con GPS
// ============================================================
const db = require('../config/database');
const { s3Upload } = require('../config/s3');
const AppError = require('../utils/AppError');
const { recordAudit } = require('./auditService');

async function validarMarcacion({ empleadoId, tenantId, tipo, lat, lng, fotoBase64, ip, correlationId, userId }) {
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
  const configuredRadius = tenant.configuracion?.radio_permitido_metros;
  const radioPermitido = Number(configuredRadius || tenant.radio_perimetro_metros || 100);
  let distancia = 0;
  let dentroPerimetro = true;

  if (tenant.ubicacion_lat && tenant.ubicacion_lng) {
    distancia = calcularDistanciaHaversine(
      Number(tenant.ubicacion_lat),
      Number(tenant.ubicacion_lng),
      lat,
      lng
    );
    dentroPerimetro = distancia <= radioPermitido;
  }

  let fotoUrl = null;
  if (fotoBase64) {
    const fotoBuffer = Buffer.from(fotoBase64, 'base64');
    const key = `marcaciones/${tenantId}/${empleadoId}/${Date.now()}.jpg`;
    fotoUrl = await s3Upload(fotoBuffer, key, 'image/jpeg');
  }

  if (tipo === 'inicio_jornada') {
    const ultima = await db.query(`
      SELECT tipo_marcacion
      FROM marcaciones
      WHERE empleado_id = $1
        AND DATE(timestamp) = CURRENT_DATE
      ORDER BY timestamp DESC
      LIMIT 1
    `, [empleadoId]);

    if (ultima.rows.length > 0 && ultima.rows[0].tipo_marcacion === 'inicio_jornada') {
      throw new AppError('No se puede registrar un nuevo inicio sin un fin previo', {
        code: 'SECUENCIA_MARCACION_INVALIDA',
        statusCode: 409,
        correlationId,
        userId,
      });
    }
  }

  const result = await db.query(`
    INSERT INTO marcaciones (
      empleado_id, tenant_id, tipo_marcacion, timestamp,
      foto_url, latitud, longitud, dentro_perimetro, distancia_metros, ip_address, metadata
    )
    VALUES ($1,$2,$3,NOW(),$4,$5,$6,$7,$8,$9,$10)
    RETURNING id
  `, [
    empleadoId,
    tenantId,
    tipo,
    fotoUrl,
    lat,
    lng,
    dentroPerimetro,
    distancia,
    ip,
    JSON.stringify({ radioPermitido }),
  ]);

  const marcacionId = result.rows[0].id;

  await recordAudit({
    tenantId,
    userId,
    correlationId,
    action: 'registrar_marcacion',
    entity: 'marcaciones',
    entityId: marcacionId,
    newData: { empleadoId, tipo, dentroPerimetro, distancia },
    ipAddress: ip,
  });

  if (tipo === 'inicio_jornada' && dentroPerimetro) {
    await generarNovedadTardia(empleadoId, tenantId, correlationId, userId);
  }

  return {
    success: true,
    marcacionId,
    dentroPerimetro,
    distancia: distancia.toFixed(0),
    fotoUrl,
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
    await db.query(`
      INSERT INTO novedades_asistencia (empleado_id, tenant_id, fecha, tipo_novedad, minutos, estado)
      VALUES ($1,$2,CURRENT_DATE,'atraso',$3,'pendiente')
      ON CONFLICT DO NOTHING
    `, [empleadoId, tenantId, minutosAtraso]);
  }
}

module.exports = { validarMarcacion, calcularDistanciaHaversine };
