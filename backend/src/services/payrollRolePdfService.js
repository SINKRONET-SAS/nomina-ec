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

function employeeColumnName(row = {}) {
  const name = `${row.apellidos || ''} ${row.nombres || ''}`.trim() || employeeName(row);
  const id = cleanText(row.cedula, 'sin cedula');
  return `${name}\n${id}`;
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
    title: cleanText(
      config.representanteLegalCargo
        || config.representante_legal_cargo
        || config.legalRepresentativeTitle,
      'Representante legal / delegado del empleador'
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

function amountValue(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function payrollConceptValues(row = {}) {
  const detail = normalizeDetail(row.detalle_calculo);
  return {
    sueldoProporcional: amountValue(detail.sueldoProporcional ?? row.sueldo_bruto),
    montoExtras50: amountValue(detail.montoExtras50 ?? row.horas_extras_50),
    montoExtras100: amountValue(detail.montoExtras100 ?? row.horas_extras_100),
    bonosDesempeno: amountValue(detail.bonosDesempeno),
    comisiones: amountValue(detail.comisiones),
    fondoReservaPagadoEmpleado: amountValue(detail.fondoReservaPagadoEmpleado),
    aporteIess: amountValue(detail.aporteIess ?? row.aporte_iess_personal),
    impuestoRenta: amountValue(detail.impuestoRenta ?? row.impuesto_renta),
    descuentoFaltas: amountValue(detail.descuentoFaltas),
    anticipos: amountValue(detail.anticipos ?? row.anticipos),
    prestamos: amountValue(detail.prestamos ?? row.prestamos),
    aportePatronal: amountValue(detail.aportePatronal),
    provisionDecimoTercero: amountValue(detail.provisionDecimoTercero),
    provisionDecimoCuarto: amountValue(detail.provisionDecimoCuarto),
    provisionVacaciones: amountValue(detail.provisionVacaciones),
    provisionFondosReserva: amountValue(detail.provisionFondosReserva),
    totalIngresos: amountValue(row.total_ingresos),
    totalDeducciones: amountValue(row.total_deducciones),
    netoRecibir: amountValue(row.neto_recibir),
    costoEmpleador: amountValue(detail.costoEmpleador),
  };
}

const TRANSPOSED_ROLE_CONCEPTS = [
  { group: 'Ingresos', key: 'sueldoProporcional', label: 'Sueldo proporcional' },
  { group: 'Ingresos', key: 'montoExtras50', label: 'Horas extra 50%' },
  { group: 'Ingresos', key: 'montoExtras100', label: 'Horas extra 100%' },
  { group: 'Ingresos', key: 'bonosDesempeno', label: 'Bonos de desempeno' },
  { group: 'Ingresos', key: 'comisiones', label: 'Comisiones' },
  { group: 'Ingresos', key: 'fondoReservaPagadoEmpleado', label: 'Fondo de reserva pagado' },
  { group: 'Ingresos', key: 'decimoTerceroMensualizado', label: 'Decimo tercero mensualizado' },
  { group: 'Ingresos', key: 'decimoCuartoMensualizado', label: 'Decimo cuarto mensualizado' },
  { group: 'Deducciones', key: 'aporteIess', label: 'Aporte IESS personal' },
  { group: 'Deducciones', key: 'impuestoRenta', label: 'Impuesto a la renta' },
  { group: 'Deducciones', key: 'descuentoFaltas', label: 'Descuento por faltas' },
  { group: 'Deducciones', key: 'anticipos', label: 'Anticipos' },
  { group: 'Deducciones', key: 'prestamos', label: 'Prestamos' },
  { group: 'Provisiones', key: 'aportePatronal', label: 'Aporte IESS patronal' },
  { group: 'Provisiones', key: 'provisionDecimoTercero', label: 'Provision decimo tercero' },
  { group: 'Provisiones', key: 'provisionDecimoCuarto', label: 'Provision decimo cuarto' },
  { group: 'Provisiones', key: 'provisionVacaciones', label: 'Provision vacaciones' },
  { group: 'Provisiones', key: 'provisionFondosReserva', label: 'Provision fondos de reserva' },
  { group: 'Totales', key: 'totalIngresos', label: 'Total ingresos', bold: true },
  { group: 'Totales', key: 'totalDeducciones', label: 'Total deducciones', bold: true },
  { group: 'Totales', key: 'netoRecibir', label: 'Neto a recibir', bold: true },
  { group: 'Totales', key: 'costoEmpleador', label: 'Costo empleador', bold: true },
];

function chunkRows(rows, size) {
  const chunks = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
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
  if (detail.decimoTerceroModalidad === 'mensual') {
    addAmountLine(ingresos, 'Decimo tercero mensualizado', detail.decimoTerceroMensualizado);
  }
  if (detail.decimoCuartoModalidad === 'mensual') {
    addAmountLine(ingresos, 'Decimo cuarto mensualizado', detail.decimoCuartoMensualizado);
  }

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

  const columnTable = (title, rows) => [
    { text: title, style: 'section' },
    {
      table: {
        widths: ['*', 70],
        body: [
          [{ text: 'Concepto', bold: true, fontSize: 8 }, { text: 'Valor', bold: true, alignment: 'right', fontSize: 8 }],
          ...(rows.length > 0 ? rows : [['Sin valores', '$0.00']]).map(([label, amount]) => [
            { text: label, fontSize: 8 },
            { text: amount, alignment: 'right', fontSize: 8 },
          ]),
        ],
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 6],
    },
  ];

  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
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
              `Cédula: ${row.cedula || 'no registrada'}`,
              `Cargo: ${row.cargo || 'no registrado'}`,
              `Departamento: ${row.departamento || 'no registrado'}`,
            ],
          },
          {
            width: '*',
            stack: [
              { text: 'Resumen', style: 'boxTitle' },
              `Estado: ${row.estado || 'borrador'}`,
              `Días trabajados: ${row.dias_trabajados || 0}`,
              `Lote de cálculo: ${row.calculation_batch_id || 'sin lote'}`,
              `Fuente legal: ${detail.fuenteLegal || 'no registrada'}`,
            ],
          },
        ],
        columnGap: 18,
        margin: [0, 0, 0, 14],
      },
      {
        columns: [
          { width: '*', stack: [...columnTable('Ingresos', ingresos)] },
          { width: '*', stack: [...columnTable('Deducciones', deducciones)] },
        ],
        columnGap: 18,
        margin: [0, 0, 0, 6],
      },
      {
        table: {
          widths: ['*', 120, '*', 120],
          body: [
            [
              { text: 'Total ingresos', bold: true },
              { text: money(row.total_ingresos), alignment: 'right', bold: true },
              { text: 'Total deducciones', bold: true },
              { text: money(row.total_deducciones), alignment: 'right', bold: true },
            ],
            [
              { text: 'Neto a recibir', bold: true, color: '#0f766e' },
              { text: money(row.neto_recibir), alignment: 'right', bold: true, color: '#0f766e' },
              { text: '', border: [false, false, false, false] },
              { text: '', border: [false, false, false, false] },
            ],
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 6, 0, 12],
      },
      { text: 'Recepcion y conformidad', style: 'section' },
      {
        text: 'El trabajador declara haber recibido el detalle de ingresos, deducciones y neto del periodo indicado. La firma deja constancia de recepción del rol de pago y no reemplaza obligaciones de pago, registro o conservación de evidencias que correspondan al empleador.',
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
              { text: representative.title, alignment: 'center' },
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
        text: `Plantilla rol_pago_sknomina v2026.07. Documento generado con SKNOMINA. Fecha: ${generatedAt}.`,
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

function buildTransposedConceptTable(rows) {
  const valuesByPayroll = rows.map((row) => payrollConceptValues(row));
  const body = [
    [
      { text: 'Concepto', bold: true },
      ...rows.map((row) => ({ text: employeeColumnName(row), bold: true, alignment: 'center' })),
      { text: 'Total bloque', bold: true, alignment: 'right' },
    ],
  ];

  let currentGroup = null;
  TRANSPOSED_ROLE_CONCEPTS.forEach((concept) => {
    if (concept.group !== currentGroup) {
      currentGroup = concept.group;
      body.push([
        { text: currentGroup, bold: true, color: '#0f766e', fillColor: '#ecfdf5' },
        ...rows.map(() => ({ text: '', fillColor: '#ecfdf5' })),
        { text: '', fillColor: '#ecfdf5' },
      ]);
    }

    const values = valuesByPayroll.map((conceptValues) => conceptValues[concept.key] || 0);
    const total = values.reduce((sum, value) => sum + value, 0);
    body.push([
      { text: concept.label, bold: Boolean(concept.bold) },
      ...values.map((value) => ({
        text: money(value),
        alignment: 'right',
        bold: Boolean(concept.bold),
      })),
      { text: money(total), alignment: 'right', bold: Boolean(concept.bold) },
    ]);
  });

  return {
    table: {
      headerRows: 1,
      widths: [116, ...rows.map(() => '*'), 72],
      body,
    },
    layout: 'lightHorizontalLines',
    margin: [0, 4, 0, 12],
  };
}

function buildTransposedSummaryTable(rows) {
  const body = [
    [
      { text: 'Empleado', bold: true },
      { text: 'Ingresos', bold: true, alignment: 'right' },
      { text: 'Deducciones', bold: true, alignment: 'right' },
      { text: 'Neto', bold: true, alignment: 'right' },
      { text: 'Estado', bold: true },
      { text: 'Lote', bold: true },
    ],
    ...rows.map((row) => [
      `${employeeName(row)}\n${row.cedula || 'sin cedula'}`,
      { text: money(row.total_ingresos), alignment: 'right' },
      { text: money(row.total_deducciones), alignment: 'right' },
      { text: money(row.neto_recibir), alignment: 'right', bold: true },
      row.estado || 'borrador',
      cleanText(row.calculation_batch_id, 'sin lote'),
    ]),
  ];

  return {
    table: {
      headerRows: 1,
      widths: ['*', 64, 70, 64, 55, 90],
      body,
    },
    layout: 'lightHorizontalLines',
    margin: [0, 4, 0, 12],
  };
}

function buildPayrollRoleTransposedDocDefinition({ rows, anio, mes } = {}) {
  const payrollRows = Array.isArray(rows) ? rows : [];
  const first = payrollRows[0] || {};
  const representative = legalRepresentative(first);
  const generatedAt = new Date().toISOString();
  const employeeBlocks = chunkRows(payrollRows, 5);
  const period = `${String(mes).padStart(2, '0')}/${anio}`;

  const content = [
    { text: 'ROL DE PAGO CONSOLIDADO TRANSPUESTO', style: 'title' },
    { text: first.razon_social || 'Empresa', style: 'subtitle' },
    {
      text: `RUC: ${first.ruc || 'no registrado'} | Periodo: ${period} | Empleados: ${payrollRows.length}`,
      style: 'audit',
      alignment: 'center',
      margin: [0, 0, 0, 10],
    },
    {
      text: 'Matriz consolidada con conceptos en filas y empleados en columnas. Este reporte permite revisar el periodo completo sin reemplazar el rol individual entregado a cada trabajador.',
      style: 'notice',
      margin: [0, 0, 0, 10],
    },
    { text: 'Resumen por empleado', style: 'section' },
    buildTransposedSummaryTable(payrollRows),
  ];

  employeeBlocks.forEach((block, index) => {
    const start = index * 5 + 1;
    const end = start + block.length - 1;
    content.push({
      text: `Matriz empleados ${start}-${end}`,
      style: 'section',
      pageBreak: index === 0 ? undefined : 'before',
    });
    content.push(buildTransposedConceptTable(block));
  });

  content.push(
    { text: 'Recepcion y conformidad consolidada', style: 'section' },
    {
      text: 'El empleador conserva este consolidado como evidencia interna de cálculo del periodo. La entrega y recepción legal frente a cada trabajador debe respaldarse con el rol individual correspondiente.',
      style: 'notice',
      margin: [0, 0, 0, 14],
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
            { text: 'Responsable de RRHH / Nómina', alignment: 'center', bold: true },
            { text: 'Revisión del consolidado del periodo', alignment: 'center' },
          ],
        },
      ],
      columnGap: 28,
      margin: [0, 0, 0, 14],
    },
    {
      text: `Plantilla rol_pago_transpuesto_sknomina v2026.06. Documento generado con SKNOMINA. Fecha: ${generatedAt}.`,
      style: 'audit',
    }
  );

  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [28, 32, 28, 32],
    content,
    styles: {
      title: { fontSize: 15, bold: true, alignment: 'center', margin: [0, 0, 0, 4] },
      subtitle: { fontSize: 10, bold: true, alignment: 'center', color: '#0f766e', margin: [0, 0, 0, 4] },
      section: { fontSize: 9, bold: true, color: '#0f766e', margin: [0, 7, 0, 3] },
      notice: { fontSize: 7, color: '#475569', italics: true },
      audit: { fontSize: 7, color: '#64748b' },
    },
    defaultStyle: { fontSize: 7, lineHeight: 1.15 },
  };
}

