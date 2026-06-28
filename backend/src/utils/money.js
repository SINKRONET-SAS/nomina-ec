// ============================================================
// SKNOMINA - Utilidades monetarias
// ============================================================

function roundMoney(value) {
  if (!Number.isFinite(value)) {
    throw new Error('Valor monetario invalido para redondeo');
  }

  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toMoneyString(value) {
  return roundMoney(value).toFixed(2);
}

module.exports = {
  roundMoney,
  toMoneyString,
};
