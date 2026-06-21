// ============================================================
// Nomina-Ec - Generador de XML RDEP para SRI
// Anexo de relacion de dependencia
// ============================================================
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const libxml = require('libxmljs2');
const { XMLBuilder, XMLParser } = require('fast-xml-parser');
const { s3Upload } = require('../config/s3');
const db = require('../config/database');
const AppError = require('../utils/AppError');

const RDEP_XSD_PATH = path.join(__dirname, '..', 'config', 'rdep', 'Esquema_RDEP_2023.xsd');
const XSD_VALIDATION_MODE = 'xsd_schema_validation';

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function readElementName(node) {
  return node?.['@_name'] || node?.['@name'];
}

function readElementType(node) {
  return node?.['@_type'] || node?.['@type'];
}

function readMinOccurs(node) {
  return node?.['@_minOccurs'] || node?.['@minOccurs'] || '1';
}

function getRdepXsdContract(content) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });
  const schema = parser.parse(content)['xs:schema'];
  const complexTypes = new Map();

  asArray(schema?.['xs:complexType']).forEach((typeNode) => {
    const name = typeNode['@_name'];
    if (name) complexTypes.set(name, typeNode);
  });

  const rootElement = asArray(schema?.['xs:element']).find((element) => readElementName(element) === 'rdep');
  if (!rootElement) {
    throw new AppError('El XSD RDEP versionado no declara la raiz esperada rdep.', {
      code: 'RDEP_XSD_ROOT_NOT_FOUND',
      statusCode: 500,
    });
  }

  return {
    rootName: readElementName(rootElement),
    rootType: readElementType(rootElement),
    complexTypes,
  };
}

let xsdDocCache = null;

function getRdepXsdMetadata() {
  if (!fs.existsSync(RDEP_XSD_PATH)) {
    throw new AppError('No se encontro el esquema XSD RDEP versionado.', {
      code: 'RDEP_XSD_NOT_FOUND',
      statusCode: 500,
      details: { path: RDEP_XSD_PATH },
    });
  }

  const content = fs.readFileSync(RDEP_XSD_PATH, 'utf8');
  const contract = getRdepXsdContract(content);
  return {
    path: RDEP_XSD_PATH,
    content,
    sha256: crypto.createHash('sha256').update(content, 'utf8').digest('hex'),
    rootName: contract.rootName,
    rootType: contract.rootType,
    validationMode: XSD_VALIDATION_MODE,
  };
}

function getRdepXsdDoc() {
  if (xsdDocCache) return xsdDocCache;
  const xsd = getRdepXsdMetadata();
  xsdDocCache = libxml.parseXml(xsd.content, { baseUrl: RDEP_XSD_PATH });
  return xsdDocCache;
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
      rootName: xsd.rootName,
      validationMode: xsd.validationMode,
    },
  };
}

function validateRdepXmlAgainstXsdContract(xmlString) {
  const xsd = getRdepXsdMetadata();
  const xsdDoc = getRdepXsdDoc();
  let xmlDoc;

  try {
    xmlDoc = libxml.parseXml(xmlString);
  } catch (error) {
    throw new AppError('El XML RDEP no pudo parsearse para validacion XSD oficial del SRI.', {
      code: 'RDEP_XSD_VALIDATION_FAILED',
      statusCode: 422,
      details: { failures: [error.message], xsdSha256: xsd.sha256, validationMode: XSD_VALIDATION_MODE },
    });
  }

  const valid = xmlDoc.validate(xsdDoc);

  if (!valid) {
    const failures = xmlDoc.validationErrors.map((err) => err.message.trim());
    throw new AppError('El XML RDEP no supera la validacion contra el esquema XSD oficial del SRI.', {
      code: 'RDEP_XSD_VALIDATION_FAILED',
      statusCode: 422,
      details: { failures, xsdSha256: xsd.sha256, validationMode: XSD_VALIDATION_MODE },
    });
  }

  return {
    valid: true,
    mode: XSD_VALIDATION_MODE,
    xsdSha256: xsd.sha256,
    xsdRoot: xsd.rootName,
    checkedAt: new Date().toISOString(),
  };
}

function money(value) {
  return (Number.parseFloat(value || 0) || 0).toFixed(2);
}

function toXsdNameText(value) {
  return String(value || 'NO REGISTRADO')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
    .slice(0, 100) || 'NO REGISTRADO';
}

function buildRdepRecord(nomina) {
  const ingresos = money(nomina.total_ingresos);
  const aporteIess = money(nomina.aporte_iess_personal);
  const impuestoRenta = money(nomina.impuesto_renta);

  return {
    empleado: {
      benGalpg: 'NO',
      tipIdRet: 'C',
      idRet: nomina.cedula,
      apellidoTrab: toXsdNameText(nomina.apellidos),
      nombreTrab: toXsdNameText(nomina.nombres),
      estab: '001',
      residenciaTrab: '01',
      paisResidencia: '593',
      aplicaConvenio: 'NA',
      tipoTrabajDiscap: '00',
      porcentajeDiscap: 0,
      tipIdDiscap: 'N',
    },
    suelSal: ingresos,
    sobSuelComRemu: '0.00',
    partUtil: '0.00',
    intGrabGen: '0.00',
    impRentEmpl: '0.00',
    decimTer: '0.00',
    decimCuar: '0.00',
    fondoReserva: '0.00',
    salarioDigno: '0.00',
    otrosIngRenGrav: '0.00',
    ingGravConEsteEmpl: ingresos,
    sisSalNet: 1,
    apoPerIess: aporteIess,
    aporPerIessConOtrosEmpls: '0.00',
    deducVivienda: '0.00',
    deducSalud: '0.00',
    deducEducartcult: '0.00',
    deducAliement: '0.00',
    deducVestim: '0.00',
    exoDiscap: '0.00',
    exoTerEd: '0.00',
    basImp: money(Number.parseFloat(ingresos) - Number.parseFloat(aporteIess)),
    impRentCaus: impuestoRenta,
    rebajaGastosPersonales: '0.00',
    impuestoRentaRebajaGastosPersonales: impuestoRenta,
    valRetAsuOtrosEmpls: '0.00',
    valImpAsuEsteEmpl: '0.00',
    valRet: impuestoRenta,
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

  const rdep = {
    rdep: {
      numRuc: tenant.ruc,
      anio: Number(anio),
      tipoEmpleador: 'PRIVADO_MIXTO',
      enteSegSocial: 'IESS',
      retRelDep: {
        datRetRelDep: nominas.map(buildRdepRecord),
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
