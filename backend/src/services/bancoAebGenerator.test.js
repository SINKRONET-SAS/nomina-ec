jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

const db = require('../config/database');
const AppError = require('../utils/AppError');
const {
  bankFileDescriptor,
  generarArchivoBanco,
  getBankProfile,
  getBankProfileForTenant,
  precheckArchivoBanco,
  validateBankRows,
} = require('./bancoAebGenerator');

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

  test('incluye plantilla Banco Pacifico para transferencias interbancarias inmediatas', () => {
    const profile = getBankProfile('PACIFICO');
    expect(profile.bankCode).toBe('2013');
    expect(profile.layout).toBe('pacifico_interbank_immediate');
    expect(profile.fields).toEqual([
      'tipoRegistro',
      'tipoIdentificacion',
      'cedula',
      'nombre',
      'bancoCodigo',
      'tipoCuenta',
      'cuenta',
      'importe',
      'concepto',
      'referencia',
    ]);
  });

  test('nombra Banco Pacifico como archivo plano txt', () => {
    const descriptor = bankFileDescriptor(getBankProfile('PACIFICO'), 2026, 6);

    expect(descriptor.fileName).toBe('PAGO_NOMINA_202606_PACIFICO.txt');
    expect(descriptor.contentType).toBe('text/plain');
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
    }).mockResolvedValueOnce({ rows: [] });

    const profile = await getBankProfileForTenant('tenant-1', 'PICHINCHA');

    expect(profile.id).toBe('perfil-tenant-1');
    expect(profile.source).toBe('tenant');
    expect(profile.delimiter).toBe(',');
    expect(profile.encoding).toBe('latin1');
    expect(profile.accountLength).toBe(12);
    expect(profile.fields).toEqual(['tipoRegistro', 'cuenta', 'importe']);
  });

  test('aplica homologacion de campos bancarios por perfil', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'perfil-tenant-1',
          tenant_id: 'tenant-1',
          banco_codigo: 'PICHINCHA',
          banco_nombre: 'PICHINCHA',
          delimiter: ',',
          encoding: 'utf8',
          date_format: 'YYYYMMDD',
          include_header: true,
          include_trailer: true,
          field_map: { profile: 'PICHINCHA', bankCode: '2011' },
        },
      ],
    }).mockResolvedValueOnce({
      rows: [
        { canonical_field: 'cedula', bank_field_name: 'IDENTIFICACION', position: 1, required: true, metadata: {} },
        { canonical_field: 'cuenta', bank_field_name: 'CTA_BENEFICIARIO', position: 2, required: true, metadata: {} },
        { canonical_field: 'importe', bank_field_name: 'VALOR', position: 3, required: true, metadata: {} },
      ],
    });

    const profile = await getBankProfileForTenant('tenant-1', 'PICHINCHA');

    expect(profile.fields).toEqual(['cedula', 'cuenta', 'importe']);
    expect(profile.headerLabels).toEqual(['IDENTIFICACION', 'CTA_BENEFICIARIO', 'VALOR']);
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

  test('reporta 422 cuando no hay nominas cerradas o pagadas con cuenta bancaria', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'tenant-1' }] })
      .mockResolvedValueOnce({ rows: [] });

    let error;
    try {
      await generarArchivoBanco('tenant-1', 2026, 6, 'PICHINCHA', { userId: 'user-1' });
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({
      code: 'BANCO_SIN_NOMINAS_CERRADAS_CON_CUENTA',
      statusCode: 422,
    });
  });

  test('precheck bancario bloquea generacion sin nominas bancarizables', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 'tenant-1' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total_cerradas: 0, total_con_cuenta: 0 }] });

    const result = await precheckArchivoBanco('tenant-1', 2026, 6, 'PICHINCHA');

    expect(result.ready).toBe(false);
    expect(result.totalNominasCerradas).toBe(0);
    expect(result.totalPagosBancarios).toBe(0);
    expect(result.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'nominas_cerradas', passed: false }),
      expect.objectContaining({ code: 'cuentas_bancarias', passed: false }),
    ]));
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

  test('valida columnas de Banco Pacifico', () => {
    const profile = getBankProfile('PACIFICO');
    const rows = [
      ['D', 'C', '0102030405', 'TEST USER', '2013', 'AH', '0000000001', '100.00', 'NOMINA 06/2026', 'REF001'],
      ['9', '', '', '', '', '', '', '', '100.00', '1'],
    ];
    expect(() => validateBankRows(rows, 100, 1, profile)).not.toThrow();
  });
});
