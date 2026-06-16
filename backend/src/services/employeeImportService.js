const crypto = require('crypto');
const db = require('../config/database');
const { recordAudit } = require('./auditService');
const { validarCedula } = require('../utils/validarCedula');

const HEADER_ALIASES = {
  externalid: 'externalId',
  external_id: 'externalId',
  codigo: 'externalId',
  identification: 'identification',
  identificacion: 'identification',
  cedula: 'identification',
  first_name: 'firstName',
  firstname: 'firstName',
  nombres: 'firstName',
  last_name: 'lastName',
  lastname: 'lastName',
  apellidos: 'lastName',
  department_code: 'departmentCode',
  departmentcode: 'departmentCode',
  departamento: 'departmentCode',
  cargo: 'position',
  position: 'position',
  hire_date: 'hireDate',
  hiredate: 'hireDate',
  fecha_ingreso: 'hireDate',
  salary: 'salary',
  sueldo: 'salary',
  sueldo_bruto_mensual: 'salary',
  bank_code: 'bankCode',
  bankcode: 'bankCode',
  banco: 'bankCode',
  bank_account: 'bankAccount',
  bankaccount: 'bankAccount',
  cuenta_bancaria: 'bankAccount',
  account_type: 'accountType',
  accounttype: 'accountType',
  tipo_cuenta: 'accountType',
  contract_type: 'contractType',
  contracttype: 'contractType',
  tipo_contrato: 'contractType',
  email: 'email',
  correo: 'email',
  phone: 'phone',
  telefono: 'phone',
  address: 'address',
  direccion: 'address',
};

const REQUIRED_FIELDS = ['identification', 'firstName', 'lastName', 'hireDate', 'salary'];

