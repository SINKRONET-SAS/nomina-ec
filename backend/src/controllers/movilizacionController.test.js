jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../services/auditService', () => ({
  recordAudit: jest.fn(),
}));

jest.mock('../services/employeeAppInviteService', () => ({
  resolveLinkedEmployee: jest.fn(),
}));

const db = require('../config/database');
const { resolveLinkedEmployee } = require('../services/employeeAppInviteService');
const { misInformes, recibirInforme } = require('./movilizacionController');

function mockResponse() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('movilizacionController', () => {
  beforeEach(() => {
    db.query.mockReset();
    resolveLinkedEmployee.mockReset();
  });

  test('recibe informe de empleado y queda pendiente', async () => {
    resolveLinkedEmployee.mockResolvedValueOnce({
      employee: { id: 'emp-1' },
      linkSource: 'employee_app_link',
    });
    db.query.mockResolvedValueOnce({
      rows: [{ id: 'inf-1', estado: 'pendiente', periodo: '2026-06', total_usd: '12.50', dias: 1 }],
    });

    const req = {
      tenantId: 'tenant-1',
      usuario: { rol: 'empleado', email: 'empleado@example.com' },
      usuarioId: 'user-1',
      body: {
        periodo: '2026-06',
        detalle: [{ fecha: '2026-06-10', origen: 'A', destino: 'B', valor_usd: 12.5, concepto: 'taxi' }],
      },
      query: {},
      params: {},
      correlationId: 'corr-mov-1',
      ip: '127.0.0.1',
    };
    const res = mockResponse();
    const next = jest.fn();

    await recibirInforme(req, res, next);

    expect(resolveLinkedEmployee).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      userId: 'user-1',
      role: 'empleado',
    }));
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO informe_movilizacion'),
      expect.arrayContaining(['tenant-1', 'emp-1', '2026-06', 12.5, 1])
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      informeId: 'inf-1',
    }));
    expect(next).not.toHaveBeenCalled();
  });

  test('misInformes resuelve al owner enlazado sin exigir empleadoId', async () => {
    resolveLinkedEmployee.mockResolvedValueOnce({
      employee: { id: 'emp-1' },
      linkSource: 'employee_app_link',
    });
    db.query.mockResolvedValueOnce({
      rows: [{ id: 'inf-1', periodo: '2026-07', estado: 'pendiente' }],
    });

    const req = {
      tenantId: 'tenant-1',
      usuarioId: 'user-1',
      usuario: { id: 'user-1', rol: 'owner', email: 'marco@example.com' },
      query: {},
      body: {},
      correlationId: 'corr-1',
    };
    const res = mockResponse();
    const next = jest.fn();

    await misInformes(req, res, next);

    expect(resolveLinkedEmployee).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      userId: 'user-1',
      email: 'marco@example.com',
      role: 'owner',
      requireExplicitLink: true,
    }));
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('FROM informe_movilizacion'), ['tenant-1', 'emp-1']);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      informes: [{ id: 'inf-1', periodo: '2026-07', estado: 'pendiente' }],
    }));
    expect(next).not.toHaveBeenCalled();
  });

  test('recibirInforme conserva empleadoId explicito para RRHH', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: 'inf-2', estado: 'pendiente', periodo: '2026-07', total_usd: 12.5, dias: 1 }],
    });

    const req = {
      tenantId: 'tenant-1',
      usuarioId: 'user-2',
      usuario: { id: 'user-2', rol: 'admin_rrhh', email: 'rrhh@example.com' },
      body: {
        empleadoId: 'emp-explicito',
        periodo: '2026-07',
        detalle: [
          {
            fecha: '2026-07-01',
            origen: 'Quito',
            destino: 'Cumbaya',
            concepto: 'otro',
            valor_usd: 12.5,
          },
        ],
      },
      query: {},
      params: {},
      correlationId: 'corr-2',
      ip: '127.0.0.1',
    };
    const res = mockResponse();
    const next = jest.fn();

    await recibirInforme(req, res, next);

    expect(resolveLinkedEmployee).not.toHaveBeenCalled();
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO informe_movilizacion'),
      expect.arrayContaining(['tenant-1', 'emp-explicito', '2026-07', 12.5, 1])
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });

  test('rechazo exige motivo comercial', async () => {
    const req = {
      tenantId: 'tenant-1',
      usuario: { rol: 'owner' },
      usuarioId: 'user-1',
      params: { id: 'inf-1' },
      body: { accion: 'rechazado', motivo: '' },
      correlationId: 'corr-mov-2',
    };
    const res = mockResponse();
    const next = jest.fn();

    const { resolverInforme } = require('./movilizacionController');
    await resolverInforme(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      code: 'MOVILIZACION_RECHAZO_MOTIVO_REQUERIDO',
    }));
    expect(db.query).not.toHaveBeenCalled();
  });
});
