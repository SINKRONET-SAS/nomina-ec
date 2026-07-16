const db = require('../config/database');
const { s3Upload } = require('../config/s3');
const { recordAudit } = require('./auditService');
const { buildSummary, generarFormulario107 } = require('./sriFormulario107Service');

jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../config/s3', () => ({
  s3Upload: jest.fn(),
}));

jest.mock('./auditService', () => ({
  recordAudit: jest.fn(),
}));

describe('sriFormulario107Service', () => {
  beforeEach(() => {
    db.query.mockReset();
    s3Upload.mockReset();
    recordAudit.mockReset();
  });

  test('genera Formulario 107 individual en PDF', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        tenant_id: 'tenant-1',
        ruc: '1790012345001',
        razon_social: 'EMPRESA DEMO S.A.',
        empleado_id: 'emp-1',
        cedula: '0102030405',
        nombres: 'Maria',
        apellidos: 'Demo',
        cargo: 'Analista',
        fecha_ingreso: '2025-01-01',
        activo: true,
        mes: 1,
        estado: 'cerrada',
        sueldo_bruto: 900,
        horas_extras_50: 75,
        horas_extras_100: 25,
        total_ingresos: 1000,
        aporte_iess_personal: 94.5,
        impuesto_renta: 0,
        total_deducciones: 94.5,
        neto_recibir: 905.5,
        detalle_calculo: {},
      }],
    });
    s3Upload.mockResolvedValueOnce('local://form107.pdf');

    const result = await generarFormulario107({
      tenantId: 'tenant-1',
      anio: 2026,
      empleadoId: 'emp-1',
      context: { correlationId: 'corr-1', userId: 'user-1' },
    });

    expect(result.fileName).toBe('FORM107_0102030405_2026.pdf');
    expect(result.contentType).toBe('application/pdf');
    expect(s3Upload.mock.calls[0][0]).toBeTruthy();
    expect(s3Upload.mock.calls[0][1]).toContain('.pdf');
    expect(s3Upload.mock.calls[0][2]).toBe('application/pdf');
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'generar_formulario_107',
      correlationId: 'corr-1',
    }));
  });

  test('desglosa ingresos para Formulario 107', () => {
    expect(buildSummary([{
      sueldo_bruto: 900,
      horas_extras_50: 75,
      horas_extras_100: 25,
      total_ingresos: 1100,
      aporte_iess_personal: 94.5,
      impuesto_renta: 10,
      total_deducciones: 104.5,
      neto_recibir: 995.5,
      detalle_calculo: { montoExtrasNocturnas: 20 },
    }])).toMatchObject({
      sueldosSalarios: 900,
      horasSuplementarias: 75,
      horasExtraordinarias: 45,
      otrosIngresosGravados: 80,
      totalIngresos: 1100,
      aporteIessPersonal: 94.5,
      impuestoRentaRetenido: 10,
    });
  });
});
