jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../services/auditService', () => ({
  recordAudit: jest.fn(),
}));

const db = require('../config/database');
const { recordAudit } = require('../services/auditService');
const {
  aprobar,
  actualizar,
  crear,
  eliminar,
  cargaMasiva,
  descargarPlantillaCargaMasiva,
  listarPendientes,
  listarTipos,
  reabrir,
  resolverPeriodo,
} = require('./novedadController');

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe('novedadController plantilla de carga masiva', () => {
  beforeEach(() => {
    db.query.mockReset();
    recordAudit.mockReset();
  });

  test('identifica al empleado por cédula sin exponer el EmpleadoId interno', async () => {
    const res = createResponse();

    await descargarPlantillaCargaMasiva({}, res);

    const csv = String(res.body).replace(/^\uFEFF/, '');
    expect(csv.split(/\r?\n/)[0]).toBe(
      'cedula,fecha,tipoNovedad,horas,monto,justificacion,idempotencyKey'
    );
    expect(csv).not.toContain('empleadoId');
    expect(res.headers['Content-Type']).toBe('text/csv; charset=utf-8');
  });
  test('trata una fila ya cargada como existente y no como error', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 'employee-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'period-1', status: 'open' }] })
      .mockResolvedValueOnce({
        rows: [{
          code: 'hora_extra_100',
          name: 'Hora extra 100%',
          payroll_impact: 'ingreso',
          applicability: { calculationMode: 'minutes_hourly_2' },
          status: 'activo',
        }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'batch-1' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'novedad-1',
          empleado_id: 'employee-1',
          fecha: '2026-07-31',
          tipo_novedad: 'hora_extra_100',
          minutos: 60,
          monto: '0.00',
          estado: 'pendiente',
          metadata: { source: 'carga_masiva_novedades' },
          novelty_batch_id: null,
        }],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'novedad-1' }] })
      .mockResolvedValueOnce({ rows: [] });

    const req = {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      correlationId: 'corr-bulk-duplicate',
      ip: '127.0.0.1',
      body: {
        rows: [{
          cedula: '0102030405',
          fecha: '2026-07-31',
          tipoNovedad: 'hora_extra_100',
          horas: '1',
          monto: '0',
          idempotencyKey: 'HE100-001',
        }],
      },
    };
    const res = createResponse();

    await cargaMasiva(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({
      total: 1,
      creadas: 0,
      yaExistentes: 1,
      errores: 0,
    });
    expect(res.body.results[0]).toMatchObject({
      rowNumber: 2,
      status: 'already_exists',
      novedad: { id: 'novedad-1' },
    });
  });

  test('registra las filas nuevas dentro de un lote visible y trazable', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 'employee-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'period-1', status: 'open', periodoNomina: '2026-07' }] })
      .mockResolvedValueOnce({
        rows: [{
          code: 'bono_desempeno',
          name: 'Bono de desempeño',
          payroll_impact: 'ingreso',
          applicability: { calculationMode: 'amount' },
          status: 'activo',
        }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'batch-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'novedad-1', estado: 'pendiente' }] })
      .mockResolvedValueOnce({ rows: [] });

    const req = {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      correlationId: 'corr-bulk-created',
      ip: '127.0.0.1',
      body: {
        sourceFilename: 'bonos-julio.csv',
        rows: [{
          cedula: '0102030405',
          fecha: '2026-07-31',
          tipoNovedad: 'bono_desempeno',
          horas: '0',
          monto: '100',
          idempotencyKey: 'BONO-001',
        }],
      },
    };
    const res = createResponse();

    await cargaMasiva(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({ batchId: 'batch-1', creadas: 1, yaExistentes: 0, errores: 0 });
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('novelty_batch_id'),
      expect.arrayContaining(['batch-1'])
    );
    expect(db.query).toHaveBeenLastCalledWith(
      expect.stringContaining("status = 'completado'"),
      expect.arrayContaining(['batch-1'])
    );
  });
});

