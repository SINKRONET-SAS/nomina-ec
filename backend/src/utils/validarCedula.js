function validarCedula(cedula) {
  if (!cedula || cedula.length !== 10) return false;
  if (!/^\d{10}$/.test(cedula)) return false;

  const codigoProvincia = parseInt(cedula.substring(0, 2));
  if (codigoProvincia < 1 || codigoProvincia > 24) return false;

  const tercerDigito = parseInt(cedula[2]);
  if (tercerDigito > 6 && tercerDigito !== 9) return false;

  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;

  for (let i = 0; i < 9; i++) {
    let valor = parseInt(cedula[i]) * coeficientes[i];
    if (valor > 9) valor -= 9;
    suma += valor;
  }

  const digitoVerificador = (10 - (suma % 10)) % 10;
  return digitoVerificador === parseInt(cedula[9]);
}

module.exports = { validarCedula };
