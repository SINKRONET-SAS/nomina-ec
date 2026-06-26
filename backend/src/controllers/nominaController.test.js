jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../services/payrollRolePdfService', () => ({
  generatePayrollRolePdf: jest.fn(),
  generatePayrollRolePeriodTransposedPdf: jest.fn(),
}));

const db = require('../config/database');
const {
  generatePayrollRolePdf,
  generatePayrollRolePeriodTransposedPdf,
} = require('../services/payrollRolePdfService');
const {
  descargarRolPDF,
  descargarRolesTranspuestosPDF,
  listarPorPeriodo,
} = require('./nominaController');

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe('nominaController listarPorPeriodo', () => {
  beforeEach(() => {
    db.query.mockReset();
    generatePayrollRolePdf.mockReset();
    generatePayrollRolePeriodTransposedPdf.mockReset();
  });

  test('rechaza parametros invalidos en lugar de consultar como periodo', async () => {
    const req = {
      tenantId: 'tenant-1',
      correlationId: 'corr-1',
      params: { anio: 'payroll-id', mes: 'rol-pdf' },
    };
    const res = createResponse();

    await listarPorPeriodo(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('NOMINA_PERIODO_INVALIDO');
    expect(db.query).not.toHaveBeenCalled();
  });
});

describe('nominaController descargarRolPDF', () => {
  beforeEach(() => {
    db.query.mockReset();
    generatePayrollRolePdf.mockReset();
    generatePayrollRolePeriodTransposedPdf.mockReset();
  });

  test('regenera PDF real cuando la URL guardada es demo', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        rol_pdf_url: 'demo://dcen26/roles/nomina-1.pdf',
        anio: 2026,
        mes: 6,
        cedula: '0102030405',
      }],
    });
    generatePayrollRolePdf.mockResolvedValueOnce({
      url: 'http://localhost:3000/api/storage/local/rol-real',
      fileName: 'rol_pago_0102030405_2026_06.pdf',
      contentType: 'application/pdf',
    });
    const req = {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      correlationId: 'corr-2',
      params: { id: 'nomina-1' },
    };
    const res = createResponse();

    await descargarRolPDF(req, res);

    expect(generatePayrollRolePdf).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      payrollId: 'nomina-1',
      userId: 'user-1',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      fileName: 'rol_pago_0102030405_2026_06.pdf',
      contentType: 'application/pdf',
      generated: true,
      correlationId: 'corr-2',
    });
    expect(res.body.url).toContain('/api/storage/local/');
    expect(res.body.url).toContain('token=');
  });
});

describe('nominaController descargarRolesTranspuestosPDF', () => {
  beforeEach(() => {
    db.query.mockReset();
    generatePayrollRolePdf.mockReset();
    generatePayrollRolePeriodTransposedPdf.mockReset();
  });

  test('genera PDF transpuesto del periodo con tenant autenticado', async () => {
    generatePayrollRolePeriodTransposedPdf.mockResolvedValueOnce({
      url: 'http://localhost:3000/api/storage/local/roles-transpuesto',
      fileName: 'roles_pago_transpuesto_2026_06.pdf',
      contentType: 'application/pdf',
      totalEmpleados: 30,
    });
    const req = {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      correlationId: 'corr-3',
      params: { anio: '2026', mes: '6' },
    };
    const res = createResponse();

    await descargarRolesTranspuestosPDF(req, res);

    expect(generatePayrollRolePeriodTransposedPdf).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      anio: '2026',
      mes: '6',
      userId: 'user-1',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      fileName: 'roles_pago_transpuesto_2026_06.pdf',
      contentType: 'application/pdf',
      totalEmpleados: 30,
      generated: true,
      correlationId: 'corr-3',
    });
    expect(res.body.url).toContain('/api/storage/local/');
    expect(res.body.url).toContain('token=');
  });
});