describe('novedadController resolverPeriodo', () => {
  beforeEach(() => {
    db.query.mockReset();
    recordAudit.mockReset();
  });

  test('aprueba novedades pendientes del periodo seleccionado', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        { id: 'nov-1', empleado_id: 'emp-1', tipo_novedad: 'bono_desempeno', fecha: '2026-06-01', estado: 'pendiente' },
        { id: 'nov-2', empleado_id: 'emp-2', tipo_novedad: 'bono_desempeno', fecha: '2026-06-01', estado: 'pendiente' },
      ],
    }).mockResolvedValueOnce({
      rows: [],
    }).mockResolvedValueOnce({
      rows: [
        { id: 'nov-1', empleado_id: 'emp-1', tipo_novedad: 'bono_desempeno', fecha: '2026-06-01', estado: 'aprobado' },
        { id: 'nov-2', empleado_id: 'emp-2', tipo_novedad: 'bono_desempeno', fecha: '2026-06-01', estado: 'aprobado' },
      ],
    });
    const req = {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      correlationId: 'corr-1',
      ip: '127.0.0.1',
      body: { anio: 2026, mes: 6, decision: 'aprobar' },
    };
    const res = createResponse();

    await resolverPeriodo(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      periodoNomina: '2026-06',
      decision: 'aprobar',
      estado: 'aprobado',
      total: 2,
    });
    expect(db.query).toHaveBeenLastCalledWith(expect.stringContaining("estado = 'pendiente'"), expect.arrayContaining([
      'user-1',
      'tenant-1',
      '2026-06',
    ]));
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'novedades.periodo.aprobado',
      entity: 'novedades_asistencia',
    }));
  });

  test('requiere motivo para rechazar novedades del periodo', async () => {
    const req = {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      correlationId: 'corr-1',
      body: { anio: 2026, mes: 6, decision: 'rechazar', motivo: '' },
    };
    const res = createResponse();

    await resolverPeriodo(req, res);

    expect(res.statusCode).toBe(422);
    expect(res.body.error).toBe('MOTIVO_RECHAZO_REQUERIDO');
    expect(db.query).not.toHaveBeenCalled();
  });
});

describe('novedadController listarTipos', () => {
  beforeEach(() => {
    db.query.mockReset();
    recordAudit.mockReset();
  });

  test('lista tipos de novedad activos desde parametrizacion de nomina', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 'type-1',
        code: 'movilizacion',
        name: 'MOVILIZACION',
        description: 'Reembolso o anticipo de movilizacion',
        payroll_impact: 'informativo',
        applicability: { calculationMode: 'informational' },
        affects_iess: false,
        affects_income_tax: false,
        affects_decimos: false,
        affects_vacation: false,
        affects_bank_file: false,
        status: 'activo',
      }],
    });
    const req = {
      tenantId: 'tenant-1',
      correlationId: 'corr-types',
      query: { fecha: '2026-07-10' },
    };
    const res = createResponse();

    await listarTipos(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      period: { anio: 2026, mes: 7 },
      tipos: [
        expect.objectContaining({
          code: 'movilizacion',
          name: 'MOVILIZACION',
          calculationMode: 'informational',
        }),
      ],
    });
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM novelty_type_configs'),
      ['tenant-1', '2026-07-01']
    );
  });
});

describe('novedadController listarPendientes operativas', () => {
  beforeEach(() => {
    db.query.mockReset();
    recordAudit.mockReset();
  });

  test('incluye novedades consumidas para habilitar invalidacion individual', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 'nov-1',
        empleado_id: 'employee-1',
        tenant_id: 'tenant-1',
        fecha: '2026-06-15',
        tipo_novedad: 'hora_extra_50',
        minutos: 60,
        monto: '200.00',
        estado: 'aprobado',
        nombres: 'Ana',
        apellidos: 'Perez',
        cedula: '0102030405',
        period_status: 'calculated',
        period_anio: 2026,
        period_mes: 6,
        consumida_por_rol: true,
        has_employee_payroll_draft: true,
      }],
    });
    const req = {
      tenantId: 'tenant-1',
      correlationId: 'corr-operativas',
      query: { scope: 'operativas' },
    };
    const res = createResponse();

    await listarPendientes(req, res);

    expect(db.query.mock.calls[0][0]).not.toContain('NOT EXISTS');
    expect(res.statusCode).toBe(200);
    expect(res.body.novedades[0]).toMatchObject({
      id: 'nov-1',
      monto: '200.00',
      editable: false,
      requiresEmployeePayrollInvalidation: true,
    });
  });
});

