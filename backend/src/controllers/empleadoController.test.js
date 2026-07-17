jest.mock('../config/database', () => ({
  query: jest.fn(),
}));
jest.mock('../services/auditService', () => ({
  recordAudit: jest.fn(),
}));
jest.mock('../services/bancoAebGenerator', () => ({
  getBankProfileForTenant: jest.fn(),
}));
jest.mock('../services/bankAccountCrypto', () => ({
  encryptBankAccount: jest.fn((account) => Buffer.from(`encrypted:${account}`)),
}));
jest.mock('../services/employeeDocumentCleanupService', () => ({
  cleanupEmployeeLegalDocuments: jest.fn(),
}));

const db = require('../config/database');
const { recordAudit } = require('../services/auditService');
const { getBankProfileForTenant } = require('../services/bancoAebGenerator');
const { encryptBankAccount } = require('../services/bankAccountCrypto');
const { cleanupEmployeeLegalDocuments } = require('../services/employeeDocumentCleanupService');
const empleadoController = require('./empleadoController');

function mockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe('empleadoController.listar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.query.mockResolvedValue({ rows: [] });
    recordAudit.mockResolvedValue(undefined);
    getBankProfileForTenant.mockResolvedValue({ bankCode: '2017', profileKey: 'PRODUBANCO' });
  });

  test('consulta empleados activos por defecto', async () => {
    const req = { tenantId: 'tenant-1', query: {}, usuario: { rol: 'owner' }, usuarioId: 'user-1', correlationId: 'corr-1' };
    const res = mockResponse();

    await empleadoController.listar(req, res);

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('FROM empleados'), ['tenant-1', true]);
    expect(res.json).toHaveBeenCalledWith({ success: true, empleados: [] });
  });

  test('permite consultar empleados inactivos con activo=false', async () => {
    const req = { tenantId: 'tenant-1', query: { activo: 'false' }, usuario: { rol: 'owner' }, usuarioId: 'user-1', correlationId: 'corr-1' };
    const res = mockResponse();

    await empleadoController.listar(req, res);

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('FROM empleados'), ['tenant-1', false]);
  });

  test('mantiene activo=true cuando el query param llega como string', async () => {
    const req = { tenantId: 'tenant-1', query: { activo: 'true' }, usuario: { rol: 'owner' }, usuarioId: 'user-1', correlationId: 'corr-1' };
    const res = mockResponse();

    await empleadoController.listar(req, res);

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('FROM empleados'), ['tenant-1', true]);
  });

  test('redacta sueldo y gastos personales para supervisor', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 'emp-1',
        nombres: 'Ana',
        sueldo_bruto_mensual: '900.00',
        gastos_personales_anuales: '1200.00',
        cargo_salary_min: '500.00',
        cargo_salary_max: '1200.00',
      }],
    });
    const req = { tenantId: 'tenant-1', query: {}, usuario: { rol: 'supervisor' }, usuarioId: 'user-2', correlationId: 'corr-2' };
    const res = mockResponse();

    await empleadoController.listar(req, res);

    expect(recordAudit).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      empleados: [expect.objectContaining({
        id: 'emp-1',
        sueldo_bruto_mensual: null,
        gastos_personales_anuales: null,
        cargo_salary_min: null,
        cargo_salary_max: null,
        cuenta_bancaria_registrada: false,
        datos_sensibles_redactados: true,
      })],
    });
  });

  test('audita lectura sensible para owner', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: 'emp-1', sueldo_bruto_mensual: '900.00', gastos_personales_anuales: '0.00' }],
    });
    const req = { tenantId: 'tenant-1', query: {}, usuario: { rol: 'owner' }, usuarioId: 'user-1', correlationId: 'corr-3', ip: '127.0.0.1' };
    const res = mockResponse();

    await empleadoController.listar(req, res);

    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'empleado.datos_sensibles.leidos',
      entity: 'empleados',
      tenantId: 'tenant-1',
      userId: 'user-1',
    }));
  });

  test('bloquea lectura de empleados para rol empleado', async () => {
    const req = { tenantId: 'tenant-1', query: {}, usuario: { rol: 'empleado' }, correlationId: 'corr-4' };
    const res = mockResponse();

    await empleadoController.listar(req, res);

    expect(db.query).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('empleadoController.obtener', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    recordAudit.mockResolvedValue(undefined);
  });

  test('expone indicador de cuenta bancaria sin devolver el valor cifrado', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'emp-1',
          nombres: 'Ana',
          apellidos: 'Perez',
          fecha_nacimiento: '1990-01-01',
          cuenta_bancaria_cifrada: 'encrypted-value',
          banco: '2017',
          tipo_cuenta: 'AHORROS',
          forma_pago: 'transferencia',
        }],
      })
      .mockResolvedValueOnce({ rows: [] });
    const req = {
      tenantId: 'tenant-1',
      params: { id: 'emp-1' },
      usuario: { rol: 'owner' },
      usuarioId: 'user-1',
      correlationId: 'corr-detail',
    };
    const res = mockResponse();

    await empleadoController.obtener(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      empleado: expect.objectContaining({
        id: 'emp-1',
        banco: '2017',
        tipo_cuenta: 'AHORROS',
        forma_pago: 'transferencia',
        cuenta_bancaria_registrada: true,
      }),
    });
    const empleado = res.json.mock.calls[0][0].empleado;
    expect(empleado).not.toHaveProperty('cuenta_bancaria_cifrada');
  });
});

