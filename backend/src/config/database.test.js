const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
  on: jest.fn(),
  end: jest.fn(),
};

jest.mock('pg', () => ({
  Pool: jest.fn(() => mockPool),
}));

describe('database tenant context', () => {
  let db;

  beforeEach(() => {
    jest.resetModules();
    mockPool.query.mockReset();
    mockPool.connect.mockReset();
    mockPool.on.mockReset();
    mockPool.end.mockReset();
    mockClient.query.mockReset();
    mockClient.release.mockReset();
    db = require('./database');
  });

  test('usa pool.query directo cuando no hay contexto tenant', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ ok: true }], rowCount: 1 });

    const result = await db.query('SELECT 1 AS ok');

    expect(result.rows[0].ok).toBe(true);
    expect(mockPool.query).toHaveBeenCalledWith('SELECT 1 AS ok', undefined);
    expect(mockPool.connect).not.toHaveBeenCalled();
  });

  test('db.query configura app.current_tenant_id dentro del contexto de request', async () => {
    mockPool.connect.mockResolvedValueOnce(mockClient);
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // set tenant
      .mockResolvedValueOnce({}) // set user
      .mockResolvedValueOnce({ rows: [{ id: 'empleado-1' }], rowCount: 1 })
      .mockResolvedValueOnce({}); // COMMIT

    const result = await db.runWithTenantContext(
      { tenantId: 'tenant-1', userId: 'user-1' },
      () => db.query('SELECT * FROM empleados WHERE id = $1', ['empleado-1']),
    );

    expect(result.rows[0].id).toBe('empleado-1');
    expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(mockClient.query).toHaveBeenNthCalledWith(2, 'SELECT set_config($1, $2, true)', ['app.current_tenant_id', 'tenant-1']);
    expect(mockClient.query).toHaveBeenNthCalledWith(3, 'SELECT set_config($1, $2, true)', ['app.current_user_id', 'user-1']);
    expect(mockClient.query).toHaveBeenNthCalledWith(4, 'SELECT * FROM empleados WHERE id = $1', ['empleado-1']);
    expect(mockClient.query).toHaveBeenNthCalledWith(5, 'COMMIT');
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });

  test('hace rollback y libera cliente si falla una consulta con contexto tenant', async () => {
    const failure = new Error('boom');
    mockPool.connect.mockResolvedValueOnce(mockClient);
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // set tenant
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce({}); // ROLLBACK

    await expect(db.runWithTenantContext(
      { tenantId: 'tenant-1' },
      () => db.query('SELECT * FROM empleados'),
    )).rejects.toThrow('boom');

    expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(mockClient.query).toHaveBeenNthCalledWith(2, 'SELECT set_config($1, $2, true)', ['app.current_tenant_id', 'tenant-1']);
    expect(mockClient.query).toHaveBeenNthCalledWith(3, 'SELECT * FROM empleados', undefined);
    expect(mockClient.query).toHaveBeenNthCalledWith(4, 'ROLLBACK');
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });
});
