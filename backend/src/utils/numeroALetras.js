function numeroALetras(num) {
  if (num === 0) return "cero";
  if (num < 0) return "menos " + numeroALetras(Math.abs(num));

  const unidades = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
  const especiales = ["diez", "once", "doce", "trece", "catorce", "quince", "dieciseis", "diecisiete", "dieciocho", "diecinueve"];
  const decenas = ["", "diez", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
  const centenas = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

  let resultado = "";
  const entero = Math.floor(num);
  const decimal = Math.round((num - entero) * 100);

  if (entero >= 1000000) {
    const millones = Math.floor(entero / 1000000);
    resultado += (millones === 1 ? "un millón" : numeroALetras(millones) + " millones") + " ";
  }

  const restoMillones = entero % 1000000;

  if (restoMillones >= 1000) {
    const miles = Math.floor(restoMillones / 1000);
    resultado += (miles === 1 ? "mil" : numeroALetras(miles) + " mil") + " ";
  }

  const restoMiles = restoMillones % 1000;

  if (restoMiles >= 100) {
    if (restoMiles === 100) {
      resultado += "cien ";
    } else {
      resultado += centenas[Math.floor(restoMiles / 100)] + " ";
    }
  }

  const dec = restoMiles % 100;
  if (dec >= 10 && dec < 20) {
    resultado += especiales[dec - 10] + " ";
  } else if (dec >= 20 && dec < 30) {
    if (dec === 20) {
      resultado += "veinte ";
    } else {
      resultado += "veinti" + unidades[dec - 20] + " ";
    }
  } else {
    resultado += decenas[Math.floor(dec / 10)];
    if (dec % 10 > 0) resultado += " y " + unidades[dec % 10];
    resultado += " ";
  }

  resultado = resultado.trim();

  if (decimal > 0) {
    resultado += " con " + decimal + "/100";
  }

  return resultado;
}

module.exports = { numeroALetras };
