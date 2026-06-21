function soloDigitos(value) {
  return String(value || '').replace(/\D+/g, '');
}

function establecimientoValido(ruc, tipo) {
  if (tipo === 6) return Number.parseInt(ruc.substring(9), 10) > 0;
  return Number.parseInt(ruc.substring(10), 10) > 0;
}

function validarModulo10(value) {
  const clean = soloDigitos(value);
  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 9; i += 1) {
    let valor = Number.parseInt(clean[i], 10) * coeficientes[i];
    if (valor >= 10) valor -= 9;
    suma += valor;
  }
  const residuo = suma % 10;
  const digitoVerificador = residuo === 0 ? 0 : 10 - residuo;
  return digitoVerificador === Number.parseInt(clean[9], 10);
}

function validarModulo11Privada(ruc) {
  const coeficientes = [4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = coeficientes.reduce((total, coeficiente, index) => (
    total + Number.parseInt(ruc[index], 10) * coeficiente
  ), 0);
  const residuo = suma % 11;
  const digitoVerificador = residuo === 0 ? 0 : 11 - residuo;
  if (digitoVerificador === 10) return false;
  return digitoVerificador === Number.parseInt(ruc[9], 10);
}

function validarModulo11Publica(ruc) {
  const coeficientes = [3, 2, 7, 6, 5, 4, 3, 2];
  const suma = coeficientes.reduce((total, coeficiente, index) => (
    total + Number.parseInt(ruc[index], 10) * coeficiente
  ), 0);
  const residuo = suma % 11;
  const digitoVerificador = residuo === 0 ? 0 : 11 - residuo;
  if (digitoVerificador === 10) return false;
  return digitoVerificador === Number.parseInt(ruc[8], 10);
}

function validarCedula(cedula) {
  const clean = soloDigitos(cedula);
  if (!/^\d{10}$/.test(clean)) return false;

  const codigoProvincia = Number.parseInt(clean.substring(0, 2), 10);
  if (codigoProvincia < 1 || codigoProvincia > 24) return false;
  if (Number.parseInt(clean[2], 10) > 5) return false;

  return validarModulo10(clean);
}

function validarRUC(ruc) {
  const clean = soloDigitos(ruc);
  if (!/^\d{13}$/.test(clean)) return false;

  const codigoProvincia = Number.parseInt(clean.substring(0, 2), 10);
  if ((codigoProvincia < 1 || codigoProvincia > 24) && codigoProvincia !== 30) return false;

  const tipo = Number.parseInt(clean[2], 10);
  if (!establecimientoValido(clean, tipo)) return false;

  if (tipo >= 0 && tipo <= 5) return validarModulo10(clean);
  if (tipo === 6) return validarModulo11Publica(clean);
  if (tipo === 9) return validarModulo11Privada(clean);
  return false;
}

function validarRUCFormato(ruc) {
  const clean = soloDigitos(ruc);
  if (!/^\d{13}$/.test(clean)) return false;

  const codigoProvincia = Number.parseInt(clean.substring(0, 2), 10);
  if ((codigoProvincia < 1 || codigoProvincia > 24) && codigoProvincia !== 30) return false;

  const tipo = Number.parseInt(clean[2], 10);
  if (!establecimientoValido(clean, tipo)) return false;

  if (tipo >= 0 && tipo <= 5) return validarModulo10(clean);
  return tipo === 6 || tipo === 9;
}

module.exports = {
  soloDigitos,
  validarCedula,
  validarRUC,
  validarRUCFormato,
};
