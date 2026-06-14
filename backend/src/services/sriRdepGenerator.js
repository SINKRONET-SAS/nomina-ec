// ============================================================
// Nomina-Ec - Generador de XML RDEP para SRI
// Anexo de relacion de dependencia
// ============================================================
const { XMLBuilder } = require('fast-xml-parser');
const { s3Upload } = require('../config/s3');
const db = require('../config/database');

async function generarXML_RDEP(tenantId, anio, mes) {
  const tenantResult = await db.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
  if (tenantResult.rows.length === 0) throw new Error('Tenant no encontrado');
  const tenant = tenantResult.rows[0];

  const nominasResult = await db.query(`
    SELECT e.cedula, e.nombres, e.apellidos,
      n.total_ingresos, n.aporte_iess_personal, n.impuesto_renta
    FROM nominas n
    JOIN empleados e ON n.empleado_id = e.id
    WHERE n.tenant_id = $1 AND n.anio = $2 AND n.mes = $3
    ORDER BY e.apellidos, e.nombres
  `, [tenantId, anio, mes]);

  if (nominasResult.rows.length === 0) {
    throw new Error('No hay nominas para el periodo seleccionado');
  }

  const trabajadores = nominasResult.rows.map((nomina) => ({
    trabajador: {
      tipoIdentificacion: 'C',
      identificacion: nomina.cedula,
      apellidos: nomina.apellidos,
      nombres: nomina.nombres,
      ingresosGravados: parseFloat(nomina.total_ingresos).toFixed(2),
      aportePersonalIess: parseFloat(nomina.aporte_iess_personal).toFixed(2),
      impuestoRentaRetenido: parseFloat(nomina.impuesto_renta).toFixed(2),
    },
  }));

  const rdep = {
    'rdep:anexoRelacionDependencia': {
      '@xmlns:rdep': 'http://www.sri.gob.ec/schema/RDEP',
      '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      identificacion: {
        razonSocial: tenant.razon_social,
        ruc: tenant.ruc,
        periodo: `${String(mes).padStart(2, '0')}/${anio}`,
        tipoAnexo: 'RDEP',
      },
      trabajadores,
      resumen: {
        totalTrabajadores: nominasResult.rows.length,
        totalIngresosGravados: nominasResult.rows.reduce((sum, nomina) => sum + parseFloat(nomina.total_ingresos), 0).toFixed(2),
        totalAportePersonalIess: nominasResult.rows.reduce((sum, nomina) => sum + parseFloat(nomina.aporte_iess_personal), 0).toFixed(2),
        totalImpuestoRentaRetenido: nominasResult.rows.reduce((sum, nomina) => sum + parseFloat(nomina.impuesto_renta), 0).toFixed(2),
      },
    },
  };

  const builder = new XMLBuilder({
    format: true,
    ignoreAttributes: false,
    attributeNamePrefix: '@',
    textNodeName: '#text',
  });

  const xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n' + builder.build(rdep);
  const key = `reportes/${tenantId}/sri/RDEP_${anio}${String(mes).padStart(2, '0')}.xml`;
  const url = await s3Upload(Buffer.from(xmlString, 'utf8'), key, 'application/xml');

  console.log(`[RDEP] XML generado para ${tenantId} - ${mes}/${anio}: ${nominasResult.rows.length} empleados`);

  return { url, totalEmpleados: nominasResult.rows.length, xmlString };
}

module.exports = { generarXML_RDEP };
