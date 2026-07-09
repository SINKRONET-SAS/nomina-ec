export function formatCurrency(value) {
  if (value === null || typeof value === 'undefined' || value === '') return 'Sin límite';
  return Number(value).toLocaleString('es-EC', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatRate(value) {
  const rate = Number(value || 0);
  return `${(rate * 100).toLocaleString('es-EC', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}

export function normalizeIncomeTaxBrackets(record) {
  let value = record?.value;
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return []; }
  }
  if (Array.isArray(value)) return value;
  return Array.isArray(value?.brackets) ? value.brackets : [];
}

export function legalParameterValue(record) {
  let value = record?.value || {};
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return value; }
  }

  if (['income_tax_table', 'tabla_impuesto_renta'].includes(record?.parameter_key)) {
    return `${normalizeIncomeTaxBrackets(record).length} tramos`;
  }

  if (typeof value.amount !== 'undefined') {
    if (String(record.unit || '').includes('porcentaje')) {
      return formatRate(value.amount);
    }
    return `${formatCurrency(value.amount)} ${record.unit || ''}`.trim();
  }

  if (typeof value.rate !== 'undefined' || typeof value.paymentMonth !== 'undefined' || typeof value.startsAfterMonths !== 'undefined') {
    return [
      typeof value.rate !== 'undefined' ? `tasa ${formatRate(value.rate)}` : '',
      typeof value.amount !== 'undefined' ? `base ${formatCurrency(value.amount)}` : '',
      typeof value.paymentMonth !== 'undefined' ? `mes pago ${value.paymentMonth}` : '',
      typeof value.startsAfterMonths !== 'undefined' ? `desde mes ${value.startsAfterMonths + 1}` : '',
      value.region || '',
      value.calculationBase || '',
    ].filter(Boolean).join(' - ');
  }

  return JSON.stringify(value);
}

export function labelLegalParameter(key) {
  const labels = {
    sbu: 'Salario básico unificado',
    iess_aporte_personal: 'IESS personal',
    iess_aporte_patronal: 'IESS patronal',
    jornada_horas_mensuales: 'Horas mensuales valor hora',
    jornada_maxima_semanal: 'Jornada máxima semanal',
    provision_vacaciones: 'Provisión vacaciones',
    vacaciones_dias_anuales: 'Vacaciones anuales',
    decimo_tercero: 'Décimo tercero',
    decimo_cuarto_costa_galapagos: 'Décimo cuarto Costa/Galapagos',
    decimo_cuarto_sierra_amazonia: 'Décimo cuarto Sierra/Amazonía',
    fondo_reserva: 'Fondo de reserva',
    income_tax_table: 'Tabla impuesto a la renta',
    tabla_impuesto_renta: 'Tabla impuesto a la renta',
  };

  return labels[key] || key;
}

export function latestLegalParameters(records) {
  const byKey = new Map();

  [...records]
    .sort((a, b) => {
      if (Number(b.period_year) !== Number(a.period_year)) return Number(b.period_year) - Number(a.period_year);
      return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
    })
    .forEach((record) => {
      if (!byKey.has(record.parameter_key)) {
        byKey.set(record.parameter_key, record);
      }
    });

  return [...byKey.values()];
}
