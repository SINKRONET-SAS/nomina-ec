jest.mock('../config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
}));

jest.mock('./auditService', () => ({
  recordAudit: jest.fn(),
}));

const db = require('../config/database');
const { recordAudit } = require('./auditService');
const {
  buildPreviewRows,
  commitEmployeeImport,
  listEmployeeImportBatches,
  parseEmployeeImport,
  previewEmployeeImport,
  rollbackEmployeeImport,
  splitDelimitedLine,
} = require('./employeeImportService');

const RAW_IMPORT = [
  'identification;firstName;lastName;departmentCode;position;hireDate;salary',
  '1710034065;Maria Fernanda;Demo Ruiz;ADM;Analista;2024-01-15;850.00',
].join('\n');

describe('employeeImportService', () => {
  beforeEach(() => {
    db.query.mockReset();
    db.getClient.mockReset();
    db.commit.mockReset();
    db.rollback.mockReset();
    recordAudit.mockReset();
  });

  test('splitDelimitedLine respeta comillas', () => {
    expect(splitDelimitedLine('1;"Demo; Uno";3', ';')).toEqual(['1', 'Demo; Uno', '3']);
  });

  test('parseEmployeeImport normaliza headers conocidos', () => {
    const rows = parseEmployeeImport({ rawText: RAW_IMPORT });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      identification: '1710034065',
      firstName: 'Maria Fernanda',
      lastName: 'Demo Ruiz',
      salary: '850.00',
    });
  });

  test('buildPreviewRows marca errores por cedula duplicada y sueldo invalido', () => {
    const rows = parseEmployeeImport({
      rawText: [
        'cedula;nombres;apellidos;fecha_ingreso;sueldo',
        '1710034065;Maria;Demo;2024-01-15;0',
        '1710034065;Maria;Demo;2024-01-15;850',
      ].join('\n'),
    });

    const preview = buildPreviewRows(rows);

    expect(preview[0].status).toBe('error');
    expect(preview[0].errors).toContain('Cédula duplicada en el archivo');
    expect(preview[0].errors).toContain('Sueldo debe ser un numero positivo');
  });

  test('previewEmployeeImport consulta cedulas existentes', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ cedula: '1710034065' }] });

    const preview = await previewEmployeeImport({ rawText: RAW_IMPORT });

    expect(preview.errorRows).toBe(1);
    expect(preview.rows[0].errors).toContain('Cédula ya registrada en el sistema');
  });

  test('previewEmployeeImport filtra cedulas existentes por tenant cuando recibe tenantId', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ cedula: '1710034065' }] })
      .mockResolvedValueOnce({ rows: [] });

    await previewEmployeeImport({ rawText: RAW_IMPORT }, 'tenant-1');

    expect(db.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('WHERE tenant_id = $1'),
      ['tenant-1', ['1710034065']]
    );
  });

  test('commitEmployeeImport inserta lote y empleados en transaccion', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'position-1',
          code: 'ANALISTA',
          name: 'Analista',
          salary_min: '500.00',
          salary_max: '1500.00',
          organization_unit_code: 'ADM',
          organization_unit_name: 'Administracion',
        }],
      });
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'batch-1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'emp-1', cedula: '1710034065', nombres: 'Maria Fernanda', apellidos: 'Demo Ruiz' }] })
        .mockResolvedValueOnce({ rows: [] }),
    };
    db.getClient.mockResolvedValueOnce(client);

    const result = await commitEmployeeImport({
      tenantId: 'tenant-1',
      userId: 'user-1',
      correlationId: 'corr-1',
      ipAddress: '127.0.0.1',
      payload: { rawText: RAW_IMPORT, sourceName: 'demo.csv' },
    });

    expect(result.ok).toBe(true);
    expect(result.batchId).toBe('batch-1');
    expect(client.query.mock.calls[1][0]).toContain('position_id');
    expect(client.query.mock.calls[1][1]).toEqual(expect.arrayContaining(['position-1', 'Analista', 'ADM']));
    expect(db.commit).toHaveBeenCalledWith(client);
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'empleados.import.commit',
      entityId: 'batch-1',
    }));
  });

  test('listEmployeeImportBatches lista lotes recientes', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 'batch-1', employee_count: 2 }] });

    const batches = await listEmployeeImportBatches({ tenantId: 'tenant-1' });

    expect(batches).toEqual([{ id: 'batch-1', employee_count: 2 }]);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('employee_import_batches'), ['tenant-1', 10]);
  });

  test('rollbackEmployeeImport bloquea lotes con procesos asociados', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'batch-1', status: 'completado', source_name: 'demo.csv' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'emp-1', cedula: '1710034065' }] })
        .mockResolvedValueOnce({ rows: [{ empleado_id: 'emp-1', source: 'nominas', total: 1 }] }),
    };
    db.getClient.mockResolvedValueOnce(client);

    const result = await rollbackEmployeeImport({
      tenantId: 'tenant-1',
      batchId: 'batch-1',
      userId: 'user-1',
      correlationId: 'corr-1',
      ipAddress: '127.0.0.1',
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(409);
    expect(db.rollback).toHaveBeenCalledWith(client);
  });

  test('rollbackEmployeeImport elimina empleados importados sin dependencias', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'batch-1', status: 'completado', source_name: 'demo.csv' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'emp-1', cedula: '1710034065' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'emp-1', cedula: '1710034065' }] })
        .mockResolvedValueOnce({ rows: [] }),
    };
    db.getClient.mockResolvedValueOnce(client);

    const result = await rollbackEmployeeImport({
      tenantId: 'tenant-1',
      batchId: 'batch-1',
      userId: 'user-1',
      correlationId: 'corr-1',
      ipAddress: '127.0.0.1',
    });

    expect(result.ok).toBe(true);
    expect(result.deletedEmployees).toBe(1);
    expect(db.commit).toHaveBeenCalledWith(client);
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'empleados.import.rollback',
      entityId: 'batch-1',
    }));
  });
});
