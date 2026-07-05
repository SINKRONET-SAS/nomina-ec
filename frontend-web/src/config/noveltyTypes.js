export const NOVELTY_TYPES = [
  { value: 'hora_extra_50', label: 'Hora extra 50%' },
  { value: 'hora_extra_100', label: 'Hora extra 100%' },
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

export function isAmountNoveltyType(value) {
  return AMOUNT_NOVELTY_TYPE_VALUES.has(value);
}

export function getNoveltyTypeLabel(value) {
  return NOVELTY_TYPE_LABELS.get(value) || String(value || '').replace(/_/g, ' ');
}

export function minutesToHours(value) {
  if (value === '' || value === null || value === undefined) {
    return '';
  }
  const minutes = Number(value);
  return Number.isFinite(minutes) ? (Math.round((minutes / 60) * 100) / 100).toFixed(2) : '';
}

export function hoursToMinutes(value) {
  if (value === '' || value === null || value === undefined) {
    return '';
  }
  const hours = Number(value);
  return Number.isFinite(hours) && hours >= 0 ? String(Math.round(hours * 60)) : '';
}
