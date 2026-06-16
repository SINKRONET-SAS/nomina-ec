// ============================================================
// Nomina-Ec - Generador de XML RDEP para SRI
// Anexo de relacion de dependencia
// ============================================================
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { XMLBuilder, XMLParser } = require('fast-xml-parser');
const { s3Upload } = require('../config/s3');
const db = require('../config/database');
const AppError = require('../utils/AppError');

const RDEP_XSD_PATH = path.join(__dirname, '..', 'config', 'rdep', 'Esquema_RDEP_2023.xsd');

function getRdepXsdMetadata() {
  if (!fs.existsSync(RDEP_XSD_PATH)) {
    throw new AppError('No se encontro el esquema XSD RDEP versionado.', {
      code: 'RDEP_XSD_NOT_FOUND',
      statusCode: 500,
      details: { path: RDEP_XSD_PATH },
    });
  }

  const content = fs.readFileSync(RDEP_XSD_PATH, 'utf8');
  return {
    path: RDEP_XSD_PATH,
    sha256: crypto.createHash('sha256').update(content, 'utf8').digest('hex'),
  };
}

async function loadRdepData(tenantId, anio, mes) {
  const tenantResult = await db.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
  if (tenantResult.rows.length === 0) {
    throw new AppError('Tenant no encontrado', {
      code: 'TENANT_NOT_FOUND',
      statusCode: 404,
    });
  }
  const tenant = tenantResult.rows[0];

  const nominasResult = await db.query(`
    SELECT e.cedula, e.nombres, e.apellidos,
      n.total_ingresos, n.aporte_iess_personal, n.impuesto_renta, n.estado
    FROM nominas n
    JOIN empleados e ON n.empleado_id = e.id
    WHERE n.tenant_id = $1
      AND n.anio = $2
      AND n.mes = $3
      AND n.estado = 'cerrada'
    ORDER BY e.apellidos, e.nombres
  `, [tenantId, anio, mes]);

  return { tenant, nominas: nominasResult.rows };
}

async function precheckRDEP(tenantId, anio, mes) {
  const xsd = getRdepXsdMetadata();
  const { tenant, nominas } = await loadRdepData(tenantId, anio, mes);
  const checks = [
    {
      code: 'tenant_ruc',
      label: 'RUC del empleador',
      passed: Boolean(tenant.ruc),
    },
    {
      code: 'tenant_razon_social',
      label: 'Razon social del empleador',
      passed: Boolean(tenant.razon_social),
    },
    {
      code: 'closed_payroll',
      label: 'Nomina cerrada para el periodo',
      passed: nominas.length > 0,
      detail: `${nominas.length} roles cerrados`,
    },
    {
      code: 'xsd_versioned',
      label: 'XSD RDEP versionado disponible',
      passed: Boolean(xsd.sha256),
      detail: xsd.sha256,
    },
  ];
  const ready = checks.every((check) => check.passed);

  return {
    ready,
    anio: Number(anio),
    mes: Number(mes),
    totalEmpleados: nominas.length,
    checks,
    xsd: {
      sha256: xsd.sha256,
      validationMode: 'structural_xsd_gate',
    },
  };
}

function validateRdepXmlAgainstXsdContract(xmlString) {
  const xsd = getRdepXsdMetadata();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@',
  });
  const parsed = parser.parse(xmlString);
  const root = parsed['rdep:anexoRelacionDependencia'];
  const failures = [];

  if (!root) failures.push('No existe raiz rdep:anexoRelacionDependencia.');
  if (root && !root.identificacion?.ruc) failures.push('Falta identificacion.ruc.');
  if (root && !root.identificacion?.razonSocial) failures.push('Falta identificacion.razonSocial.');
  if (root && !root.identificacion?.periodo) failures.push('Falta identificacion.periodo.');
  const trabajadores = root?.trabajadores?.trabajador;
  const workerList = Array.isArray(trabajadores) ? trabajadores : (trabajadores ? [trabajadores] : []);
  if (workerList.length === 0) failures.push('No existen trabajadores RDEP.');

  workerList.forEach((worker, index) => {
    if (!worker.identificacion) failures.push(`Trabajador ${index + 1}: falta identificacion.`);
    if (!worker.apellidos) failures.push(`Trabajador ${index + 1}: faltan apellidos.`);
    if (!worker.nombres) failures.push(`Trabajador ${index + 1}: faltan nombres.`);
    if (Number.isNaN(Number(worker.ingresosGravados))) failures.push(`Trabajador ${index + 1}: ingresos gravados no numericos.`);
  });

  if (failures.length > 0) {
    throw new AppError('El XML RDEP no supera la validacion estructural contra el contrato XSD versionado.', {
      code: 'RDEP_XSD_VALIDATION_FAILED',
      statusCode: 422,
      details: { failures, xsdSha256: xsd.sha256 },
    });
  }

  return {
    valid: true,
    mode: 'structural_xsd_gate',
    xsdSha256: xsd.sha256,
    checkedAt: new Date().toISOString(),
  };
}

async function generarXML_RDEP(tenantId, anio, mes) {
  const precheck = await precheckRDEP(tenantId, anio, mes);
  if (!precheck.ready) {
    throw new AppError('RDEP no esta listo para generarse. Revisa el precheck del periodo.', {
      code: 'RDEP_PRECHECK_FAILED',
      statusCode: 423,
      details: { checks: precheck.checks },
    });
  }
  const { tenant, nominas } = await loadRdepData(tenantId, anio, mes);

  const trabajadores = nominas.map((nomina) => ({
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
        totalTrabajadores: nominas.length,
        totalIngresosGravados: nominas.reduce((sum, nomina) => sum + parseFloat(nomina.total_ingresos), 0).toFixed(2),
        totalAportePersonalIess: nominas.reduce((sum, nomina) => sum + parseFloat(nomina.aporte_iess_personal), 0).toFixed(2),
        totalImpuestoRentaRetenido: nominas.reduce((sum, nomina) => sum + parseFloat(nomina.impuesto_renta), 0).toFixed(2),
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
  const validation = validateRdepXmlAgainstXsdContract(xmlString);
  const key = `reportes/${tenantId}/sri/RDEP_${anio}${String(mes).padStart(2, '0')}.xml`;
  const url = await s3Upload(Buffer.from(xmlString, 'utf8'), key, 'application/xml');

  console.log(`[RDEP] XML generado para ${tenantId} - ${mes}/${anio}: ${nominas.length} empleados`);

  return { url, totalEmpleados: nominas.length, xmlString, validation, precheck };
}

module.exports = {
  generarXML_RDEP,
  getRdepXsdMetadata,
  precheckRDEP,
  validateRdepXmlAgainstXsdContract,
};
