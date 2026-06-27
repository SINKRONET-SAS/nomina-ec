jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../services/sriRdepGenerator', () => ({
  generarXML_RDEP: jest.fn(),
  precheckRDEP: jest.fn(),
}));

jest.mock('../services/iessSaeGenerator', () => ({
  generarXML_SAE: jest.fn(),
}));

jest.mock('../services/bancoAebGenerator', () => ({
  generarArchivoBanco: jest.fn(),
  precheckArchivoBanco: jest.fn(),
}));

jest.mock('../services/payrollReportService', () => ({
  generarReporteNomina: jest.fn(),
}));

jest.mock('../services/sriFormulario107Service', () => ({
  generarFormulario107: jest.fn(),
  precheckFormulario107: jest.fn(),
}));

jest.mock('../services/planCapabilityService', () => ({
  assertCapability: jest.fn(),
  getTenantPlanCapabilities: jest.fn(),
}));

const db = require('../config/database');
const { reporteAsistencia } = require('./reporteController');

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

describe('reporteController reporteAsistencia', () => {
  beforeEach(() => {
    db.query.mockReset();
  });

  test('expone horas extra 50 y 100 redondeadas a dos decimales', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        empleado_id: 'emp-1',
        nombre: 'Ana Demo',
        minutos_extra_50: 90,
        minutos_extra_100: 135,
        horas_extra_50: '1.50',
        horas_extra_100: '2.25',
      }],
    });
    const req = {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      correlationId: 'corr-asistencia',
      params: { anio: '2026', mes: '6' },
    };
    const res = createResponse();

    await reporteAsistencia(req, res);

    expect(db.query.mock.calls[0][0]).toContain('horas_extra_50');
    expect(db.query.mock.calls[0][0]).toContain('horas_extra_100');
    expect(res.statusCode).toBe(200);
    expect(res.body.reporte[0]).toMatchObject({
      horas_extra_50: '1.50',
      horas_extra_100: '2.25',
    });
  });
});
