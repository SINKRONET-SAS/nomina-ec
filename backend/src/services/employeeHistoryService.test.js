jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../config/s3', () => ({
  resolveStorageUrl: jest.fn((url) => url),
}));

const db = require('../config/database');
const { getEmployeeHistory } = require('./employeeHistoryService');

describe('employeeHistoryService', () => {
  beforeEach(() => {
    db.query.mockReset();
    db.query.mockResolvedValue({ rows: [] });
  });

  test('filtra roles finales para autoservicio mobile', async () => {
    await getEmployeeHistory({
      tenantId: 'tenant-1',
      empleadoId: 'employee-1',
      limit: 12,
      closedPayrollOnly: true,
    });

    expect(db.query.mock.calls[0][0]).toContain("AND estado IN ('cerrada', 'pagada')");
    expect(db.query.mock.calls[0][1]).toEqual(['tenant-1', 'employee-1', 12]);
  });

  test('mantiene historial completo para administracion', async () => {
    await getEmployeeHistory({
      tenantId: 'tenant-1',
      empleadoId: 'employee-1',
    });

    expect(db.query.mock.calls[0][0]).not.toContain("estado IN ('cerrada', 'pagada')");
  });
});
