jest.mock('../config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
  commit: jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('./auditService', () => ({ recordAudit: jest.fn().mockResolvedValue(undefined) }));
jest.mock('./payrollNoveltyService', () => ({ ensureNoveltyTypeAllowed: jest.fn().mockResolvedValue({ code: 'bono_desempeno' }) }));

const db = require('../config/database');
const { recordAudit } = require('./auditService');
const { ensureNoveltyTypeAllowed } = require('./payrollNoveltyService');
const { ADVANCE_BULK_TEMPLATE_COLUMNS, createRun, decideLine, closeRun, parseBulkCsv, templateCsv } = require('./advancePayrollService');

const user = { id: 'user-1' };
const context = { correlationId: 'corr-advance', ipAddress: '127.0.0.1' };

function runRow() {
  return { id: 'role-1', tenant_id: 'tenant-1', payroll_period_id: 'period-1', anio: 2026, mes: 7, fecha_corte: '2026-07-31', estado: 'aprobado', descripcion: 'Quincena', created_by: 'user-1' };
}

function getRunQueries() {
  db.query
    .mockResolvedValueOnce({ rows: [runRow()] })
    .mockResolvedValueOnce({ rows: [{ id: 'line-1', role_id: 'role-1', empleado_id: 'employee-1', nombres: 'Ana', apellidos: 'Demo', cedula: '0999999999', monto: '100.00', tipo_novedad: 'bono_desempeno', nombre_bonificacion: 'Bono cumplimiento', estado: 'bonificar', bonificacion_novedad_id: 'novelty-1' }] });
}

describe('advancePayrollService', () => {
  beforeEach(() => {
    db.query.mockReset();
    db.getClient.mockReset();
    db.commit.mockClear();
    db.rollback.mockClear();
    recordAudit.mockClear();
    ensureNoveltyTypeAllowed.mockClear();
  });

  test('expone una plantilla CSV por cedula y rechaza encabezados alternos', () => {
    const csv = templateCsv();
    expect(csv.split(/\r?\n/)[0]).toBe(ADVANCE_BULK_TEMPLATE_COLUMNS.join(','));
    expect(parseBulkCsv(csv)).toEqual([expect.objectContaining({ cedula: '0102030405', monto: '100.00', tipoNovedad: 'bono_desempeno' })]);
    expect(() => parseBulkCsv('empleadoId,monto,tipoNovedad,nombreBonificacion\nabc,100,bono_desempeno,Bono')).toThrow('encabezado');
  });

  test('crea un rol en la ruta única de anticipos y conserva nombre/tipo de bonificación', async () => {
    const tx = { query: jest.fn() };
    db.getClient.mockResolvedValueOnce(tx);
    tx.query
      .mockResolvedValueOnce({ rows: [{ id: 'period-1', status: 'open' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'employee-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'role-1', tenant_id: 'tenant-1', payroll_period_id: 'period-1', anio: 2026, mes: 7, fecha_corte: '2026-07-31', estado: 'borrador', descripcion: 'Quincena', created_by: 'user-1' }] })
      .mockResolvedValueOnce({ rows: [] });
    getRunQueries();

    const result = await createRun('tenant-1', { anio: 2026, mes: 7, descripcion: 'Quincena', lineas: [{ empleadoId: 'employee-1', monto: 100, tipoNovedad: 'bono_desempeno', nombreBonificacion: 'Bono cumplimiento' }] }, user, context);

    expect(result.lineas[0]).toMatchObject({ nombreBonificacion: 'Bono cumplimiento', estado: 'bonificar' });
    expect(ensureNoveltyTypeAllowed).toHaveBeenCalledWith(expect.objectContaining({ tipoNovedad: 'bono_desempeno', anio: 2026, mes: 7 }));
    expect(db.commit).toHaveBeenCalledWith(tx);
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'nomina.rol_anticipos.creado' }));
  });

  test('convierte una línea aprobada en bonificación idempotente', async () => {
    const tx = { query: jest.fn() };
    db.getClient.mockResolvedValueOnce(tx);
    tx.query
      .mockResolvedValueOnce({ rows: [runRow()] })
      .mockResolvedValueOnce({ rows: [{ id: 'period-1', status: 'open' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'line-1', role_id: 'role-1', empleado_id: 'employee-1', monto: '100.00', tipo_novedad: 'bono_desempeno', nombre_bonificacion: 'Bono cumplimiento', estado: 'aprobado' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'novelty-1' }] })
      .mockResolvedValueOnce({ rows: [] });
    getRunQueries();

    const result = await decideLine('tenant-1', 'role-1', 'line-1', 'bonificar', user, context);

    expect(result.lineas[0]).toMatchObject({ estado: 'bonificar', bonificacionNovedadId: 'novelty-1' });
    expect(db.commit).toHaveBeenCalledWith(tx);
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'nomina.rol_anticipos.linea.bonificar' }));
  });

  test('no cierra el rol mientras existan líneas sin decisión', async () => {
    const tx = { query: jest.fn() };
    db.getClient.mockResolvedValueOnce(tx);
    tx.query
      .mockResolvedValueOnce({ rows: [{ estado: 'aprobado' }] })
      .mockResolvedValueOnce({ rows: [{ total: 1 }] });

    await expect(closeRun('tenant-1', 'role-1', user, context)).rejects.toMatchObject({ code: 'ROL_ANTICIPOS_LINEAS_PENDIENTES' });
    expect(db.rollback).toHaveBeenCalledWith(tx);
  });
});
