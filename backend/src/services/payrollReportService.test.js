const { rowsForReport } = require('./payrollReportService');

function payrollRow(overrides = {}) {
  return {
    anio: 2026,
    mes: 6,
    cedula: '0102030405',
    nombres: 'Ana',
    apellidos: 'Demo',
    departamento: 'RRHH',
    cargo: 'Analista RRHH',
    cargo_codigo: 'ANALISTA_RRHH',
    unidad_nombre: 'Talento Humano',
    centro_costo: 'CC-RRHH',
    estado: 'borrador',
    sueldo_bruto: 1000,
    horas_extras_50: 0,
    horas_extras_100: 0,
    total_ingresos: 1000,
    aporte_iess_personal: 94.5,
    impuesto_renta: 20,
    anticipos: 25.5,
    prestamos: 10,
    total_deducciones: 150,
    neto_recibir: 850,
    detalle_calculo: {
      sueldoProporcional: 1000,
      aporteIess: 94.5,
      impuestoRenta: 20,
      anticipos: 25.5,
      prestamos: 10,
      descuentoFaltas: 0,
      aportePatronal: 111.5,
      provisionDecimoTercero: 83.33,
      provisionDecimoCuarto: 40.17,
      provisionVacaciones: 41.67,
      provisionFondosReserva: 83.33,
      fondoReservaDepositadoIess: 83.33,
      totalIngresos: 1000,
      totalDeducciones: 150,
      netoRecibir: 850,
      costoEmpleador: 1360,
    },
    ...overrides,
  };
}

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

  test('genera detalle por empleado desde lineas de calculo normalizadas', () => {
    const rows = rowsForReport([payrollRow()], 'PAYROLL_EMPLOYEE_DETAIL', 2026, 6);

    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        conceptoCodigo: 'sueldo_base',
        concepto: 'Sueldo proporcional',
        valor: 1000,
      }),
      expect.objectContaining({
        conceptoCodigo: 'neto_banco',
        categoria: 'pago',
        valor: 850,
      }),
    ]));
  });

  test('genera matriz empleados x conceptos conciliada', () => {
    const rows = rowsForReport([payrollRow()], 'PAYROLL_BENEFITS_MATRIX', 2026, 6);

    expect(rows[0]).toMatchObject({
      empleado: 'Demo Ana',
      totalIngresosNomina: 1000,
      totalDeduccionesNomina: 150,
      netoRecibir: 850,
      conciliacion: 'OK',
    });
    expect(rows[0].concept_sueldo_base).toBe(1000);
    expect(rows[0].concept_aporte_iess_personal).toBe(94.5);
  });

  test('genera reporte contable CRN26 balanceado con mappings por concepto', () => {
    const rows = rowsForReport([payrollRow()], 'PAYROLL_ACCOUNTING_REPORT', 2026, 6, {
      accountingMappings: [
        {
          concept_code: 'sueldo_base',
          concept_label: 'Sueldo proporcional',
          category: 'ingreso',
          entry_type: 'DEVENGAMIENTO',
          debit_account_code: '999001',
          debit_account_name: 'Cuenta custom sueldo',
          credit_account_code: '210101',
          credit_account_name: 'Nomina por pagar',
          cost_center_mode: 'employee',
        },
      ],
    });

    const debe = rows.reduce((sum, row) => sum + row.debe, 0);
    const haber = rows.reduce((sum, row) => sum + row.haber, 0);

    expect(rows.some((row) => row.cuenta === '999001')).toBe(true);
    expect(Math.round(debe * 100)).toBe(Math.round(haber * 100));
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
