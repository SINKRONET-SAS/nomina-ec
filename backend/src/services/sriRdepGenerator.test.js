jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../config/s3', () => ({
  s3Upload: jest.fn(async () => 'https://storage.example.com/rdep.xml'),
}));

const db = require('../config/database');
const { s3Upload } = require('../config/s3');
const {
  generarXML_RDEP,
  precheckRDEP,
  validateRdepXmlAgainstXsdContract,
} = require('./sriRdepGenerator');

const tenant = {
  id: 'tenant-1',
  ruc: '1790012345001',
  razon_social: 'EMPRESA DEMO S.A.',
};

const nomina = {
  cedula: '0102030405',
  nombres: 'ANA',
  apellidos: 'DEMO',
  total_ingresos: '1000.00',
  aporte_iess_personal: '94.50',
  impuesto_renta: '0.00',
  estado: 'cerrada',
};

describe('sriRdepGenerator', () => {
  beforeEach(() => {
    db.query.mockReset();
    s3Upload.mockClear();
  });

  test('precheck marca listo con tenant y nomina cerrada', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [tenant] })
      .mockResolvedValueOnce({ rows: [nomina] });

    const result = await precheckRDEP('tenant-1', 2026, 6);

    expect(result.ready).toBe(true);
    expect(result.totalEmpleados).toBe(1);
    expect(result.xsd.sha256).toHaveLength(64);
    expect(result.checks.every((check) => check.passed)).toBe(true);
  });

  test('precheck bloquea si no hay nomina cerrada', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [tenant] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await precheckRDEP('tenant-1', 2026, 6);

    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.code === 'closed_payroll').passed).toBe(false);
  });

  test('genera XML RDEP con validacion estructural', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [tenant] })
      .mockResolvedValueOnce({ rows: [nomina] })
      .mockResolvedValueOnce({ rows: [tenant] })
      .mockResolvedValueOnce({ rows: [nomina] });

    const result = await generarXML_RDEP('tenant-1', 2026, 6);

    expect(result.url).toBe('https://storage.example.com/rdep.xml');
    expect(result.totalEmpleados).toBe(1);
    expect(result.validation.valid).toBe(true);
    expect(result.xmlString).toContain('rdep:anexoRelacionDependencia');
    expect(s3Upload).toHaveBeenCalledTimes(1);
  });

  test('rechaza XML sin trabajadores', () => {
    const xml = '<?xml version="1.0" encoding="UTF-8"?><rdep:anexoRelacionDependencia><identificacion><ruc>1790012345001</ruc><razonSocial>EMPRESA</razonSocial><periodo>06/2026</periodo></identificacion></rdep:anexoRelacionDependencia>';

    expect(() => validateRdepXmlAgainstXsdContract(xml)).toThrow('validacion estructural');
  });
});
