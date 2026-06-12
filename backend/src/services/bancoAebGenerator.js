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

async function generarArchivoBanco(tenantId, anio, mes, banco = 'PICHINCHA', context = {}) {
  const profile = getBankProfile(banco);
  const tenantResult = await db.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);

  if (tenantResult.rows.length === 0) {
    throw new Error('Tenant no encontrado');
  }

  const nominasResult = await db.query(`
    SELECT e.cedula, e.nombres, e.apellidos, e.cuenta_bancaria_cifrada,
      e.banco, e.tipo_cuenta, n.neto_recibir
    FROM nominas n
    JOIN empleados e ON n.empleado_id = e.id
    WHERE n.tenant_id = $1
      AND n.anio = $2
      AND n.mes = $3
      AND n.estado = 'cerrada'
      AND e.cuenta_bancaria_cifrada IS NOT NULL
    ORDER BY e.apellidos, e.nombres
  `, [tenantId, anio, mes]);

  if (nominasResult.rows.length === 0) {
    throw new Error('No hay nominas cerradas con cuenta bancaria para el periodo');
  }

  const rows = [];
  if (profile.includeHeader) {
    rows.push(profile.fields.map((field) => field.toUpperCase()));
  }

  let totalPagos = 0;

  for (const [index, payroll] of nominasResult.rows.entries()) {
    const cuenta = await decryptBankAccount(payroll.cuenta_bancaria_cifrada);
    const bancoCodigo = getBankProfile(payroll.banco || banco).bankCode;
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
  const key = `reportes/${tenantId}/banco/PAGO_NOMINA_${anio}${String(mes).padStart(2, '0')}_${banco}.csv`;
  const url = await s3Upload(Buffer.from(csvContent, profile.encoding), key, 'text/csv');
  const excelUrl = await generateReviewWorkbook(nominasResult.rows, tenantId, anio, mes);

  if (context.correlationId) {
    await recordAudit({
      tenantId,
      userId: context.userId || null,
      correlationId: context.correlationId,
      action: 'generar_archivo_bancario',
      entity: 'perfiles_bancarios',
      newData: { banco, anio, mes, totalPagos, totalEmpleados: nominasResult.rows.length, checksum },
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
  ];

  rows.forEach((row) => {
    sheet.addRow({
      cedula: row.cedula,
      nombre: `${row.apellidos} ${row.nombres}`,
      banco: row.banco,
      cuenta: '****',
      monto: Number.parseFloat(row.neto_recibir),
    });
  });

  const excelBuffer = await workbook.xlsx.writeBuffer();
  const excelKey = `reportes/${tenantId}/banco/PAGO_NOMINA_${anio}${String(mes).padStart(2, '0')}.xlsx`;
  return s3Upload(excelBuffer, excelKey, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

function getBankProfile(banco) {
  const key = String(banco || '').toUpperCase();
  const profile = bankProfiles[key];

  if (!profile) {
    throw new Error(`Perfil bancario no configurado: ${key}`);
  }

  return profile;
}

async function decryptBankAccount(encryptedAccount) {
  const encryptionKey = process.env.BANK_ACCOUNT_ENCRYPTION_KEY || 'change-this-local-bank-key';
  const result = await db.query(
    'SELECT pgp_sym_decrypt($1::bytea, $2) as cuenta',
    [encryptedAccount, encryptionKey]
  );
  const account = result.rows[0]?.cuenta;

  if (!account) {
    throw new Error('No se pudo descifrar la cuenta bancaria');
  }

  return account.replace(/\D/g, '');
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
  validateBankRows,
};
