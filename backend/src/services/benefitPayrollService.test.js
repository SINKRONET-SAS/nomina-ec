jest.mock('pdfmake/build/pdfmake', () => ({
  createPdf: jest.fn(() => ({
    getBuffer: (callback) => callback(new Uint8Array([37, 80, 68, 70, 45, 49, 46, 51])),
  })),
}));

jest.mock('pdfmake/build/vfs_fonts', () => ({}));

jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

const {
  BENEFIT_TYPES,
  normalizePayload,
  resolveBenefitPeriod,
  defaultPaymentDate,
  buildBenefitLines,
  assertMonthlyPayrollsClosed,
  buildPdf,
  pdfBufferFromDefinition,
} = require('./benefitPayrollService');
const db = require('../config/database');
const pdfmake = require('pdfmake/build/pdfmake');

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

  test('conserva el empleado al generar utilidades y no deja empleadoId nulo', () => {
    const lines = buildBenefitLines('participacion_laboral', [
      { empleadoId: 'emp-1', cedula: '0102030405', nombres: 'Ana', apellidos: 'Paz', cargas_familiares: 2, dias_trabajados: 360, sueldo_bruto: 1000, total_ingresos: 1000, detalle_calculo: {} },
    ], { anio: 2026, utilidadLiquida: 15000 });

    expect(lines).toHaveLength(1);
    expect(lines[0].empleadoId).toBe('emp-1');
    expect(lines[0].pago).toBe(2250);
    expect(lines[0].metadata.reportRow.poolParticipacion).toBe(2250);
  });

  test('bloquea beneficios si existen roles mensuales normales abiertos', async () => {
    db.query.mockReset().mockResolvedValueOnce({
      rows: [{ anio: 2026, mes: 6, total_roles: 2, roles_cerrados: 1, roles_pendientes: 1 }],
    });

    await expect(assertMonthlyPayrollsClosed('tenant-1', {
      desde: '2026-01-01',
      hasta: '2026-12-31',
    })).rejects.toMatchObject({
      code: 'ROL_BENEFICIO_NOMINAS_MENSUALES_ABIERTAS',
      statusCode: 422,
      details: {
        pendingMonths: ['2026-06'],
        reviewRoute: '/dashboard/nomina/cerrar',
      },
    });
  });

  test('normaliza el buffer de pdfmake para que Express lo entregue como PDF binario', async () => {
    const buffer = await pdfBufferFromDefinition({ content: ['prueba'] });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  test('incluye días y modalidad, y omite la nota redundante del PDF', async () => {
    db.query.mockReset()
      .mockResolvedValueOnce({
        rows: [{
          id: 'role-1',
          tenant_id: 'tenant-1',
          tipo_beneficio: 'decimo_cuarto',
          anio: 2026,
          region: 'sierra_amazonia',
          fecha_pago: '2026-08-15',
          periodo_desde: '2025-08-01',
          periodo_hasta: '2026-07-31',
          estado: 'borrador',
          total_provision: 401.70,
          total_ajuste: -5.39,
          total_pago: 396.31,
        }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'line-1',
          role_id: 'role-1',
          empleado_id: 'employee-1',
          nombres: 'Marco',
          apellidos: 'Paz',
          cedula: '0102030405',
          dias: 296,
          monto_provision: 401.70,
          monto_ajuste: -5.39,
          monto_pago: 396.31,
          modalidad: 'acumulado',
          destino: 'empleado',
        }],
      });

    const result = await buildPdf('tenant-1', 'role-1');
    const definition = pdfmake.createPdf.mock.calls.at(-1)[0];
    const table = definition.content.find((item) => item.table).table;

    expect(table.body[0].map((cell) => cell.text)).toEqual([
      'Empleado', 'Cédula', 'Días', 'Modalidad', 'SBU/SMV provisión', 'SBU/SMV pago', 'Provisión', 'Ajuste legal', 'Pago del rol', 'Destino del pago',
    ]);
    expect(table.body[1]).toEqual([
      'Paz Marco', '0102030405', '296', 'Acumulado', '', '', '$401.70', '$-5.39', '$396.31', 'Empleado',
    ]);
    expect(definition.content.some((item) => String(item.text || '').includes('La provisión mensual'))).toBe(false);
    expect(Buffer.isBuffer(result.buffer)).toBe(true);
  });

  test('genera columnas y factores específicos para el PDF de participación laboral', async () => {
    db.query.mockReset()
      .mockResolvedValueOnce({
        rows: [{
          id: 'role-utilidades',
          tenant_id: 'tenant-1',
          tipo_beneficio: 'participacion_laboral',
          anio: 2026,
          region: '',
          fecha_pago: '2026-04-15',
          periodo_desde: '2025-01-01',
          periodo_hasta: '2025-12-31',
          estado: 'borrador',
          total_provision: 0,
          total_ajuste: 2250,
          total_pago: 2250,
        }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'line-utilidades',
          role_id: 'role-utilidades',
          empleado_id: 'employee-1',
          nombres: 'Ana',
          apellidos: 'Paz',
          cedula: '0102030405',
          dias: 360,
          monto_provision: 0,
          monto_ajuste: 2250,
          monto_pago: 2250,
          modalidad: 'pago_anual',
          destino: 'empleado',
          metadata: JSON.stringify({ reportRow: {
            cargasFamiliares: 2,
            utilidadLiquida: 15000,
            poolParticipacion: 2250,
            fondo10Trabajadores: 1500,
            fondo5Cargas: 750,
            totalDiasTrabajados: 360,
            totalFactorCargas: 720,
            factorCargasFamiliares: 720,
            participacion10: 1500,
            participacion5: 750,
            participacionTotal: 2250,
          } }),
        }],
      });

    const result = await buildPdf('tenant-1', 'role-utilidades');
    const definition = pdfmake.createPdf.mock.calls.at(-1)[0];
    const table = definition.content.find((item) => item.table).table;
    const headers = table.body[0].map((cell) => cell.text);

    expect(headers).toEqual(expect.arrayContaining(['Fondo 15%', 'Días totales del reparto', 'Factor total cargas', 'Participación 10%', 'Participación 5%']));
    expect(table.body[1]).toEqual(expect.arrayContaining(['$2250.00', '720', '360']));
    expect(Buffer.isBuffer(result.buffer)).toBe(true);
  });
});
