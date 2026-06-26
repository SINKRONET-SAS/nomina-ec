const pdfmake = require('pdfmake/build/pdfmake');
pdfmake.vfs = require('pdfmake/build/vfs_fonts');

const db = require('../config/database');
const { s3Upload } = require('../config/s3');
const AppError = require('../utils/AppError');
const { toMoneyString } = require('../utils/money');

function normalizeDetail(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (err) {
    return {};
  }
}

function money(value) {
  return `$${toMoneyString(Number(value || 0))}`;
}

function cleanText(value, fallback = '') {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ');
  return text || fallback;
}

function safeFilePart(value) {
  return String(value || 'sin_dato').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
}

function employeeName(row = {}) {
  return `${row.nombres || ''} ${row.apellidos || ''}`.trim() || 'Empleado';
}

function legalRepresentative(row = {}) {
  const config = normalizeDetail(row.tenant_configuracion || row.configuracion);
  return {
    name: cleanText(
      config.representanteLegal
        || config.representante_legal
        || config.legalRepresentative
        || row.representante_legal,
      'Representante legal/delegado autorizado'
    ),
    idNumber: cleanText(
      config.representanteLegalIdentificacion
        || config.representante_legal_identificacion
        || config.legalRepresentativeId
        || config.cedulaRepresentanteLegal,
      'no registrada'
    ),
  };
}

function addAmountLine(lines, label, amount) {
  const value = Number(amount || 0);
  if (!Number.isFinite(value) || value <= 0) return;
  lines.push([label, money(value)]);
}

function buildPayrollRoleDocDefinition(row) {
  const detail = normalizeDetail(row.detalle_calculo);
  const representative = legalRepresentative(row);
  const generatedAt = new Date().toISOString();
  const ingresos = [];
  const deducciones = [];
  const provisiones = [];

  addAmountLine(ingresos, 'Sueldo proporcional', detail.sueldoProporcional ?? row.sueldo_bruto);
  addAmountLine(ingresos, 'Horas extra 50%', detail.montoExtras50 ?? row.horas_extras_50);
  addAmountLine(ingresos, 'Horas extra 100%', detail.montoExtras100 ?? row.horas_extras_100);
  addAmountLine(ingresos, 'Bonos de desempeno', detail.bonosDesempeno);
  addAmountLine(ingresos, 'Comisiones', detail.comisiones);
  addAmountLine(ingresos, 'Fondo de reserva pagado', detail.fondoReservaPagadoEmpleado);

  addAmountLine(deducciones, 'Aporte IESS personal', detail.aporteIess ?? row.aporte_iess_personal);
  addAmountLine(deducciones, 'Impuesto a la renta', detail.impuestoRenta ?? row.impuesto_renta);
  addAmountLine(deducciones, 'Descuento por faltas', detail.descuentoFaltas);
  addAmountLine(deducciones, 'Anticipos', detail.anticipos ?? row.anticipos);
  addAmountLine(deducciones, 'Prestamos', detail.prestamos ?? row.prestamos);

  addAmountLine(provisiones, 'Aporte IESS patronal', detail.aportePatronal);
  addAmountLine(provisiones, 'Provision decimo tercero', detail.provisionDecimoTercero);
  addAmountLine(provisiones, 'Provision decimo cuarto', detail.provisionDecimoCuarto);
  addAmountLine(provisiones, 'Provision vacaciones', detail.provisionVacaciones);
  addAmountLine(provisiones, 'Provision fondos de reserva', detail.provisionFondosReserva);

  const table = (title, rows) => [
    { text: title, style: 'section' },
    {
      table: {
        widths: ['*', 90],
        body: [
          [{ text: 'Concepto', bold: true }, { text: 'Valor', bold: true, alignment: 'right' }],
          ...(rows.length > 0 ? rows : [['Sin valores', '$0.00']]).map(([label, amount]) => [
            label,
            { text: amount, alignment: 'right' },
          ]),
        ],
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 10],
    },
  ];

  return {
    pageSize: 'A4',
    pageMargins: [36, 42, 36, 42],
    content: [
      { text: 'ROL DE PAGO', style: 'title' },
      { text: row.razon_social || 'Empresa', style: 'subtitle' },
      { text: `RUC: ${row.ruc || 'no registrado'} | Periodo: ${String(row.mes).padStart(2, '0')}/${row.anio}`, style: 'audit', alignment: 'center', margin: [0, 0, 0, 14] },
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'Empleado', style: 'boxTitle' },
              employeeName(row),
              `Cedula: ${row.cedula || 'no registrada'}`,
              `Cargo: ${row.cargo || 'no registrado'}`,
              `Departamento: ${row.departamento || 'no registrado'}`,
            ],
          },
          {
            width: '*',
            stack: [
              { text: 'Resumen', style: 'boxTitle' },
              `Estado: ${row.estado || 'borrador'}`,
              `Dias trabajados: ${row.dias_trabajados || 0}`,
              `Lote de calculo: ${row.calculation_batch_id || 'sin lote'}`,
              `Fuente legal: ${detail.fuenteLegal || 'no registrada'}`,
            ],
          },
        ],
        columnGap: 18,
        margin: [0, 0, 0, 14],
      },
      ...table('Ingresos', ingresos),
      ...table('Deducciones', deducciones),
      ...table('Provisiones y costo empleador', provisiones),
      {
        table: {
          widths: ['*', 90],
          body: [
            ['Total ingresos', { text: money(row.total_ingresos), alignment: 'right', bold: true }],
            ['Total deducciones', { text: money(row.total_deducciones), alignment: 'right', bold: true }],
            ['Neto a recibir', { text: money(row.neto_recibir), alignment: 'right', bold: true }],
            ['Costo empleador', { text: money(detail.costoEmpleador), alignment: 'right', bold: true }],
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 6, 0, 12],
      },
      { text: 'Recepcion y conformidad', style: 'section' },
      {
        text: 'El trabajador declara haber recibido el detalle de ingresos, deducciones, provisiones y neto del periodo indicado. La firma deja constancia de recepcion del rol de pago y no reemplaza obligaciones de pago, registro o conservacion de evidencias que correspondan al empleador.',
        style: 'notice',
        margin: [0, 0, 0, 18],
      },
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: '\n\n____________________________', alignment: 'center' },
              { text: representative.name, alignment: 'center', bold: true },
              { text: 'Representante legal / delegado del empleador', alignment: 'center' },
              { text: `Identificacion: ${representative.idNumber}`, alignment: 'center' },
            ],
          },
          {
            width: '*',
            stack: [
              { text: '\n\n____________________________', alignment: 'center' },
              { text: employeeName(row), alignment: 'center', bold: true },
              { text: 'Trabajador', alignment: 'center' },
              { text: `C.C.: ${row.cedula || 'no registrada'}`, alignment: 'center' },
            ],
          },
        ],
        columnGap: 26,
        margin: [0, 0, 0, 16],
      },
      {
        text: `Plantilla rol_pago_nomina_ec v2026.06. Documento generado por Nomina-Ec. Fecha: ${generatedAt}.`,
        style: 'audit',
      },
    ],
    styles: {
      title: { fontSize: 16, bold: true, alignment: 'center', margin: [0, 0, 0, 4] },
      subtitle: { fontSize: 11, bold: true, alignment: 'center', color: '#0f766e', margin: [0, 0, 0, 4] },
      section: { fontSize: 10, bold: true, color: '#0f766e', margin: [0, 8, 0, 4] },
      boxTitle: { fontSize: 9, bold: true, color: '#0f766e', margin: [0, 0, 0, 3] },
      notice: { fontSize: 8, color: '#475569', italics: true },
      audit: { fontSize: 8, color: '#64748b' },
    },
    defaultStyle: { fontSize: 9, lineHeight: 1.25 },
  };
}

