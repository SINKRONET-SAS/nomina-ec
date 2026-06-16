# Crear generador de XML ATS para SRI
sri_ats_generator = '''// ============================================================
// PLAN HAIKY - Generador de XML ATS para SRI
// Anexo Transaccional Simplificado
// ============================================================
const { XMLBuilder } = require('fast-xml-parser');
const { s3Upload } = require('../config/s3');
const db = require('../config/database');

/**
 * Genera el XML del ATS para declaración al SRI
 */
async function generarXML_ATS(tenantId, anio, mes) {
  // 1. Obtener datos del tenant
  const tenantResult = await db.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
  if (tenantResult.rows.length === 0) throw new Error('Tenant no encontrado');
  const tenant = tenantResult.rows[0];
  
  // 2. Obtener nóminas del período
  const nominasResult = await db.query(`
    SELECT e.cedula, e.nombres, e.apellidos, 
      n.total_ingresos, n.aporte_iess_personal, n.impuesto_renta
    FROM nominas n
    JOIN empleados e ON n.empleado_id = e.id
    WHERE n.tenant_id = $1 AND n.anio = $2 AND n.mes = $3
    ORDER BY e.apellidos, e.nombres
  `, [tenantId, anio, mes]);
  
  if (nominasResult.rows.length === 0) {
    throw new Error('No hay nóminas para el período seleccionado');
  }
  
  // 3. Construir estructura XML según esquema SRI
  const detalleEmpleados = nominasResult.rows.map(n => ({
    detalleEmpleado: {
      tipoIdentificacion: 'C', // Cédula
      identificacion: n.cedula,
      apellidosNombres: `${n.apellidos} ${n.nombres}`,
      tipoRelacion: 'REL_DEPEND', // Relación de dependencia
      ingresosBrutos: parseFloat(n.total_ingresos).toFixed(2),
      aportePersonal: parseFloat(n.aporte_iess_personal).toFixed(2),
      impuestoRentRetenido: parseFloat(n.impuesto_renta).toFixed(2),
    }
  }));
  
  const ats = {
    'ats:ats': {
      '@xmlns:ats': 'http://www.sri.gob.ec/schema/ATS',
      '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      identificacion: {
        razonSocial: tenant.razon_social,
        ruc: tenant.ruc,
        periodo: `${String(mes).padStart(2, '0')}/${anio}`,
        tipoDeclaracion: 'ATS',
      },
      detalleEmpleados: detalleEmpleados,
      resumen: {
        totalEmpleados: nominasResult.rows.length,
        totalIngresos: nominasResult.rows.reduce((sum, n) => sum + parseFloat(n.total_ingresos), 0).toFixed(2),
        totalAportePersonal: nominasResult.rows.reduce((sum, n) => sum + parseFloat(n.aporte_iess_personal), 0).toFixed(2),
        totalImpuestoRenta: nominasResult.rows.reduce((sum, n) => sum + parseFloat(n.impuesto_renta), 0).toFixed(2),
      }
    }
  };
  
  // 4. Generar XML
  const builder = new XMLBuilder({
    format: true,
    ignoreAttributes: false,
    attributeNamePrefix: '@',
    textNodeName: '#text',
  });
  
  const xmlString = '<?xml version="1.0" encoding="UTF-8"?>\\n' + builder.build(ats);
  
  // 5. Subir a S3
  const key = `reportes/${tenantId}/sri/ATS_${anio}${String(mes).padStart(2, '0')}.xml`;
  const url = await s3Upload(Buffer.from(xmlString, 'utf8'), key, 'application/xml');
  
  console.log(`[ATS] XML generado para ${tenantId} - ${mes}/${anio}: ${nominasResult.rows.length} empleados`);
  
  return { url, totalEmpleados: nominasResult.rows.length, xmlString };
}

module.exports = { generarXML_ATS };
'''

with open('backend/src/services/sriAtsGenerator.js', 'w') as f:
    f.write(sri_ats_generator)

