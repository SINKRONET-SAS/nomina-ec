jest.mock('../config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
}));

jest.mock('../services/auditService', () => ({
  recordAudit: jest.fn(),
}));

jest.mock('../services/communicationService', () => ({
  sendRolPagoDisponible: jest.fn(),
  sendRolPagoEmail: jest.fn(),
}));

jest.mock('../services/operationalReadinessService', () => ({
  assertTenantPayrollReady: jest.fn(),
}));

jest.mock('../services/payrollRolePdfService', () => ({
  generatePayrollRolePdf: jest.fn(),
  generatePayrollRolePeriodTransposedPdf: jest.fn(),
}));

const db = require('../config/database');
const { recordAudit } = require('../services/auditService');
const { sendRolPagoDisponible, sendRolPagoEmail } = require('../services/communicationService');
const { assertTenantPayrollReady } = require('../services/operationalReadinessService');
const {
  generatePayrollRolePdf,
  generatePayrollRolePeriodTransposedPdf,
} = require('../services/payrollRolePdfService');
const {
  cerrarMes,
  descargarRolPDF,
  enviarRolPagoEmail,
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
    db.getClient.mockReset();
    db.commit.mockReset();
    db.rollback.mockReset();
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

describe('nominaController cerrarMes', () => {
  beforeEach(() => {
    db.query.mockReset();
    db.getClient.mockReset();
    db.commit.mockReset();
    db.rollback.mockReset();
    recordAudit.mockReset();
    sendRolPagoDisponible.mockReset();
    assertTenantPayrollReady.mockReset();
    assertTenantPayrollReady.mockResolvedValue({ ready: true });
    recordAudit.mockResolvedValue();
    sendRolPagoDisponible.mockResolvedValue({ status: 'sent', provider: 'smtp' });
  });

  test('bloquea el periodo y cierra nomina dentro de una transaccion', async () => {
    const tx = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'period-1', status: 'calculated' }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 'nomina-1',
            empleado_id: '11111111-1111-1111-1111-111111111111',
            tenant_id: 'tenant-1',
            anio: 2026,
            mes: 6,
            detalle_calculo: { beneficiosDescontados: [] },
          }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: '11111111-1111-1111-1111-111111111111',
            tenant_id: 'tenant-1',
            nombres: 'Ana',
            apellidos: 'Perez',
            email_personal: 'ana@example.com',
          }],
        }),
    };
    db.getClient.mockResolvedValueOnce(tx);
    const req = {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      correlationId: 'corr-cierre',
      ip: '127.0.0.1',
      body: { anio: 2026, mes: 6 },
    };
    const res = createResponse();

    await cerrarMes(req, res);

    expect(db.getClient).toHaveBeenCalledWith('tenant-1', 'user-1');
    expect(tx.query.mock.calls[0][0]).toContain('FOR UPDATE');
    expect(tx.query.mock.calls[1][0]).toContain("SET estado = 'cerrada'");
    expect(tx.query.mock.calls[2][0]).toContain("SET status = 'closed'");
    expect(db.commit).toHaveBeenCalledWith(tx);
    expect(db.rollback).not.toHaveBeenCalled();
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      action: 'cerrar_nomina',
    }));
    expect(sendRolPagoDisponible).toHaveBeenCalledWith(expect.objectContaining({
      employee: expect.objectContaining({ nombres: 'Ana' }),
      payroll: expect.objectContaining({ id: 'nomina-1' }),
    }));
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true, total: 1 });
  });

  test('revierte la transaccion si el periodo dejo de estar calculado', async () => {
    const tx = {
      query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 'period-1', status: 'closed' }] }),
    };
    db.getClient.mockResolvedValueOnce(tx);
    const req = {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      correlationId: 'corr-cierre-409',
      body: { anio: 2026, mes: 6 },
    };
    const res = createResponse();

    await cerrarMes(req, res);

    expect(db.rollback).toHaveBeenCalledWith(tx);
    expect(db.commit).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toBe('NOMINA_PERIODO_NO_CALCULADO');
  });
});

