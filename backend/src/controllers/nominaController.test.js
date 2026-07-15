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

jest.mock('../services/payrollLifecycleService', () => ({
  discardPayrollDraft: jest.fn(),
  discardPayrollPeriodCalculation: jest.fn(),
  invalidateEmployeePayrollForNovelty: jest.fn(),
}));

jest.mock('../services/calculoNominaService', () => ({
  calcularNominaEmpleado: jest.fn(),
  calcularNominaMensual: jest.fn(),
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
  discardPayrollDraft,
  discardPayrollPeriodCalculation,
  invalidateEmployeePayrollForNovelty,
} = require('../services/payrollLifecycleService');
const { calcularNominaEmpleado, calcularNominaMensual } = require('../services/calculoNominaService');
const {
  precalcularMes,
  calcularMes,
  cerrarMes,
  descartarCalculoPeriodo,
  descargarRolPDF,
  eliminarBorrador,
  invalidarCalculoEmpleado,
  recalcularEmpleado,
  enviarRolPagoEmail,
  reabrirMes,
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

describe('nominaController calcularMes', () => {
  beforeEach(() => {
    db.getClient.mockReset();
    db.commit.mockReset();
    db.rollback.mockReset();
    calcularNominaMensual.mockReset();
    assertTenantPayrollReady.mockReset();
    assertTenantPayrollReady.mockResolvedValue({ ready: true });
    db.rollback.mockResolvedValue();
  });

  test('oculta el mensaje interno de una transaccion PostgreSQL abortada', async () => {
    const tx = { query: jest.fn() };
    const databaseError = new Error('current transaction is aborted, commands ignored until end of transaction block');
    databaseError.code = '25P02';
    db.getClient.mockResolvedValue(tx);
    calcularNominaMensual.mockRejectedValue(databaseError);
    const req = {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      correlationId: 'corr-calculo-error',
      ip: '127.0.0.1',
      body: { anio: 2026, mes: 6 },
    };
    const res = createResponse();

    await calcularMes(req, res);

    expect(db.rollback).toHaveBeenCalledWith(tx);
    expect(res.statusCode).toBe(500);
    expect(res.body).toMatchObject({
      error: 'NOMINA_CALCULO_ERROR',
      correlationId: 'corr-calculo-error',
    });
    expect(res.body.message).not.toContain('transaction is aborted');
    expect(res.body.message).toContain('código de seguimiento');
  });

  test('precalcula todos los empleados y revierte sin crear roles', async () => {
    const tx = { query: jest.fn() };
    db.getClient.mockResolvedValue(tx);
    calcularNominaMensual.mockResolvedValue({
      success: true,
      total: 2,
      batch: { id: 'batch-preview' },
      resultados: [
        { empleadoId: 'emp-1', nombre: 'Ana Perez', cedula: '0102030405', netoRecibir: '500.00' },
        { empleadoId: 'emp-2', nombre: 'Luis Ruiz', cedula: '1710034065', error: 'Revisa horas extra.' },
      ],
    });
    const req = {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      correlationId: 'corr-preview',
      ip: '127.0.0.1',
      body: { anio: 2026, mes: 6 },
    };
    const res = createResponse();

    await precalcularMes(req, res);

    expect(db.rollback).toHaveBeenCalledWith(tx);
    expect(db.commit).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      resultado: {
        preview: true,
        persisted: false,
        batch: null,
        exitosos: 1,
        errores: 1,
        resultados: [
          expect.objectContaining({ nombre: 'Ana Perez', cedula: '0102030405' }),
          expect.objectContaining({ nombre: 'Luis Ruiz', cedula: '1710034065' }),
        ],
      },
    });
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

describe('nominaController descarte controlado', () => {
  beforeEach(() => {
    discardPayrollDraft.mockReset();
    discardPayrollPeriodCalculation.mockReset();
    invalidateEmployeePayrollForNovelty.mockReset();
  });

  test('descarta el calculo completo y devuelve la siguiente accion', async () => {
    discardPayrollPeriodCalculation.mockResolvedValueOnce({
      deleted: 30,
      anio: 2026,
      mes: 6,
      nextAction: 'correct_sources_and_recalculate',
    });
    const req = {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      correlationId: 'corr-discard',
      ip: '127.0.0.1',
      body: { anio: 2026, mes: 6, motivo: 'Correccion de novedades del periodo' },
    };
    const res = createResponse();

    await descartarCalculoPeriodo(req, res);

    expect(discardPayrollPeriodCalculation).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      anio: 2026,
      mes: 6,
      reason: 'Correccion de novedades del periodo',
      correlationId: 'corr-discard',
    }));
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      result: expect.objectContaining({ deleted: 30 }),
      correlationId: 'corr-discard',
    });
  });

  test('elimina un borrador individual para corregir sus fuentes', async () => {
    discardPayrollDraft.mockResolvedValueOnce({
      deleted: 1,
      payrollId: 'payroll-1',
      empleadoId: 'employee-1',
      nextAction: 'correct_sources',
    });
    const req = {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      correlationId: 'corr-role',
      ip: '127.0.0.1',
      params: { id: 'payroll-1' },
      body: { motivo: 'Corregir horas extra del empleado', intencion: 'correction' },
    };
    const res = createResponse();

    await eliminarBorrador(req, res);

    expect(discardPayrollDraft).toHaveBeenCalledWith(expect.objectContaining({
      payrollId: 'payroll-1',
      reason: 'Corregir horas extra del empleado',
      intent: 'correction',
    }));
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain('Corrige las novedades');
  });

  test('propaga bloqueo de un rol cerrado con codigo funcional', async () => {
    discardPayrollDraft.mockRejectedValueOnce(Object.assign(
      new Error('El rol esta cerrado y no puede eliminarse ni corregirse como borrador.'),
      { code: 'NOMINA_ROL_FINAL_INMUTABLE', statusCode: 409 }
    ));
    const req = {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      correlationId: 'corr-final',
      ip: '127.0.0.1',
      params: { id: 'payroll-closed' },
      body: { motivo: 'Intento de corregir un rol cerrado', intencion: 'correction' },
    };
    const res = createResponse();

    await eliminarBorrador(req, res);

    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({
      error: 'NOMINA_ROL_FINAL_INMUTABLE',
      correlationId: 'corr-final',
    });
  });
});