describe('empleadoController.actualizar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    recordAudit.mockResolvedValue(undefined);
    getBankProfileForTenant.mockResolvedValue({ bankCode: '2017', profileKey: 'PRODUBANCO' });
  });

  test('guarda el codigo bancario usado por la ficha y confirma cuenta registrada', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 'emp-1',
        nombres: 'Ana',
        apellidos: 'Perez',
        cargo: 'Analista',
        sueldo_bruto_mensual: '1000.00',
        banco: '2017',
        tipo_cuenta: 'AHORROS',
        forma_pago: 'transferencia',
        cuenta_bancaria_registrada: true,
      }],
    });
    const req = {
      tenantId: 'tenant-1',
      params: { id: 'emp-1' },
      body: {
        forma_pago: 'transferencia',
        banco: '2017',
        tipo_cuenta: 'AHORROS',
        cuenta_bancaria: '9999999999',
      },
      usuario: { rol: 'owner' },
      usuarioId: 'user-1',
      correlationId: 'corr-update',
    };
    const res = mockResponse();

    await empleadoController.actualizar(req, res);

    expect(encryptBankAccount).toHaveBeenCalledWith('9999999999');
    expect(getBankProfileForTenant).toHaveBeenCalledWith('tenant-1', '2017');
    const [sql, values] = db.query.mock.calls[0];
    expect(sql).toContain('banco =');
    expect(values).toEqual(expect.arrayContaining(['2017', 'AHORROS', 'transferencia']));
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      empleado: expect.objectContaining({
        banco: '2017',
        tipo_cuenta: 'AHORROS',
        forma_pago: 'transferencia',
        cuenta_bancaria_registrada: true,
      }),
    });
  });

  test('guarda referencia externa y ubicacion domiciliaria en la ficha', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 'emp-1',
        nombres: 'Ana',
        apellidos: 'Perez',
        cargo: 'Analista',
        sueldo_bruto_mensual: '1000.00',
        referencia_no_convive_nombres: 'Maria Gomez',
        referencia_no_convive_email: 'maria@example.com',
        referencia_no_convive_telefono: '0999999999',
        domicilio_lat: '-0.1806530',
        domicilio_lng: '-78.4678340',
      }],
    });
    const req = {
      tenantId: 'tenant-1',
      params: { id: 'emp-1' },
      body: {
        referencia_no_convive_nombres: ' Maria Gomez ',
        referencia_no_convive_email: 'MARIA@EXAMPLE.COM',
        referencia_no_convive_telefono: '0999999999',
        domicilio_lat: '-0.180653',
        domicilio_lng: '-78.467834',
      },
      usuario: { rol: 'owner' },
      usuarioId: 'user-1',
      correlationId: 'corr-home',
    };
    const res = mockResponse();

    await empleadoController.actualizar(req, res);

    const [sql, values] = db.query.mock.calls[0];
    expect(sql).toContain('referencia_no_convive_nombres =');
    expect(sql).toContain('domicilio_lat =');
    expect(values).toEqual(expect.arrayContaining([
      'Maria Gomez',
      'maria@example.com',
      '0999999999',
      -0.180653,
      -78.467834,
    ]));
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      empleado: expect.objectContaining({
        referencia_no_convive_nombres: 'Maria Gomez',
        domicilio_lat: '-0.1806530',
      }),
    });
  });
});

describe('empleadoController.eliminar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    recordAudit.mockResolvedValue(undefined);
    cleanupEmployeeLegalDocuments.mockResolvedValue({ documentCount: 0, storageObjectCount: 0, storageKeys: [] });
  });

  test('bloquea eliminacion cuando existen roles cerrados o pagados', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ total: 2, primer_periodo: 202606, ultimo_periodo: 202607 }],
    });
    const req = {
      tenantId: 'tenant-1',
      params: { id: 'emp-1' },
      usuario: { rol: 'owner' },
      usuarioId: 'user-1',
      correlationId: 'corr-delete-block',
    };
    const res = mockResponse();

    await empleadoController.eliminar(req, res);

    expect(db.query).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'EMPLEADO_ELIMINACION_BLOQUEADA_NOMINA_CERRADA',
      details: expect.objectContaining({ totalRolesFinales: 2 }),
    }));
    expect(recordAudit).not.toHaveBeenCalled();
  });

  test('elimina logicamente si no existen roles cerrados o pagados', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ total: 0, primer_periodo: null, ultimo_periodo: null }] })
      .mockResolvedValueOnce({ rows: [{ id: 'emp-1', cedula: '0912345678', nombres: 'Ana', apellidos: 'Perez', activo: true }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'emp-1',
          cedula: '0912345678',
          nombres: 'Ana',
          apellidos: 'Perez',
          activo: false,
        }],
      });
    const req = {
      tenantId: 'tenant-1',
      params: { id: 'emp-1' },
      usuario: { rol: 'owner' },
      usuarioId: 'user-1',
      correlationId: 'corr-delete-ok',
      ip: '127.0.0.1',
    };
    const res = mockResponse();

    await empleadoController.eliminar(req, res);

    expect(db.query.mock.calls[0][0]).toContain("estado IN ('cerrada', 'pagada')");
    expect(db.query.mock.calls[2][0]).toContain('SET activo = false');
    expect(cleanupEmployeeLegalDocuments).toHaveBeenCalledWith(expect.objectContaining({ employeeId: 'emp-1', tenantId: 'tenant-1' }));
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'empleado.eliminado',
      entity: 'empleados',
      entityId: 'emp-1',
      tenantId: 'tenant-1',
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: 'Ficha eliminada de la base activa.',
      deletionMode: 'logical',
    }));
  });
});
