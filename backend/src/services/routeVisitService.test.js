jest.mock('pdfmake/build/pdfmake', () => ({
  createPdf: jest.fn(() => ({
    getBuffer: (callback) => callback(Buffer.from('pdf-rutas')),
  })),
}));

jest.mock('pdfmake/build/vfs_fonts', () => ({}));

jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../config/s3', () => ({
  s3Upload: jest.fn(),
}));

const db = require('../config/database');
const {
  exportRouteReportCsv,
  exportRouteReportPdf,
  exportRouteReportXlsx,
  getRouteReportRows,
} = require('./routeVisitService');

const reportRow = {
  operational_date: '2026-06-27',
  cedula: '0102030405',
  empleado: 'Ana Demo',
  cargo: 'Mercaderista',
  sitio: 'Tienda Norte',
  estado_parada: 'completed',
  is_unplanned: false,
  llegada: '2026-06-27T08:00:00.000Z',
  salida: '2026-06-27T08:45:00.000Z',
  dentro_zona: true,
  distancia_maxima: 12.4,
  excepciones: 0,
};

describe('routeVisitService route report', () => {
  beforeEach(() => {
    db.query.mockReset();
    db.query.mockResolvedValue({ rows: [reportRow] });
  });

  test('lista entradas y salidas visibles para la pantalla', async () => {
    const report = await getRouteReportRows({
      tenantId: 'tenant-1',
      fechaInicio: '2026-06-27',
      fechaFin: '2026-06-27',
    });

    expect(db.query.mock.calls[0][0]).toContain("mark_type = 'arrival'");
    expect(db.query.mock.calls[0][0]).toContain("mark_type = 'departure'");
    expect(report.rows[0]).toMatchObject({
      fecha: '2026-06-27',
      empleado: 'Ana Demo',
      sitio: 'Tienda Norte',
      llegada: '2026-06-27T08:00:00.000Z',
      salida: '2026-06-27T08:45:00.000Z',
      dentroZona: true,
    });
  });

  test('genera CSV, Excel y PDF del mismo reporte', async () => {
    const csv = await exportRouteReportCsv({
      tenantId: 'tenant-1',
      fechaInicio: '2026-06-27',
      fechaFin: '2026-06-27',
    });
    const xlsx = await exportRouteReportXlsx({
      tenantId: 'tenant-1',
      fechaInicio: '2026-06-27',
      fechaFin: '2026-06-27',
    });
    const pdf = await exportRouteReportPdf({
      tenantId: 'tenant-1',
      fechaInicio: '2026-06-27',
      fechaFin: '2026-06-27',
    });

    expect(csv).toContain('llegada,salida');
    expect(csv).toContain('Ana Demo');
    expect(Buffer.isBuffer(xlsx)).toBe(true);
    expect(xlsx.length).toBeGreaterThan(0);
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.toString()).toBe('pdf-rutas');
  });
});
