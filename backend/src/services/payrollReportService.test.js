const { rowsForReport } = require('./payrollReportService');

describe('payrollReportService accounting entries', () => {
  test('mapea codigo de cargo en reporte tabular', () => {
    const rows = rowsForReport([
      {
        anio: 2026,
        mes: 6,
        cedula: '0102030405',
        nombres: 'Ana',
        apellidos: 'Demo',
        departamento: 'RRHH',
        cargo: 'Analista RRHH',
        cargo_codigo: 'ANALISTA_RRHH',
        estado: 'borrador',
        detalle_calculo: {},
      },
    ], 'PAYROLL_DETAIL_TABULAR', 2026, 6);

    expect(rows[0]).toMatchObject({
      cargo: 'Analista RRHH',
      cargoCodigo: 'ANALISTA_RRHH',
    });
  });

  test('genera asientos contables balanceados de devengamiento y pago', () => {
    const rows = rowsForReport([
      {
        anio: 2026,
        mes: 6,
        cedula: '0102030405',
        nombres: 'Ana',
        apellidos: 'Demo',
        total_ingresos: 1000,
        neto_recibir: 850,
        aporte_iess_personal: 94.5,
        impuesto_renta: 20,
        anticipos: 25.5,
        prestamos: 10,
        detalle_calculo: {
          descuentoFaltas: 0,
          aportePatronal: 111.5,
          provisionDecimoTercero: 83.33,
          provisionDecimoCuarto: 40.17,
          provisionVacaciones: 41.67,
          provisionFondosReserva: 83.33,
        },
      },
    ], 'PAYROLL_ACCOUNTING_ENTRIES', 2026, 6);

    const debe = rows.reduce((sum, row) => sum + row.debe, 0);
    const haber = rows.reduce((sum, row) => sum + row.haber, 0);

    expect(rows.some((row) => row.cuenta === '510201')).toBe(true);
    expect(Math.round(debe * 100)).toBe(Math.round(haber * 100));
  });
});
