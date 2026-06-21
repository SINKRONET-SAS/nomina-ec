jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

const db = require('../config/database');
const { generarArchivoBanco, getBankProfile, getBankProfileForTenant, validateBankRows } = require('./bancoAebGenerator');

describe('bancoAebGenerator', () => {
  beforeEach(() => {
    db.query.mockReset();
  });

  test('obtiene perfil bancario inicial', () => {
    expect(getBankProfile('PICHINCHA').bankCode).toBe('2011');
  });

  test('obtiene perfil bancario por codigo numerico inicial', () => {
    expect(getBankProfile('2011').profileKey).toBe('PICHINCHA');
  });

  test('prioriza perfil bancario configurado por tenant', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'perfil-tenant-1',
          tenant_id: 'tenant-1',
          banco_codigo: 'PICHINCHA',
          banco_nombre: 'PICHINCHA',
          delimiter: ',',
          encoding: 'latin1',
          date_format: 'YYYY-MM-DD',
          include_header: false,
          include_trailer: true,
          field_map: {
            profile: 'PICHINCHA',
            bankCode: '2011',
            accountLength: 12,
            fields: ['tipoRegistro', 'cuenta', 'importe'],
          },
        },
      ],
    });

    const profile = await getBankProfileForTenant('tenant-1', 'PICHINCHA');

    expect(profile.id).toBe('perfil-tenant-1');
    expect(profile.source).toBe('tenant');
    expect(profile.delimiter).toBe(',');
    expect(profile.encoding).toBe('latin1');
    expect(profile.accountLength).toBe(12);
    expect(profile.fields).toEqual(['tipoRegistro', 'cuenta', 'importe']);
  });

  test('usa perfil inicial si el tenant no tiene configuracion', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const profile = await getBankProfileForTenant('tenant-1', 'PICHINCHA');

    expect(profile.source).toBe('static');
    expect(profile.bankCode).toBe('2011');
  });

  test('filtra nominas cerradas y pagadas para archivo bancario', () => {
    expect(generarArchivoBanco.toString()).toContain("n.estado IN ('cerrada', 'pagada')");
  });

  test('valida conteo de registros bancarios', () => {
    const profile = getBankProfile('PICHINCHA');
    const rows = [
      profile.fields,
      ['1', '2011', '00', '0000000001', '0102030405', 'TEST', 'NOMINA', '20260628', '100.00', 'REF'],
      ['9', '', '', '', '', '', '', '', '100.00', '1'],
    ];
    expect(() => validateBankRows(rows, 100, 1, profile)).not.toThrow();
  });
});
