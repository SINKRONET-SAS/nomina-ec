jest.mock('pdfmake/build/pdfmake', () => ({
  createPdf: jest.fn(() => ({
    getBuffer: (callback) => callback(Buffer.from('pdf-contrato-demo')),
  })),
}));

jest.mock('pdfmake/build/vfs_fonts', () => ({}));

jest.mock('../config/s3', () => ({
  s3Upload: jest.fn(async () => 'https://storage.local/contrato.pdf'),
}));

jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

const pdfmake = require('pdfmake/build/pdfmake');
const db = require('../config/database');
const { s3Upload } = require('../config/s3');
const {
  generarContrato,
  interpolate,
  listContractTemplates,
  loadContractTemplate,
} = require('./templateGenerator');

const tenant = {
  id: 'tenant-1',
  razon_social: 'Demo S.A.',
  ruc: '1790012345001',
  configuracion: {
    direccion: 'Quito',
    representanteLegal: 'Ana Representante',
    representanteLegalIdentificacion: '1700000001',
    ciudad: 'Quito',
  },
};

const employee = {
  id: 'emp-1',
  tenant_id: 'tenant-1',
  nombres: 'Carla Fernanda',
  apellidos: 'Almeida Rojas',
  cedula: '0102030405',
  cargo: 'Mercaderista',
  position_name: 'Mercaderista',
  sueldo_bruto_mensual: '600.00',
  fecha_ingreso: '2026-06-01',
  direccion_domicilio: 'Norte de Quito',
  organization_unit_name: 'Trade marketing',
  work_zone_name: 'Ruta Norte',
  work_shift_name: 'Jornada ordinaria',
  weekly_hours: '40',
  start_time: '08:00',
  end_time: '17:00',
  break_minutes: 60,
};

describe('templateGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.query.mockReset();
  });

  test('lista plantillas ejecutables desde backend', () => {
    const templates = listContractTemplates();

    expect(templates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        templateKey: 'contrato_indefinido_mercaderista_prueba',
        probation: expect.objectContaining({ enabled: true, days: 90 }),
        sourcePath: expect.stringContaining('backend/src/templates/legal/contracts'),
      }),
      expect.objectContaining({
        templateKey: 'contrato_productivo',
        contractType: 'productivo',
        contractTypeAcceptedEcuador: true,
      }),
      expect.objectContaining({
        templateKey: 'contrato_teletrabajo',
        contractType: 'teletrabajo',
        contractTypeAcceptedEcuador: true,
      }),
    ]));
  });

  test('carga plantilla por alias de contrato de prueba', () => {
    const template = loadContractTemplate({ tipoContrato: 'prueba' });

    expect(template).toMatchObject({
      templateKey: 'contrato_indefinido_mercaderista_prueba',
      contractType: 'indefinido',
    });
  });

  test('interpela variables sin ejecutar codigo externo', () => {
    const text = interpolate('Empleado {{employee.fullName}} - {{missing.value}}', {
      employee: { fullName: 'Ana Demo' },
    });

    expect(text).toBe('Empleado Ana Demo - no registrado');
  });

  test('genera contrato PDF completo y documento legal auditable', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [employee] })
      .mockResolvedValueOnce({ rows: [{ id: 'doc-1', tipo_documento: 'contrato' }] });

    const result = await generarContrato(
      { id: employee.id, tenant_id: tenant.id },
      tenant,
      'prueba',
      { generatedAt: new Date('2026-06-25T00:00:00Z'), year: 2026 },
    );

    expect(pdfmake.createPdf).toHaveBeenCalledTimes(1);
    const docDefinition = pdfmake.createPdf.mock.calls[0][0];
    expect(JSON.stringify(docDefinition)).toContain('CONTRATO INDIVIDUAL DE TRABAJO A TIEMPO INDEFINIDO CON PERIODO DE PRUEBA');
    expect(JSON.stringify(docDefinition)).toContain('1700000001');
    expect(JSON.stringify(docDefinition)).not.toContain('Ver documento HTML original');

    expect(s3Upload).toHaveBeenCalledWith(
      Buffer.from('pdf-contrato-demo'),
      expect.stringContaining('contrato_indefinido_mercaderista_prueba_'),
      'application/pdf',
    );
    expect(db.query.mock.calls[1][0]).toContain('INSERT INTO documentos_legales');

    const metadata = JSON.parse(db.query.mock.calls[1][1][3]);
    expect(metadata).toMatchObject({
      documentKind: 'contrato',
      templateKey: 'contrato_indefinido_mercaderista_prueba',
      legalReviewStatus: 'requiere revisión laboral previa a producción',
      sutRegistrationStatus: 'pendiente de gestion externa',
      probation: expect.objectContaining({ enabled: true, days: 90 }),
    });
    expect(result).toMatchObject({
      url: 'https://storage.local/contrato.pdf',
      template: { templateKey: 'contrato_indefinido_mercaderista_prueba' },
      documento: { id: 'doc-1', tipo_documento: 'contrato' },
    });
  });

  test('usa el modelo definido en la ficha del empleado cuando no se envia plantilla manual', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{
          ...employee,
          tipo_contrato: 'contrato_teletrabajo',
        }],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'doc-2', tipo_documento: 'contrato' }] });

    const result = await generarContrato(
      { id: employee.id, tenant_id: tenant.id },
      tenant,
      null,
      { generatedAt: new Date('2026-06-25T00:00:00Z'), year: 2026 },
    );

    expect(result.template).toMatchObject({
      templateKey: 'contrato_teletrabajo',
    });
    const metadata = JSON.parse(db.query.mock.calls[1][1][3]);
    expect(metadata).toMatchObject({
      templateKey: 'contrato_teletrabajo',
      tipoContrato: 'teletrabajo',
    });
  });

  test('bloquea contrato con sueldo menor al SBU configurado', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ ...employee, sueldo_bruto_mensual: '300.00' }],
    });

    await expect(generarContrato(
      { id: employee.id, tenant_id: tenant.id },
      tenant,
      'prueba',
      { generatedAt: new Date('2026-06-25T00:00:00Z'), year: 2026 },
    )).rejects.toMatchObject({
      code: 'CONTRATO_SUELDO_MENOR_SBU',
      statusCode: 422,
    });
    expect(s3Upload).not.toHaveBeenCalled();
  });
});
