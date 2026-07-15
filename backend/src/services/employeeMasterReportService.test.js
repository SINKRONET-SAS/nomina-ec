jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

const ExcelJS = require('exceljs');
const db = require('../config/database');
const { buildEmployeeMasterReport } = require('./employeeMasterReportService');

describe('employeeMasterReportService', () => {
  beforeEach(() => {
    db.query.mockReset();
  });

  test('genera una fila por empleado sin exponer la cuenta bancaria', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        cedula: '0102030405',
        apellidos: 'Pérez',
        nombres: 'Ana',
        fecha_nacimiento: '1990-03-10',
        cargo: 'Analista',
        departamento: 'Operaciones',
        unidad_organizativa_codigo: 'OPS',
        jornada_codigo: 'GENERAL',
        controla_asistencia: true,
        fecha_ingreso: '2026-06-15',
        fecha_salida: null,
        sueldo_bruto_mensual: '900.00',
        tipo_contrato: 'indefinido',
        iess_afiliado: true,
        iess_tipo_relacion: 'relacion_dependencia',
        modalidad_decimo_tercero: 'acumulado',
        modalidad_decimo_cuarto: 'acumulado',
        modalidad_fondo_reserva: 'mensual',
        forma_pago: 'transferencia',
        email_personal: 'ana@example.com',
        telefono: '0990000000',
        activo: true,
      }],
    });

    const report = await buildEmployeeMasterReport({ tenantId: 'tenant-1' });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(report.buffer);
    const worksheet = workbook.getWorksheet('Empleados');

    expect(db.query).toHaveBeenCalledWith(expect.not.stringContaining('cuenta_bancaria'), ['tenant-1', true]);
    expect(report.total).toBe(1);
    expect(worksheet.rowCount).toBe(2);
    expect(worksheet.getRow(2).getCell(1).value).toBe('0102030405');
    expect(worksheet.getRow(2).getCell(9).value).toBe('Sí');
    expect(worksheet.getRow(2).getCell(10).value).toBe('2026-06-15');
    expect(worksheet.getRow(2).getCell(12).value).toBe(900);
  });
});