function pdfBufferFromDefinition(docDefinition) {
  return new Promise((resolve) => {
    pdfmake.createPdf(docDefinition).getBuffer((buffer) => resolve(buffer));
  });
}

async function generatePayrollRolePdf({ tenantId, payrollId, userId = null, includeBuffer = false } = {}) {
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
    throw new AppError('Nómina no encontrada.', {
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
    ...(includeBuffer ? { buffer } : {}),
  };
}

async function generatePayrollRolePeriodTransposedPdf({ tenantId, anio, mes, userId = null } = {}) {
  const anioNumber = Number(anio);
  const mesNumber = Number(mes);
  if (!Number.isInteger(anioNumber) || !Number.isInteger(mesNumber) || mesNumber < 1 || mesNumber > 12) {
    throw new AppError('Periodo de nómina inválido.', {
      code: 'NOMINA_PERIODO_INVALIDO',
      statusCode: 400,
    });
  }

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
    WHERE n.tenant_id = $1
      AND n.anio = $2
      AND n.mes = $3
    ORDER BY e.apellidos ASC, e.nombres ASC, e.cedula ASC
  `, [tenantId, anioNumber, mesNumber]);

  if (result.rows.length === 0) {
    throw new AppError('No hay nóminas para generar el rol transpuesto del periodo.', {
      code: 'NOMINA_PERIODO_SIN_ROLES',
      statusCode: 404,
    });
  }

  const docDefinition = buildPayrollRoleTransposedDocDefinition({
    rows: result.rows,
    anio: anioNumber,
    mes: mesNumber,
  });
  const buffer = await pdfBufferFromDefinition(docDefinition);
  const fileName = `roles_pago_transpuesto_${anioNumber}_${String(mesNumber).padStart(2, '0')}.pdf`;
  const key = `roles/${tenantId}/${anioNumber}-${String(mesNumber).padStart(2, '0')}/consolidado/${Date.now()}_${fileName}`;
  const url = await s3Upload(buffer, key, 'application/pdf');

  return {
    url,
    fileName,
    contentType: 'application/pdf',
    tenantId,
    anio: anioNumber,
    mes: mesNumber,
    totalEmpleados: result.rows.length,
    userId,
  };
}

module.exports = {
  buildPayrollRoleDocDefinition,
  buildPayrollRoleTransposedDocDefinition,
  generatePayrollRolePdf,
  generatePayrollRolePeriodTransposedPdf,
};
