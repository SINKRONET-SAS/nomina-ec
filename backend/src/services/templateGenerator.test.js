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
  buildContractContext,
  buildContractDocDefinition,
  generarContrato,
  interpolate,
  listContractTemplates,
  loadContractTemplate,
  validateSignatureReadyContext,
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

  test('carga modelo de obra o servicio revisado para mercaderistas con contexto de contacto', () => {
    const template = loadContractTemplate({ tipoContrato: 'obra_servicio_giro_negocio' });
    const context = buildContractContext({
      employee: {
        ...employee,
        email_personal: 'carla@example.com',
        telefono: '0999999999',
      },
      tenant: {
        ...tenant,
        configuracion: {
          ...tenant.configuracion,
          giroNegocio: 'campanas de comercializacion y trade marketing',
          contratoObraServicio: {
            descripcionServicio: 'campana de mercaderismo en puntos de venta',
            duracionEstimada: '6 meses',
            ciudadPrestacion: 'Quito',
            provinciaPrestacion: 'Pichincha',
          },
        },
      },
      template,
      legalParameters: {
        payroll: {
          unifiedBaseSalary: 470,
          personalIessRate: 0.0945,
          employerIessRate: 0.1115,
          weeklyMaxHours: 40,
        },
      },
      year: 2026,
      generatedAt: new Date('2026-07-02T00:00:00Z'),
    });

    expect(template).toMatchObject({
      templateKey: 'contrato_obra_servicio_giro_negocio',
      legalReviewRequired: false,
      documentPresentation: 'signature_ready',
      probation: expect.objectContaining({ enabled: true, days: 90 }),
    });
    expect(context).toMatchObject({
      employee: {
        contactEmail: 'carla@example.com',
        contactPhone: '0999999999',
      },
      contract: {
        serviceDescription: 'campana de mercaderismo en puntos de venta',
        estimatedDuration: '6 meses',
        workCity: 'Quito',
        workProvince: 'Pichincha',
        legalReviewStatus: expect.stringContaining('modelo revisado'),
      },
    });
    const docDefinition = buildContractDocDefinition({ template, context });
    const rendered = JSON.stringify(docDefinition);
    expect(docDefinition.content[1]).toMatchObject({ text: 'COMPARECIENTES' });
    expect(docDefinition.styles.sectionTitle.color).toBe('#000000');
    expect(rendered).toContain('campana de mercaderismo en puntos de venta');
    expect(rendered).toContain('carla@example.com');
    expect(rendered).toContain('firman este contrato por triplicado');
    expect(rendered).not.toContain('Base legal y controles de emision');
    expect(rendered).not.toContain('Modelo implementado con base');
    expect(rendered).not.toContain('Registro SUT/MDT');
    expect(rendered).not.toContain('Estado SUT/MDT');
    expect(rendered).not.toContain('Generado por SKNOMINA');
    expect(rendered).not.toContain('dos ejemplares de igual tenor');
    expect(rendered).not.toContain('{{');
  });

  test('bloquea la emisión lista para firma cuando faltan datos impresos', () => {
    const template = loadContractTemplate({ tipoContrato: 'obra_servicio_giro_negocio' });
    const context = buildContractContext({
      employee,
      tenant: {
        ...tenant,
        configuracion: {
          ...tenant.configuracion,
          representanteLegalIdentificacion: '',
        },
      },
      template,
      legalParameters: { payroll: { unifiedBaseSalary: 470 } },
      year: 2026,
      generatedAt: new Date('2026-07-02T00:00:00Z'),
    });

    expect(() => validateSignatureReadyContext(template, context)).toThrow(
      expect.objectContaining({
        code: 'CONTRATO_DATOS_FIRMA_INCOMPLETOS',
        statusCode: 422,
      }),
    );
  });

  test('genera el contrato listo para firma con los datos guardados en Datos de empresa', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{
          ...employee,
          email_personal: 'carla@example.com',
          telefono: '0999999999',
          provincia_domicilio: 'Pichincha',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{
          payload: {
            direccion: 'Av. República 123',
            ciudad: 'Quito',
            provincia: 'Pichincha',
            representanteLegal: 'Ana Representante',
            representanteLegalIdentificacion: '1700000001',
            actividadEconomica: 'servicios de trade marketing',
            contratoObraServicio: {
              descripcionServicio: 'campaña de mercaderismo en puntos de venta',
              duracionEstimada: '6 meses',
              ciudadPrestacion: 'Quito',
              provinciaPrestacion: 'Pichincha',
              direccionPrestacion: 'Av. República 123',
            },
          },
        }],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'doc-signature-ready', tipo_documento: 'contrato' }] });

    const result = await generarContrato(
      { id: employee.id, tenant_id: tenant.id },
      tenant,
      'obra_servicio_giro_negocio',
      { generatedAt: new Date('2026-07-02T00:00:00Z'), year: 2026 },
    );

    const rendered = JSON.stringify(pdfmake.createPdf.mock.calls[0][0]);
    expect(rendered).toContain('Av. República 123');
    expect(rendered).toContain('campaña de mercaderismo en puntos de venta');
    expect(rendered).not.toContain('Generado por SKNOMINA');
    expect(result.template).toMatchObject({
      templateKey: 'contrato_obra_servicio_giro_negocio',
      version: '2026.07.20',
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

  test('no imprime notas internas de base legal, revision o registro en contratos emitidos', () => {
    for (const template of listContractTemplates().map((item) => loadContractTemplate({ templateKey: item.templateKey }))) {
      const context = buildContractContext({
        employee: { ...employee, email_personal: 'carla@example.com', telefono: '0999999999' },
        tenant,
        template,
        legalParameters: { payroll: { unifiedBaseSalary: 470, weeklyMaxHours: 40 } },
        year: 2026,
        generatedAt: new Date('2026-07-02T00:00:00Z'),
      });
      const rendered = JSON.stringify(buildContractDocDefinition({ template, context }));
      expect(rendered).not.toContain('Base legal y controles de emision');
      expect(rendered).not.toContain('Modelo implementado con base');
      expect(rendered).not.toContain('Registro SUT/MDT:');
      expect(rendered).not.toContain('plantilla preliminar');
    }
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
