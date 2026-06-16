# Crear utilidades correctamente
utilidades_completo = '''// ============================================================
// PLAN HAIKY - Utilidades Completas
// ============================================================

// ============================================================
// VALIDAR CÉDULA ECUATORIANA
// ============================================================
function validarCedula(cedula) {
  if (!cedula || cedula.length !== 10) return false;
  if (!/^\\d{10}$/.test(cedula)) return false;
  
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

// ============================================================
// NÚMERO A LETRAS
// ============================================================
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

// ============================================================
// CÁLCULO IR ECUADOR 2026
// ============================================================
function calcularIREcuador(baseMensual, anio) {
  const baseAnual = baseMensual * 12;
  const fraccionBasica = 12208;
  
  if (baseAnual <= fraccionBasica) return 0;
  
  const tablaIR = [
    { desde: 12209, hasta: 15188, exceso: 12208, porcentaje: 5, fraccion: 0 },
    { desde: 15189, hasta: 19572, exceso: 15188, porcentaje: 10, fraccion: 148.95 },
    { desde: 19573, hasta: 23950, exceso: 19572, porcentaje: 12, fraccion: 587.15 },
    { desde: 23951, hasta: 41545, exceso: 23950, porcentaje: 15, fraccion: 1112.53 },
    { desde: 41546, hasta: 45820, exceso: 41545, porcentaje: 20, fraccion: 3751.63 },
    { desde: 45821, hasta: 55645, exceso: 45820, porcentaje: 25, fraccion: 4606.23 },
    { desde: 55646, hasta: 72545, exceso: 55645, porcentaje: 30, fraccion: 7062.23 },
    { desde: 72546, hasta: 102130, exceso: 72545, porcentaje: 35, fraccion: 12132.23 },
  ];
  
  let irAnual = 0;
  
  for (let tramo of tablaIR) {
    if (baseAnual >= tramo.desde) {
      const baseTramo = Math.min(baseAnual, tramo.hasta);
      const excedente = baseTramo - tramo.exceso;
      irAnual = tramo.fraccion + (excedente * tramo.porcentaje / 100);
    }
  }
  
  return Math.round((irAnual / 12) * 100) / 100;
}

// ============================================================
// CÁLCULO IESS
// ============================================================
function calcularAporteIESS(sueldoBruto) {
  const aportePersonal = sueldoBruto * 0.0945;
  const aportePatronal = sueldoBruto * 0.1115;
  
  return {
    aportePersonal: Math.round(aportePersonal * 100) / 100,
    aportePatronal: Math.round(aportePatronal * 100) / 100,
    total: Math.round((aportePersonal + aportePatronal) * 100) / 100,
  };
}

module.exports = {
  validarCedula,
  numeroALetras,
  calcularIREcuador,
  calcularAporteIESS,
};
'''

with open('backend/src/utils/utilidades.js', 'w') as f:
    f.write(utilidades_completo)

# Crear archivos individuales que reexportan
with open('backend/src/utils/validarCedula.js', 'w') as f:
    f.write('const { validarCedula } = require("./utilidades");\nmodule.exports = { validarCedula };\n')

with open('backend/src/utils/numeroALetras.js', 'w') as f:
    f.write('const { numeroALetras } = require("./utilidades");\nmodule.exports = { numeroALetras };\n')

with open('backend/src/utils/calculoIrEcuador.js', 'w') as f:
    f.write('const { calcularIREcuador } = require("./utilidades");\nmodule.exports = { calcularIREcuador };\n')

with open('backend/src/utils/calculoIess.js', 'w') as f:
    f.write('const { calcularAporteIESS } = require("./utilidades");\nmodule.exports = { calcularAporteIESS };\n')

print("✓ Utilidades creadas correctamente")
 # Result execute error ```