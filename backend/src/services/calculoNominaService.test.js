const {
  calcularDiasTrabajados,
  calcularIR,
  calcularProvisionFondosReserva,
} = require('./calculoNominaService');
const { getLegalParameters } = require('../config/legal-ecuador');
const {
  assertLegalParametersReadyForProduction,
  VALIDATED_SOURCE_STATUS,
} = require('./legalParameterService');

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

  test('no provisiona fondos de reserva antes del primer año laboral', () => {
    expect(calcularProvisionFondosReserva('2026-02-01', 600, 2026, 6)).toBe(0);
  });

  test('provisiona fondos de reserva despues del primer año laboral', () => {
    expect(calcularProvisionFondosReserva('2024-01-01', 600, 2026, 6)).toBe(50);
  });

  test('bloquea calculos productivos con parametros legales pendientes', () => {
    const previous = process.env.REQUIRE_VALIDATED_LEGAL_PARAMETERS;
    process.env.REQUIRE_VALIDATED_LEGAL_PARAMETERS = 'true';

    expect(() => assertLegalParametersReadyForProduction(getLegalParameters(2026), {
      year: 2026,
      tenantId: 'tenant-prueba',
      operation: 'calculo_nomina',
    })).toThrow('Los parametros legales del periodo no tienen validacion oficial');

    process.env.REQUIRE_VALIDATED_LEGAL_PARAMETERS = previous;
  });

  test('permite calculos productivos cuando la fuente legal esta validada oficialmente', () => {
    const previous = process.env.REQUIRE_VALIDATED_LEGAL_PARAMETERS;
    process.env.REQUIRE_VALIDATED_LEGAL_PARAMETERS = 'true';
    const legal = { ...getLegalParameters(2026), sourceStatus: VALIDATED_SOURCE_STATUS };

    expect(() => assertLegalParametersReadyForProduction(legal, {
      year: 2026,
      tenantId: 'tenant-prueba',
      operation: 'calculo_nomina',
    })).not.toThrow();

    process.env.REQUIRE_VALIDATED_LEGAL_PARAMETERS = previous;
  });
});
