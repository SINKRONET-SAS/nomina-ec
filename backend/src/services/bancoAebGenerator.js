// ============================================================
// PLAN HAIKY - Generador de Archivo Bancario
// ============================================================
const crypto = require('crypto');
const ExcelJS = require('exceljs');
const { s3Upload } = require('../config/s3');
const db = require('../config/database');
const bankProfiles = require('../config/bank-file-profiles.json');
const { roundMoney, toMoneyString } = require('../utils/money');
const { recordAudit } = require('./auditService');
const { decryptBankAccount } = require('./bankAccountCrypto');

async function generarArchivoBanco(tenantId, anio, mes, banco = 'PICHINCHA', context = {}) {
  const profile = await getBankProfileForTenant(tenantId, banco);
  const tenantResult = await db.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);

  if (tenantResult.rows.length === 0) {
    throw new Error('Tenant no encontrado');
  }

  const nominasResult = await db.query(`
    SELECT e.cedula, e.nombres, e.apellidos, e.cuenta_bancaria_cifrada,
      e.banco, e.tipo_cuenta, n.neto_recibir, n.estado
    FROM nominas n
    JOIN empleados e ON n.empleado_id = e.id
    WHERE n.tenant_id = $1
      AND n.anio = $2
      AND n.mes = $3
      AND n.estado IN ('cerrada', 'pagada')
      AND e.cuenta_bancaria_cifrada IS NOT NULL
    ORDER BY e.apellidos, e.nombres
  `, [tenantId, anio, mes]);

  if (nominasResult.rows.length === 0) {
    throw new Error('No hay nominas cerradas o pagadas con cuenta bancaria para el periodo');
  }

  const rows = [];
  if (profile.includeHeader) {
    rows.push(profile.headerLabels || profile.fields.map((field) => field.toUpperCase()));
  }

  let totalPagos = 0;
  const bankProfileCache = new Map([[normalizeBankKey(banco), profile]]);

  for (const [index, payroll] of nominasResult.rows.entries()) {
    const cuenta = await decryptBankAccount(payroll.cuenta_bancaria_cifrada);
    const rowBankKey = normalizeBankKey(payroll.banco || banco);
    if (!bankProfileCache.has(rowBankKey)) {
      bankProfileCache.set(rowBankKey, await getBankProfileForTenant(tenantId, payroll.banco || banco));
    }
    const rowProfile = bankProfileCache.get(rowBankKey);
    const bancoCodigo = rowProfile.bankCode;
    const monto = roundMoney(Number.parseFloat(payroll.neto_recibir));
    const paymentValues = buildPaymentValues({
      payroll,
      cuenta,
      monto,
      bancoCodigo,
      tenantId,
      anio,
      mes,
      index,
      profile: rowProfile,
    });

    rows.push(rowProfile.fields.map((field) => paymentValues[field] ?? ''));

    totalPagos = roundMoney(totalPagos + monto);
  }

  if (profile.includeTrailer) {
    rows.push(['9', '', '', '', '', '', '', '', formatAmount(totalPagos, profile), nominasResult.rows.length.toString()]);
  }

  validateBankRows(rows, totalPagos, nominasResult.rows.length, profile);
  const csvContent = rows.map((row) => row.join(profile.delimiter)).join(profile.lineEnding);
  const checksum = crypto.createHash('sha256').update(csvContent, 'utf8').digest('hex');
  const key = `reportes/${tenantId}/banco/PAGO_NOMINA_${anio}${String(mes).padStart(2, '0')}_${profile.profileKey}.csv`;
  const url = await s3Upload(Buffer.from(csvContent, profile.encoding), key, 'text/csv');
  const excelUrl = await generateReviewWorkbook(nominasResult.rows, tenantId, anio, mes);

  if (context.correlationId) {
    await recordAudit({
      tenantId,
      userId: context.userId || null,
      correlationId: context.correlationId,
      action: 'generar_archivo_bancario',
      entity: 'perfiles_bancarios',
      newData: {
        banco,
        anio,
        mes,
        totalPagos,
        totalEmpleados: nominasResult.rows.length,
        checksum,
        bankProfile: {
          id: profile.id || null,
          source: profile.source,
          key: profile.profileKey,
          bankCode: profile.bankCode,
        },
      },
      ipAddress: context.ipAddress || null,
    });
  }

  console.log(`[BANCO] Archivo generado para ${tenantId} - ${mes}/${anio}: ${nominasResult.rows.length} pagos`);

  return {
    csvUrl: url,
    excelUrl,
    totalPagos: toMoneyString(totalPagos),
    totalEmpleados: nominasResult.rows.length,
    checksum,
    bankProfile: {
      id: profile.id || null,
      source: profile.source,
      key: profile.profileKey,
      bankCode: profile.bankCode,
    },
  };
}

