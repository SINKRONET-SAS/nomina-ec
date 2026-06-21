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
    rows.push(profile.fields.map((field) => field.toUpperCase()));
  }

  let totalPagos = 0;
  const bankProfileCache = new Map([[normalizeBankKey(banco), profile]]);

  for (const [index, payroll] of nominasResult.rows.entries()) {
    const cuenta = await decryptBankAccount(payroll.cuenta_bancaria_cifrada);
    const rowBankKey = normalizeBankKey(payroll.banco || banco);
    if (!bankProfileCache.has(rowBankKey)) {
      bankProfileCache.set(rowBankKey, await getBankProfileForTenant(tenantId, payroll.banco || banco));
    }
    const bancoCodigo = bankProfileCache.get(rowBankKey).bankCode;
    const monto = roundMoney(Number.parseFloat(payroll.neto_recibir));

    rows.push([
      '1',
      bancoCodigo.padStart(4, '0'),
      '00',
      cuenta.padStart(profile.accountLength, '0'),
      payroll.cedula,
      `${payroll.apellidos} ${payroll.nombres}`.substring(0, 40),
      `NOMINA ${String(mes).padStart(2, '0')}/${anio}`.substring(0, 40),
      `${anio}${String(mes).padStart(2, '0')}28`,
      formatAmount(monto, profile),
      `NOM${tenantId.substring(0, 8)}${String(index + 1).padStart(4, '0')}`,
    ]);

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
    includeHeader: Boolean(row.include_header),
    includeTrailer: Boolean(row.include_trailer),
    accountLength: Number(fieldMap.accountLength || fallbackProfile?.accountLength || 10),
    fields,
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

  return normalizeTenantBankProfile(result.rows[0], key);
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
}

module.exports = {
  generarArchivoBanco,
  getBankProfile,
  getBankProfileForTenant,
  decryptBankAccount,
  validateBankRows,
};
