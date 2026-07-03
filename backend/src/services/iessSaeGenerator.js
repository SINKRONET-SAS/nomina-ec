// ============================================================
// SKNOMINA - Generador de XML SAE para IESS
// Sistema de Aviso de Entrada/Salida
// ============================================================
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { XMLBuilder } = require('fast-xml-parser');
const { s3Upload } = require('../config/s3');
const db = require('../config/database');
const AppError = require('../utils/AppError');
const {
  assertLegalParametersReadyForProduction,
  getLegalParametersForTenant,
} = require('./legalParameterService');
const logger = require('../utils/logger');

const SAE_MANIFEST_PATH = path.join(__dirname, '..', 'config', 'iess', 'sae-source-manifest.json');
const SAE_CONTRACT_VERSION = 'SAE-IESS-2026-DPS26';

function readSaeManifest() {
  if (!fs.existsSync(SAE_MANIFEST_PATH)) {
    throw new AppError('No se encontro el manifiesto SAE IESS.', {
      code: 'SAE_SOURCE_MANIFEST_NOT_FOUND',
      statusCode: 500,
      details: { path: SAE_MANIFEST_PATH },
    });
  }

  try {
    return JSON.parse(fs.readFileSync(SAE_MANIFEST_PATH, 'utf8'));
  } catch (error) {
    throw new AppError('El manifiesto SAE IESS no pudo leerse.', {
      code: 'SAE_SOURCE_MANIFEST_INVALID',
      statusCode: 500,
      details: { path: SAE_MANIFEST_PATH, reason: error.message },
    });
  }
}

