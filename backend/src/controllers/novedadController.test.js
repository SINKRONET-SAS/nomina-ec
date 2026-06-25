jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../services/auditService', () => ({
  recordAudit: jest.fn(),
}));

const db = require('../config/database');
const { recordAudit } = require('../services/auditService');
const { crear, resolverPeriodo } = require('./novedadController');

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

describe('novedadController resolverPeriodo', () => {
  beforeEach(() => {
    db.query.mockReset();
    recordAudit.mockReset();
  });

  test('aprueba novedades pendientes del periodo seleccionado', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        { id: 'nov-1', empleado_id: 'emp-1', tipo_novedad: 'hora_extra_50', fecha: '2026-06-01', estado: 'aprobado' },
        { id: 'nov-2', empleado_id: 'emp-2', tipo_novedad: 'hora_extra_50', fecha: '2026-06-01', estado: 'aprobado' },
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
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("estado = 'pendiente'"), expect.arrayContaining([
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
});
