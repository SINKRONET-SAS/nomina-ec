jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../config/s3', () => ({
  decodeLocalStorageKey: jest.fn(),
  s3Delete: jest.fn(),
}));

const db = require('../config/database');
const { s3Delete } = require('../config/s3');
const {
  cleanupEmployeeLegalDocuments,
  storageKeyFromDocument,
} = require('./employeeDocumentCleanupService');

describe('employeeDocumentCleanupService', () => {
  beforeEach(() => jest.clearAllMocks());

  test('elimina objetos y registros legales del empleado dentro del tenant', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [
          { id: 'doc-1', tipo_documento: 'contrato', documento_url: 'https://storage/contrato.pdf', metadata: { storageKey: 'documentos/t/emp/contrato.pdf' } },
          { id: 'doc-2', tipo_documento: 'contrato_firmado', documento_url: 'https://storage/firmado.pdf', metadata: { storageKey: 'documentos/t/emp/firmado.pdf' } },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'doc-1' }, { id: 'doc-2' }] });

    const result = await cleanupEmployeeLegalDocuments({
      tenantId: 'tenant-1',
      employeeId: 'emp-1',
      correlationId: 'corr-1',
      userId: 'user-1',
    });

    expect(s3Delete).toHaveBeenCalledWith('documentos/t/emp/contrato.pdf');
    expect(s3Delete).toHaveBeenCalledWith('documentos/t/emp/firmado.pdf');
    expect(db.query.mock.calls[1][0]).toContain('DELETE FROM documentos_legales');
    expect(result).toMatchObject({ documentCount: 2, storageObjectCount: 2 });
  });

  test('bloquea depuración si un documento no tiene clave trazable', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: 'doc-1', tipo_documento: 'contrato', documento_url: 'https://storage/contrato.pdf', metadata: {} }],
    });

    await expect(cleanupEmployeeLegalDocuments({ tenantId: 'tenant-1', employeeId: 'emp-1' }))
      .rejects.toMatchObject({ code: 'EMPLEADO_DOCUMENTO_STORAGE_KEY_AUSENTE', statusCode: 409 });
    expect(s3Delete).not.toHaveBeenCalled();
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  test('obtiene claves desde metadata y no acepta una URL remota como clave', () => {
    expect(storageKeyFromDocument({ metadata: { storageKey: 'documentos/t/emp/a.pdf' } })).toBe('documentos/t/emp/a.pdf');
    expect(storageKeyFromDocument({ documento_url: 'https://storage/a.pdf', metadata: {} })).toBe('');
  });
});
