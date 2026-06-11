// ============================================================
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
    clausula_irrenunciable: 'El trabajador no podrÃ¡ renunciar a los derechos establecidos en el CÃ³digo del Trabajo, siendo nula cualquier estipulaciÃ³n en contrario conforme al Art. 326 de la ConstituciÃ³n de la RepÃºblica del Ecuador.',
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
  
  <p>En la ciudad de Quito, Distrito Metropolitano, a los ${data.fecha}, entre el Sr./Sra. <strong>${data.empresa_razon_social}</strong>, con RUC ${data.empresa_ruc}, en adelante "EL EMPLEADOR", y el Sr./Sra. <strong>${data.empleado_nombre}</strong>, con cÃ©dula de ciudadanÃ­a ${data.empleado_cedula}, en adelante "EL TRABAJADOR", se ha celebrado el presente contrato de trabajo, que se regirÃ¡ por las siguientes clÃ¡usulas:</p>
  
  <h2>PRIMERA.- OBJETO</h2>
  <p class="clausula">EL TRABAJADOR prestarÃ¡ sus servicios personales a EL EMPLEADOR, desempeÃ±ando el cargo de <strong>${data.cargo}</strong>, cumpliendo las funciones inherentes al mismo.</p>
  
  <h2>SEGUNDA.- DURACIÃ“N</h2>
  <p class="clausula">El presente contrato es de tipo ${data.tipo_contrato}, e inicia el ${data.fecha_inicio}.</p>
  
  <h2>TERCERA.- JORNADA DE TRABAJO</h2>
  <p class="clausula">EL TRABAJADOR cumplirÃ¡ una jornada de ${data.jornada}, de lunes a viernes, con un descanso de una hora para la alimentaciÃ³n.</p>
  
  <h2>CUARTA.- REMUNERACIÃ“N</h2>
  <p class="clausula">EL EMPLEADOR pagarÃ¡ a EL TRABAJADOR la remuneraciÃ³n mensual uniforme de <strong>USD ${data.sueldo_numeros}</strong> (${data.sueldo_letras} DÃ“LARES DE LOS ESTADOS UNIDOS DE AMÃ‰RICA), pagadera en la fecha que la empresa establezca para el efecto.</p>
  
  <h2>QUINTA.- OBLIGACIONES</h2>
  <p class="clausula">EL TRABAJADOR se obliga a cumplir con el reglamento interno de la empresa, asÃ­ como con las disposiciones del CÃ³digo del Trabajo y sus reglamentos.</p>
  
  <h2>CLÃUSULA IRRENUNCIABLE</h2>
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
  // En producciÃ³n usar puppeteer o wkhtmltopdf
  // AquÃ­ generamos un PDF bÃ¡sico con pdfmake
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
 * Convierte nÃºmero a letras (simplificado)
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
    resultado += (millones === 1 ? 'un millÃ³n' : numeroALetras(millones) + ' millones') + ' ';
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

