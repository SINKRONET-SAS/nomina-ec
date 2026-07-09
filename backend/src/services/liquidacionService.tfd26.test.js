const {
  calcularDesahucio,
  calcularIndemnizacionDespidoIntempestivo,
  validateTerminationCauseForEmployee,
} = require('./liquidacionService');
const { getTerminationCause, listTerminationCauses } = require('../config/terminationCauses');

describe('liquidacionService TFD26', () => {
  test('incluye terminacion unilateral en periodo de prueba', () => {
    const causes = listTerminationCauses().map((cause) => cause.code);

    expect(causes).toContain('periodo_prueba_unilateral_empleador');
    expect(causes).toContain('periodo_prueba_unilateral_trabajador');
  });

  test('bloquea periodo de prueba vencido', () => {
    expect(() => validateTerminationCauseForEmployee(
      getTerminationCause('periodo_prueba_unilateral_empleador'),
      { diasServicio: 91 },
    )).toThrow('periodo de prueba');
  });

  test('calcula despido intempestivo con fraccion de anio como anio completo', () => {
    const cause = getTerminationCause('despido_intempestivo');

    expect(calcularIndemnizacionDespidoIntempestivo(1000, 4.2, cause)).toBe(5000);
    expect(calcularDesahucio(1000, 4.2, cause)).toBe(1000);
  });

  test('paga bonificacion por desahucio en mutuo acuerdo', () => {
    expect(calcularDesahucio(800, 3.8, getTerminationCause('mutuo_acuerdo'))).toBe(600);
  });
});
