const ECUADOR_TIME_ZONE = 'America/Guayaquil';

function datePartsEC(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ECUADOR_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function parseDateOnly(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return { year: match[1], month: match[2], day: match[3] };
}

export function formatDateEC(value) {
  if (!value) return '-';

  const dateOnly = parseDateOnly(value);
  if (dateOnly) {
    return `${dateOnly.day}/${dateOnly.month}/${dateOnly.year}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('es-EC', { timeZone: ECUADOR_TIME_ZONE });
}

export function formatDateTimeEC(value) {
  if (!value) return '-';

  const dateOnly = parseDateOnly(value);
  if (dateOnly) {
    return `${dateOnly.day}/${dateOnly.month}/${dateOnly.year}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString('es-EC', { timeZone: ECUADOR_TIME_ZONE });
}

export function todayISOEC() {
  const values = datePartsEC();

  return `${values.year}-${values.month}-${values.day}`;
}

export function currentPeriodEC(value = new Date()) {
  const values = datePartsEC(value);
  const anio = Number(values.year);
  const mes = Number(values.month);

  return {
    anio,
    mes,
    year: anio,
    month: mes,
    label: `${values.month}/${values.year}`,
    timeZone: ECUADOR_TIME_ZONE,
  };
}

export function firstDayOfPeriodEC(anio, mes) {
  return `${Number(anio)}-${String(Number(mes)).padStart(2, '0')}-01`;
}

export { ECUADOR_TIME_ZONE };
