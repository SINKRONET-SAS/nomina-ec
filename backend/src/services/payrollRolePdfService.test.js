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
const {
  buildPayrollRoleDocDefinition,
  generatePayrollRolePdf,
} = require('./payrollRolePdfService');

describe('payrollRolePdfService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('genera rol PDF bajo demanda y persiste URL en nomina', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{
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
        }],
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
  });
});
