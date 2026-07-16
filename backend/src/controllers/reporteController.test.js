jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../services/sriRdepGenerator', () => ({
  generarXML_RDEP: jest.fn(),
  precheckRDEP: jest.fn(),
}));

jest.mock('../services/iessSaeGenerator', () => ({
  generarXML_SAE: jest.fn(),
  precheckSAE: jest.fn(),
}));

jest.mock('../services/bancoAebGenerator', () => ({
  generarArchivoBanco: jest.fn(),
  precheckArchivoBanco: jest.fn(),
}));

jest.mock('../services/payrollReportService', () => ({
  generarConsolidadoAnualNomina: jest.fn(),
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
const payrollReportService = require('../services/payrollReportService');
const planCapabilityService = require('../services/planCapabilityService');
const { exportarConsolidadoAnual, reporteAsistencia } = require('./reporteController');

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

  test('agrega marcaciones y novedades por separado sin multiplicar resultados', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        empleado_id: 'emp-1',
        nombre: 'Ana Demo',
        dias_con_marcacion: 20,
        faltas_aprobadas: 0,
        minutos_extra_50: 90,
        minutos_extra_100: 135,
        minutos_extra_nocturna: 60,
        horas_extra_50: '1.50',
        horas_extra_100: '2.25',
        horas_extra_nocturna: '1.00',
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
    expect(db.query.mock.calls[0][0]).toContain('horas_extra_nocturna');
    expect(db.query.mock.calls[0][0]).toContain('WITH limites AS');
    expect(db.query.mock.calls[0][0]).toContain('asistencia AS');
    expect(db.query.mock.calls[0][0]).toContain('novedades AS');
    expect(db.query.mock.calls[0][0]).toContain('dias_con_marcacion');
    expect(db.query.mock.calls[0][0]).toContain('faltas_aprobadas');
    expect(db.query).toHaveBeenCalledWith(expect.any(String), ['tenant-1', 2026, 6]);
    expect(res.statusCode).toBe(200);
    expect(res.body.reporte[0]).toMatchObject({
      dias_con_marcacion: 20,
      faltas_aprobadas: 0,
      horas_extra_50: '1.50',
      horas_extra_100: '2.25',
      horas_extra_nocturna: '1.00',
    });
  });
});

describe('reporteController exportarConsolidadoAnual', () => {
  beforeEach(() => {
    payrollReportService.generarConsolidadoAnualNomina.mockReset();
    planCapabilityService.assertCapability.mockReset();
  });

  test('exporta consolidado anual con filtros y capability de reportes avanzados', async () => {
    planCapabilityService.assertCapability.mockResolvedValueOnce(true);
    payrollReportService.generarConsolidadoAnualNomina.mockResolvedValueOnce({
      url: 'local://consolidado.xlsx',
      fileName: 'PAYROLL_ANUAL_2026.xlsx',
      totalFilas: 12,
    });
    const req = {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      correlationId: 'corr-anual',
      ip: '127.0.0.1',
      params: { anio: '2026' },
      query: {
        reportCode: 'PAYROLL_DETAIL_TABULAR',
        filters: JSON.stringify({ department: 'OPS' }),
      },
    };
    const res = createResponse();

    await exportarConsolidadoAnual(req, res);

    expect(planCapabilityService.assertCapability).toHaveBeenCalledWith('tenant-1', 'advancedReports', expect.objectContaining({
      correlationId: 'corr-anual',
      userId: 'user-1',
    }));
    expect(payrollReportService.generarConsolidadoAnualNomina).toHaveBeenCalledWith(expect.objectContaining({
      anio: 2026,
      filters: { department: 'OPS' },
      reportCode: 'PAYROLL_DETAIL_TABULAR',
    }));
    expect(res.statusCode).toBe(200);
    expect(res.body.reporte.fileName).toBe('PAYROLL_ANUAL_2026.xlsx');
  });
});