describe('nominaController descargarRolPDF', () => {
  beforeEach(() => {
    db.query.mockReset();
    generatePayrollRolePdf.mockReset();
    generatePayrollRolePeriodTransposedPdf.mockReset();
    sendRolPagoEmail.mockReset();
    recordAudit.mockReset();
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

describe('nominaController enviarRolPagoEmail', () => {
  beforeEach(() => {
    db.query.mockReset();
    generatePayrollRolePdf.mockReset();
    sendRolPagoEmail.mockReset();
    recordAudit.mockReset();
  });

  test('envia rol cerrado por email con PDF adjunto generado', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 'nomina-1',
        empleado_id: 'emp-1',
        tenant_id: 'tenant-1',
        anio: 2026,
        mes: 6,
        estado: 'cerrada',
        nombres: 'Ana',
        apellidos: 'Perez',
        cedula: '0102030405',
        email_personal: 'ana@example.com',
      }],
    });
    generatePayrollRolePdf.mockResolvedValueOnce({
      fileName: 'rol_pago_0102030405_2026_06.pdf',
      contentType: 'application/pdf',
      buffer: Buffer.from('pdf-demo'),
    });
    sendRolPagoEmail.mockResolvedValueOnce({
      status: 'sent',
      provider: 'smtp',
      messageId: 'smtp-role-1',
    });
    recordAudit.mockResolvedValueOnce(undefined);
    const req = {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      correlationId: 'corr-role-email',
      ip: '127.0.0.1',
      params: { id: 'nomina-1' },
    };
    const res = createResponse();

    await enviarRolPagoEmail(req, res);

    expect(generatePayrollRolePdf).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      payrollId: 'nomina-1',
      userId: 'user-1',
      includeBuffer: true,
    });
    expect(sendRolPagoEmail).toHaveBeenCalledWith(expect.objectContaining({
      employee: expect.objectContaining({ email_personal: 'ana@example.com' }),
      pdf: expect.objectContaining({ fileName: 'rol_pago_0102030405_2026_06.pdf' }),
      correlationId: 'corr-role-email',
    }));
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'nomina.rol_pago.email_enviar',
      entity: 'nominas',
      entityId: 'nomina-1',
    }));
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      delivery: { status: 'sent', provider: 'smtp', messageId: 'smtp-role-1' },
      fileName: 'rol_pago_0102030405_2026_06.pdf',
      correlationId: 'corr-role-email',
    });
  });

  test('bloquea envio por email si el rol no esta cerrado', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 'nomina-1',
        empleado_id: 'emp-1',
        tenant_id: 'tenant-1',
        anio: 2026,
        mes: 6,
        estado: 'borrador',
        email_personal: 'ana@example.com',
      }],
    });
    const req = {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      correlationId: 'corr-role-email-409',
      params: { id: 'nomina-1' },
    };
    const res = createResponse();

    await enviarRolPagoEmail(req, res);

    expect(generatePayrollRolePdf).not.toHaveBeenCalled();
    expect(sendRolPagoEmail).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toBe('NOMINA_ROL_NO_CERRADO');
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

  test('devuelve mensaje seguro cuando el almacenamiento documental no esta configurado', async () => {
    generatePayrollRolePeriodTransposedPdf.mockRejectedValueOnce(Object.assign(
      new Error('El almacenamiento documental no esta configurado. Configura credenciales S3 reales en Render antes de generar o descargar documentos.'),
      {
        code: 'STORAGE_S3_CREDENTIALS_MISSING',
        statusCode: 503,
      }
    ));
    const req = {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      correlationId: 'corr-storage',
      params: { anio: '2026', mes: '6' },
    };
    const res = createResponse();

    await descargarRolesTranspuestosPDF(req, res);

    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({
      error: 'STORAGE_S3_CREDENTIALS_MISSING',
      message: 'El almacenamiento documental no esta configurado. Configura credenciales S3 reales en Render antes de generar o descargar documentos.',
      correlationId: 'corr-storage',
    });
    expect(res.body.message).not.toMatch(/Could not load credentials|Error al subir archivo a S3/i);
  });
});
