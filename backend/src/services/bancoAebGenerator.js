// ============================================================
// PLAN HAIKY - Generador de Archivo Bancario (Formato AEB)
// Para pago de nómina vía banco
// ============================================================
const ExcelJS = require('exceljs');
const { s3Upload } = require('../config/s3');
const db = require('../config/database');
const bankProfiles = require('../config/bank-file-profiles.json');
const { roundMoney, toMoneyString } = require('../utils/money');

/**
 * Genera archivo CSV/Excel para pago bancario
 */
async function generarArchivoBanco(tenantId, anio, mes, banco = 'PICHINCHA') {
  const profile = getBankProfile(banco);

  // 1. Obtener datos del tenant
  const tenantResult = await db.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
  if (tenantResult.rows.length === 0) throw new Error('Tenant no encontrado');
  const tenant = tenantResult.rows[0];
  
  // 2. Obtener nóminas con cuentas bancarias
  const nominasResult = await db.query(`
    SELECT e.cedula, e.nombres, e.apellidos, e.cuenta_bancaria_cifrada,
      e.banco, e.tipo_cuenta, n.neto_recibir
    FROM nominas n
    JOIN empleados e ON n.empleado_id = e.id
    WHERE n.tenant_id = $1 AND n.anio = $2 AND n.mes = $3
    AND e.cuenta_bancaria_cifrada IS NOT NULL
    ORDER BY e.apellidos, e.nombres
  `, [tenantId, anio, mes]);
  
  if (nominasResult.rows.length === 0) {
    throw new Error('No hay empleados con cuenta bancaria para el período');
  }
  
  // 3. Generar CSV formato AEB (Asociación Española de Banca - adaptado a Ecuador)
  const rows = [];
  
  // Cabecera
  rows.push([
    'TIPO_REGISTRO',
    'OFICINA',
    'DC',
    'CUENTA',
    'CEDULA',
    'NOMBRE',
    'CONCEPTO',
    'FECHA_OPERACION',
    'IMPORT',
    'REFERENCIA'
  ]);
  
  let totalPagos = 0;
  
  for (const [index, n] of nominasResult.rows.entries()) {
    const cuenta = await decryptBankAccount(n.cuenta_bancaria_cifrada);
    const bancoCodigo = getBankProfile(n.banco || banco).bankCode;
    const monto = roundMoney(parseFloat(n.neto_recibir));
    
    rows.push([
      '1', // Tipo registro: pago
      bancoCodigo.padStart(4, '0'), // Código banco
      '00', // DC
      cuenta.padStart(profile.accountLength, '0'), // Cuenta
      n.cedula, // Cédula
      `${n.apellidos} ${n.nombres}`.substring(0, 40), // Nombre
      `NOMINA ${String(mes).padStart(2, '0')}/${anio}`.substring(0, 40), // Concepto
      `${anio}${String(mes).padStart(2, '0')}28`, // Fecha operación (último día)
      formatAmount(monto, profile), // Importe
      `NOM${tenantId.substring(0, 8)}${String(index + 1).padStart(4, '0')}` // Referencia
    ]);
    
    totalPagos = roundMoney(totalPagos + monto);
  }
  
  // Total
  rows.push([
    '9', // Tipo registro: total
    '', '', '', '', '', '', '',
    formatAmount(totalPagos, profile),
    nominasResult.rows.length.toString()
  ]);
  
  // 4. Convertir a CSV
  validateBankRows(rows, totalPagos, nominasResult.rows.length, profile);
  const csvContent = rows.map(row => row.join(profile.delimiter)).join(profile.lineEnding);
  
  // 5. Subir a S3
  const key = `reportes/${tenantId}/banco/PAGO_NOMINA_${anio}${String(mes).padStart(2, '0')}_${banco}.csv`;
  const url = await s3Upload(Buffer.from(csvContent, 'utf8'), key, 'text/csv');
  
  // 6. También generar Excel
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Pagos');
  
  sheet.columns = [
    { header: 'Cédula', key: 'cedula', width: 15 },
    { header: 'Nombre', key: 'nombre', width: 40 },
    { header: 'Banco', key: 'banco', width: 15 },
    { header: 'Cuenta', key: 'cuenta', width: 15 },
    { header: 'Monto', key: 'monto', width: 12 },
  ];
  
  nominasResult.rows.forEach(n => {
    sheet.addRow({
      cedula: n.cedula,
      nombre: `${n.apellidos} ${n.nombres}`,
      banco: n.banco || banco,
      cuenta: '****', // No mostrar cuenta completa
      monto: parseFloat(n.neto_recibir),
    });
  });
  
  const excelBuffer = await workbook.xlsx.writeBuffer();
  const excelKey = `reportes/${tenantId}/banco/PAGO_NOMINA_${anio}${String(mes).padStart(2, '0')}.xlsx`;
  const excelUrl = await s3Upload(excelBuffer, excelKey, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  
  console.log(`[BANCO] Archivo generado para ${tenantId} - ${mes}/${anio}: ${nominasResult.rows.length} pagos, total $${toMoneyString(totalPagos)}`);
  
  return { csvUrl: url, excelUrl, totalPagos: toMoneyString(totalPagos), totalEmpleados: nominasResult.rows.length };
}

/**
 * Obtiene perfil bancario configurado
 */
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

module.exports = { generarArchivoBanco };