# Crear generador de XML SAE para IESS
iess_sae_generator = '''// ============================================================
// PLAN HAIKY - Generador de XML SAE para IESS
// Sistema de Aviso de Entrada/Salida
// ============================================================
const { XMLBuilder } = require('fast-xml-parser');
const { s3Upload } = require('../config/s3');
const db = require('../config/database');

/**
 * Genera el XML del SAE para declaración al IESS
 */
async function generarXML_SAE(tenantId, anio, mes) {
  // 1. Obtener datos del tenant
  const tenantResult = await db.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
  if (tenantResult.rows.length === 0) throw new Error('Tenant no encontrado');
  const tenant = tenantResult.rows[0];
  
  // 2. Obtener nóminas del período
  const nominasResult = await db.query(`
    SELECT e.cedula, e.nombres, e.apellidos, e.fecha_ingreso,
      n.total_ingresos, n.aporte_iess_personal
    FROM nominas n
    JOIN empleados e ON n.empleado_id = e.id
    WHERE n.tenant_id = $1 AND n.anio = $2 AND n.mes = $3
    ORDER BY e.apellidos, e.nombres
  `, [tenantId, anio, mes]);
  
  if (nominasResult.rows.length === 0) {
    throw new Error('No hay nóminas para el período seleccionado');
  }
  
  // 3. Construir estructura XML según esquema IESS
  const detalleAportantes = nominasResult.rows.map(n => ({
    aportante: {
      tipoIdentificacion: 'CED',
      identificacion: n.cedula,
      apellidos: n.apellidos,
      nombres: n.nombres,
      fechaIngreso: new Date(n.fecha_ingreso).toISOString().split('T')[0],
      sueldo: parseFloat(n.total_ingresos).toFixed(2),
      aportePersonal: parseFloat(n.aporte_iess_personal).toFixed(2),
      aportePatronal: (parseFloat(n.total_ingresos) * 0.1115).toFixed(2),
    }
  }));
  
  const sae = {
    'sae:planilla': {
      '@xmlns:sae': 'http://www.iess.gob.ec/schema/SAE',
      '@version': '2.0',
      empleador: {
        ruc: tenant.ruc,
        razonSocial: tenant.razon_social,
        periodo: `${String(mes).padStart(2, '0')}/${anio}`,
        tipoPlanilla: 'PLANILLA_MENSUAL',
      },
      detalleAportantes: detalleAportantes,
      totales: {
        totalAportantes: nominasResult.rows.length,
        totalSalarios: nominasResult.rows.reduce((sum, n) => sum + parseFloat(n.total_ingresos), 0).toFixed(2),
        totalAportePersonal: nominasResult.rows.reduce((sum, n) => sum + parseFloat(n.aporte_iess_personal), 0).toFixed(2),
        totalAportePatronal: nominasResult.rows.reduce((sum, n) => sum + (parseFloat(n.total_ingresos) * 0.1115), 0).toFixed(2),
        totalAporte: nominasResult.rows.reduce((sum, n) => sum + parseFloat(n.aporte_iess_personal) + (parseFloat(n.total_ingresos) * 0.1115), 0).toFixed(2),
      }
    }
  };
  
  // 4. Generar XML
  const builder = new XMLBuilder({
    format: true,
    ignoreAttributes: false,
    attributeNamePrefix: '@',
  });
  
  const xmlString = '<?xml version="1.0" encoding="UTF-8"?>\\n' + builder.build(sae);
  
  // 5. Subir a S3
  const key = `reportes/${tenantId}/iess/SAE_${anio}${String(mes).padStart(2, '0')}.xml`;
  const url = await s3Upload(Buffer.from(xmlString, 'utf8'), key, 'application/xml');
  
  console.log(`[SAE] XML generado para ${tenantId} - ${mes}/${anio}: ${nominasResult.rows.length} empleados`);
  
  return { url, totalEmpleados: nominasResult.rows.length, xmlString };
}

module.exports = { generarXML_SAE };
'''

with open('backend/src/services/iessSaeGenerator.js', 'w') as f:
    f.write(iess_sae_generator)

print("✓ Generadores de ATS y SAE creados")
 # Result 
✓ Generadores de ATS y SAE creados
