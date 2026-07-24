jest.mock('../config/s3', () => ({
  s3Delete: jest.fn(async () => {}),
}));

const mockClient = { query: jest.fn() };

jest.mock('../config/database', () => ({
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
const { deleteGeneratedLegalDocument } = require('./generatedLegalDocumentDeletionService');

describe('generatedLegalDocumentDeletionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.query.mockReset();
  });

  test('elimina contrato no firmado, storage y registro con auditoria', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ id: 'doc-1', empleado_id: 'emp-1', tipo_documento: 'contrato', firmado: false, metadata: { storageKey: 'contrato-1.pdf' } }] })
      .mockResolvedValueOnce({ rows: [{ id: 'doc-1', tipo_documento: 'contrato', empleado_id: 'emp-1' }] });

    const result = await deleteGeneratedLegalDocument({ tenantId: 'tenant-1', documentId: 'doc-1', correlationId: 'corr-1', userId: 'user-1' });

    expect(s3Delete).toHaveBeenCalledWith('contrato-1.pdf');
    expect(db.commit).toHaveBeenCalledWith(mockClient);
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'documento.generado.eliminar', entityId: 'doc-1' }));
    expect(result).toMatchObject({ id: 'doc-1', tipoDocumento: 'contrato', deleted: true });
  });

  test('bloquea documentos firmados sin tocar storage', async () => {
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'doc-2', tipo_documento: 'contrato', firmado: true, metadata: { storageKey: 'contrato-2.pdf' } }] });

    await expect(deleteGeneratedLegalDocument({ tenantId: 'tenant-1', documentId: 'doc-2', correlationId: 'corr-2', userId: 'user-1' }))
      .rejects.toMatchObject({ code: 'DOCUMENTO_GENERADO_FIRMADO_NO_ELIMINABLE', statusCode: 409 });
    expect(s3Delete).not.toHaveBeenCalled();
    expect(db.rollback).toHaveBeenCalledWith(mockClient);
  });

  test('elimina acta de dotacion no devuelta junto con su fila operativa', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ id: 'doc-3', empleado_id: 'emp-1', tipo_documento: 'acta_entrega_dotacion', firmado: false, metadata: { storageKey: 'acta-3.pdf' } }] })
      .mockResolvedValueOnce({ rows: [{ id: 'acta-3', devuelto: false }] })
      .mockResolvedValueOnce({ rows: [{ id: 'acta-3' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'doc-3', tipo_documento: 'acta_entrega_dotacion', empleado_id: 'emp-1' }] });

    const result = await deleteGeneratedLegalDocument({ tenantId: 'tenant-1', documentId: 'doc-3', correlationId: 'corr-3', userId: 'user-1' });

    expect(mockClient.query.mock.calls[2][0]).toContain('DELETE FROM acta_entrega_equipos');
    expect(result.deliveryActId).toBe('acta-3');
    expect(s3Delete).toHaveBeenCalledWith('acta-3.pdf');
  });

  test('bloquea acta de dotacion devuelta', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ id: 'doc-4', tipo_documento: 'acta_entrega_dotacion', firmado: false, metadata: { storageKey: 'acta-4.pdf' } }] })
      .mockResolvedValueOnce({ rows: [{ id: 'acta-4', devuelto: true }] });

    await expect(deleteGeneratedLegalDocument({ tenantId: 'tenant-1', documentId: 'doc-4', correlationId: 'corr-4', userId: 'user-1' }))
      .rejects.toMatchObject({ code: 'ACTA_DOTACION_DEVUELTA_NO_ELIMINABLE', statusCode: 409 });
    expect(s3Delete).not.toHaveBeenCalled();
  });

  test('bloquea documento sin clave de almacenamiento trazable', async () => {
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'doc-5', tipo_documento: 'acta_finiquito', firmado: false, metadata: {} }] });

    await expect(deleteGeneratedLegalDocument({ tenantId: 'tenant-1', documentId: 'doc-5', correlationId: 'corr-5', userId: 'user-1' }))
      .rejects.toMatchObject({ code: 'DOCUMENTO_GENERADO_STORAGE_KEY_MISSING', statusCode: 409 });
    expect(s3Delete).not.toHaveBeenCalled();
  });
});
