jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../config/s3', () => ({
  s3Upload: jest.fn(async () => 'https://storage.local/sae.xml'),
}));

jest.mock('./legalParameterService', () => ({
  getLegalParametersForTenant: jest.fn(async () => ({
    sourceStatus: 'validado_oficial',
    payroll: {
      employerIessRate: 0.2,
    },
  })),
  assertLegalParametersReadyForProduction: jest.fn(),
}));

const db = require('../config/database');
const { generarXML_SAE } = require('./iessSaeGenerator');

describe('generarXML_SAE', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('usa el aporte patronal de parametros legales versionados', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{ id: 'tenant-1', ruc: '1790000000001', razon_social: 'Empresa Demo' }],
      })
      .mockResolvedValueOnce({
        rows: [{
          cedula: '0102030405',
          nombres: 'Ana',
          apellidos: 'Perez',
          fecha_ingreso: '2026-01-01',
          total_ingresos: '1000.00',
          aporte_iess_personal: '94.50',
        }],
      });

    const result = await generarXML_SAE('tenant-1', 2026, 1);

    expect(result.xmlString).toContain('<aportePatronal>200.00</aportePatronal>');
    expect(result.xmlString).toContain('<totalAportePatronal>200.00</totalAportePatronal>');
    expect(result.xmlString).toContain('<totalAporte>294.50</totalAporte>');
  });
});