async function generateReviewWorkbook(rows, tenantId, anio, mes) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Pagos');
  sheet.columns = [
    { header: 'Cedula', key: 'cedula', width: 15 },
    { header: 'Nombre', key: 'nombre', width: 40 },
    { header: 'Banco', key: 'banco', width: 15 },
    { header: 'Cuenta', key: 'cuenta', width: 15 },
    { header: 'Monto', key: 'monto', width: 12 },
    { header: 'Estado nomina', key: 'estado', width: 16 },
  ];

  rows.forEach((row) => {
    sheet.addRow({
      cedula: row.cedula,
      nombre: `${row.apellidos} ${row.nombres}`,
      banco: row.banco,
      cuenta: '****',
      monto: Number.parseFloat(row.neto_recibir),
      estado: row.estado,
    });
  });

  const excelBuffer = await workbook.xlsx.writeBuffer();
  const excelKey = `reportes/${tenantId}/banco/PAGO_NOMINA_${anio}${String(mes).padStart(2, '0')}.xlsx`;
  return s3Upload(excelBuffer, excelKey, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

function normalizeBankKey(value) {
  return String(value || '').trim().toUpperCase();
}

function parseFieldMap(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (err) {
    throw new Error('Mapa de campos bancario invalido');
  }
}

function getBankProfile(banco) {
  const key = normalizeBankKey(banco);
  const profileKey = bankProfiles[key]
    ? key
    : Object.keys(bankProfiles).find((candidate) => bankProfiles[candidate].bankCode === key);
  const profile = profileKey ? bankProfiles[profileKey] : null;

  if (!profile) {
    throw new Error(`Perfil bancario no configurado: ${key}`);
  }

  return {
    ...profile,
    source: 'static',
    profileKey,
  };
}

function normalizeTenantBankProfile(row, requestedBank) {
  const fieldMap = parseFieldMap(row.field_map);
  const fallbackKey = fieldMap.profile || row.banco_nombre || requestedBank || row.banco_codigo;
  let fallbackProfile = null;

  try {
    fallbackProfile = getBankProfile(fallbackKey);
  } catch (err) {
    fallbackProfile = null;
  }

  const bankCode = String(fieldMap.bankCode || fallbackProfile?.bankCode || row.banco_codigo || '').trim();
  if (!/^\d+$/.test(bankCode)) {
    throw new Error(`Perfil bancario ${row.banco_nombre || row.banco_codigo} no tiene codigo bancario numerico`);
  }

  const fields = Array.isArray(fieldMap.fields) && fieldMap.fields.length > 0
    ? fieldMap.fields
    : (fallbackProfile?.fields || [
      'tipoRegistro',
      'oficina',
      'digitoControl',
      'cuenta',
      'cedula',
      'nombre',
      'concepto',
      'fechaOperacion',
      'importe',
      'referencia',
    ]);

  return {
    ...(fallbackProfile || {}),
    id: row.id,
    source: row.tenant_id ? 'tenant' : 'global-db',
    profileKey: normalizeBankKey(fieldMap.profile || row.banco_nombre || row.banco_codigo),
    bankCode,
    delimiter: row.delimiter || fallbackProfile?.delimiter || ';',
    encoding: row.encoding || fallbackProfile?.encoding || 'utf8',
    lineEnding: fieldMap.lineEnding || fallbackProfile?.lineEnding || '\n',
    dateFormat: row.date_format || fallbackProfile?.dateFormat || 'YYYYMMDD',
    amountDecimals: Number(fieldMap.amountDecimals ?? fallbackProfile?.amountDecimals ?? 2),
    decimalSeparator: fieldMap.decimalSeparator || fallbackProfile?.decimalSeparator || '.',
    layout: fieldMap.layout || fallbackProfile?.layout || 'generic_delimited',
    includeHeader: Boolean(row.include_header),
    includeTrailer: Boolean(row.include_trailer),
    accountLength: Number(fieldMap.accountLength || fallbackProfile?.accountLength || 10),
    fields,
    headerLabels: null,
  };
}

function applyBankFieldMappings(profile, mappings = []) {
  if (!Array.isArray(mappings) || mappings.length === 0) {
    return profile;
  }

  const orderedMappings = [...mappings].sort((a, b) => Number(a.position) - Number(b.position));
  return {
    ...profile,
    fields: orderedMappings.map((mapping) => mapping.canonical_field),
    headerLabels: orderedMappings.map((mapping) => mapping.bank_field_name),
    fieldMappings: orderedMappings.map((mapping) => ({
      canonicalField: mapping.canonical_field,
      bankFieldName: mapping.bank_field_name,
      position: Number(mapping.position),
      formatter: mapping.formatter || '',
      required: Boolean(mapping.required),
      metadata: mapping.metadata || {},
    })),
  };
}

async function getBankProfileForTenant(tenantId, banco) {
  const key = normalizeBankKey(banco || 'PICHINCHA');
  const result = await db.query(`
    SELECT *
    FROM perfiles_bancarios
    WHERE activo = true
      AND (tenant_id = $1 OR tenant_id IS NULL)
      AND (
        UPPER(banco_codigo) = $2
        OR UPPER(banco_nombre) = $2
        OR UPPER(field_map->>'profile') = $2
      )
    ORDER BY CASE WHEN tenant_id = $1 THEN 0 ELSE 1 END, updated_at DESC
    LIMIT 1
  `, [tenantId, key]);

  if (result.rows.length === 0) {
    return getBankProfile(key);
  }

  const profile = normalizeTenantBankProfile(result.rows[0], key);
  const mappings = await loadBankFieldMappings(tenantId, result.rows[0], profile);
  return applyBankFieldMappings(profile, mappings);
}

async function loadBankFieldMappings(tenantId, profileRow, profile) {
  const result = await db.query(`
    SELECT *
    FROM bank_field_mappings
    WHERE (tenant_id = $1 OR tenant_id IS NULL)
      AND (
        bank_profile_id = $2
        OR UPPER(banco_codigo) = $3
        OR UPPER(banco_codigo) = $4
      )
    ORDER BY CASE WHEN tenant_id = $1 THEN 0 ELSE 1 END, position ASC
  `, [
    tenantId,
    profileRow.id,
    normalizeBankKey(profileRow.banco_codigo),
    normalizeBankKey(profile.profileKey),
  ]);

  const byField = new Map();
  for (const row of result.rows) {
    if (!byField.has(row.canonical_field)) {
      byField.set(row.canonical_field, row);
    }
  }
  return [...byField.values()].sort((a, b) => Number(a.position) - Number(b.position));
}

function buildPaymentValues({ payroll, cuenta, monto, bancoCodigo, tenantId, anio, mes, index, profile }) {
  const values = {
    tipoRegistro: '1',
    bancoCodigo: bancoCodigo.padStart(4, '0'),
    oficina: '00',
    digitoControl: '00',
    cuenta: cuenta.padStart(profile.accountLength, '0'),
    cedula: payroll.cedula,
    nombre: `${payroll.apellidos} ${payroll.nombres}`.substring(0, 40),
    concepto: `NOMINA ${String(mes).padStart(2, '0')}/${anio}`.substring(0, 40),
    fechaOperacion: `${anio}${String(mes).padStart(2, '0')}28`,
    importe: formatAmount(monto, profile),
    referencia: `NOM${tenantId.substring(0, 8)}${String(index + 1).padStart(4, '0')}`,
  };

  if (profile.layout === 'pacifico_interbank_immediate') {
    return {
      ...values,
      tipoRegistro: 'D',
      tipoIdentificacion: resolveIdentificationType(payroll.cedula),
      tipoCuenta: resolvePacificoAccountType(payroll.tipo_cuenta),
      nombre: values.nombre.substring(0, 60),
      concepto: values.concepto.substring(0, 30),
      referencia: values.referencia.substring(0, 20),
    };
  }

  return values;
}

function resolveIdentificationType(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10) return 'C';
  if (digits.length === 13) return 'R';
  if (digits.length > 0) return 'P';
  throw new Error('Identificacion del beneficiario requerida para archivo bancario');
}