describe('nominaController correccion individual por empleado', () => {
  beforeEach(() => {
    db.getClient.mockReset();
    db.commit.mockReset();
    db.rollback.mockReset();
    db.commit.mockResolvedValue(undefined);
    recordAudit.mockReset();
    invalidateEmployeePayrollForNovelty.mockReset();
    calcularNominaEmpleado.mockReset();
    assertTenantPayrollReady.mockReset();
    assertTenantPayrollReady.mockResolvedValue({ ready: true });
  });

  test('invalida el calculo de un solo empleado desde una novedad', async () => {
    invalidateEmployeePayrollForNovelty.mockResolvedValueOnce({
      scope: 'employee',
      empleadoId: 'employee-1',
      anio: 2026,
      mes: 6,
      nominasInvalidas: 1,
      lineasInvalidas: 4,
      novedadEditable: true,
    });
    const req = {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      correlationId: 'corr-invalidate',
      ip: '127.0.0.1',
      params: { anio: '2026', mes: '6', empleadoId: 'employee-1' },
      body: { novedadId: 'nov-1', motivo: 'Corregir novedad individual' },
    };
    const res = createResponse();

    await invalidarCalculoEmpleado(req, res);

    expect(invalidateEmployeePayrollForNovelty).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      employeeId: 'employee-1',
      anio: '2026',
      mes: '6',
      noveltyId: 'nov-1',
      reason: 'Corregir novedad individual',
    }));
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      scope: 'employee',
      empleadoId: 'employee-1',
      lineasInvalidas: 4,
      correlationId: 'corr-invalidate',
    });
  });

  test('recalcula un empleado y marca el periodo como calculado cuando no quedan pendientes', async () => {
    const tx = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ total: 2, missing: 0 }] })
        .mockResolvedValueOnce({ rows: [{ id: 'period-1', anio: 2026, mes: 6, status: 'calculated', calculated_at: 'now' }] }),
    };
    db.getClient.mockResolvedValueOnce(tx);
    calcularNominaEmpleado.mockResolvedValueOnce({
      success: true,
      total: 1,
      batch: { id: 'batch-employee' },
      resultados: [
        { empleadoId: 'employee-1', nombre: 'Ana Perez', cedula: '0102030405', netoRecibir: '900.00' },
      ],
    });
    recordAudit.mockResolvedValueOnce(undefined);
    const req = {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      correlationId: 'corr-recalc',
      ip: '127.0.0.1',
      params: { anio: '2026', mes: '6', empleadoId: 'employee-1' },
    };
    const res = createResponse();

    await recalcularEmpleado(req, res);

    expect(calcularNominaEmpleado).toHaveBeenCalledWith('tenant-1', 'employee-1', 2026, 6, expect.objectContaining({
      dbClient: tx,
      correlationId: 'corr-recalc',
    }));
    expect(tx.query.mock.calls[1][0]).toContain('lastEmployeePayrollRecalculation');
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'nomina.empleado.recalcular',
      dbClient: tx,
    }));
    expect(db.commit).toHaveBeenCalledWith(tx);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      coverage: { total: 2, missing: 0 },
      correlationId: 'corr-recalc',
    });
  });
});

describe('nominaController proteccion de nomina cerrada', () => {
  beforeEach(() => {
    db.query.mockReset();
    recordAudit.mockReset();
  });

  test('mantiene el endpoint heredado sin reabrir ni mutar roles cerrados', async () => {
    const req = {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      correlationId: 'corr-reopen-blocked',
      body: { anio: 2026, mes: 6, motivo: 'Corregir una novedad detectada luego del cierre' },
    };
    const res = createResponse();

    await reabrirMes(req, res);

    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({
      error: 'NOMINA_CERRADA_INMUTABLE',
      nextAction: 'registrar_ajuste_periodo_abierto',
      correlationId: 'corr-reopen-blocked',
    });
    expect(db.query).not.toHaveBeenCalled();
    expect(recordAudit).not.toHaveBeenCalled();
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
