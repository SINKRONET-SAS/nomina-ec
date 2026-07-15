const ExcelJS = require('exceljs');
const db = require('../config/database');
const { todayInEcuador } = require('../utils/dateEcuador');

function isoDate(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

async function buildEmployeeMasterReport({ tenantId, activeOnly = true }) {
  const result = await db.query(`
    SELECT
      e.cedula,
      e.apellidos,
      e.nombres,
      e.fecha_nacimiento,
      COALESCE(jp.name, e.cargo) AS cargo,
      COALESCE(ou.name, e.departamento) AS departamento,
      e.unidad_organizativa_codigo,
      e.jornada_codigo,
      e.controla_asistencia,
      e.fecha_ingreso,
      e.fecha_salida,
      e.sueldo_bruto_mensual,
      e.tipo_contrato,
      e.iess_afiliado,
      e.iess_tipo_relacion,
      e.modalidad_decimo_tercero,
      e.modalidad_decimo_cuarto,
      e.modalidad_fondo_reserva,
      e.forma_pago,
      e.email_personal,
      e.telefono,
      e.activo
    FROM empleados e
    LEFT JOIN job_positions jp
      ON jp.id = e.position_id
     AND jp.tenant_id = e.tenant_id
    LEFT JOIN organization_units ou
      ON ou.tenant_id = e.tenant_id
     AND ou.code = e.unidad_organizativa_codigo
    WHERE e.tenant_id = $1
      AND ($2::boolean = false OR e.activo = true)
    ORDER BY e.apellidos, e.nombres, e.cedula
  `, [tenantId, activeOnly]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SKNOMINA';
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet('Empleados', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  worksheet.columns = [
    { header: 'Cédula', key: 'cedula', width: 14 },
    { header: 'Apellidos', key: 'apellidos', width: 28 },
    { header: 'Nombres', key: 'nombres', width: 28 },
    { header: 'Fecha de nacimiento', key: 'fecha_nacimiento', width: 20 },
    { header: 'Cargo', key: 'cargo', width: 26 },
    { header: 'Departamento', key: 'departamento', width: 24 },
    { header: 'Unidad organizativa', key: 'unidad_organizativa_codigo', width: 22 },
    { header: 'Jornada', key: 'jornada_codigo', width: 18 },
    { header: 'Control de asistencia', key: 'controla_asistencia', width: 21 },
    { header: 'Fecha de ingreso', key: 'fecha_ingreso', width: 18 },
    { header: 'Fecha de salida', key: 'fecha_salida', width: 18 },
    { header: 'Sueldo mensual', key: 'sueldo_bruto_mensual', width: 18 },
    { header: 'Tipo de contrato', key: 'tipo_contrato', width: 24 },
    { header: 'Afiliado al IESS', key: 'iess_afiliado', width: 18 },
    { header: 'Relación IESS', key: 'iess_tipo_relacion', width: 24 },
    { header: 'Décimo tercero', key: 'modalidad_decimo_tercero', width: 19 },
    { header: 'Décimo cuarto', key: 'modalidad_decimo_cuarto', width: 19 },
    { header: 'Fondo de reserva', key: 'modalidad_fondo_reserva', width: 20 },
    { header: 'Forma de pago', key: 'forma_pago', width: 18 },
    { header: 'Email', key: 'email_personal', width: 30 },
    { header: 'Teléfono', key: 'telefono', width: 18 },
    { header: 'Estado', key: 'estado', width: 15 },
  ];

  for (const employee of result.rows) {
    worksheet.addRow({
      ...employee,
      fecha_nacimiento: isoDate(employee.fecha_nacimiento),
      fecha_ingreso: isoDate(employee.fecha_ingreso),
      fecha_salida: isoDate(employee.fecha_salida),
      sueldo_bruto_mensual: Number(employee.sueldo_bruto_mensual || 0),
      iess_afiliado: employee.iess_afiliado ? 'Sí' : 'No',
      controla_asistencia: employee.controla_asistencia ? 'Sí' : 'No',
      estado: employee.activo ? 'Activo' : 'Desvinculado',
    });
  }

  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: worksheet.columns.length },
  };
  worksheet.getRow(1).height = 28;
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });
  worksheet.getColumn('sueldo_bruto_mensual').numFmt = '$#,##0.00';
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1 && rowNumber % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      });
    }
  });

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return {
    buffer,
    total: result.rows.length,
    fileName: `listado_maestro_empleados_${todayInEcuador()}.xlsx`,
  };
}

module.exports = { buildEmployeeMasterReport };
