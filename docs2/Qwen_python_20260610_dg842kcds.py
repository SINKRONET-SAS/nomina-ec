# Crear validador de marcaciones con GPS
marcacion_validator = '''// ============================================================
// PLAN HAIKY - Validador de Marcaciones (Foto + GPS)
// ============================================================
const db = require('../config/database');
const { s3Upload } = require('../config/s3');

/**
 * Valida y registra una marcación
 * @param {Object} params - Parámetros de la marcacion
 * @returns {Object} Resultado de la validación
 */
async function validarMarcacion({ empleadoId, tenantId, tipo, lat, lng, fotoBase64, ip }) {
  // 1. Validar geolocalización (REGLA IRRENUNCIABLE)
  if (!lat || !lng) {
    throw new Error('VIOLACION_REGLA_IRRENUNCIABLE: La geolocalización es obligatoria para registrar marcaciones.');
  }
  
  // 2. Obtener configuración del tenant
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
      console.log(`[MARCACION] Fuera de perímetro: ${distancia.toFixed(0)}m (máx: ${radioPermitido}m)`);
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
  
  // 6. Registrar marcación (SIEMPRE, incluso si es inválida)
  const result = await db.query(`
    INSERT INTO marcaciones (empleado_id, tenant_id, tipo_marcacion, timestamp, 
      foto_url, geolocalizacion, ip_address, es_valida, distancia_metros)
    VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8)
    RETURNING id
  `, [empleadoId, tenantId, tipo, fotoUrl, 
      JSON.stringify({ lat, lng, precision: 10 }), ip, esValida, distancia]);
  
  const marcacionId = result.rows[0].id;
  
  // 7. Generar novedad automática si es tardía
  if (tipo === 'inicio_jornada' && esValida) {
    await generarNovedadTardía(empleadoId, tenantId, lat, lng);
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
 * Calcula la distancia entre dos puntos GPS (Fórmula de Haversine)
 */
function calcularDistanciaHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
}

/**
 * Genera novedad de tardía si aplica
 */
async function generarNovedadTardía(empleadoId, tenantId, lat, lng) {
  // Obtener horario del tenant
  const tenant = await db.query('SELECT configuracion FROM tenants WHERE id = $1', [tenantId]);
  const config = tenant.rows[0]?.configuracion || {};
  const horaInicio = config.horario_laboral?.inicio || '08:00';
  const tolerancia = config.tolerancia_minutos_tardia || 5;
  
  // Obtener marcación más reciente
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
    
    console.log(`[NOVEDAD] Tardía de ${minutosTardia} min registrada para empleado ${empleadoId}`);
  }
}

module.exports = { validarMarcacion, calcularDistanciaHaversine };
'''

with open('backend/src/services/marcacionValidator.js', 'w') as f:
    f.write(marcacion_validator)

