jest.mock('pdfmake/build/pdfmake', () => ({
  createPdf: jest.fn(() => ({
    getBuffer: (callback) => callback(Buffer.from('pdf-demo')),
  })),
}));

jest.mock('pdfmake/build/vfs_fonts', () => ({}));

jest.mock('../config/s3', () => ({
  s3Upload: jest.fn(async () => 'https://storage.local/acta-entrega-dotacion.pdf'),
}));

const mockClient = {
  query: jest.fn(),
};

jest.mock('../config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(async () => mockClient),
  commit: jest.fn(async () => {}),
  rollback: jest.fn(async () => {}),
}));

jest.mock('./auditService', () => ({
  AUDIT_ACTIONS: { DOCUMENTO_GENERADO: 'documento.generado' },
  recordAudit: jest.fn(async () => {}),
}));

const pdfmake = require('pdfmake/build/pdfmake');
const db = require('../config/database');
const { s3Upload } = require('../config/s3');
const { recordAudit } = require('./auditService');
const {
  generateEquipmentDeliveryAct,
  normalizeItems,
} = require('./equipmentDeliveryActService');

describe('equipmentDeliveryActService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.query.mockReset();
  });

  test('normaliza items de ropa y equipo para acta', () => {
    const items = normalizeItems([
      { categoria: 'ropa_trabajo', descripcion: 'Camisa manga larga', cantidad: 2, talla: 'M' },
      { categoria: 'equipo', descripcion: 'Laptop', serial: 'ABC-123' },
    ]);

    expect(items).toEqual([
      expect.objectContaining({ categoria: 'ropa_trabajo', cantidad: 2, talla: 'M' }),
      expect.objectContaining({ categoria: 'equipo', cantidad: 1, serial: 'ABC-123' }),
    ]);
  });

  test('genera acta, documento legal y auditoria', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 'emp-1',
        nombres: 'Ana',
        apellidos: 'Demo',
        cedula: '0102030405',
        cargo: 'Analista',
        razon_social: 'Demo S.A.',
        ruc: '1790012345001',
        configuracion: {
          direccion: 'Quito',
          representanteLegal: 'Ana Representante',
          representanteLegalIdentificacion: '1700000001',
        },
      }],
    });
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ id: 'acta-1', documento_legal_id: null }] })
      .mockResolvedValueOnce({ rows: [{ id: 'doc-1', tipo_documento: 'acta_entrega_dotacion' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'acta-1', documento_legal_id: 'doc-1' }] });

    const result = await generateEquipmentDeliveryAct({
      tenantId: 'tenant-1',
      empleadoId: 'emp-1',
      fechaEntrega: '2026-06-24',
      items: [{ categoria: 'epp', descripcion: 'Casco de seguridad', cantidad: 1 }],
      observaciones: 'Uso obligatorio en planta.',
      correlationId: 'corr-1',
      userId: 'user-1',
    });

    expect(s3Upload).toHaveBeenCalledWith(
      Buffer.from('pdf-demo'),
      expect.stringContaining('acta_entrega_dotacion_'),
      'application/pdf',
    );
    const docDefinition = pdfmake.createPdf.mock.calls[0][0];
    expect(JSON.stringify(docDefinition)).toContain('Ana Representante');
    expect(JSON.stringify(docDefinition)).toContain('1700000001');
    expect(JSON.stringify(docDefinition)).toContain('Representante legal / delegado del empleador');
    expect(mockClient.query.mock.calls[0][0]).toContain('INSERT INTO acta_entrega_equipos');
    expect(mockClient.query.mock.calls[1][0]).toContain('INSERT INTO documentos_legales');
    expect(mockClient.query.mock.calls[1][0]).toContain('acta_entrega_dotacion');
    expect(db.commit).toHaveBeenCalledTimes(1);
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'documento.generado',
      entity: 'acta_entrega_equipos',
      entityId: 'acta-1',
    }));
    expect(result).toMatchObject({
      acta: { id: 'acta-1', documento_legal_id: 'doc-1' },
      documento: { id: 'doc-1', tipo_documento: 'acta_entrega_dotacion' },
    });
  });
});
