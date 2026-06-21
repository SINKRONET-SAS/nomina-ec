const {
  soloDigitos,
  validarCedula,
  validarRUC,
  validarRUCFormato,
} = require('./validarCedula');

describe('validacion ecuatoriana de identificacion', () => {
  test('normaliza digitos', () => {
    expect(soloDigitos('17-13175071')).toBe('1713175071');
  });

  test('valida cedula con modulo 10 y tercer digito 0-5', () => {
    expect(validarCedula('1713175071')).toBe(true);
    expect(validarCedula('1700000000')).toBe(false);
    expect(validarCedula('1790016919')).toBe(false);
  });

  test('valida RUC persona natural de forma estricta', () => {
    expect(validarRUC('1713175071001')).toBe(true);
    expect(validarRUC('1713175072001')).toBe(false);
  });

  test('permite formato de RUC juridico privado sin falso negativo de modulo 11', () => {
    expect(validarRUC('1793235327001')).toBe(false);
    expect(validarRUCFormato('1793235327001')).toBe(true);
  });
});