describe('novedadController aprobar horas extra', () => {
  beforeEach(() => {
    db.query.mockReset();
    recordAudit.mockReset();
  });

  function mockOvertimeApprovalPrecheck({ approvedRows = [] } = {}) {
    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: '11111111-1111-1111-1111-111111111111',
          empleado_id: '22222222-2222-2222-2222-222222222222',
          tenant_id: 'tenant-1',
          fecha: '2026-06-03',
          tipo_novedad: 'hora_extra_50',
          minutos: 120,
          metadata: {},
        }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          parameter_key: 'horas_extra_limite_semanal',
          value: { amount: 2 },
          validation_status: 'validado_oficial',
          source_name: 'Parametro de prueba',
          source_url: '',
        }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: approvedRows });
  }

  test('requiere aprobacion explicita para exceder limite semanal', async () => {
    mockOvertimeApprovalPrecheck({
      approvedRows: [{
        id: '33333333-3333-3333-3333-333333333333',
        empleado_id: '22222222-2222-2222-2222-222222222222',
        fecha: '2026-06-01',
        tipo_novedad: 'hora_extra_50',
        minutos: 60,
        metadata: {},
      }],
    });
    const req = {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      correlationId: 'corr-approve-limit',
      params: { id: '11111111-1111-1111-1111-111111111111' },
      body: {},
    };
    const res = createResponse();

    await aprobar(req, res);

    expect(res.statusCode).toBe(422);
    expect(res.body).toMatchObject({
      error: 'NOVEDAD_HORAS_EXTRA_LIMITE_APROBACION_REQUERIDA',
      correlationId: 'corr-approve-limit',
    });
    expect(db.query).toHaveBeenCalledTimes(5);
  });

  test('marca excepcion aprobada cuando el motivo cubre el exceso', async () => {
    mockOvertimeApprovalPrecheck({
      approvedRows: [{
        id: '33333333-3333-3333-3333-333333333333',
        empleado_id: '22222222-2222-2222-2222-222222222222',
        fecha: '2026-06-01',
        tipo_novedad: 'hora_extra_50',
        minutos: 60,
        metadata: {},
      }],
    });
    db.query.mockResolvedValueOnce({
      rows: [{
        id: '11111111-1111-1111-1111-111111111111',
        estado: 'aprobado',
        aprobado_por: 'user-1',
        empleado_id: '22222222-2222-2222-2222-222222222222',
        tipo_novedad: 'hora_extra_50',
        fecha: '2026-06-03',
        metadata: {
          overtimeLimitException: {
            approved: true,
            reason: 'Cierre extraordinario autorizado',
          },
        },
      }],
    });
    const req = {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      correlationId: 'corr-approve-exception',
      params: { id: '11111111-1111-1111-1111-111111111111' },
      body: {
        approveOvertimeLimitException: true,
        overtimeLimitApprovalReason: 'Cierre extraordinario autorizado',
      },
    };
    const res = createResponse();

    await aprobar(req, res);

    expect(res.statusCode).toBe(200);
    expect(db.query).toHaveBeenLastCalledWith(
      expect.stringContaining('overtimeLimitException'),
      expect.arrayContaining(['user-1', '11111111-1111-1111-1111-111111111111', 'tenant-1'])
    );
    expect(JSON.parse(db.query.mock.calls[5][1][3])).toMatchObject({
      approved: true,
      approvedBy: 'user-1',
      reason: 'Cierre extraordinario autorizado',
      limitHours: 2,
      approvedVia: 'novedad.individual',
    });
  });
});

