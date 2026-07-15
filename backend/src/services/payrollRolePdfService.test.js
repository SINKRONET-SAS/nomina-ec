jest.mock('pdfmake/build/pdfmake', () => ({
  createPdf: jest.fn(() => ({
    getBuffer: (callback) => callback(Buffer.from('pdf-rol-demo')),
  })),
}));

jest.mock('pdfmake/build/vfs_fonts', () => ({}));

jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../config/s3', () => ({
  s3Upload: jest.fn(async () => 'http://localhost:3000/api/storage/local/rol-demo'),
}));

const db = require('../config/database');
const { s3Upload } = require('../config/s3');
const pdfmake = require('pdfmake/build/pdfmake');
const {
  buildPayrollRoleDocDefinition,
  buildPayrollRoleTransposedDocDefinition,
  generatePayrollRolePdf,
  generatePayrollRolePeriodTransposedPdf,
} = require('./payrollRolePdfService');

function payrollRow(overrides = {}) {
  return {
    id: 'payroll-1',
    tenant_id: 'tenant-1',
    empleado_id: 'employee-1',
    anio: 2026,
    mes: 6,
    dias_trabajados: 30,
    sueldo_bruto: 600,
    horas_extras_50: 15,
    horas_extras_100: 0,
    total_ingresos: 615,
    total_deducciones: 58.12,
    neto_recibir: 556.88,
    estado: 'borrador',
    detalle_calculo: {
      sueldoProporcional: 600,
      aporteIess: 58.12,
      netoRecibir: 556.88,
      costoEmpleador: 710,
    },
    nombres: 'Carla',
    apellidos: 'Almeida',
    cedula: '1707300008',
    cargo: 'Mercaderista',
    departamento: 'OPERACIONES',
    razon_social: 'Empresa Demo',
    ruc: '1799999999001',
    tenant_configuracion: {
      representanteLegal: 'Ana Representante',
      representanteLegalIdentificacion: '1700000001',
    },
    ...overrides,
  };
}

function persistedDiscountLines() {
  return [
    {
      concept_code: 'descuento_uniforme',
      concept_label: 'Descuento uniforme',
      category: 'deduccion',
      amount: 12,
      source: 'novedad',
      source_id: 'nov-descuento-uniforme',
      metadata: { tipoNovedad: 'descuento_uniforme' },
    },
    {
      concept_code: 'novedad_atraso',
      concept_label: 'Atraso',
      category: 'deduccion',
      amount: 4,
      source: 'novedad',
      source_id: 'nov-atraso',
      metadata: { tipoNovedad: 'atraso' },
    },
    {
      concept_code: 'descuento_permiso_sin_sueldo',
      concept_label: 'Permiso sin sueldo',
      category: 'deduccion',
      amount: 8,
      source: 'novedad',
      source_id: 'nov-permiso-sin-sueldo',
      metadata: { tipoNovedad: 'permiso_sin_sueldo' },
    },
    {
      concept_code: 'novedad_salida_temprana',
      concept_label: 'Salida temprana',
      category: 'deduccion',
      amount: 6,
      source: 'novedad',
      source_id: 'nov-salida-temprana',
      metadata: { tipoNovedad: 'salida_temprana' },
    },
  ];
}

