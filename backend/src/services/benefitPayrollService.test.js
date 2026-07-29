jest.mock('pdfmake/build/pdfmake', () => ({
  createPdf: jest.fn(() => ({
    getBuffer: (callback) => callback(new Uint8Array([37, 80, 68, 70, 45, 49, 46, 51])),
  })),
}));

jest.mock('pdfmake/build/vfs_fonts', () => ({}));

const {
  BENEFIT_TYPES,
  normalizePayload,
  resolveBenefitPeriod,
  defaultPaymentDate,
  buildBenefitLines,
  pdfBufferFromDefinition,
} = require('./benefitPayrollService');

describe('benefitPayrollService', () => {
  test('resuelve periodos legales ecuatorianos de decimos', () => {
    expect(resolveBenefitPeriod('decimo_tercero', 2026, '')).toEqual({ desde: '2025-12-01', hasta: '2026-11-30' });
    expect(resolveBenefitPeriod('decimo_cuarto', 2026, 'costa_galapagos')).toEqual({ desde: '2025-03-01', hasta: '2026-02-28' });
    expect(resolveBenefitPeriod('decimo_cuarto', 2026, 'sierra_amazonia')).toEqual({ desde: '2025-08-01', hasta: '2026-07-31' });
    expect(defaultPaymentDate('decimo_cuarto', 2026, 'sierra_amazonia')).toBe('2026-08-15');
  });

  test('exige justificacion cuando el SBU/SMV de pago cambia', () => {
    expect(() => normalizePayload({ tipoBeneficio: 'decimo_cuarto', anio: 2026, region: 'costa_galapagos', sbuPago: 500 }, { payroll: { unifiedBaseSalary: 482 } })).toThrow('Explica el cambio');
    const payload = normalizePayload({ tipoBeneficio: 'decimo_cuarto', anio: 2026, region: 'costa_galapagos', sbuPago: 500, observacion: 'Resolucion oficial actualiza el SBU' }, { payroll: { unifiedBaseSalary: 482 } });
    expect(payload.sbuPago).toBe(500);
  });

  test('genera ajuste de decimo cuarto sin alterar la provision mensual', () => {
    const lines = buildBenefitLines('decimo_cuarto', [
      ...Array.from({ length: 12 }, () => ({ empleado_id: 'emp-1', cedula: '0102030405', nombres: 'Ana', apellidos: 'Paz', region_decimo_cuarto: 'costa_galapagos', modalidad_decimo_cuarto: 'acumulado', dias_trabajados: 30, detalle_calculo: { provisionDecimoCuarto: 482 / 12, ingresosBase: 482 } })),
    ], { anio: 2026, region: 'costa_galapagos', sbuPago: 500 });
    expect(lines).toHaveLength(1);
    expect(lines[0].provision).toBe(482.04);
    expect(lines[0].ajuste).toBe(17.96);
    expect(lines[0].pago).toBe(500);
    expect(BENEFIT_TYPES.decimo_cuarto.conceptCode).toBe('decimo_cuarto_acumulado');
  });

  test('normaliza el buffer de pdfmake para que Express lo entregue como PDF binario', async () => {
    const buffer = await pdfBufferFromDefinition({ content: ['prueba'] });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