describe('novedadController crear', () => {
  beforeEach(() => {
    db.query.mockReset();
    recordAudit.mockReset();
  });

  test('rechaza novedades de empleados que no pertenecen al tenant actual', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const req = {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      correlationId: 'corr-tenant',
      body: {
        empleadoId: 'emp-otro-tenant',
        fecha: '2026-06-01',
        tipoNovedad: 'hora_extra_50',
        minutos: 60,
      },
    };
    const res = createResponse();

    await crear(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toMatchObject({
      error: 'EMPLEADO_NO_ENCONTRADO',
      correlationId: 'corr-tenant',
    });
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('tenant_id = $2'),
      ['emp-otro-tenant', 'tenant-1']
    );
  });

  test('acepta horas con dos decimales y registra minutos normalizados', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 'emp-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'period-1', status: 'open' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'nov-1',
          empleado_id: 'emp-1',
          fecha: '2026-06-01',
          tipo_novedad: 'hora_extra_50',
          minutos: 75,
          monto: 0,
          estado: 'pendiente',
        }],
      });
    const req = {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      correlationId: 'corr-hours',
      ip: '127.0.0.1',
      body: {
        empleadoId: 'emp-1',
        fecha: '2026-06-01',
        tipoNovedad: 'hora_extra_50',
        horas: 1.25,
      },
    };
    const res = createResponse();

    await crear(req, res);

    expect(res.statusCode).toBe(201);
    expect(db.query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('INSERT INTO novedades_asistencia'),
      expect.arrayContaining([75])
    );
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'novedades.manual.crear',
      newData: expect.objectContaining({ minutos: 75 }),
    }));
  });

  test('rechaza novedades manuales si la fecha no pertenece a un mes abierto', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 'emp-1' }] })
      .mockResolvedValueOnce({ rows: [] });
    const req = {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      correlationId: 'corr-period',
      body: {
        empleadoId: 'emp-1',
        fecha: '2026-07-05',
        tipoNovedad: 'hora_extra_50',
        horas: 1,
      },
    };
    const res = createResponse();

    await crear(req, res);

    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({
      error: 'PAYROLL_PERIOD_NOT_OPEN_FOR_NOVELTY',
      correlationId: 'corr-period',
    });
    expect(db.query).toHaveBeenCalledTimes(2);
    expect(recordAudit).not.toHaveBeenCalled();
  });

  test('actualiza novedad editable y la devuelve a pendiente', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'nov-1',
          empleado_id: 'emp-1',
          tenant_id: 'tenant-1',
          period_id: 'period-1',
          periodo_nomina: '2026-06',
          fecha: '2026-06-01',
          tipo_novedad: 'hora_extra_50',
          minutos: 60,
          monto: 0,
          justificacion: 'Original',
          estado: 'aprobado',
        }],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'period-1', status: 'open' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'emp-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'period-1', status: 'open' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'nov-1',
          empleado_id: 'emp-1',
          fecha: '2026-06-02',
          tipo_novedad: 'hora_extra_50',
          minutos: 120,
          monto: 0,
          justificacion: 'Ajuste',
          estado: 'pendiente',
        }],
      });
    const req = {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      correlationId: 'corr-update',
      ip: '127.0.0.1',
      params: { id: 'nov-1' },
      body: {
        empleadoId: 'emp-1',
        fecha: '2026-06-02',
        tipoNovedad: 'hora_extra_50',
        horas: 2,
        justificacion: 'Ajuste',
      },
    };
    const res = createResponse();

    await actualizar(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.novedad).toMatchObject({ estado: 'pendiente', minutos: 120 });
    expect(db.query).toHaveBeenNthCalledWith(
      7,
      expect.stringContaining('UPDATE novedades_asistencia'),
      expect.arrayContaining([120])
    );
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'novedades.manual.actualizar',
      entityId: 'nov-1',
    }));
  });

  test('reabre novedad aprobada no consumida cuando el mes sigue abierto', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'nov-1',
          empleado_id: 'emp-1',
          tenant_id: 'tenant-1',
          period_id: 'period-1',
          periodo_nomina: '2026-06',
          fecha: '2026-06-01',
          tipo_novedad: 'hora_extra_50',
          minutos: 60,
          monto: 0,
          justificacion: 'Original',
          estado: 'aprobado',
        }],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'period-1', status: 'open' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'nov-1',
          empleado_id: 'emp-1',
          estado: 'pendiente',
        }],
      });
    const req = {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      correlationId: 'corr-reopen',
      ip: '127.0.0.1',
      params: { id: 'nov-1' },
      body: { motivo: 'Corregir la fecha de la novedad' },
    };
    const res = createResponse();

    await reabrir(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.novedad).toMatchObject({ id: 'nov-1', estado: 'pendiente' });
    expect(db.query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining("SET estado = 'pendiente'"),
      expect.arrayContaining(['nov-1', 'tenant-1'])
    );
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'novedades.manual.reabrir',
      entityId: 'nov-1',
    }));
  });

  test('bloquea eliminar novedad ya consumida por rol', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'nov-1',
          empleado_id: 'emp-1',
          tenant_id: 'tenant-1',
          period_id: 'period-1',
          periodo_nomina: '2026-06',
          fecha: '2026-06-01',
          tipo_novedad: 'hora_extra_50',
          minutos: 60,
          monto: 0,
          justificacion: 'Original',
          estado: 'aprobado',
        }],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'period-1', status: 'open' }] })
      .mockResolvedValueOnce({ rows: [{ exists: 1 }] });
    const req = {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      correlationId: 'corr-delete',
      params: { id: 'nov-1' },
    };
    const res = createResponse();

    await eliminar(req, res);

    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({
      error: 'NOVEDAD_CONSUMIDA_POR_ROL',
      correlationId: 'corr-delete',
    });
    expect(db.query).toHaveBeenCalledTimes(3);
    expect(recordAudit).not.toHaveBeenCalled();
  });
});
