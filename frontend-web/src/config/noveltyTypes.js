export const NOVELTY_TYPES = [
  { value: 'hora_extra_50', label: 'Hora extra 50%' },
  { value: 'hora_extra_100', label: 'Hora extra 100%' },
  { value: 'hora_extra_nocturna', label: 'Hora extra nocturna' },
  { value: 'atraso', label: 'Atraso' },
  { value: 'salida_temprana', label: 'Salida temprana' },
  { value: 'falta', label: 'Falta injustificada' },
  { value: 'permiso_con_sueldo', label: 'Permiso con sueldo' },
  { value: 'permiso_sin_sueldo', label: 'Permiso sin sueldo' },
  { value: 'incapacidad_iess', label: 'Incapacidad IESS' },
  { value: 'vacaciones', label: 'Vacaciones' },
  { value: 'bono_desempeno', label: 'Bono de desempeño' },
  { value: 'comision', label: 'Comisión' },
];

const AMOUNT_NOVELTY_TYPE_VALUES = new Set(['bono_desempeno', 'comision']);
const NOVELTY_TYPE_LABELS = new Map(NOVELTY_TYPES.map((type) => [type.value, type.label]));
const AMOUNT_CALCULATION_MODES = new Set(['amount']);

function normalizeNoveltyCode(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function normalizeNoveltyTypeOption(type = {}) {
  const value = normalizeNoveltyCode(type.value || type.code || type.tipo_novedad);
  if (!value) return null;

  const applicability = type.applicability && typeof type.applicability === 'object' ? type.applicability : {};
  const calculationMode = String(
    type.calculationMode
      || type.calculation_mode
      || applicability.calculationMode
      || ''
  ).trim();

  return {
    ...type,
    value,
    label: String(type.label || type.name || value.replace(/_/g, ' ')).trim(),
    calculationMode,
    payrollImpact: type.payrollImpact || type.payroll_impact || '',
    status: type.status || 'activo',
  };
}

export function buildNoveltyTypeOptions(types = []) {
  const seen = new Set();
  const options = [];

  for (const type of types) {
    const option = normalizeNoveltyTypeOption(type);
    if (!option || seen.has(option.value)) continue;
    if (String(option.status || '').toLowerCase() !== 'activo') continue;
    seen.add(option.value);
    options.push(option);
  }

  return options.length > 0 ? options : NOVELTY_TYPES;
}

function findNoveltyType(value, types = NOVELTY_TYPES) {
  const normalized = normalizeNoveltyCode(value);
  return buildNoveltyTypeOptions(types).find((type) => type.value === normalized);
}

export function isAmountNoveltyType(value, types = NOVELTY_TYPES) {
  const type = findNoveltyType(value, types);
  if (type?.calculationMode) return AMOUNT_CALCULATION_MODES.has(type.calculationMode);
  return AMOUNT_NOVELTY_TYPE_VALUES.has(normalizeNoveltyCode(value));
}

export function getNoveltyTypeLabel(value, types = NOVELTY_TYPES) {
  const type = findNoveltyType(value, types);
  if (type?.label) return type.label;
  const normalized = normalizeNoveltyCode(value);
  return NOVELTY_TYPE_LABELS.get(normalized) || String(value || '').replace(/_/g, ' ');
}

export function minutesToHours(value) {
  if (value === '' || value === null || value === undefined) {
    return '';
  }
  const minutes = Number(value);
  return Number.isFinite(minutes) ? (Math.round((minutes / 60) * 100) / 100).toFixed(2) : '';
}

export function normalizeHoursDraft(value) {
  const normalized = String(value ?? '').trim().replace(',', '.');
  if (normalized === '') return '';
  return /^\d{0,5}(\.\d{0,2})?$/.test(normalized) ? normalized : null;
}

export function hoursDraftToNumber(value) {
  const normalized = String(value ?? '').trim().replace(',', '.');
  const hours = Number(normalized);
  return Number.isFinite(hours) && hours >= 0 ? hours : 0;
}

export function hoursToMinutes(value) {
  if (value === '' || value === null || value === undefined) {
    return '';
  }
  const hours = Number(value);
  return Number.isFinite(hours) && hours >= 0 ? String(Math.round(hours * 60)) : '';
}
