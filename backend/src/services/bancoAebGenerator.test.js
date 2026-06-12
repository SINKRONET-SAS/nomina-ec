const { getBankProfile, validateBankRows } = require('./bancoAebGenerator');

describe('bancoAebGenerator', () => {
  test('obtiene perfil bancario inicial', () => {
    expect(getBankProfile('PICHINCHA').bankCode).toBe('2011');
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