function numberValue(value) {
  const parsed = Number.parseFloat(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  return numberValue(value).toFixed(2);
}

function normalizeText(value, fallback = 'NO REGISTRADO') {
  const text = String(value || fallback)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text || fallback;
}

function normalizeId(value) {
  return String(value || '').replace(/\D/g, '');
}

async function loadSaeData(tenantId, anio, mes) {
  const legalParameters = await getLegalParametersForTenant(tenantId, anio);
  assertLegalParametersReadyForProduction(legalParameters, {
    year: anio,
    tenantId,
    operation: 'generacion_sae_iess',
  });
  const employerIessRate = Number(legalParameters.payroll?.employerIessRate);

  const tenantResult = await db.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
  if (tenantResult.rows.length === 0) {
    throw new AppError('Empresa no encontrada para generar SAE IESS.', {
      code: 'TENANT_NOT_FOUND',
      statusCode: 404,
    });
  }

  const nominasResult = await db.query(`
    SELECT
      e.cedula,
      e.nombres,
      e.apellidos,
      e.fecha_ingreso,
      n.total_ingresos,
      n.aporte_iess_personal,
      n.estado
    FROM nominas n
    JOIN empleados e ON n.empleado_id = e.id
    WHERE n.tenant_id = $1
      AND n.anio = $2
      AND n.mes = $3
      AND n.estado = 'cerrada'
    ORDER BY e.apellidos, e.nombres
  `, [tenantId, anio, mes]);

  return {
    tenant: tenantResult.rows[0],
    nominas: nominasResult.rows,
    legalParameters,
    employerIessRate,
  };
}

function buildSaeChecks({ tenant, nominas, employerIessRate, manifest, anio, mes }) {
  const source = (manifest.sources || []).find((item) => item.kind === 'official_institution') || {};
  const reconciliation = manifest.validationPolicy?.officialSourceReconciliation || '';
  const checks = [
    {
      code: 'empleador_ruc',
      label: 'RUC del empleador',
      passed: Boolean(normalizeId(tenant.ruc)),
      detail: normalizeId(tenant.ruc) || 'Falta RUC del empleador.',
    },
    {
      code: 'empleador_razon_social',
      label: 'Razon social del empleador',
      passed: Boolean(tenant.razon_social),
      detail: tenant.razon_social || 'Falta razon social del empleador.',
    },
    {
      code: 'nomina_cerrada_periodo',
      label: 'Nomina cerrada del periodo',
      passed: nominas.length > 0,
      detail: nominas.length > 0
        ? `${nominas.length} roles cerrados para ${String(mes).padStart(2, '0')}/${anio}.`
        : 'Cierra la nomina del periodo antes de generar SAE IESS.',
    },
    {
      code: 'iess_aporte_patronal',
      label: 'Aporte patronal IESS vigente',
      passed: Number.isFinite(employerIessRate) && employerIessRate > 0,
      detail: Number.isFinite(employerIessRate) ? `${(employerIessRate * 100).toFixed(2)}%` : 'No configurado.',
    },
    {
      code: 'trabajadores_identificados',
      label: 'Trabajadores identificados',
      passed: nominas.length > 0 && nominas.every((row) => normalizeId(row.cedula)),
      detail: `${nominas.filter((row) => normalizeId(row.cedula)).length}/${nominas.length} trabajadores con identificacion.`,
    },
    {
      code: 'fechas_ingreso',
      label: 'Fechas de ingreso registradas',
      passed: nominas.length > 0 && nominas.every((row) => row.fecha_ingreso),
      detail: `${nominas.filter((row) => row.fecha_ingreso).length}/${nominas.length} trabajadores con fecha de ingreso.`,
    },
    {
      code: 'fuente_iess_reconciliada',
      label: 'Fuente IESS reconciliada',
      passed: String(source.status || '').includes('checked_2026')
        && String(reconciliation).startsWith('checked_'),
      detail: `${reconciliation || 'pendiente'}; ${source.observedAt || manifest.observedAt || 'sin fecha'}`,
    },
    {
      code: 'contrato_xml_versionado',
      label: 'Contrato XML versionado',
      passed: manifest.version === SAE_CONTRACT_VERSION,
      detail: manifest.version || 'Sin version.',
    },
  ];

  return checks;
}

async function precheckSAE(tenantId, anio, mes) {
  const year = Number(anio);
  const month = Number(mes);
  const manifest = readSaeManifest();
  const { tenant, nominas, employerIessRate } = await loadSaeData(tenantId, year, month);
  const checks = buildSaeChecks({ tenant, nominas, employerIessRate, manifest, anio: year, mes: month });
  const totalSalarios = nominas.reduce((sum, row) => sum + numberValue(row.total_ingresos), 0);
  const totalAportePersonal = nominas.reduce((sum, row) => sum + numberValue(row.aporte_iess_personal), 0);
  const totalAportePatronal = nominas.reduce(
    (sum, row) => sum + (numberValue(row.total_ingresos) * employerIessRate),
    0,
  );

  return {
    ready: checks.every((check) => check.passed),
    anio: year,
    mes: month,
    totalEmpleados: nominas.length,
    checks,
    totals: {
      totalSalarios: money(totalSalarios),
      totalAportePersonal: money(totalAportePersonal),
      totalAportePatronal: money(totalAportePatronal),
      totalAporte: money(totalAportePersonal + totalAportePatronal),
    },
    manifest: {
      version: manifest.version,
      observedAt: manifest.observedAt,
      officialSourceReconciliation: manifest.validationPolicy?.officialSourceReconciliation || '',
      schemaPolicy: manifest.validationPolicy?.schemaPolicy || '',
    },
  };
}

function buildSaeXml({ tenant, nominas, employerIessRate, anio, mes }) {
  const detalleAportantes = nominas.map((row) => ({
    aportante: {
      tipoIdentificacion: 'CED',
      identificacion: normalizeId(row.cedula),
      apellidos: normalizeText(row.apellidos).toUpperCase(),
      nombres: normalizeText(row.nombres).toUpperCase(),
      fechaIngreso: new Date(row.fecha_ingreso).toISOString().split('T')[0],
      sueldo: money(row.total_ingresos),
      aportePersonal: money(row.aporte_iess_personal),
      aportePatronal: money(numberValue(row.total_ingresos) * employerIessRate),
    },
  }));

  const totalSalarios = nominas.reduce((sum, row) => sum + numberValue(row.total_ingresos), 0);
  const totalAportePersonal = nominas.reduce((sum, row) => sum + numberValue(row.aporte_iess_personal), 0);
  const totalAportePatronal = nominas.reduce(
    (sum, row) => sum + (numberValue(row.total_ingresos) * employerIessRate),
    0,
  );

  const sae = {
    'sae:planilla': {
      '@xmlns:sae': 'http://www.iess.gob.ec/schema/SAE',
      '@version': SAE_CONTRACT_VERSION,
      empleador: {
        ruc: normalizeId(tenant.ruc),
        razonSocial: normalizeText(tenant.razon_social),
        periodo: `${String(mes).padStart(2, '0')}/${anio}`,
        tipoPlanilla: 'PLANILLA_MENSUAL',
      },
      detalleAportantes,
      totales: {
        totalAportantes: nominas.length,
        totalSalarios: money(totalSalarios),
        totalAportePersonal: money(totalAportePersonal),
        totalAportePatronal: money(totalAportePatronal),
        totalAporte: money(totalAportePersonal + totalAportePatronal),
      },
    },
  };

  const builder = new XMLBuilder({
    format: true,
    ignoreAttributes: false,
    attributeNamePrefix: '@',
  });

  return '<?xml version="1.0" encoding="UTF-8"?>\n' + builder.build(sae);
}

async function generarXML_SAE(tenantId, anio, mes) {
  const precheck = await precheckSAE(tenantId, anio, mes);
  if (!precheck.ready) {
    throw new AppError('SAE IESS requiere datos validados antes de generar el XML.', {
      code: 'SAE_PRECHECK_FAILED',
      statusCode: 423,
      details: { checks: precheck.checks },
    });
  }

  const { tenant, nominas, employerIessRate } = await loadSaeData(tenantId, Number(anio), Number(mes));
  const xmlString = buildSaeXml({ tenant, nominas, employerIessRate, anio: Number(anio), mes: Number(mes) });
  const sha256 = crypto.createHash('sha256').update(xmlString.replace(/\r\n?/g, '\n'), 'utf8').digest('hex');
  const fileName = `SAE_IESS_${anio}${String(mes).padStart(2, '0')}.xml`;
  const key = `reportes/${tenantId}/iess/${fileName}`;
  const url = await s3Upload(Buffer.from(xmlString, 'utf8'), key, 'application/xml');

  logger.info({
    code: 'SAE_XML_GENERATED',
    correlationId: process.env.CORRELATION_ID || 'sae-generator',
    tenantId,
    anio,
    mes,
    totalEmpleados: nominas.length,
  }, 'XML SAE generado');

  return {
    url,
    fileName,
    contentType: 'application/xml',
    totalEmpleados: nominas.length,
    xmlString,
    sha256,
    validation: {
      valid: true,
      mode: 'versioned_structural_contract',
      contractVersion: SAE_CONTRACT_VERSION,
      checkedAt: new Date().toISOString(),
    },
    precheck,
  };
}

module.exports = {
  SAE_CONTRACT_VERSION,
  generarXML_SAE,
  precheckSAE,
};
