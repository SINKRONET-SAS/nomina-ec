jest.mock('../config/s3', () => ({
  s3Delete: jest.fn(async () => {}),
}));

const mockClient = { query: jest.fn() };

jest.mock('../config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(async () => mockClient),
  commit: jest.fn(async () => {}),
  rollback: jest.fn(async () => {}),
}));

jest.mock('./auditService', () => ({
  recordAudit: jest.fn(async () => {}),
}));

const db = require('../config/database');
const { s3Delete } = require('../config/s3');
const { recordAudit } = require('./auditService');
const {
  deleteOrphanLegalDocument,
  listOrphanLegalDocuments,
} = require('./orphanLegalDocumentService');

describe('orphanLegalDocumentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.query.mockReset();
  });

  test('lista solo documentos sin empleado vinculado', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 'doc-1', tipo_documento: 'contrato', metadata: { storageKey: 'doc-1.pdf', sizeBytes: 1200 }, firmado: false, created_at: '2026-07-16' }] });

    const result = await listOrphanLegalDocuments({ tenantId: 'tenant-1' });

    expect(db.query.mock.calls[0][0]).toContain('empleado_id IS NULL');
    expect(result.documentos).toEqual([expect.objectContaining({ id: 'doc-1', storageKeyAvailable: true })]);
  });

  test('elimina objeto y registro solo mientras permanece huerfano', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ id: 'doc-1', tipo_documento: 'contrato', documento_url: 's3://doc-1', metadata: { storageKey: 'doc-1.pdf' }, empleado_id: null }] })
      .mockResolvedValueOnce({ rows: [{ id: 'doc-1', tipo_documento: 'contrato' }] });

    const result = await deleteOrphanLegalDocument({
      tenantId: 'tenant-1',
      documentId: 'doc-1',
      correlationId: 'corr-1',
      userId: 'user-1',
    });

    expect(s3Delete).toHaveBeenCalledWith('doc-1.pdf');
    expect(mockClient.query.mock.calls[1][0]).toContain('empleado_id IS NULL');
    expect(db.commit).toHaveBeenCalledWith(mockClient);
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'documento_huerfano.eliminar',
      entityId: 'doc-1',
    }));
    expect(result).toMatchObject({ id: 'doc-1', deleted: true });
  });
});
