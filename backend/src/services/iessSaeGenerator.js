// ============================================================
// SKNOMINA - Carga batch IESS
// El portal IESS documenta archivos ASCII TXT/DAT, no XML SAE.
// ============================================================
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { s3Upload } = require('../config/s3');
const db = require('../config/database');
const AppError = require('../utils/AppError');
const {
  assertLegalParametersReadyForProduction,
  getLegalParametersForTenant,
} = require('./legalParameterService');
const logger = require('../utils/logger');

const SAE_MANIFEST_PATH = path.join(__dirname, '..', 'config', 'iess', 'sae-source-manifest.json');
const SAE_CONTRACT_VERSION = 'IESS-BATCH-ASCII-2026-RPE26';
const IESS_BATCH_MOVEMENT_MSU = 'MSU';
const IESS_BATCH_SEPARATOR = ';';

function readSaeManifest() {
  if (!fs.existsSync(SAE_MANIFEST_PATH)) {
    throw new AppError('No se encontro el manifiesto de carga batch IESS.', {
      code: 'SAE_SOURCE_MANIFEST_NOT_FOUND',
      statusCode: 500,
      details: { path: SAE_MANIFEST_PATH },
    });
  }

  try {
    return JSON.parse(fs.readFileSync(SAE_MANIFEST_PATH, 'utf8'));
  } catch (error) {
    throw new AppError('El manifiesto de carga batch IESS no pudo leerse.', {
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

function normalizeId(value) {
  return String(value || '').replace(/\D/g, '');
}

function safeJsonObject(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
}

function normalizeIessEstablishmentCode(value) {
  const clean = normalizeId(value);
  if (!clean || clean.length > 4) return '';
  return clean.padStart(4, '0');
}

function isEnabledFlag(value) {
  return value === true || String(value || '').toLowerCase() === 'true';
}

function isActiveConfigRecord(record = {}) {
  if (!record) return false;
  const status = String(record.status || record.estado || 'activo').toLowerCase();
  return status !== 'inactivo' && status !== 'archivado';
}

function resolveCompanyIessEstablishment(companyConfig = {}) {
  const records = Array.isArray(companyConfig.iessEstablecimientos)
    ? companyConfig.iessEstablecimientos
    : [];
  const activeRecords = records.filter(isActiveConfigRecord);
  return activeRecords.find((record) => isEnabledFlag(record.principal) || isEnabledFlag(record.isPrincipal))
    || activeRecords[0]
    || {};
}

function resolveIessEstablishmentCode(tenant, companyConfig = {}, iessEstablishment = null) {
  const tenantConfig = safeJsonObject(tenant?.configuracion);
  const establishmentPayload = safeJsonObject(iessEstablishment?.payload);
  const companyEstablishment = resolveCompanyIessEstablishment(companyConfig);
  const candidates = [
    establishmentPayload.codigoEstablecimiento,
    establishmentPayload.iessCodigoEstablecimiento,
    establishmentPayload.iess_codigo_establecimiento,
    iessEstablishment?.code,
    companyEstablishment.codigoEstablecimiento,
    companyEstablishment.iessCodigoEstablecimiento,
    companyEstablishment.iess_codigo_establecimiento,
    companyEstablishment.code,
    companyConfig.iess?.codigoEstablecimiento,
    companyConfig.iessCodigoEstablecimiento,
    companyConfig.iess_codigo_establecimiento,
    tenantConfig.iess?.codigoEstablecimiento,
    tenantConfig.iessCodigoEstablecimiento,
    tenantConfig.iess_codigo_establecimiento,
    tenantConfig.iessEstablishmentCode,
  ];
  const configured = candidates.find((candidate) => String(candidate || '').trim());
  return normalizeIessEstablishmentCode(configured);
}

async function loadSaeData(tenantId, anio, mes) {
  const legalParameters = await getLegalParametersForTenant(tenantId, anio);
  assertLegalParametersReadyForProduction(legalParameters, {
    year: anio,
    tenantId,
    operation: 'generacion_batch_iess_txt',
  });
  const employerIessRate = Number(legalParameters.payroll?.employerIessRate);

  const tenantResult = await db.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
  if (tenantResult.rows.length === 0) {
    throw new AppError('Empresa no encontrada para generar batch IESS.', {
      code: 'TENANT_NOT_FOUND',
      statusCode: 404,
    });
  }

  const companyConfigResult = await db.query(`
    SELECT payload
    FROM configuration_catalogs
    WHERE tenant_id = $1
      AND catalog_type = 'empresa_operativa'
      AND status = 'activo'
    ORDER BY updated_at DESC, created_at DESC
    LIMIT 1
  `, [tenantId]);

  const iessEstablishmentResult = await db.query(`
    SELECT code, name, payload
    FROM configuration_catalogs
    WHERE tenant_id = $1
      AND catalog_type = 'iess_establecimiento'
      AND status = 'activo'
    ORDER BY
      CASE
        WHEN LOWER(COALESCE(payload->>'principal', payload->>'isPrincipal', 'false')) = 'true' THEN 0
        ELSE 1
      END,
      updated_at DESC,
      created_at DESC
    LIMIT 1
  `, [tenantId]);

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
    companyConfig: safeJsonObject(companyConfigResult.rows[0]?.payload),
    iessEstablishment: iessEstablishmentResult.rows[0] || null,
    nominas: nominasResult.rows,
    legalParameters,
    employerIessRate,
  };
}

function uniqueIds(nominas) {
  return new Set(nominas.map((row) => normalizeId(row.cedula)).filter(Boolean));
}

function buildSaeChecks({ tenant, companyConfig, iessEstablishment, nominas, employerIessRate, manifest, anio, mes }) {
  const source = (manifest.sources || []).find((item) => item.kind === 'official_iess_batch_portal') || {};
  const reconciliation = manifest.validationPolicy?.officialSourceReconciliation || '';
  const batchFormatValidated = manifest.validationPolicy?.batchFormatStatus === 'official_ascii_txt_dat';
  const distinctEmployees = uniqueIds(nominas);
  const establishmentCode = resolveIessEstablishmentCode(tenant, companyConfig, iessEstablishment);
  const checks = [
    {
      code: 'empleador_ruc',
      label: 'RUC del empleador',
      passed: Boolean(normalizeId(tenant.ruc)),
      detail: normalizeId(tenant.ruc) || 'Falta RUC del empleador.',
    },
    {
      code: 'iess_codigo_establecimiento',
      label: 'Codigo de establecimiento IESS',
      passed: Boolean(establishmentCode),
      detail: establishmentCode || 'Configura Datos de empresa > IESS > Establecimientos antes de preparar el batch.',
    },
    {
      code: 'nomina_cerrada_periodo',
      label: 'Nomina cerrada del periodo',
      passed: nominas.length > 0,
      detail: nominas.length > 0
        ? `${nominas.length} roles cerrados para ${String(mes).padStart(2, '0')}/${anio}.`
        : 'Cierra la nomina del periodo antes de preparar el batch IESS.',
    },
    {
      code: 'parametros_nomina_iess',
      label: 'Parametros de nomina IESS vigentes',
      passed: Number.isFinite(employerIessRate) && employerIessRate > 0,
      detail: Number.isFinite(employerIessRate)
        ? `Aporte patronal referencial ${(employerIessRate * 100).toFixed(2)}%.`
        : 'No configurado.',
    },
    {
      code: 'trabajadores_identificados',
      label: 'Trabajadores identificados',
      passed: nominas.length > 0 && nominas.every((row) => normalizeId(row.cedula)),
      detail: `${nominas.filter((row) => normalizeId(row.cedula)).length}/${nominas.length} trabajadores con identificacion.`,
    },
    {
      code: 'un_registro_por_trabajador',
      label: 'Un registro por trabajador',
      passed: nominas.length > 0 && distinctEmployees.size === nominas.length,
      detail: `${distinctEmployees.size}/${nominas.length} identificaciones unicas.`,
    },
    {
      code: 'sueldos_msu',
      label: 'Sueldos para movimiento MSU',
      passed: nominas.length > 0 && nominas.every((row) => numberValue(row.total_ingresos) > 0),
      detail: `${nominas.filter((row) => numberValue(row.total_ingresos) > 0).length}/${nominas.length} trabajadores con sueldo mayor a cero.`,
    },
    {
      code: 'fuente_iess_reconciliada',
      label: 'Instructivo batch IESS localizado',
      passed: String(source.status || '').includes('checked_2026')
        && String(reconciliation).startsWith('checked_'),
      detail: `${reconciliation || 'pendiente'}; ${source.observedAt || manifest.observedAt || 'sin fecha'}`,
    },
    {
      code: 'formato_carga_iess',
      label: 'Formato de carga IESS TXT/DAT',
      passed: batchFormatValidated,
      detail: batchFormatValidated
        ? 'Archivo ASCII TXT/DAT con separador punto y coma.'
        : 'Pendiente de instructivo batch IESS.',
    },
  ];

  return checks;
}

async function precheckSAE(tenantId, anio, mes) {
  const year = Number(anio);
  const month = Number(mes);
  const manifest = readSaeManifest();
  const { tenant, companyConfig, iessEstablishment, nominas, employerIessRate } = await loadSaeData(tenantId, year, month);
  const checks = buildSaeChecks({
    tenant,
    companyConfig,
    iessEstablishment,
    nominas,
    employerIessRate,
    manifest,
    anio: year,
    mes: month,
  });
  const totalSalarios = nominas.reduce((sum, row) => sum + numberValue(row.total_ingresos), 0);
  const totalAportePersonal = nominas.reduce((sum, row) => sum + numberValue(row.aporte_iess_personal), 0);
  const totalAportePatronal = nominas.reduce(
    (sum, row) => sum + (numberValue(row.total_ingresos) * employerIessRate),
    0,
  );
  const ready = checks.every((check) => check.passed);

  return {
    ready,
    dataReady: ready,
    anio: year,
    mes: month,
    movementType: IESS_BATCH_MOVEMENT_MSU,
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
      batchFormatStatus: manifest.validationPolicy?.batchFormatStatus || '',
      separator: manifest.validationPolicy?.separator || IESS_BATCH_SEPARATOR,
      encoding: manifest.validationPolicy?.encoding || 'ASCII',
      fileExtensions: manifest.validationPolicy?.fileExtensions || ['.txt', '.dat'],
      supportedMovementTypes: manifest.validationPolicy?.supportedMovementTypes || [IESS_BATCH_MOVEMENT_MSU],
    },
  };
}

function buildIessBatchTxt({ tenant, companyConfig, iessEstablishment, nominas, anio, mes }) {
  const ruc = normalizeId(tenant.ruc);
  const establishmentCode = resolveIessEstablishmentCode(tenant, companyConfig, iessEstablishment);
  const periodMonth = String(mes).padStart(2, '0');

  return nominas.map((row) => [
    ruc,
    establishmentCode,
    String(anio),
    periodMonth,
    IESS_BATCH_MOVEMENT_MSU,
    normalizeId(row.cedula),
    money(row.total_ingresos),
  ].join(IESS_BATCH_SEPARATOR)).join('\r\n') + '\r\n';
}

async function generarArchivoIessBatch(tenantId, anio, mes) {
  const precheck = await precheckSAE(tenantId, anio, mes);
  if (!precheck.ready) {
    throw new AppError('IESS requiere datos validados antes de generar el archivo batch TXT/DAT.', {
      code: 'IESS_BATCH_PRECHECK_FAILED',
      statusCode: 423,
      details: { checks: precheck.checks },
    });
  }

  const { tenant, companyConfig, iessEstablishment, nominas } = await loadSaeData(tenantId, Number(anio), Number(mes));
  const batchString = buildIessBatchTxt({
    tenant,
    companyConfig,
    iessEstablishment,
    nominas,
    anio: Number(anio),
    mes: Number(mes),
  });
  const sha256 = crypto.createHash('sha256').update(batchString.replace(/\r\n?/g, '\n'), 'ascii').digest('hex');
  const fileName = `IESS_MSU_${anio}${String(mes).padStart(2, '0')}.txt`;
  const key = `reportes/${tenantId}/iess/${fileName}`;
  const contentType = 'text/plain; charset=us-ascii';
  const url = await s3Upload(Buffer.from(batchString, 'ascii'), key, contentType);

  logger.info({
    code: 'IESS_BATCH_TXT_GENERATED',
    correlationId: process.env.CORRELATION_ID || 'iess-batch-generator',
    tenantId,
    anio,
    mes,
    movementType: IESS_BATCH_MOVEMENT_MSU,
    totalEmpleados: nominas.length,
  }, 'Archivo batch IESS TXT generado');

  return {
    url,
    fileName,
    contentType,
    totalEmpleados: nominas.length,
    batchString,
    sha256,
    movementType: IESS_BATCH_MOVEMENT_MSU,
    validation: {
      valid: true,
      mode: 'iess_batch_ascii_txt_dat',
      contractVersion: SAE_CONTRACT_VERSION,
      checkedAt: new Date().toISOString(),
    },
    precheck,
  };
}

module.exports = {
  SAE_CONTRACT_VERSION,
  generarArchivoIessBatch,
  generarXML_SAE: generarArchivoIessBatch,
  precheckSAE,
};
