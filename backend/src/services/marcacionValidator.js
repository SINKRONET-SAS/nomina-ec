// ============================================================
// PLAN HAIKY - Validador de Marcaciones (Foto + GPS)
// ============================================================
const db = require('../config/database');
const { s3Upload } = require('../config/s3');

/**
 * Valida y registra una marcaciÃ³n
 * @param {Object} params - ParÃ¡metros de la marcacion
 * @returns {Object} Resultado de la validaciÃ³n
 */
async function validarMarcacion({ empleadoId, tenantId, tipo, lat, lng, fotoBase64, ip }) {
  // 1. Validar geolocalizaciÃ³n (REGLA IRRENUNCIABLE)
  if (!lat || !lng) {
    throw new Error('VIOLACION_REGLA_IRRENUNCIABLE: La geolocalizaciÃ³n es obligatoria para registrar marcaciones.');
  }
  
  // 2. Obtener configuraciÃ³n del tenant
  const tenantResult = await db.query(
    'SELECT configuracion, ubicacion_lat, ubicacion_lng FROM tenants WHERE id = $1',
    [tenantId]
  );
  
  if (tenantResult.rows.length === 0) {
    throw new Error('Tenant no encontrado');
  }
  
  const tenant = tenantResult.rows[0];
  const radioPermitido = tenant.configuracion?.radio_permitido_metros || 100;
  
  // 3. Calcular distancia (Haversine)
  let distancia = 0;
  let esValida = true;
  
  if (tenant.ubicacion_lat && tenant.ubicacion_lng) {
    distancia = calcularDistanciaHaversine(
      tenant.ubicacion_lat, tenant.ubicacion_lng,
      lat, lng
    );
    
    if (distancia > radioPermitido) {
      esValida = false;
      console.log(`[MARCACION] Fuera de perÃ­metro: ${distancia.toFixed(0)}m (mÃ¡x: ${radioPermitido}m)`);
    }
  }
  
  // 4. Subir foto a S3
  let fotoUrl = null;
  if (fotoBase64) {
    const fotoBuffer = Buffer.from(fotoBase64, 'base64');
    const key = `marcaciones/${tenantId}/${empleadoId}/${Date.now()}.jpg`;
    fotoUrl = await s3Upload(fotoBuffer, key, 'image/jpeg');
  }
  
  // 5. Validar secuencia (REGLA IRRENUNCIABLE: No dos inicios sin fin)
  if (tipo === 'inicio_jornada') {
    const ultima = await db.query(`
      SELECT tipo_marcacion FROM marcaciones 
      WHERE empleado_id = $1 AND DATE(timestamp) = CURRENT_DATE
      ORDER BY timestamp DESC LIMIT 1
    `, [empleadoId]);
    
    if (ultima.rows.length > 0 && ultima.rows[0].tipo_marcacion === 'inicio_jornada') {
      throw new Error('VIOLACION_REGLA_IRRENUNCIABLE: No se puede registrar un nuevo inicio sin un fin previo.');
    }
  }
  
  // 6. Registrar marcaciÃ³n (SIEMPRE, incluso si es invÃ¡lida)
  const result = await db.query(`
    INSERT INTO marcaciones (empleado_id, tenant_id, tipo_marcacion, timestamp, 
      foto_url, geolocalizacion, ip_address, es_valida, distancia_metros)
    VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8)
    RETURNING id
  `, [empleadoId, tenantId, tipo, fotoUrl, 
      JSON.stringify({ lat, lng, precision: 10 }), ip, esValida, distancia]);
  
  const marcacionId = result.rows[0].id;
  
  // 7. Generar novedad automÃ¡tica si es tardÃ­a
  if (tipo === 'inicio_jornada' && esValida) {
    await generarNovedadTardia(empleadoId, tenantId, lat, lng);
  }
  
  return {
    success: true,
    marcacionId,
    esValida,
    distancia: distancia.toFixed(0),
    fotoUrl,
  };
}

/**
 * Calcula la distancia entre dos puntos GPS (FÃ³rmula de Haversine)
 */
function calcularDistanciaHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radio de la Tierra en metros
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
}

/**
 * Genera novedad de tardÃ­a si aplica
 */
async function generarNovedadTardia(empleadoId, tenantId, lat, lng) {
  // Obtener horario del tenant
  const tenant = await db.query('SELECT configuracion FROM tenants WHERE id = $1', [tenantId]);
  const config = tenant.rows[0]?.configuracion || {};
  const horaInicio = config.horario_laboral?.inicio || '08:00';
  const tolerancia = config.tolerancia_minutos_tardia || 5;
  
  // Obtener marcaciÃ³n mÃ¡s reciente
  const marcacion = await db.query(`
    SELECT timestamp FROM marcaciones 
    WHERE empleado_id = $1 AND tipo_marcacion = 'inicio_jornada'
    ORDER BY timestamp DESC LIMIT 1
  `, [empleadoId]);
  
  if (marcacion.rows.length === 0) return;
  
  const fechaMarcacion = new Date(marcacion.rows[0].timestamp);
  const [h, m] = horaInicio.split(':').map(Number);
  const horaLimite = new Date(fechaMarcacion);
  horaLimite.setHours(h, m + tolerancia, 0, 0);
  
  if (fechaMarcacion > horaLimite) {
    const minutosTardia = Math.round((fechaMarcacion - horaLimite) / 60000);
    
    await db.query(`
      INSERT INTO novedades_asistencia (empleado_id, tenant_id, fecha, tipo_novedad, minutos, estado)
      VALUES ($1, $2, CURRENT_DATE, 'tardia', $3, 'pendiente')
    `, [empleadoId, tenantId, minutosTardia]);
    
    console.log(`[NOVEDAD] TardÃ­a de ${minutosTardia} min registrada para empleado ${empleadoId}`);
  }
}

module.exports = { validarMarcacion, calcularDistanciaHaversine };

