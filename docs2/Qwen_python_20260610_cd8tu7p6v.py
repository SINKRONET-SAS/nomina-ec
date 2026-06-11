# Crear motor de cálculo de nómina
calculo_nomina_service = """// ============================================================
// PLAN HAIKY - Motor de Cálculo de Nómina Mensual
// Ecuador 2026
// ============================================================
const db = require('../config/database');
const { s3Upload } = require('../config/s3');
const { numeroALetras } = require('../utils/numeroALetras');
const { calcularIREcuador } = require('../utils/calculoIrEcuador');

// Constantes legales Ecuador 2026
const CONSTANTS = {
  HORAS_LABORALES_MES: 240, // 8h/día * 30 días
  PORCENTAJE_IESS_PERSONAL: 0.0945, // 9.45%
  PORCENTAJE_IESS_PATRONAL: 0.1115, // 11.15%
  PORCENTAJE_VACACIONES: 1/24, // 1 mes por cada 2 años = 1/24 mensual
  DIAS_VACACIONES_MINIMO: 15, // Art. 69 Código Trabajo
  DECIMO_TERCERO_MESES: [12, 1, 11], // Dic, Ene, Nov (costa: Mar, Abr, Feb)
  DECIMO_CUARTO_MESES_COSTA: [3, 4, 2], // Mar, Abr, Feb
  DECIMO_CUARTO_MESES_SIERRA: [8, 9, 7], // Ago, Sep, Jul
};

/**
 * Calcula la nómina mensual para todos los empleados de un tenant
 * @param {string} tenantId - UUID del tenant
 * @param {number} anio - Año
 * @param {number} mes - Mes (1-12)
 * @returns {Object} Resultado del cálculo
 */
async function calcularNominaMensual(tenantId, anio, mes) {
  console.log(`[NÓMINA] Iniciando cálculo para ${mes}/${anio} - Tenant: ${tenantId}`);
  
  const client = await db.pool.connect();
  
  try {
    // Configurar contexto RLS
    await client.query('BEGIN');
    await client.query(`SET LOCAL app.current_tenant_id = $1`, [tenantId]);
    
    // 1. Obtener todos los empleados activos del tenant
    const empleadosResult = await client.query(`
      SELECT * FROM empleados 
      WHERE tenant_id = $1 AND activo = true 
      AND fecha_ingreso <= $2
      AND (fecha_salida IS NULL OR fecha_salida > $2)
    `, [tenantId, `${anio}-${String(mes).padStart(2, '0')}-${obtenerUltimoDiaMes(anio, mes)}`]);
    
    const empleados = empleadosResult.rows;
    console.log(`[NÓMINA] ${empleados.length} empleados encontrados`);
    
    const resultados = [];
    
    for (const emp of empleados) {
      try {
        const resultado = await calcularNominaEmpleado(client, emp, tenantId, anio, mes);
        resultados.push(resultado);
      } catch (err) {
        console.error(`[NÓMINA] Error calculando nómina de empleado ${emp.id}:`, err.message);
        resultados.push({
          empleadoId: emp.id,
          error: err.message,
        });
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`[NÓMINA] Cálculo completado: ${resultados.filter(r => !r.error).length} exitosos, ${resultados.filter(r => r.error).length} con errores`);
    
    return {
      success: true,
      totalEmpleados: empleados.length,
      exitosos: resultados.filter(r => !r.error).length,
      errores: resultados.filter(r => r.error).length,
      resultados,
    };
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[NÓMINA] Error fatal:', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Calcula la nómina de un empleado específico
 */
async function calcularNominaEmpleado(client, emp, tenantId, anio, mes) {
  // 1. Calcular días trabajados (proporcional si ingresó en el mes)
  const diasTrabajados = calcularDiasTrabajados(emp, anio, mes);
  
  // 2. Obtener novedades aprobadas del mes
  const novedadesResult = await client.query(`
    SELECT tipo_novedad, SUM(minutos) as total_minutos, COUNT(*) as cantidad
    FROM novedades_asistencia
    WHERE empleado_id = $1 
      AND EXTRACT(YEAR FROM fecha) = $2 
      AND EXTRACT(MONTH FROM fecha) = $3
      AND estado = 'aprobado'
    GROUP BY tipo_novedad
  `, [emp.id, anio, mes]);
  
  const novedades = {};
  novedadesResult.rows.forEach(n => {
    novedades[n.tipo_novedad] = {
      minutos: parseInt(n.total_minutos) || 0,
      cantidad: parseInt(n.cantidad) || 0,
    };
  });
  
  // 3. Obtener faltas no justificadas (para descuento)
  const faltasResult = await client.query(`
    SELECT COUNT(*) as total FROM novedades_asistencia
    WHERE empleado_id = $1 
      AND tipo_novedad = 'falta' 
      AND estado = 'aprobado'
      AND EXTRACT(YEAR FROM fecha) = $2 
      AND EXTRACT(MONTH FROM fecha) = $3
  `, [emp.id, anio, mes]);
  
  const faltasNoJustificadas = parseInt(faltasResult.rows[0].total) || 0;
  
  // 4. Calcular valor hora ordinaria
  const sueldoMensual = parseFloat(emp.sueldo_bruto_mensual);
  const valorHoraOrdinaria = sueldoMensual / CONSTANTS.HORAS_LABORALES_MES;
  const valorDiaOrdinario = valorHoraOrdinaria * 8; // jornada 8h
  
  // 5. Calcular sueldo proporcional por días trabajados
  const sueldoProporcional = (sueldoMensual / 30) * diasTrabajados;
  
  // 6. Calcular horas extras (aprobadas)
  const extras50Min = (novedades['hora_extra_50']?.minutos || 0);
  const extras100Min = (novedades['hora_extra_100']?.minutos || 0);
  const extras50Horas = extras50Min / 60;
  const extras100Horas = extras100Min / 60;
  
  const montoExtras50 = extras50Horas * valorHoraOrdinaria * 1.5;
  const montoExtras100 = extras100Horas * valorHoraOrdinaria * 2.0;
  const totalHorasExtra = montoExtras50 + montoExtras100;
  
  // 7. Descuento por faltas
  const descuentoFaltas = faltasNoJustificadas * valorDiaOrdinario;
  
  // 8. Descuento por tardías (si aplica)
  const tardiasMin = (novedades['tardia']?.minutos || 0);
  const descuentoTardias = (tardiasMin / 60) * valorHoraOrdinaria;
  
  // 9. Total ingresos
  const totalIngresos = sueldoProporcional + totalHorasExtra;
  
  // 10. Aporte IESS Personal (9.45%)
  const aporteIessPersonal = totalIngresos * CONSTANTS.PORCENTAJE_IESS_PERSONAL;
  
  // 11. Impuesto a la Renta
  const baseImponibleMensual = totalIngresos - aporteIessPersonal;
  const impuestoRenta = calcularIREcuador(baseImponibleMensual, anio, mes);
  
  // 12. Otras deducciones (anticipos, préstamos)
  const anticiposResult = await client.query(`
    SELECT COALESCE(SUM(monto), 0) as total FROM anticipos
    WHERE empleado_id = $1 AND anio = $2 AND mes = $3 AND estado = 'aprobado'
  `, [emp.id, anio, mes]).catch(() => ({ rows: [{ total: 0 }] }));
  const anticipos = parseFloat(anticiposResult.rows[0].total) || 0;
  
  // 13. Total deducciones
  const totalDeducciones = aporteIessPersonal + impuestoRenta + descuentoFaltas + descuentoTardias + anticipos;
  
  // 14. Neto a pagar
  const netoRecibir = totalIngresos - totalDeducciones;
  
  // 15. Provisiones (décimos y vacaciones)
  const decimoTercero = sueldoMensual / 12; // 1 sueldo adicional / 12 meses
  const decimoCuarto = 460 / 12; // $460 anuales / 12 meses (2026)
  const provisionVacaciones = sueldoMensual * CONSTANTS.PORCENTAJE_VACACIONES;
  
  // 16. Insertar/Actualizar nómina en BD
  const nominaResult = await client.query(`
    INSERT INTO nominas (
      tenant_id, empleado_id, anio, mes, dias_trabajados,
      sueldo_bruto, horas_extras_50, horas_extras_100,
      total_ingresos, aporte_iess_personal, impuesto_renta,
      anticipos, total_deducciones, neto_recibir,
      decimo_tercero, decimo_cuarto, provision_vacaciones
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    ON CONFLICT (tenant_id, empleado_id, anio, mes) 
    DO UPDATE SET
      dias_trabajados = EXCLUDED.dias_trabajados,
      sueldo_bruto = EXCLUDED.sueldo_bruto,
      horas_extras_50 = EXCLUDED.horas_extras_50,
      horas_extras_100 = EXCLUDED.horas_extras_100,
      total_ingresos = EXCLUDED.total_ingresos,
      aporte_iess_personal = EXCLUDED.aporte_iess_personal,
      impuesto_renta = EXCLUDED.impuesto_renta,
      anticipos = EXCLUDED.anticipos,
      total_deducciones = EXCLUDED.total_deducciones,
      neto_recibir = EXCLUDED.neto_recibir,
      decimo_tercero = EXCLUDED.decimo_tercero,
      decimo_cuarto = EXCLUDED.decimo_cuarto,
      provision_vacaciones = EXCLUDED.provision_vacaciones,
      cerrada = false
    RETURNING id
  `, [
    tenantId, emp.id, anio, mes, diasTrabajados,
    sueldoProporcional, montoExtras50, montoExtras100,
    totalIngresos, aporteIessPersonal, impuestoRenta,
    anticipos, totalDeducciones, netoRecibir,
    decimoTercero, decimoCuarto, provisionVacaciones
  ]);
  
  const nominaId = nominaResult.rows[0].id;
  
  // 17. Generar rol de pagos PDF
  const rolPdfUrl = await generarRolPagosPDF(emp, {
    anio, mes, diasTrabajados, sueldoProporcional,
    montoExtras50, montoExtras100, totalIngresos,
    aporteIessPersonal, impuestoRenta, descuentoFaltas,
    descuentoTardias, anticipos, totalDeducciones, netoRecibir,
    decimoTercero, decimoCuarto, provisionVacaciones,
  }, tenantId);
  
  // 18. Actualizar URL del PDF
  await client.query(`
    UPDATE nominas SET rol_pdf_url = $1 WHERE id = $2
  `, [rolPdfUrl, nominaId]);
  
  // 19. Registrar en documentos_legales
  await client.query(`
    INSERT INTO documentos_legales (tenant_id, empleado_id, tipo_documento, documento_url, metadata)
    VALUES ($1, $2, 'rol_pago', $3, $4)
  `, [
    tenantId, emp.id, rolPdfUrl,
    JSON.stringify({ anio, mes, neto_recibir: netoRecibir })
  ]);
  
  return {
    empleadoId: emp.id,
    nombre: `${emp.nombres} ${emp.apellidos}`,
    cedula: emp.cedula,
    nominaId,
    totalIngresos: totalIngresos.toFixed(2),
    totalDeducciones: totalDeducciones.toFixed(2),
    netoRecibir: netoRecibir.toFixed(2),
  };
}

/**
 * Calcula los días trabajados en el mes
 */
function calcularDiasTrabajados(emp, anio, mes) {
  const fechaIngreso = new Date(emp.fecha_ingreso);
  const primerDiaMes = new Date(anio, mes - 1, 1);
  const ultimoDiaMes = new Date(anio, mes, 0);
  
  if (fechaIngreso <= primerDiaMes) {
    return 30; // Trabajó todo el mes
  }
  
  if (fechaIngreso > ultimoDiaMes) {
    return 0; // Aún no ingresaba
  }
  
  // Proporcional
  const dias = ultimoDiaMes.getDate() - fechaIngreso.getDate() + 1;
  return Math.min(dias, 30);
}

/**
 * Obtiene el último día del mes
 */
function obtenerUltimoDiaMes(anio, mes) {
  return new Date(anio, mes, 0).getDate();
}

/**
 * Genera el PDF del rol de pagos
 */
async function generarRolPagosPDF(emp, datos, tenantId) {
  const pdfmake = require('pdfmake/build/pdfmake');
  const pdfFonts = require('pdfmake/build/vfs_fonts');
  
  // Definir documento
  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    content: [
      { text: 'ROL DE PAGOS', style: 'header' },
      { text: `${datos.mes}/${datos.anio}`, style: 'subheader' },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }] },
      { text: ' ', margin: [0, 10, 0, 0] },
      
      // Datos del empleado
      { text: 'DATOS DEL EMPLEADO', style: 'sectionTitle' },
      {
        columns: [
          { width: '50%', text: `Nombre: ${emp.nombres} ${emp.apellidos}` },
          { width: '50%', text: `Cédula: ${emp.cedula}` },
        ],
      },
      {
        columns: [
          { width: '50%', text: `Cargo: ${emp.cargo || 'N/A'}` },
          { width: '50%', text: `Días trabajados: ${datos.diasTrabajados}` },
        ],
      },
      { text: ' ', margin: [0, 10, 0, 0] },
      
      // Ingresos
      { text: 'INGRESOS', style: 'sectionTitle' },
      {
        columns: [
          { width: '70%', text: 'Sueldo básico' },
          { width: '30%', text: `$ ${datos.sueldoProporcional.toFixed(2)}`, alignment: 'right' },
        ],
      },
    ],
    styles: {
      header: { fontSize: 18, bold: true, alignment: 'center', margin: [0, 0, 0, 5] },
      subheader: { fontSize: 14, alignment: 'center', margin: [0, 0, 0, 10] },
      sectionTitle: { fontSize: 12, bold: true, margin: [0, 5, 0, 5] },
    },
  };
  
  // Agregar horas extras si existen
  if (datos.montoExtras50 > 0) {
    docDefinition.content.push({
      columns: [
        { width: '70%', text: 'Horas extras 50%' },
        { width: '30%', text: `$ ${datos.montoExtras50.toFixed(2)}`, alignment: 'right' },
      ],
    });
  }
  
  if (datos.montoExtras100 > 0) {
    docDefinition.content.push({
      columns: [
        { width: '70%', text: 'Horas extras 100%' },
        { width: '30%', text: `$ ${datos.montoExtras100.toFixed(2)}`, alignment: 'right' },
      ],
    });
  }
  
  // Total ingresos
  docDefinition.content.push(
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5 }] },
    {
      columns: [
        { width: '70%', text: 'TOTAL INGRESOS', style: 'sectionTitle' },
        { width: '30%', text: `$ ${datos.totalIngresos.toFixed(2)}`, alignment: 'right', bold: true },
      ],
    }
  );
  
  // Deducciones
  docDefinition.content.push(
    { text: ' ', margin: [0, 10, 0, 0] },
    { text: 'DEDUCCIONES', style: 'sectionTitle' },
    {
      columns: [
        { width: '70%', text: 'Aporte IESS Personal (9.45%)' },
        { width: '30%', text: `$ ${datos.aporteIessPersonal.toFixed(2)}`, alignment: 'right' },
      ],
    }
  );
  
  if (datos.impuestoRenta > 0) {
    docDefinition.content.push({
      columns: [
        { width: '70%', text: 'Impuesto a la Renta' },
        { width: '30%', text: `$ ${datos.impuestoRenta.toFixed(2)}`, alignment: 'right' },
      ],
    });
  }
  
  if (datos.descuentoFaltas > 0) {
    docDefinition.content.push({
      columns: [
        { width: '70%', text: 'Descuento por faltas' },
        { width: '30%', text: `$ ${datos.descuentoFaltas.toFixed(2)}`, alignment: 'right' },
      ],
    });
  }
  
  if (datos.anticipos > 0) {
    docDefinition.content.push({
      columns: [
        { width: '70%', text: 'Anticipos / Préstamos' },
        { width: '30%', text: `$ ${datos.anticipos.toFixed(2)}`, alignment: 'right' },
      ],
    });
  }
  
  // Total deducciones
  docDefinition.content.push(
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5 }] },
    {
      columns: [
        { width: '70%', text: 'TOTAL DEDUCCIONES', style: 'sectionTitle' },
        { width: '30%', text: `$ ${datos.totalDeducciones.toFixed(2)}`, alignment: 'right', bold: true },
      ],
    }
  );
  
  // Neto a recibir
  docDefinition.content.push(
    { text: ' ', margin: [0, 10, 0, 0] },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2 }] },
    {
      columns: [
        { width: '70%', text: 'NETO A RECIBIR', fontSize: 14, bold: true },
        { width: '30%', text: `$ ${datos.netoRecibir.toFixed(2)}`, alignment: 'right', fontSize: 14, bold: true },
      ],
    },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2 }] },
    { text: ' ', margin: [0, 10, 0, 0] },
    { text: `Son: ${numeroALetras(datos.netoRecibir)} DÓLARES AMERICANOS`, italics: true, fontSize: 10 },
    { text: ' ', margin: [0, 20, 0, 0] },
    
    // Firmas
    {
      columns: [
        { 
          width: '50%',
          stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 1 }] },
            { text: 'Firma del Empleado', alignment: 'center', fontSize: 10 },
            { text: `${emp.nombres} ${emp.apellidos}`, alignment: 'center', fontSize: 9 },
            { text: `C.C. ${emp.cedula}`, alignment: 'center', fontSize: 9 },
          ]
        },
        { 
          width: '50%',
          stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 1 }] },
            { text: 'Firma Autorizada', alignment: 'center', fontSize: 10 },
            { text: 'Departamento de RRHH', alignment: 'center', fontSize: 9 },
          ]
        },
      ],
    },
    { text: ' ', margin: [0, 20, 0, 0] },
    { text: 'Fecha de generación: ' + new Date().toLocaleString('es-EC'), fontSize: 8, color: '#999' },
    { text: 'Documento generado por Plan Haiky SaaS RRHH', fontSize: 8, color: '#999', alignment: 'center' },
  );
  
  // Generar PDF
  const pdfDoc = pdfmake.createPdf(docDefinition);
  
  // Obtener buffer del PDF
  const pdfBuffer = await new Promise((resolve, reject) => {
    pdfDoc.getBuffer((buffer) => {
      resolve(buffer);
    });
  });
  
  // Subir a S3
  const key = `roles-pago/${tenantId}/${emp.id}/rol_${datos.anio}_${String(datos.mes).padStart(2, '0')}.pdf`;
  const url = await s3Upload(pdfBuffer, key, 'application/pdf');
  
  return url;
}

module.exports = {
  calcularNominaMensual,
  calcularNominaEmpleado,
  CONSTANTS,
};
"""

with open('backend/src/services/calculoNominaService.js', 'w') as f:
    f.write(calculo_nomina_service)

print("✓ Motor de cálculo de nómina creado")
 # Result execute error ```