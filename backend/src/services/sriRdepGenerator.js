// ============================================================
// SKNOMINA - Generador de XML RDEP para SRI
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
const logger = require('../utils/logger');

const RDEP_XSD_PATH = path.join(__dirname, '..', 'config', 'rdep', 'Esquema_RDEP_2023.xsd');
const RDEP_MANIFEST_PATH = path.join(__dirname, '..', 'config', 'rdep', 'rdep-source-manifest.json');
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

function getRdepSourceManifest() {
  if (!fs.existsSync(RDEP_MANIFEST_PATH)) {
    throw new AppError('No se encontro el manifiesto de fuente oficial RDEP.', {
      code: 'RDEP_SOURCE_MANIFEST_NOT_FOUND',
      statusCode: 500,
      details: { path: RDEP_MANIFEST_PATH },
    });
  }

  try {
    return JSON.parse(fs.readFileSync(RDEP_MANIFEST_PATH, 'utf8'));
  } catch (error) {
    throw new AppError('El manifiesto de fuente oficial RDEP no pudo leerse.', {
      code: 'RDEP_SOURCE_MANIFEST_INVALID',
      statusCode: 500,
      details: { path: RDEP_MANIFEST_PATH, reason: error.message },
    });
  }
}

function getRdepSourceMetadata(xsd) {
  const manifest = getRdepSourceManifest();
  const officialSource = (manifest.sources || []).find((source) => source.kind === 'official_web_page');
  const xsdSource = (manifest.sources || []).find((source) => source.kind === 'xsd');
  const manifestSha256 = String(xsdSource?.sha256 || '').toLowerCase();
  const officialSourceReconciliation = manifest.validationPolicy?.officialSourceReconciliation || '';

  return {
    observedAt: officialSource?.observedAt || manifest.observedAt || '',
    officialSourceUrl: officialSource?.url || '',
    sourceStatus: officialSource?.status || '',
    officialSourceReconciliation,
    verificationScript: manifest.validationPolicy?.verificationScript || '',
    manifestSha256,
    hashMatchesManifest: Boolean(manifestSha256 && manifestSha256 === xsd.sha256),
  };
}

