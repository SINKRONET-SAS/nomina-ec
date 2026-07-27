jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../config/s3', () => ({
  s3Upload: jest.fn(async () => 'https://storage.local/iess-msu.txt'),
}));

jest.mock('./legalParameterService', () => ({
  getLegalParametersForTenant: jest.fn(async () => ({
    sourceStatus: 'validado_oficial',
    payroll: {
      employerIessRate: 0.2,
      personalIessRate: 0.0945,
    },
  })),
  assertLegalParametersReadyForProduction: jest.fn(),
}));

const db = require('../config/database');
const { s3Upload } = require('../config/s3');
const { generarXML_SAE, precheckSAE } = require('./iessSaeGenerator');

const tenantRows = [{ id: 'tenant-1', ruc: '1790000000001', razon_social: 'Empresa Demo' }];
const companyRows = [{ payload: { razonSocial: 'Empresa Demo' } }];
const establishmentRows = [{ code: '0002', payload: { codigoEstablecimiento: '0002', principal: true } }];

function mockMsuData(payrollRows) {
  db.query
    .mockResolvedValueOnce({ rows: tenantRows })
    .mockResolvedValueOnce({ rows: companyRows })
    .mockResolvedValueOnce({ rows: establishmentRows })
    .mockResolvedValueOnce({ rows: payrollRows });
}

describe('generarXML_SAE', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('genera archivo batch IESS MSU en ASCII TXT', async () => {
    const payrollRows = [{
      cedula: '0102030405',
      nombres: 'Ana',
      apellidos: 'Perez',
      fecha_ingreso: '2026-01-01',
      total_ingresos: '1000.00',
      aporte_iess_personal: '94.50',
      estado: 'cerrada',
      detalle_calculo: null,
    }];
    mockMsuData(payrollRows);
    mockMsuData(payrollRows);

    const result = await generarXML_SAE('tenant-1', 2026, 1);

    expect(result.batchString).toBe('1790000000001;0002;2026;01;MSU;0102030405;1000.00\r\n');
    expect(result.batchString).not.toContain('<?xml');
    expect(result.fileName).toBe('IESS_MSU_202601.txt');
    expect(result.contentType).toBe('text/plain; charset=us-ascii');
    expect(result.validation).toMatchObject({
      valid: true,
      mode: 'iess_batch_ascii_txt_dat',
    });
    expect(result.precheck.ready).toBe(true);
    expect(s3Upload).toHaveBeenCalledWith(
      Buffer.from(result.batchString, 'ascii'),
      'reportes/tenant-1/iess/IESS_MSU_202601.txt',
      'text/plain; charset=us-ascii',
    );
  });

  test('MSU excluye ingresos no-IESS del sueldo', async () => {
    const payrollRows = [{
      cedula: '0102030405',
      nombres: 'Ana',
      apellidos: 'Perez',
      fecha_ingreso: '2026-01-01',
      total_ingresos: '1050.00',
      aporte_iess_personal: '94.50',
      estado: 'cerrada',
      detalle_calculo: {
        novedadesResumen: { incomeNotAffectsIess: 50 },
      },
    }];
    mockMsuData(payrollRows);
    mockMsuData(payrollRows);

    const result = await generarXML_SAE('tenant-1', 2026, 1);

    expect(result.batchString).toContain(';1000.00\r\n');
    expect(result.batchString).not.toContain(';1050.00');
  });

  test('genera batch ENT para nuevos empleados del periodo', async () => {
    mockMsuData([]);
    db.query
      .mockResolvedValueOnce({ rows: [{
        cedula: '0908070605',
        nombres: 'Carlos',
        apellidos: 'Lopez',
        fecha_ingreso: '2026-01-15',
        sueldo_bruto_mensual: 500,
      }] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await generarXML_SAE('tenant-1', 2026, 1, 'ENT');

    expect(result.movementType).toBe('ENT');
    expect(result.batchString).toContain(';ENT;');
    expect(result.batchString).toContain('0908070605');
    expect(result.batchString).toContain('15/01/2026');
    expect(result.batchString).toContain('500.00');
    expect(result.fileName).toBe('IESS_ENT_202601.txt');
  });

  test('genera batch SAL para empleados con salida en el periodo', async () => {
    mockMsuData([]);
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{
        cedula: '0102030405',
        nombres: 'Ana',
        apellidos: 'Perez',
        fecha_salida: '2026-01-31',
        motivo_salida: 'RENUNCIA',
        sueldo_bruto_mensual: 1000,
      }] });

    const result = await generarXML_SAE('tenant-1', 2026, 1, 'SAL');

    expect(result.movementType).toBe('SAL');
    expect(result.batchString).toContain(';SAL;');
    expect(result.batchString).toContain('0102030405');
    expect(result.batchString).toContain('31/01/2026');
    expect(result.batchString).toContain(';RV\r\n');
    expect(result.fileName).toBe('IESS_SAL_202601.txt');
  });

  test('rechaza batch si existen trabajadores duplicados en el periodo', async () => {
    db.query
      .mockResolvedValueOnce({ rows: tenantRows })
      .mockResolvedValueOnce({ rows: [{ payload: {} }] })
      .mockResolvedValueOnce({ rows: [{ code: '0002', payload: { principal: true } }] })
      .mockResolvedValueOnce({
        rows: [
          {
            cedula: '0102030405', nombres: 'Ana', apellidos: 'Perez',
            fecha_ingreso: '2026-01-01', total_ingresos: '1000.00',
            aporte_iess_personal: '94.50', estado: 'cerrada', detalle_calculo: null,
          },
          {
            cedula: '0102030405', nombres: 'Ana', apellidos: 'Perez',
            fecha_ingreso: '2026-01-01', total_ingresos: '1000.00',
            aporte_iess_personal: '94.50', estado: 'cerrada', detalle_calculo: null,
          },
        ],
      });

    const precheck = await precheckSAE('tenant-1', 2026, 1);

    expect(precheck.ready).toBe(false);
    expect(precheck.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'un_registro_por_trabajador', passed: false }),
    ]));
  });

  test('bloquea SAE cuando no existe nomina cerrada del periodo', async () => {
    db.query
      .mockResolvedValueOnce({ rows: tenantRows })
      .mockResolvedValueOnce({ rows: [{ payload: {} }] })
      .mockResolvedValueOnce({ rows: [{ code: '0002', payload: { principal: true } }] })
      .mockResolvedValueOnce({ rows: [] });

    const precheck = await precheckSAE('tenant-1', 2026, 1);

    expect(precheck.ready).toBe(false);
    expect(precheck.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'nomina_cerrada_periodo', passed: false }),
    ]));
  });

  test('bloquea batch si no existe establecimiento IESS configurado', async () => {
    db.query
      .mockResolvedValueOnce({ rows: tenantRows })
      .mockResolvedValueOnce({ rows: [{ payload: {} }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          cedula: '0102030405', nombres: 'Ana', apellidos: 'Perez',
          fecha_ingreso: '2026-01-01', total_ingresos: '1000.00',
          aporte_iess_personal: '94.50', estado: 'cerrada', detalle_calculo: null,
        }],
      });

    const precheck = await precheckSAE('tenant-1', 2026, 1);

    expect(precheck.ready).toBe(false);
    expect(precheck.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'iess_codigo_establecimiento', passed: false }),
    ]));
  });
});