function pdfBufferFromDefinition(docDefinition) {
  return new Promise((resolve) => {
    pdfmake.createPdf(docDefinition).getBuffer((buffer) => resolve(buffer));
  });
}

async function generatePayrollRolePdf({ tenantId, payrollId, userId = null } = {}) {
  const result = await db.query(`
    SELECT
      n.*,
      e.nombres,
      e.apellidos,
      e.cedula,
      COALESCE(jp.name, e.cargo) AS cargo,
      e.departamento,
      t.razon_social,
      t.ruc,
      t.configuracion AS tenant_configuracion
    FROM nominas n
    JOIN empleados e ON e.id = n.empleado_id AND e.tenant_id = n.tenant_id
    JOIN tenants t ON t.id = n.tenant_id
    LEFT JOIN job_positions jp
      ON jp.id = e.position_id
     AND jp.tenant_id = e.tenant_id
    WHERE n.id = $1 AND n.tenant_id = $2
    LIMIT 1
  `, [payrollId, tenantId]);

  const row = result.rows[0];
  if (!row) {
    throw new AppError('Nomina no encontrada.', {
      code: 'NOMINA_NO_ENCONTRADA',
      statusCode: 404,
    });
  }

  const docDefinition = buildPayrollRoleDocDefinition(row);
  const buffer = await pdfBufferFromDefinition(docDefinition);
  const fileName = `rol_pago_${safeFilePart(row.cedula)}_${row.anio}_${String(row.mes).padStart(2, '0')}.pdf`;
  const key = `roles/${tenantId}/${row.anio}-${String(row.mes).padStart(2, '0')}/${safeFilePart(row.empleado_id)}/${Date.now()}_${fileName}`;
  const url = await s3Upload(buffer, key, 'application/pdf');

  if (row.estado !== 'cerrada') {
    await db.query(`
      UPDATE nominas
      SET rol_pdf_url = $3,
          updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
    `, [payrollId, tenantId, url]);
  }

  return {
    url,
    fileName,
    contentType: 'application/pdf',
    payrollId,
    tenantId,
    userId,
  };
}

module.exports = {
  buildPayrollRoleDocDefinition,
  generatePayrollRolePdf,
};