function getRdepXsdMetadata() {
  if (!fs.existsSync(RDEP_XSD_PATH)) {
    throw new AppError('No se encontro el esquema XSD RDEP versionado.', {
      code: 'RDEP_XSD_NOT_FOUND',
      statusCode: 500,
      details: { path: RDEP_XSD_PATH },
    });
  }

  const content = fs.readFileSync(RDEP_XSD_PATH, 'utf8');
  const canonicalContent = content.replace(/\r\n?/g, '\n');
  const contract = getRdepXsdContract(content);
  return {
    path: RDEP_XSD_PATH,
    content,
    sha256: crypto.createHash('sha256').update(canonicalContent, 'utf8').digest('hex'),
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

async function loadRdepData(tenantId, anio) {
  const tenantResult = await db.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
  if (tenantResult.rows.length === 0) {
    throw new AppError('Tenant no encontrado', {
      code: 'TENANT_NOT_FOUND',
      statusCode: 404,
    });
  }
  const tenant = tenantResult.rows[0];

  const nominasResult = await db.query(`
    SELECT
      e.id AS empleado_id,
      e.cedula,
      e.nombres,
      e.apellidos,
      e.gastos_personales_anuales,
      e.cargas_familiares,
      n.mes,
      n.total_ingresos,
      n.aporte_iess_personal,
      n.impuesto_renta,
      n.estado,
      n.detalle_calculo
    FROM nominas n
    JOIN empleados e ON n.empleado_id = e.id
    WHERE n.tenant_id = $1
      AND n.anio = $2
      AND n.estado = 'cerrada'
    ORDER BY e.apellidos, e.nombres, n.mes
  `, [tenantId, anio]);

  return { tenant, nominas: nominasResult.rows };
}

async function precheckRDEP(tenantId, anio) {
  const xsd = getRdepXsdMetadata();
  const source = getRdepSourceMetadata(xsd);
  const { tenant, nominas } = await loadRdepData(tenantId, anio);
  const employeeIds = new Set(nominas.map((row) => row.empleado_id));
  const periods = new Set(nominas.map((row) => Number(row.mes)).filter(Boolean));
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
      code: 'closed_payroll_year',
      label: 'Nomina cerrada del ejercicio fiscal',
      passed: nominas.length > 0,
      detail: `${nominas.length} roles cerrados de ${employeeIds.size} trabajadores en ${periods.size} meses`,
    },
    {
      code: 'annual_scope',
      label: 'Alcance anual RDEP',
      passed: periods.size > 0,
      detail: `Ejercicio fiscal ${Number(anio)}; el mes de pantalla no limita el XML.`,
    },
    {
      code: 'xsd_versioned',
      label: 'XSD RDEP versionado disponible',
      passed: Boolean(xsd.sha256),
      detail: xsd.sha256,
    },
    {
      code: 'official_source_reconciled',
      label: 'Fuente oficial SRI reconciliada',
      passed: source.hashMatchesManifest && String(source.officialSourceReconciliation).startsWith('checked_'),
      detail: `${source.officialSourceReconciliation || 'pendiente'}; ${source.observedAt || 'sin fecha de revision'}`,
    },
  ];
  const ready = checks.every((check) => check.passed);

  return {
    ready,
    anio: Number(anio),
    totalEmpleados: employeeIds.size,
    totalRoles: nominas.length,
    mesesConNomina: [...periods].sort((a, b) => a - b),
    checks,
    xsd: {
      sha256: xsd.sha256,
      rootName: xsd.rootName,
      validationMode: xsd.validationMode,
      observedAt: source.observedAt,
      officialSourceUrl: source.officialSourceUrl,
      sourceStatus: source.sourceStatus,
      officialSourceReconciliation: source.officialSourceReconciliation,
      hashMatchesManifest: source.hashMatchesManifest,
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

function numberValue(value) {
  const parsed = Number.parseFloat(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value) {
  return Math.round(numberValue(value) * 100) / 100;
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

function sumDetail(rows, key) {
  return roundMoney(rows.reduce((total, row) => total + numberValue(row.detalle_calculo?.[key]), 0));
}

function aggregateAnnualRows(nominas) {
  const grouped = new Map();

  for (const row of nominas) {
    const key = row.empleado_id || row.cedula;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }

  return [...grouped.values()].map((rows) => {
    const first = rows[0];
    const totalIngresos = roundMoney(rows.reduce((total, row) => total + numberValue(row.total_ingresos), 0));
    const aporteIess = roundMoney(rows.reduce((total, row) => total + numberValue(row.aporte_iess_personal), 0));
    const impuestoRenta = roundMoney(rows.reduce((total, row) => total + numberValue(row.impuesto_renta), 0));
    const fondoReserva = roundMoney(
      sumDetail(rows, 'fondoReservaPagadoEmpleado') + sumDetail(rows, 'fondoReservaDepositadoIess')
    );
    const decimoTercero = sumDetail(rows, 'provisionDecimoTercero');
    const decimoCuarto = sumDetail(rows, 'provisionDecimoCuarto');
    const sueldoSalario = Math.max(0, roundMoney(totalIngresos - fondoReserva));

    return {
      ...first,
      total_ingresos_anual: totalIngresos,
      sueldo_salario_anual: sueldoSalario,
      aporte_iess_anual: aporteIess,
      impuesto_renta_anual: impuestoRenta,
      fondo_reserva_anual: fondoReserva,
      decimo_tercero_anual: decimoTercero,
      decimo_cuarto_anual: decimoCuarto,
      gastos_personales_anuales: roundMoney(first.gastos_personales_anuales),
      meses_reportados: rows.map((row) => Number(row.mes)).sort((a, b) => a - b),
    };
  });
}

function buildRdepRecord(nomina) {
  const ingresos = money(nomina.sueldo_salario_anual);
  const aporteIess = money(nomina.aporte_iess_anual);
  const impuestoRenta = money(nomina.impuesto_renta_anual);
  const baseImponible = Math.max(0, roundMoney(nomina.total_ingresos_anual - nomina.aporte_iess_anual));

  return {
    empleado: {
      benGalpg: 'NO',
      numCargRebGastPers: Math.min(Math.max(Number.parseInt(nomina.cargas_familiares || '0', 10) || 0, 0), 5),
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
    decimTer: money(nomina.decimo_tercero_anual),
    decimCuar: money(nomina.decimo_cuarto_anual),
    fondoReserva: money(nomina.fondo_reserva_anual),
    salarioDigno: '0.00',
    otrosIngRenGrav: '0.00',
    ingGravConEsteEmpl: money(nomina.total_ingresos_anual),
    sisSalNet: 1,
    apoPerIess: aporteIess,
    aporPerIessConOtrosEmpls: '0.00',
    deducVivienda: '0.00',
    deducSalud: '0.00',
    deducEduca: '0.00',
    deducEducartcult: '0.00',
    deducAliement: '0.00',
    deducVestim: '0.00',
    deducArtycult: '0.00',
    deduccionTurismo: '0.00',
    exoDiscap: '0.00',
    exoTerEd: '0.00',
    basImp: money(baseImponible),
    impRentCaus: impuestoRenta,
    rebajaGastosPersonales: '0.00',
    impuestoRentaRebajaGastosPersonales: impuestoRenta,
    valRetAsuOtrosEmpls: '0.00',
    valImpAsuEsteEmpl: '0.00',
    valRet: impuestoRenta,
  };
}

async function generarXML_RDEP(tenantId, anio) {
  const precheck = await precheckRDEP(tenantId, anio);
  if (!precheck.ready) {
    throw new AppError('RDEP no esta listo para generarse. Revisa el precheck del periodo.', {
      code: 'RDEP_PRECHECK_FAILED',
      statusCode: 423,
      details: { checks: precheck.checks },
    });
  }
  const { tenant, nominas } = await loadRdepData(tenantId, anio);
  const annualRecords = aggregateAnnualRows(nominas);

  const rdep = {
    rdep: {
      numRuc: tenant.ruc,
      anio: Number(anio),
      tipoEmpleador: 'PRIVADO_MIXTO',
      enteSegSocial: 'IESS',
      retRelDep: {
        datRetRelDep: annualRecords.map(buildRdepRecord),
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
  const fileName = `RDEP_${anio}.xml`;
  const key = `reportes/${tenantId}/sri/${fileName}`;
  const url = await s3Upload(Buffer.from(xmlString, 'utf8'), key, 'application/xml');

  logger.info({
    code: 'RDEP_XML_GENERATED',
    correlationId: process.env.CORRELATION_ID || 'rdep-generator',
    tenantId,
    anio,
    totalEmpleados: annualRecords.length,
  }, 'XML RDEP generado');

  return {
    url,
    fileName,
    contentType: 'application/xml',
    totalEmpleados: annualRecords.length,
    totalRoles: nominas.length,
    xmlString,
    validation,
    precheck,
  };
}

module.exports = {
  generarXML_RDEP,
  getRdepXsdMetadata,
  precheckRDEP,
  validateRdepXmlAgainstXsdContract,
};
