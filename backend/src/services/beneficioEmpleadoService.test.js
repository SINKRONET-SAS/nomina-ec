jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('./auditService', () => ({
  recordAudit: jest.fn(),
}));

const db = require('../config/database');
const { getApprovedDeductions } = require('./beneficioEmpleadoService');

describe('beneficioEmpleadoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('agrupa anticipos y prestamos aprobados para nomina', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        { id: 'ben-1', tipo: 'anticipo', descripcion: 'Anticipo junio', saldo_pendiente: '100.00', cuota_mensual: '80.00' },
        { id: 'ben-2', tipo: 'prestamo', descripcion: 'Prestamo laptop', saldo_pendiente: '300.00', cuota_mensual: '120.00' },
      ],
    });

    const result = await getApprovedDeductions('tenant-1', 'emp-1', 2026, 6);

    expect(result.anticipos).toBe(80);
    expect(result.prestamos).toBe(120);
    expect(result.items).toHaveLength(2);
    expect(db.query.mock.calls[0][1]).toEqual(['tenant-1', 'emp-1', 2026, 6]);
  });
});
