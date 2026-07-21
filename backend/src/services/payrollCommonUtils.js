'use strict';

/**
 * Utilidades compartidas entre payrollRolePdfService y payrollReportService.
 *
 * Extraídas para evitar duplicación y divergencia en mantenimiento.
 * Referencia: Auditoría AIV100-26, hallazgo A-02.
 */

/**
 * Normaliza un campo detalle que puede ser string JSON o ya objeto.
 */
function normalizeDetail(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return {}; }
}

/**
 * Determina si un código normalizado corresponde a concepto de horas extra.
 */
function isOvertimeConcept(normalizedCode) {
  return typeof normalizedCode === 'string' && /^he(50|100)$/i.test(normalizedCode);
}

/**
 * Determina si una línea de rol es una línea de novedad.
 */
function isRoleNoveltyLine(line = {}) {
  const metadata = normalizeDetail(line.metadata);
  return metadata.source === 'novelty' || metadata.noveltyId != null;
}

module.exports = { normalizeDetail, isOvertimeConcept, isRoleNoveltyLine };