function cleanHeader(value) {
  return String(value || '')
    .trim()
    .replace(/^\uFEFF/, '')
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function canonicalHeader(value) {
  const clean = cleanHeader(value);
  return HEADER_ALIASES[clean] || clean;
}

function detectDelimiter(headerLine) {
  const candidates = [';', ',', '\t'];
  return candidates
    .map((delimiter) => ({
      delimiter,
      count: (headerLine.match(new RegExp(delimiter === '\t' ? '\\t' : `\\${delimiter}`, 'g')) || []).length,
    }))
    .sort((a, b) => b.count - a.count)[0].delimiter;
}

function splitDelimitedLine(line, delimiter) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function parseEmployeeImport({ rawText, rows }) {
  if (Array.isArray(rows)) {
    return rows.map((row, index) => normalizeEmployeeRow(row, index + 2));
  }

  const lines = String(rawText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitDelimitedLine(lines[0], delimiter).map(canonicalHeader);

  return lines.slice(1).map((line, index) => {
    const values = splitDelimitedLine(line, delimiter);
    const row = headers.reduce((memo, header, headerIndex) => ({
      ...memo,
      [header]: values[headerIndex] || '',
    }), {});
    return normalizeEmployeeRow(row, index + 2);
  });
}

function normalizeEmployeeRow(row, rowNumber = 1) {
  const source = row || {};
  return {
    rowNumber,
    externalId: String(source.externalId || source.external_id || '').trim(),
    identification: String(source.identification || source.cedula || '').replace(/\D/g, ''),
    firstName: String(source.firstName || source.nombres || '').trim(),
    lastName: String(source.lastName || source.apellidos || '').trim(),
    departmentCode: String(source.departmentCode || source.departamento || '').trim(),
    position: String(source.position || source.cargo || '').trim(),
    hireDate: String(source.hireDate || source.fecha_ingreso || '').trim(),
    salary: String(source.salary || source.sueldo_bruto_mensual || '').trim(),
    bankCode: String(source.bankCode || source.banco || '').trim(),
    bankAccount: String(source.bankAccount || source.cuenta_bancaria || '').trim(),
    accountType: String(source.accountType || source.tipo_cuenta || '').trim(),
    contractType: String(source.contractType || source.tipo_contrato || 'indefinido').trim() || 'indefinido',
    email: String(source.email || source.correo || '').trim(),
    phone: String(source.phone || source.telefono || '').trim(),
    address: String(source.address || source.direccion || '').trim(),
  };
}

function maskBankAccount(value) {
  if (!value) return '';
  const text = String(value);
  if (text.length <= 4) return '****';
  return `${'*'.repeat(Math.max(4, text.length - 4))}${text.slice(-4)}`;
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function buildPreviewRows(rows, existingCedulas = new Set()) {
  const seen = new Map();

  rows.forEach((row) => {
    if (!row.identification) return;
    seen.set(row.identification, (seen.get(row.identification) || 0) + 1);
  });

  return rows.map((row) => {
    const errors = [];

    REQUIRED_FIELDS.forEach((field) => {
      if (!row[field]) errors.push(`Campo requerido: ${field}`);
    });

    if (row.identification && !validarCedula(row.identification)) {
      errors.push('Cedula ecuatoriana invalida');
    }
    if (row.identification && seen.get(row.identification) > 1) {
      errors.push('Cedula duplicada en el archivo');
    }
    if (row.identification && existingCedulas.has(row.identification)) {
      errors.push('Cedula ya registrada en el sistema');
    }

    const salary = Number(row.salary);
    if (!Number.isFinite(salary) || salary <= 0) {
      errors.push('Sueldo debe ser un numero positivo');
    }

    if (row.hireDate && !isValidDate(row.hireDate)) {
      errors.push('Fecha de ingreso debe usar formato YYYY-MM-DD');
    }
    if (row.hireDate && isValidDate(row.hireDate) && new Date(`${row.hireDate}T00:00:00.000Z`) > new Date()) {
      errors.push('Fecha de ingreso futura requiere revision manual');
    }

    return {
      rowNumber: row.rowNumber,
      status: errors.length ? 'error' : 'valid',
      errors,
      data: {
        externalId: row.externalId,
        identification: row.identification,
        firstName: row.firstName,
        lastName: row.lastName,
        departmentCode: row.departmentCode,
        position: row.position,
        hireDate: row.hireDate,
        salary: salary > 0 ? salary : row.salary,
        bankCode: row.bankCode,
        bankAccount: maskBankAccount(row.bankAccount),
        accountType: row.accountType,
        contractType: row.contractType,
        email: row.email,
      },
      original: row,
    };
  });
}

function summarizePreview(previewRows) {
  const totalRows = previewRows.length;
  const errorRows = previewRows.filter((row) => row.status === 'error').length;
  return {
    totalRows,
    validRows: totalRows - errorRows,
    errorRows,
    rows: previewRows.map(({ original, ...row }) => row),
  };
}

async function getExistingCedulas(rows) {
  const cedulas = [...new Set(rows.map((row) => row.identification).filter(Boolean))];
  if (cedulas.length === 0) return new Set();

  const result = await db.query(
    'SELECT cedula FROM empleados WHERE cedula = ANY($1::text[])',
    [cedulas]
  );
  return new Set(result.rows.map((row) => row.cedula));
}

async function previewEmployeeImport(payload) {
  const rows = parseEmployeeImport(payload);
  const existingCedulas = await getExistingCedulas(rows);
  return summarizePreview(buildPreviewRows(rows, existingCedulas));
}

function batchFingerprint(payload) {
  return crypto.createHash('sha256').update(String(payload.rawText || JSON.stringify(payload.rows || []))).digest('hex');
}

async function encryptBankAccount(client, account) {
  if (!account) return null;
  const result = await client.query(
    'SELECT pgp_sym_encrypt($1, $2) as cifrado',
    [account, process.env.BANK_ACCOUNT_ENCRYPTION_KEY || 'change-this-local-bank-key']
  );
  return result.rows[0].cifrado;
}

async function commitEmployeeImport({ tenantId, userId, correlationId, ipAddress, payload }) {
  const rows = parseEmployeeImport(payload);
  const existingCedulas = await getExistingCedulas(rows);
  const previewRows = buildPreviewRows(rows, existingCedulas);
  const preview = summarizePreview(previewRows);

  if (preview.errorRows > 0 || preview.validRows === 0) {
    return { ok: false, status: 400, preview };
  }

  const client = await db.getClient(tenantId, userId);
  let batchId;

  try {
    const batch = await client.query(`
      INSERT INTO employee_import_batches (
        tenant_id, created_by, source_name, status, total_rows, valid_rows, error_rows, summary
      )
      VALUES ($1,$2,$3,'procesando',$4,$5,$6,$7)
      RETURNING id
    `, [
      tenantId,
      userId || null,
      payload.sourceName || 'carga_manual',
      preview.totalRows,
      preview.validRows,
      preview.errorRows,
      JSON.stringify({ fingerprint: batchFingerprint(payload), preview: preview.rows }),
    ]);
    batchId = batch.rows[0].id;

    const inserted = [];
    for (const previewRow of previewRows) {
      const row = previewRow.original;
      const encryptedAccount = await encryptBankAccount(client, row.bankAccount);
      const result = await client.query(`
        INSERT INTO empleados (
          tenant_id, cedula, nombres, apellidos, cargo, departamento,
          sueldo_bruto_mensual, fecha_ingreso, tipo_contrato,
          cuenta_bancaria_cifrada, banco, tipo_cuenta,
          direccion_domicilio, telefono, email_personal, import_batch_id
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        RETURNING id, cedula, nombres, apellidos
      `, [
        tenantId,
        row.identification,
        row.firstName,
        row.lastName,
        row.position,
        row.departmentCode,
        Number(row.salary),
        row.hireDate,
        row.contractType || 'indefinido',
        encryptedAccount,
        row.bankCode,
        row.accountType,
        row.address,
        row.phone,
        row.email,
        batchId,
      ]);
      inserted.push(result.rows[0]);
    }

    await client.query(`
      UPDATE employee_import_batches
      SET status = 'completado', completed_at = NOW(), summary = $2
      WHERE id = $1
    `, [
      batchId,
      JSON.stringify({ fingerprint: batchFingerprint(payload), imported: inserted.length, preview: preview.rows }),
    ]);

    await db.commit(client);

    await recordAudit({
      tenantId,
      userId,
      correlationId,
      action: 'empleados.import.commit',
      entity: 'employee_import_batches',
      entityId: batchId,
      newData: { imported: inserted.length },
      metadata: { sourceName: payload.sourceName || 'carga_manual', totalRows: preview.totalRows },
      ipAddress,
    });

    return {
      ok: true,
      status: 201,
      batchId,
      totalImported: inserted.length,
      preview: summarizePreview(previewRows),
    };
  } catch (err) {
    await db.rollback(client);
    throw err;
  }
}

async function listEmployeeImportBatches({ tenantId, limit = 10 }) {
  const result = await db.query(`
    SELECT
      b.id,
      b.source_name,
      b.status,
      b.total_rows,
      b.valid_rows,
      b.error_rows,
      b.summary,
      b.created_at,
      b.completed_at,
      COUNT(e.id)::int AS employee_count
    FROM employee_import_batches b
    LEFT JOIN empleados e
      ON e.tenant_id = b.tenant_id
     AND e.import_batch_id = b.id
    WHERE b.tenant_id = $1
    GROUP BY b.id
    ORDER BY b.created_at DESC
    LIMIT $2
  `, [tenantId, limit]);

  return result.rows;
}

async function rollbackEmployeeImport({ tenantId, batchId, userId, correlationId, ipAddress }) {
  const client = await db.getClient(tenantId, userId);

  try {
    const batch = await client.query(`
      SELECT id, status, source_name
      FROM employee_import_batches
      WHERE tenant_id = $1 AND id = $2
      FOR UPDATE
    `, [tenantId, batchId]);

    if (batch.rows.length === 0) {
      await db.rollback(client);
      return {
        ok: false,
        status: 404,
        error: 'EMPLOYEE_IMPORT_BATCH_NOT_FOUND',
        message: 'No encontramos el lote de importacion solicitado.',
      };
    }

    if (batch.rows[0].status === 'revertido') {
      await db.rollback(client);
      return {
        ok: true,
        status: 200,
        batchId,
        deletedEmployees: 0,
        message: 'El lote ya estaba revertido.',
      };
    }

    if (batch.rows[0].status !== 'completado') {
      await db.rollback(client);
      return {
        ok: false,
        status: 409,
        error: 'EMPLOYEE_IMPORT_BATCH_NOT_READY',
        message: 'Solo se pueden revertir lotes completados.',
      };
    }

    const employees = await client.query(`
      SELECT id, cedula, nombres, apellidos
      FROM empleados
      WHERE tenant_id = $1 AND import_batch_id = $2
    `, [tenantId, batchId]);

    if (employees.rows.length === 0) {
      await client.query(`
        UPDATE employee_import_batches
        SET status = 'revertido', completed_at = NOW(),
            summary = summary || $3::jsonb
        WHERE tenant_id = $1 AND id = $2
      `, [tenantId, batchId, JSON.stringify({ rollback: { deletedEmployees: 0, reason: 'sin_empleados_importados' } })]);
      await db.commit(client);
      return {
        ok: true,
        status: 200,
        batchId,
        deletedEmployees: 0,
        message: 'El lote no tenia empleados activos para revertir.',
      };
    }

    const blockers = await client.query(`
      WITH imported AS (
        SELECT id
        FROM empleados
        WHERE tenant_id = $1 AND import_batch_id = $2
      )
      SELECT empleado_id, source, COUNT(*)::int AS total
      FROM (
        SELECT empleado_id, 'nominas' AS source FROM nominas WHERE tenant_id = $1 AND empleado_id IN (SELECT id FROM imported)
        UNION ALL
        SELECT empleado_id, 'marcaciones' AS source FROM marcaciones WHERE tenant_id = $1 AND empleado_id IN (SELECT id FROM imported)
        UNION ALL
        SELECT empleado_id, 'novedades_asistencia' AS source FROM novedades_asistencia WHERE tenant_id = $1 AND empleado_id IN (SELECT id FROM imported)
        UNION ALL
        SELECT empleado_id, 'acta_entrega_equipos' AS source FROM acta_entrega_equipos WHERE tenant_id = $1 AND empleado_id IN (SELECT id FROM imported)
        UNION ALL
        SELECT empleado_id, 'beneficios_empleados' AS source FROM beneficios_empleados WHERE tenant_id = $1 AND empleado_id IN (SELECT id FROM imported)
      ) refs
      GROUP BY empleado_id, source
      ORDER BY empleado_id, source
    `, [tenantId, batchId]);

    if (blockers.rows.length > 0) {
      await db.rollback(client);
      return {
        ok: false,
        status: 409,
        error: 'EMPLOYEE_IMPORT_ROLLBACK_BLOCKED',
        message: 'No se puede revertir el lote porque ya existen procesos laborales asociados.',
        blockers: blockers.rows,
      };
    }

    const deleted = await client.query(`
      DELETE FROM empleados
      WHERE tenant_id = $1 AND import_batch_id = $2
      RETURNING id, cedula, nombres, apellidos
    `, [tenantId, batchId]);

    await client.query(`
      UPDATE employee_import_batches
      SET status = 'revertido', completed_at = NOW(),
          summary = summary || $3::jsonb
      WHERE tenant_id = $1 AND id = $2
    `, [
      tenantId,
      batchId,
      JSON.stringify({ rollback: { deletedEmployees: deleted.rows.length, correlationId } }),
    ]);

    await db.commit(client);

    await recordAudit({
      tenantId,
      userId,
      correlationId,
      action: 'empleados.import.rollback',
      entity: 'employee_import_batches',
      entityId: batchId,
      newData: { deletedEmployees: deleted.rows.length },
      metadata: { sourceName: batch.rows[0].source_name },
      ipAddress,
    });

    return {
      ok: true,
      status: 200,
      batchId,
      deletedEmployees: deleted.rows.length,
      employees: deleted.rows,
    };
  } catch (err) {
    await db.rollback(client);
    throw err;
  }
}

module.exports = {
  buildPreviewRows,
  commitEmployeeImport,
  listEmployeeImportBatches,
  parseEmployeeImport,
  previewEmployeeImport,
  rollbackEmployeeImport,
  splitDelimitedLine,
};