function resolvePacificoAccountType(value) {
  const text = String(value || '').trim().toUpperCase();
  if (['AHORROS', 'AHORRO', 'AH', 'A'].includes(text)) return 'AH';
  if (['CORRIENTE', 'CC', 'C'].includes(text)) return 'CC';
  throw new Error('Banco Pacifico requiere tipo de cuenta AHORROS o CORRIENTE por empleado');
}

function formatAmount(value, profile) {
  return toMoneyString(value).replace('.', profile.decimalSeparator);
}

function validateBankRows(rows, totalPagos, totalEmpleados, profile) {
  const expectedRows = totalEmpleados + (profile.includeHeader ? 1 : 0) + (profile.includeTrailer ? 1 : 0);

  if (rows.length !== expectedRows) {
    throw new Error('Conteo de registros bancarios inconsistente');
  }

  if (totalPagos <= 0) {
    throw new Error('Total bancario invalido');
  }

  if (profile.layout === 'pacifico_interbank_immediate') {
    const dataRows = rows.slice(profile.includeHeader ? 1 : 0, profile.includeTrailer ? -1 : undefined);
    for (const row of dataRows) {
      if (row.length !== profile.fields.length) {
        throw new Error('Formato Banco Pacifico inconsistente: columnas incompletas');
      }
    }
  }
}

module.exports = {
  generarArchivoBanco,
  getBankProfile,
  getBankProfileForTenant,
  decryptBankAccount,
  validateBankRows,
};
