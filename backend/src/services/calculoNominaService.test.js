const { calcularDiasTrabajados, calcularIR } = require('./calculoNominaService');
const { getLegalParameters } = require('../config/legal-ecuador');

describe('calculoNominaService', () => {
  test('calcula dias trabajados proporcionales para ingreso a mitad de mes', () => {
    expect(calcularDiasTrabajados('2026-06-16', 2026, 6)).toBe(15);
  });

  test('calcula IR mensual en cero para base anual exenta', () => {
    const legal = getLegalParameters(2026);
    expect(calcularIR(900, legal)).toBe(0);
  });

  test('calcula IR mensual para tramo progresivo', () => {
    const legal = getLegalParameters(2026);
    expect(calcularIR(2000, legal)).toBeGreaterThan(0);
  });
});
