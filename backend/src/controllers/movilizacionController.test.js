jest.mock('../config/database', () => ({
  query: jest.fn(),
}));
jest.mock('../services/auditService', () => ({
  recordAudit: jest.fn(),
}));

const db = require('../config/database');
const movilizacionController = require('./movilizacionController');

function mockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe('movilizacionController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('recibe informe de empleado y queda pendiente', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 'emp-1' }] })
      .mockResolvedValueOnce({
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
      correlationId: 'corr-mov-1',
    };
    const res = mockResponse();
    const next = jest.fn();

    await movilizacionController.recibirInforme(req, res, next);

    expect(db.query.mock.calls[1][0]).toContain('INSERT INTO informe_movilizacion');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      informeId: 'inf-1',
    }));
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

    await movilizacionController.resolverInforme(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      code: 'MOVILIZACION_RECHAZO_MOTIVO_REQUERIDO',
    }));
    expect(db.query).not.toHaveBeenCalled();
  });
});
