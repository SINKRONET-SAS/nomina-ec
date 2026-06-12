function parseIvaRate(value) {
  const parsed = Number(value);
  const normalized = parsed > 1 ? parsed / 100 : parsed;
  const allowedRates = [0, 0.12, 0.15];
  const rounded = Math.round(normalized * 10000) / 10000;

  if (!Number.isFinite(parsed) || parsed < 0 || !allowedRates.includes(rounded)) {
    const err = new Error('IVA comercial inválido. Use 0%, 12% o 15%.');
    err.code = 'COMMERCIAL_IVA_RATE_INVALID';
    err.statusCode = 500;
    throw err;
  }

  return rounded;
}

const COMMERCIAL_IVA_RATE = parseIvaRate(
  process.env.COMMERCIAL_IVA_RATE || process.env.PROVIDER_INVOICE_IVA_RATE || '0.15'
);

function buildPayphoneAmounts(baseCentavos) {
  const baseGravadaCentavos = Math.max(0, Math.round(Number(baseCentavos) || 0));
  const ivaCentavos = Math.round(baseGravadaCentavos * COMMERCIAL_IVA_RATE);
  const montoCentavos = baseGravadaCentavos + ivaCentavos;

  return {
    montoCentavos,
    baseGravadaCentavos,
    baseNoGravadaCentavos: 0,
    ivaCentavos,
    ivaPercent: Math.round(COMMERCIAL_IVA_RATE * 100),
    moneda: 'USD',
  };
}

function formatUsdFromCents(centavos) {
  return `$${(Math.max(0, Number(centavos) || 0) / 100).toFixed(2)}`;
}

module.exports = {
  COMMERCIAL_IVA_RATE,
  buildPayphoneAmounts,
  formatUsdFromCents,
};