# Crear generador de documentos legales (templates)
template_generator = '''// ============================================================
// PLAN HAIKY - Generador de Documentos Legales
// Contratos, Actas de Finiquito, Roles de Pago
// ============================================================
const fs = require('fs');
const path = require('path');
const { s3Upload } = require('../config/s3');
const db = require('../config/database');

/**
 * Genera un contrato de trabajo
 */
async function generarContrato(empleado, tenant, tipoContrato) {
  // Datos para el template
  const data = {
    fecha: new Date().toLocaleDateString('es-EC'),
    empresa_razon_social: tenant.razon_social,
    empresa_ruc: tenant.ruc,
    empresa_direccion: tenant.direccion || '',
    empleado_nombre: `${empleado.nombres} ${empleado.apellidos}`,
    empleado_cedula: empleado.cedula,
    empleado_domicilio: empleado.direccion_domicilio || '',
    cargo: empleado.cargo || 'No especificado',
    sueldo_numeros: parseFloat(empleado.sueldo_bruto_mensual).toFixed(2),
    sueldo_letras: numeroALetras(parseFloat(empleado.sueldo_bruto_mensual)),
    fecha_inicio: new Date(empleado.fecha_ingreso).toLocaleDateString('es-EC'),
    tipo_contrato: tipoContrato.toUpperCase(),
    jornada: tenant.configuracion?.horario_laboral?.inicio + ' a ' + tenant.configuracion?.horario_laboral?.fin || '08:00 a 17:00',
    clausula_irrenunciable: 'El trabajador no podrá renunciar a los derechos establecidos en el Código del Trabajo, siendo nula cualquier estipulación en contrario conforme al Art. 326 de la Constitución de la República del Ecuador.',
  };
  
  // Generar contenido HTML del contrato
  const html = generarHTMLContrato(data);
  
  // Convertir a PDF (usando pdfmake)
  const pdfBuffer = await generarPDFDesdeHTML(html);
  
  // Subir a S3
  const key = `contratos/${tenant.id}/${empleado.id}/contrato_${tipoContrato}_${Date.now()}.pdf`;
  const url = await s3Upload(pdfBuffer, key, 'application/pdf');
  
  // Guardar en BD
  await db.query(`
    INSERT INTO documentos_legales (tenant_id, empleado_id, tipo_documento, documento_url, metadata)
    VALUES ($1, $2, $3, $4, $5)
  `, [tenant.id, empleado.id, `contrato_${tipoContrato}`, url, JSON.stringify(data)]);
  
  return { url, data };
}

/**
 * Genera el HTML del contrato
 */
function generarHTMLContrato(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Contrato de Trabajo - ${data.empleado_nombre}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.6; margin: 40px; }
    h1 { text-align: center; font-size: 16pt; }
    h2 { font-size: 14pt; margin-top: 20px; }
    .clausula { margin: 15px 0; text-align: justify; }
    .firma { margin-top: 60px; }
    .firma-linea { border-top: 1px solid #000; width: 250px; margin-top: 50px; text-align: center; }
    .irrenunciable { background: #f0f0f0; padding: 10px; border-left: 4px solid #333; font-style: italic; }
  </style>
</head>
<body>
  <h1>CONTRATO DE TRABAJO ${data.tipo_contrato}</h1>
  
  <p>En la ciudad de Quito, Distrito Metropolitano, a los ${data.fecha}, entre el Sr./Sra. <strong>${data.empresa_razon_social}</strong>, con RUC ${data.empresa_ruc}, en adelante "EL EMPLEADOR", y el Sr./Sra. <strong>${data.empleado_nombre}</strong>, con cédula de ciudadanía ${data.empleado_cedula}, en adelante "EL TRABAJADOR", se ha celebrado el presente contrato de trabajo, que se regirá por las siguientes cláusulas:</p>
  
  <h2>PRIMERA.- OBJETO</h2>
  <p class="clausula">EL TRABAJADOR prestará sus servicios personales a EL EMPLEADOR, desempeñando el cargo de <strong>${data.cargo}</strong>, cumpliendo las funciones inherentes al mismo.</p>
  
  <h2>SEGUNDA.- DURACIÓN</h2>
  <p class="clausula">El presente contrato es de tipo ${data.tipo_contrato}, e inicia el ${data.fecha_inicio}.</p>
  
  <h2>TERCERA.- JORNADA DE TRABAJO</h2>
  <p class="clausula">EL TRABAJADOR cumplirá una jornada de ${data.jornada}, de lunes a viernes, con un descanso de una hora para la alimentación.</p>
  
  <h2>CUARTA.- REMUNERACIÓN</h2>
  <p class="clausula">EL EMPLEADOR pagará a EL TRABAJADOR la remuneración mensual uniforme de <strong>USD ${data.sueldo_numeros}</strong> (${data.sueldo_letras} DÓLARES DE LOS ESTADOS UNIDOS DE AMÉRICA), pagadera en la fecha que la empresa establezca para el efecto.</p>
  
  <h2>QUINTA.- OBLIGACIONES</h2>
  <p class="clausula">EL TRABAJADOR se obliga a cumplir con el reglamento interno de la empresa, así como con las disposiciones del Código del Trabajo y sus reglamentos.</p>
  
  <h2>CLÁUSULA IRRENUNCIABLE</h2>
  <p class="irrenunciable">${data.clausula_irrenunciable}</p>
  
  <p>Y en prueba de conformidad, las partes firman el presente contrato en dos ejemplares de un mismo tenor.</p>
  
  <div class="firma">
    <div class="firma-linea">
      <strong>${data.empresa_razon_social}</strong><br>
      EL EMPLEADOR<br>
      RUC: ${data.empresa_ruc}
    </div>
  </div>
  
  <div class="firma">
    <div class="firma-linea">
      <strong>${data.empleado_nombre}</strong><br>
      EL TRABAJADOR<br>
      C.C.: ${data.empleado_cedula}
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Genera PDF desde HTML (simplificado)
 */
async function generarPDFDesdeHTML(html) {
  // En producción usar puppeteer o wkhtmltopdf
  // Aquí generamos un PDF básico con pdfmake
  const pdfmake = require('pdfmake/build/pdfmake');
  
  const docDefinition = {
    content: [
      { text: 'CONTRATO DE TRABAJO', style: 'header' },
      { text: 'Documento generado por Plan Haiky SaaS', fontSize: 8, color: '#999' },
      { text: ' ' },
      { text: 'Ver documento HTML original para contenido completo.', italics: true },
    ],
    styles: {
      header: { fontSize: 18, bold: true, alignment: 'center' },
    },
  };
  
  return new Promise((resolve) => {
    pdfmake.createPdf(docDefinition).getBuffer((buffer) => {
      resolve(buffer);
    });
  });
}

/**
 * Convierte número a letras (simplificado)
 */
function numeroALetras(num) {
  const unidades = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  const decenas = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
  
  if (num === 0) return 'cero';
  
  let resultado = '';
  const entero = Math.floor(num);
  
  if (entero >= 1000000) {
    const millones = Math.floor(entero / 1000000);
    resultado += (millones === 1 ? 'un millón' : numeroALetras(millones) + ' millones') + ' ';
  }
  
  const resto = entero % 1000000;
  if (resto >= 1000) {
    const miles = Math.floor(resto / 1000);
    resultado += (miles === 1 ? 'mil' : numeroALetras(miles) + ' mil') + ' ';
  }
  
  const restante = resto % 1000;
  if (restante >= 100) {
    resultado += centenas[Math.floor(restante / 100)] + ' ';
  }
  
  const dec = restante % 100;
  if (dec >= 10 && dec < 20) {
    const especiales = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciseis', 'diecisiete', 'dieciocho', 'diecinueve'];
    resultado += especiales[dec - 10];
  } else {
    resultado += decenas[Math.floor(dec / 10)];
    if (dec % 10 > 0) resultado += ' y ' + unidades[dec % 10];
  }
  
  return resultado.trim() || 'cero';
}

module.exports = { generarContrato, numeroALetras };
'''

with open('backend/src/services/templateGenerator.js', 'w') as f:
    f.write(template_generator)

print("✓ Validador de marcaciones y generador de templates creados")
 # Result 
✓ Validador de marcaciones y generador de templates creados