describe('payrollRolePdfService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('genera rol PDF bajo demanda y persiste URL en nomina', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [payrollRow()],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await generatePayrollRolePdf({
      tenantId: 'tenant-1',
      payrollId: 'payroll-1',
      userId: 'user-1',
    });

    expect(result).toMatchObject({
      url: 'http://localhost:3000/api/storage/local/rol-demo',
      fileName: 'rol_pago_1707300008_2026_06.pdf',
      contentType: 'application/pdf',
    });
    expect(s3Upload).toHaveBeenCalledWith(
      Buffer.from('pdf-rol-demo'),
      expect.stringContaining('rol_pago_1707300008_2026_06.pdf'),
      'application/pdf'
    );
    expect(db.query).toHaveBeenLastCalledWith(expect.stringContaining('UPDATE nominas'), [
      'payroll-1',
      'tenant-1',
      'http://localhost:3000/api/storage/local/rol-demo',
    ]);
  });

  test('documento incluye totales principales del rol', () => {
    const doc = buildPayrollRoleDocDefinition({
      anio: 2026,
      mes: 6,
      nombres: 'Carla',
      apellidos: 'Almeida',
      cedula: '1707300008',
      total_ingresos: 615,
      total_deducciones: 58.12,
      neto_recibir: 556.88,
      detalle_calculo: { costoEmpleador: 710 },
      tenant_configuracion: {
        representanteLegal: 'Ana Representante',
        representanteLegalIdentificacion: '1700000001',
      },
    });

    expect(JSON.stringify(doc)).toContain('ROL DE PAGO');
    expect(JSON.stringify(doc)).toContain('Neto a recibir');
    expect(JSON.stringify(doc)).toContain('$556.88');
    expect(JSON.stringify(doc)).toContain('Recepcion y conformidad');
    expect(JSON.stringify(doc)).toContain('Ana Representante');
    expect(JSON.stringify(doc)).toContain('Representante legal / delegado del empleador');
    expect(JSON.stringify(doc)).toContain('BORRADOR - NO CONSTITUYE COMPROBANTE DE PAGO');
  });

  test('documento individual refleja tipos dinamicos de novedad', () => {
    const doc = buildPayrollRoleDocDefinition(payrollRow({
      total_ingresos: 645,
      total_deducciones: 70.12,
      neto_recibir: 574.88,
      detalle_calculo: {
        sueldoProporcional: 600,
        aporteIess: 58.12,
        netoRecibir: 574.88,
        costoEmpleador: 740,
        novedadesCalculadas: [
          {
            noveltyId: 'nov-bono-transporte',
            code: 'bono_transporte',
            conceptCode: 'bono_transporte',
            label: 'Bono transporte',
            category: 'ingreso',
            payrollImpact: 'ingreso',
            amount: 45,
            sourceId: 'nov-bono-transporte',
          },
          {
            noveltyId: 'nov-descuento-uniforme',
            code: 'descuento_uniforme',
            conceptCode: 'descuento_uniforme',
            label: 'Descuento uniforme',
            category: 'deduccion',
            payrollImpact: 'descuento',
            amount: 12,
            sourceId: 'nov-descuento-uniforme',
          },
        ],
      },
    }));

    const serialized = JSON.stringify(doc);
    expect(serialized).toContain('Bono transporte');
    expect(serialized).toContain('Descuento uniforme');
    expect(serialized).toContain('$45.00');
    expect(serialized).toContain('$12.00');
  });

  test('documento individual refleja todos los descuentos persistidos en lineas de calculo', () => {
    const doc = buildPayrollRoleDocDefinition(payrollRow({
      total_deducciones: 78.12,
      neto_recibir: 536.88,
      detalle_calculo: {
        sueldoProporcional: 600,
        aporteIess: 58.12,
        netoRecibir: 536.88,
        costoEmpleador: 710,
      },
      calculation_lines: persistedDiscountLines(),
    }));

    const serialized = JSON.stringify(doc);
    expect(serialized).toContain('Atraso');
    expect(serialized).toContain('Descuento uniforme');
    expect(serialized).toContain('Permiso sin sueldo');
    expect(serialized).toContain('Salida temprana');
    expect(serialized).toContain('$4.00');
    expect(serialized).toContain('$12.00');
    expect(serialized).toContain('$8.00');
    expect(serialized).toContain('$6.00');
  });

  test('rol cerrado no incluye aviso de borrador', () => {
    const doc = buildPayrollRoleDocDefinition(payrollRow({ estado: 'cerrada' }));

    expect(JSON.stringify(doc)).not.toContain('BORRADOR - NO CONSTITUYE COMPROBANTE DE PAGO');
  });

  test('documento transpuesto incluye conceptos en filas y empleados en columnas', () => {
    const doc = buildPayrollRoleTransposedDocDefinition({
      anio: 2026,
      mes: 6,
      rows: [
        payrollRow(),
        payrollRow({
          id: 'payroll-2',
          empleado_id: 'employee-2',
          nombres: 'Marco',
          apellidos: 'Benitez',
          cedula: '1707300009',
          total_ingresos: 700,
          total_deducciones: 66.15,
          neto_recibir: 633.85,
          detalle_calculo: {
            sueldoProporcional: 700,
            aporteIess: 66.15,
            netoRecibir: 633.85,
            costoEmpleador: 828.05,
          },
        }),
      ],
    });

    const serialized = JSON.stringify(doc);
    expect(doc.pageOrientation).toBe('landscape');
    expect(serialized).toContain('ROL DE PAGO CONSOLIDADO TRANSPUESTO');
    expect(serialized).toContain('Sueldo proporcional');
    expect(serialized).toContain('Almeida Carla');
    expect(serialized).toContain('Benitez Marco');
    expect(serialized).toContain('$1315.00');
    expect(serialized).toContain('rol_pago_transpuesto_sknomina');
    expect(serialized).toContain('BORRADOR - NO CONSTITUYE COMPROBANTE DE PAGO');
  });

  test('documento transpuesto refleja tipos dinamicos de novedad por empleado', () => {
    const doc = buildPayrollRoleTransposedDocDefinition({
      anio: 2026,
      mes: 6,
      rows: [
        payrollRow({
          total_ingresos: 645,
          total_deducciones: 70.12,
          neto_recibir: 574.88,
          detalle_calculo: {
            sueldoProporcional: 600,
            aporteIess: 58.12,
            netoRecibir: 574.88,
            costoEmpleador: 740,
            novedadesCalculadas: [
              {
                noveltyId: 'nov-bono-transporte-1',
                code: 'bono_transporte',
                conceptCode: 'bono_transporte',
                label: 'Bono transporte',
                category: 'ingreso',
                payrollImpact: 'ingreso',
                amount: 45,
                sourceId: 'nov-bono-transporte-1',
              },
              {
                noveltyId: 'nov-descuento-uniforme-1',
                code: 'descuento_uniforme',
                conceptCode: 'descuento_uniforme',
                label: 'Descuento uniforme',
                category: 'deduccion',
                payrollImpact: 'descuento',
                amount: 12,
                sourceId: 'nov-descuento-uniforme-1',
              },
            ],
          },
        }),
        payrollRow({
          id: 'payroll-2',
          empleado_id: 'employee-2',
          nombres: 'Marco',
          apellidos: 'Benitez',
          cedula: '1707300009',
          total_ingresos: 705,
          total_deducciones: 69.15,
          neto_recibir: 635.85,
          detalle_calculo: {
            sueldoProporcional: 700,
            aporteIess: 66.15,
            netoRecibir: 635.85,
            costoEmpleador: 828.05,
            novedadesCalculadas: [
              {
                noveltyId: 'nov-bono-transporte-2',
                code: 'bono_transporte',
                conceptCode: 'bono_transporte',
                label: 'Bono transporte',
                category: 'ingreso',
                payrollImpact: 'ingreso',
                amount: 5,
                sourceId: 'nov-bono-transporte-2',
              },
              {
                noveltyId: 'nov-descuento-uniforme-2',
                code: 'descuento_uniforme',
                conceptCode: 'descuento_uniforme',
                label: 'Descuento uniforme',
                category: 'deduccion',
                payrollImpact: 'descuento',
                amount: 3,
                sourceId: 'nov-descuento-uniforme-2',
              },
            ],
          },
        }),
      ],
    });

    const serialized = JSON.stringify(doc);
    expect(serialized).toContain('Bono transporte');
    expect(serialized).toContain('Descuento uniforme');
    expect(serialized).toContain('$50.00');
    expect(serialized).toContain('$15.00');
  });

  test('genera rol transpuesto por periodo y sube un unico PDF consolidado', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        payrollRow(),
        payrollRow({
          id: 'payroll-2',
          empleado_id: 'employee-2',
          nombres: 'Marco',
          apellidos: 'Benitez',
          cedula: '1707300009',
        }),
      ],
    });

    const result = await generatePayrollRolePeriodTransposedPdf({
      tenantId: 'tenant-1',
      anio: 2026,
      mes: 6,
      userId: 'user-1',
    });

    expect(result).toMatchObject({
      url: 'http://localhost:3000/api/storage/local/rol-demo',
      fileName: 'roles_pago_transpuesto_2026_06.pdf',
      contentType: 'application/pdf',
      totalEmpleados: 2,
    });
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('WHERE n.tenant_id = $1'), [
      'tenant-1',
      2026,
      6,
    ]);
    expect(db.query.mock.calls[0][0]).toContain('payroll_calculation_lines');
    expect(db.query.mock.calls[0][0]).toContain('AS calculation_lines');
    expect(s3Upload).toHaveBeenCalledWith(
      Buffer.from('pdf-rol-demo'),
      expect.stringContaining('roles_pago_transpuesto_2026_06.pdf'),
      'application/pdf'
    );
  });

  test('genera rol PDF con lineas persistidas para descuentos dinamicos', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [payrollRow({
          detalle_calculo: {
            sueldoProporcional: 600,
            aporteIess: 58.12,
            netoRecibir: 536.88,
            costoEmpleador: 710,
          },
          calculation_lines: persistedDiscountLines(),
        })],
      })
      .mockResolvedValueOnce({ rows: [] });

    await generatePayrollRolePdf({
      tenantId: 'tenant-1',
      payrollId: 'payroll-1',
      userId: 'user-1',
    });

    const selectSql = db.query.mock.calls[0][0];
    const docDefinition = pdfmake.createPdf.mock.calls[0][0];
    const serialized = JSON.stringify(docDefinition);
    expect(selectSql).toContain('payroll_calculation_lines');
    expect(selectSql).toContain('AS calculation_lines');
    expect(serialized).toContain('Atraso');
    expect(serialized).toContain('Descuento uniforme');
    expect(serialized).toContain('Permiso sin sueldo');
    expect(serialized).toContain('Salida temprana');
  });
});
