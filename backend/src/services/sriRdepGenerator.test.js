jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../config/s3', () => ({
  s3Upload: jest.fn(async () => 'https://storage.example.com/rdep.xml'),
}));

const db = require('../config/database');
const { s3Upload } = require('../config/s3');
const AppError = require('../utils/AppError');
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
  empleado_id: 'emp-1',
  cedula: '0102030405',
  nombres: 'ANA',
  apellidos: 'DEMO',
  mes: 6,
  total_ingresos: '1000.00',
  aporte_iess_personal: '94.50',
  impuesto_renta: '0.00',
  estado: 'cerrada',
  detalle_calculo: {
    fondoReservaPagadoEmpleado: 83.33,
    fondoReservaDepositadoIess: 0,
    provisionDecimoTercero: 83.33,
    provisionDecimoCuarto: 39.17,
  },
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

    const result = await precheckRDEP('tenant-1', 2026);

    expect(result.ready).toBe(true);
    expect(result.totalEmpleados).toBe(1);
    expect(result.totalRoles).toBe(1);
    expect(result.mesesConNomina).toEqual([6]);
    expect(result.xsd.sha256).toHaveLength(64);
    expect(result.xsd.rootName).toBe('rdep');
    expect(result.xsd.validationMode).toBe('xsd_schema_validation');
    expect(result.checks.every((check) => check.passed)).toBe(true);
  });

  test('precheck bloquea si no hay nomina cerrada', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [tenant] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await precheckRDEP('tenant-1', 2026);

    expect(result.ready).toBe(false);
    expect(result.checks.find((check) => check.code === 'closed_payroll_year').passed).toBe(false);
  });

  test('genera XML RDEP con validacion real contra XSD oficial', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [tenant] })
      .mockResolvedValueOnce({ rows: [nomina] })
      .mockResolvedValueOnce({ rows: [tenant] })
      .mockResolvedValueOnce({ rows: [nomina] });

    const result = await generarXML_RDEP('tenant-1', 2026);

    expect(result.url).toBe('https://storage.example.com/rdep.xml');
    expect(result.fileName).toBe('RDEP_2026.xml');
    expect(result.totalEmpleados).toBe(1);
    expect(result.totalRoles).toBe(1);
    expect(result.validation.valid).toBe(true);
    expect(result.validation.mode).toBe('xsd_schema_validation');
    expect(result.xmlString).toContain('<rdep>');
    expect(result.xmlString).toContain('<retRelDep>');
    expect(result.xmlString).toContain('<datRetRelDep>');
    expect(result.xmlString).toContain('<decimTer>83.33</decimTer>');
    expect(result.xmlString).toContain('<fondoReserva>83.33</fondoReserva>');
    expect(s3Upload).toHaveBeenCalledTimes(1);
  });

  test('rechaza XML que no cumple el esquema oficial', () => {
    const xml = '<?xml version="1.0" encoding="UTF-8"?><anexoRelacionDependencia><numRuc>1790012345001</numRuc><anio>2026</anio></anexoRelacionDependencia>';

    expect(() => validateRdepXmlAgainstXsdContract(xml)).toThrow(AppError);
  });
});
