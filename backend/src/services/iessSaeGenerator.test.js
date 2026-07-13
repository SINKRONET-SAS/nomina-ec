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
const { generarXML_SAE, precheckSAE } = require('./iessSaeGenerator');

describe('generarXML_SAE', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ALLOW_EXPERIMENTAL_IESS_XML;
  });

  test('bloquea XML IESS si no existe formato oficial o habilitacion experimental', async () => {
    const tenantRows = [{ id: 'tenant-1', ruc: '1790000000001', razon_social: 'Empresa Demo' }];
    const payrollRows = [{
      cedula: '0102030405',
      nombres: 'Ana',
      apellidos: 'Perez',
      fecha_ingreso: '2026-01-01',
      total_ingresos: '1000.00',
      aporte_iess_personal: '94.50',
      estado: 'cerrada',
    }];
    db.query
      .mockResolvedValueOnce({ rows: tenantRows })
      .mockResolvedValueOnce({ rows: payrollRows })
      .mockResolvedValueOnce({ rows: tenantRows })
      .mockResolvedValueOnce({ rows: payrollRows });

    await expect(generarXML_SAE('tenant-1', 2026, 1)).rejects.toMatchObject({
      code: 'IESS_XML_FORMAT_NOT_VALIDATED',
      statusCode: 423,
    });
  });

  test('usa el aporte patronal de parametros legales versionados en modo experimental', async () => {
    process.env.ALLOW_EXPERIMENTAL_IESS_XML = 'true';
    const tenantRows = [{ id: 'tenant-1', ruc: '1790000000001', razon_social: 'Empresa Demo' }];
    const payrollRows = [{
      cedula: '0102030405',
      nombres: 'Ana',
      apellidos: 'Perez',
      fecha_ingreso: '2026-01-01',
      total_ingresos: '1000.00',
      aporte_iess_personal: '94.50',
      estado: 'cerrada',
    }];
    db.query
      .mockResolvedValueOnce({ rows: tenantRows })
      .mockResolvedValueOnce({ rows: payrollRows });

    const result = await generarXML_SAE('tenant-1', 2026, 1);

    expect(result.xmlString).toContain('<aportePatronal>200.00</aportePatronal>');
    expect(result.xmlString).toContain('<totalAportePatronal>200.00</totalAportePatronal>');
    expect(result.xmlString).toContain('<totalAporte>294.50</totalAporte>');
    expect(result.fileName).toBe('SAE_IESS_202601.xml');
    expect(result.validation).toMatchObject({
      valid: true,
      mode: 'experimental_versioned_structural_contract',
    });
    expect(result.precheck.ready).toBe(true);
    expect(result.precheck.dataReady).toBe(true);
  });

  test('bloquea SAE cuando no existe nomina cerrada del periodo', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{ id: 'tenant-1', ruc: '1790000000001', razon_social: 'Empresa Demo' }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const precheck = await precheckSAE('tenant-1', 2026, 1);

    expect(precheck.ready).toBe(false);
    expect(precheck.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'nomina_cerrada_periodo', passed: false }),
    ]));
  });
});
