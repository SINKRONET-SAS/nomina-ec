const AppError = require('../utils/AppError');
const configurationService = require('./configurationService');

const TEMPLATE_COLUMNS = [
  'organization_unit_code',
  'code',
  'name',
  'description',
  'salary_min',
  'salary_max',
  'currency',
  'effective_from',
  'effective_to',
  'status',
];

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function templateCsv() {
  return [
    TEMPLATE_COLUMNS.join(','),
    [
      'ADMINISTRACION',
      'ANALISTA_RRHH',
      'Analista RRHH',
      'Gestion de talento humano',
      '482.00',
      '1200.00',
      'USD',
      '2026-01-01',
      '',
      'activo',
    ].map(csvCell).join(','),
  ].join('\r\n');
}

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"' && quoted) {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseCsv(csv) {
  const lines = String(csv || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) {
    throw new AppError('La plantilla de cargos debe incluir encabezado y al menos una fila.', {
      code: 'CARGOS_CARGA_MASIVA_SIN_FILAS',
      statusCode: 400,
    });
  }
  const headers = parseCsvLine(lines[0]).map((value) => value.toLowerCase());
  if (headers.length !== TEMPLATE_COLUMNS.length || headers.some((value, index) => value !== TEMPLATE_COLUMNS[index])) {
    throw new AppError(`El encabezado no coincide con la plantilla oficial: ${TEMPLATE_COLUMNS.join(',')}.`, {
      code: 'CARGOS_CARGA_MASIVA_ENCABEZADO_INVALIDO',
      statusCode: 400,
    });
  }
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return TEMPLATE_COLUMNS.reduce((row, column, index) => ({ ...row, [column]: values[index] || '' }), {});
  });
}

function normalizeRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new AppError('La carga masiva de cargos requiere al menos una fila.', {
      code: 'CARGOS_CARGA_MASIVA_SIN_FILAS',
      statusCode: 400,
    });
  }
  if (rows.length > 1000) {
    throw new AppError('La carga masiva de cargos admite hasta 1.000 filas.', {
      code: 'CARGOS_CARGA_MASIVA_LIMITE',
      statusCode: 413,
    });
  }
  return rows.map((row) => Object.fromEntries(TEMPLATE_COLUMNS.map((column) => [column, String(row?.[column] || '').trim()])));
}

async function bulkCreateJobPositions({ user, rows, context }) {
  const normalizedRows = normalizeRows(rows);
  const seenCodes = new Set();
  const results = [];
  for (const [index, row] of normalizedRows.entries()) {
    const rowNumber = index + 2;
    try {
      const code = row.code.toUpperCase();
      if (seenCodes.has(code)) {
        throw new AppError('El código se repite dentro del archivo.', { code: 'CARGO_DUPLICADO_ARCHIVO', statusCode: 409 });
      }
      seenCodes.add(code);
      const record = await configurationService.createResource('jobPositions', row, user, context);
      results.push({ rowNumber, status: 'created', cargo: record });
    } catch (error) {
      results.push({
        rowNumber,
        status: 'error',
        code: error.code || 'CARGO_CARGA_MASIVA_FILA_INVALIDA',
        message: error.message || 'Fila inválida.',
      });
    }
  }
  return {
    total: results.length,
    creados: results.filter((row) => row.status === 'created').length,
    errores: results.filter((row) => row.status === 'error').length,
    results,
  };
}

module.exports = {
  TEMPLATE_COLUMNS,
  templateCsv,
  parseCsv,
  normalizeRows,
  bulkCreateJobPositions,
};
