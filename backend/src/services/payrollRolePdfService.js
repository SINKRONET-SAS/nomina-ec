const pdfmake = require('pdfmake/build/pdfmake');
pdfmake.vfs = require('pdfmake/build/vfs_fonts');

const db = require('../config/database');
const { s3Upload } = require('../config/s3');
const AppError = require('../utils/AppError');
const { toMoneyString } = require('../utils/money');
const { linesForPayrollRow } = require('./payrollAccountingService');

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

function positiveNumber(...values) {
  for (const value of values) {
    const number = Number(value || 0);
    if (Number.isFinite(number) && number > 0) return number;
  }
  return 0;
}

function formatHours(value) {
  return amountValue(value).toFixed(2);
}

function normalizeConceptKey(value, fallback = 'concepto') {
  const normalized = String(value || fallback)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || fallback;
}

function roleLineCategory(line = {}) {
  const category = String(line.category || '').trim().toLowerCase();
  if (category === 'descuento') return 'deduccion';
  return category;
}

const ROLE_NOVELTY_LABELS = {
  horas_extra_50: 'Horas extra 50%',
  horas_extra_100: 'Horas extra 100%',
  bono_desempeno: 'Bono de desempeno',
  comision: 'Comisiones',
  descuento_faltas: 'Descuento por faltas',
};

const OVERTIME_CONCEPTS = new Set(['horas_extra_50', 'horas_extra_100']);

function isOvertimeConcept(normalizedCode) {
  return OVERTIME_CONCEPTS.has(String(normalizedCode || '').trim().toLowerCase());
}

function isRoleNoveltyLine(line = {}) {
  const source = String(line.source || '').trim().toLowerCase();
  const metadata = normalizeDetail(line.metadata);
  return source === 'novedad'
    || Boolean(metadata.tipoNovedad)
    || Boolean(metadata.calculationMode && source !== 'legal');
}

function lineHours(line = {}) {
  const metadata = normalizeDetail(line.metadata);
  const directHours = positiveNumber(line.hours, line.horas, metadata.hours, metadata.horas);
  if (directHours > 0) return directHours;

  const minutes = positiveNumber(line.minutes, line.minutos, metadata.minutes, metadata.minutos);
  return minutes > 0 ? minutes / 60 : 0;
}

function aggregateRoleLines(lines = []) {
  const aggregate = new Map();

  lines.forEach((line, index) => {
    const category = roleLineCategory(line);
    if (!['ingreso', 'deduccion'].includes(category)) return;

    const amount = amountValue(line.amount);
    if (amount <= 0) return;

    const rawCode = line.concept_code || line.conceptCode || line.code || line.source_id || line.sourceId;
    const rawLabel = line.concept_label || line.conceptLabel || line.label || rawCode;
    const normalizedCode = normalizeConceptKey(rawCode || rawLabel, `concepto_${index + 1}`);
    const label = ROLE_NOVELTY_LABELS[normalizedCode]
      || cleanText(rawLabel, cleanText(rawCode, `Concepto ${index + 1}`));
    const key = `novedad_${category}_${normalizedCode}`;
    const hours = lineHours(line);

    if (!aggregate.has(key)) {
      aggregate.set(key, {
        key,
        label,
        category,
        normalizedCode,
        amount: 0,
        hours: 0,
      });
    }
    aggregate.get(key).amount += amount;
    aggregate.get(key).hours += hours;
  });

  return Array.from(aggregate.values());
}

function roleNoveltyConcepts(row = {}) {
  const detail = normalizeDetail(row.detalle_calculo);
  return aggregateRoleLines(linesForPayrollRow(row).filter(isRoleNoveltyLine))
    .map((concept) => {
      if (!isOvertimeConcept(concept.normalizedCode) || concept.hours > 0) return concept;
      if (concept.normalizedCode === 'horas_extra_50') {
        return { ...concept, hours: amountValue(detail.extras50) };
      }
      if (concept.normalizedCode === 'horas_extra_100') {
        return { ...concept, hours: amountValue(detail.extras100) };
      }
      return concept;
    });
}

function roleConceptLabel(concept = {}) {
  if (!isOvertimeConcept(concept.normalizedCode) || amountValue(concept.hours) <= 0) {
    return concept.label;
  }
  return `${concept.label} (${formatHours(concept.hours)} h)`;
}

function addRoleConceptLines(lines, concepts, category) {
  concepts
    .filter((concept) => concept.category === category)
    .forEach((concept) => addAmountLine(lines, roleConceptLabel(concept), concept.amount));
}

function payrollConceptValues(row = {}) {
  const detail = normalizeDetail(row.detalle_calculo);
  const values = {
    sueldoProporcional: amountValue(detail.sueldoProporcional ?? row.sueldo_bruto),
    fondoReservaPagadoEmpleado: amountValue(detail.fondoReservaPagadoEmpleado),
    decimoTerceroMensualizado: amountValue(detail.decimoTerceroModalidad === 'mensual' ? detail.decimoTerceroMensualizado : 0),
    decimoCuartoMensualizado: amountValue(detail.decimoCuartoModalidad === 'mensual' ? detail.decimoCuartoMensualizado : 0),
    aporteIess: amountValue(detail.aporteIess ?? row.aporte_iess_personal),
    impuestoRenta: amountValue(detail.impuestoRenta ?? row.impuesto_renta),
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

  roleNoveltyConcepts(row).forEach((concept) => {
    values[concept.key] = amountValue(concept.amount);
    if (isOvertimeConcept(concept.normalizedCode)) {
      values[`${concept.key}_hours`] = amountValue(concept.hours);
    }
  });

  return values;
}

const TRANSPOSED_ROLE_CONCEPTS_BY_GROUP = {
  IngresosInicio: [
    { group: 'Ingresos', key: 'sueldoProporcional', label: 'Sueldo proporcional' },
  ],
  IngresosFin: [
    { group: 'Ingresos', key: 'fondoReservaPagadoEmpleado', label: 'Fondo de reserva pagado' },
    { group: 'Ingresos', key: 'decimoTerceroMensualizado', label: 'Decimo tercero mensualizado' },
    { group: 'Ingresos', key: 'decimoCuartoMensualizado', label: 'Decimo cuarto mensualizado' },
  ],
  DeduccionesInicio: [
    { group: 'Deducciones', key: 'aporteIess', label: 'Aporte IESS personal' },
    { group: 'Deducciones', key: 'impuestoRenta', label: 'Impuesto a la renta' },
  ],
  DeduccionesFin: [
    { group: 'Deducciones', key: 'anticipos', label: 'Anticipos' },
    { group: 'Deducciones', key: 'prestamos', label: 'Prestamos' },
  ],
  Provisiones: [
    { group: 'Provisiones', key: 'aportePatronal', label: 'Aporte IESS patronal' },
    { group: 'Provisiones', key: 'provisionDecimoTercero', label: 'Provision decimo tercero' },
    { group: 'Provisiones', key: 'provisionDecimoCuarto', label: 'Provision decimo cuarto' },
    { group: 'Provisiones', key: 'provisionVacaciones', label: 'Provision vacaciones' },
    { group: 'Provisiones', key: 'provisionFondosReserva', label: 'Provision fondos de reserva' },
  ],
  Totales: [
    { group: 'Totales', key: 'totalIngresos', label: 'Total ingresos', bold: true },
    { group: 'Totales', key: 'totalDeducciones', label: 'Total deducciones', bold: true },
    { group: 'Totales', key: 'netoRecibir', label: 'Neto a recibir', bold: true },
    { group: 'Totales', key: 'costoEmpleador', label: 'Costo empleador', bold: true },
  ],
};

function noveltyConceptsForRows(rows = []) {
  const conceptsByKey = new Map();

  rows.forEach((row) => {
    roleNoveltyConcepts(row).forEach((concept) => {
      if (!conceptsByKey.has(concept.key)) {
        if (isOvertimeConcept(concept.normalizedCode)) {
          conceptsByKey.set(`${concept.key}_hours`, {
            group: concept.category === 'deduccion' ? 'Deducciones' : 'Ingresos',
            key: `${concept.key}_hours`,
            label: `${concept.label} (horas)`,
            valueType: 'hours',
          });
        }
        conceptsByKey.set(concept.key, {
          group: concept.category === 'deduccion' ? 'Deducciones' : 'Ingresos',
          key: concept.key,
          label: isOvertimeConcept(concept.normalizedCode) ? `${concept.label} (valor)` : concept.label,
          valueType: 'money',
        });
      }
    });
  });

  return Array.from(conceptsByKey.values());
}

function transposedRoleConcepts(rows = []) {
  const noveltyConcepts = noveltyConceptsForRows(rows);
  const noveltyIncome = noveltyConcepts.filter((concept) => concept.group === 'Ingresos');
  const noveltyDeductions = noveltyConcepts.filter((concept) => concept.group === 'Deducciones');

  return [
    ...TRANSPOSED_ROLE_CONCEPTS_BY_GROUP.IngresosInicio,
    ...noveltyIncome,
    ...TRANSPOSED_ROLE_CONCEPTS_BY_GROUP.IngresosFin,
    ...TRANSPOSED_ROLE_CONCEPTS_BY_GROUP.DeduccionesInicio,
    ...noveltyDeductions,
    ...TRANSPOSED_ROLE_CONCEPTS_BY_GROUP.DeduccionesFin,
    ...TRANSPOSED_ROLE_CONCEPTS_BY_GROUP.Provisiones,
    ...TRANSPOSED_ROLE_CONCEPTS_BY_GROUP.Totales,
  ];
}

function chunkRows(rows, size) {
  const chunks = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
}

function transposedConceptValue(concept = {}, value) {
  if (concept.valueType === 'hours') {
    return `${formatHours(value)} h`;
  }
  return money(value);
}

function buildPayrollRoleDocDefinition(row) {
  const detail = normalizeDetail(row.detalle_calculo);
  const representative = legalRepresentative(row);
  const isFinalRole = ['cerrada', 'pagada'].includes(String(row.estado || '').toLowerCase());
  const generatedAt = new Date().toISOString();
  const ingresos = [];
  const deducciones = [];
  const provisiones = [];
  const noveltyConcepts = roleNoveltyConcepts(row);

  addAmountLine(ingresos, 'Sueldo proporcional', detail.sueldoProporcional ?? row.sueldo_bruto);
  addRoleConceptLines(ingresos, noveltyConcepts, 'ingreso');
  addAmountLine(ingresos, 'Fondo de reserva pagado', detail.fondoReservaPagadoEmpleado);
  if (detail.decimoTerceroModalidad === 'mensual') {
    addAmountLine(ingresos, 'Decimo tercero mensualizado', detail.decimoTerceroMensualizado);
  }
  if (detail.decimoCuartoModalidad === 'mensual') {
    addAmountLine(ingresos, 'Decimo cuarto mensualizado', detail.decimoCuartoMensualizado);
  }

  addAmountLine(deducciones, 'Aporte IESS personal', detail.aporteIess ?? row.aporte_iess_personal);
  addAmountLine(deducciones, 'Impuesto a la renta', detail.impuestoRenta ?? row.impuesto_renta);
  addRoleConceptLines(deducciones, noveltyConcepts, 'deduccion');
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
      ...(!isFinalRole ? [{
        text: 'BORRADOR - NO CONSTITUYE COMPROBANTE DE PAGO',
        style: 'draftWarning',
      }] : []),
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
      draftWarning: { fontSize: 10, bold: true, alignment: 'center', color: '#b91c1c', margin: [0, 0, 0, 6] },
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
  transposedRoleConcepts(rows).forEach((concept) => {
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
        text: transposedConceptValue(concept, value),
        alignment: 'right',
        bold: Boolean(concept.bold),
      })),
      { text: transposedConceptValue(concept, total), alignment: 'right', bold: Boolean(concept.bold) },
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
  const includesDrafts = payrollRows.some((row) => !['cerrada', 'pagada'].includes(String(row.estado || '').toLowerCase()));

  const content = [
    { text: 'ROL DE PAGO CONSOLIDADO TRANSPUESTO', style: 'title' },
    ...(includesDrafts ? [{
      text: 'BORRADOR - NO CONSTITUYE COMPROBANTE DE PAGO',
      style: 'draftWarning',
    }] : []),
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
      draftWarning: { fontSize: 9, bold: true, alignment: 'center', color: '#b91c1c', margin: [0, 0, 0, 5] },
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
      t.configuracion AS tenant_configuracion,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'concept_code', pcl.concept_code,
          'calculation_batch_id', pcl.calculation_batch_id,
          'concept_label', pcl.concept_label,
          'category', pcl.category,
          'amount', pcl.amount,
          'source', pcl.source,
          'source_id', pcl.source_id,
          'source_version', pcl.source_version,
          'legal_parameter_key', pcl.legal_parameter_key,
          'cost_center_code', pcl.cost_center_code,
          'organization_unit_code', pcl.organization_unit_code,
          'position_code', pcl.position_code,
          'metadata', pcl.metadata
        ) ORDER BY pcl.category, pcl.concept_code, pcl.source_id)
        FROM payroll_calculation_lines pcl
        WHERE pcl.payroll_id = n.id
          AND pcl.tenant_id = n.tenant_id
      ), '[]'::jsonb) AS calculation_lines
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
      t.configuracion AS tenant_configuracion,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'concept_code', pcl.concept_code,
          'calculation_batch_id', pcl.calculation_batch_id,
          'concept_label', pcl.concept_label,
          'category', pcl.category,
          'amount', pcl.amount,
          'source', pcl.source,
          'source_id', pcl.source_id,
          'source_version', pcl.source_version,
          'legal_parameter_key', pcl.legal_parameter_key,
          'cost_center_code', pcl.cost_center_code,
          'organization_unit_code', pcl.organization_unit_code,
          'position_code', pcl.position_code,
          'metadata', pcl.metadata
        ) ORDER BY pcl.category, pcl.concept_code, pcl.source_id)
        FROM payroll_calculation_lines pcl
        WHERE pcl.payroll_id = n.id
          AND pcl.tenant_id = n.tenant_id
      ), '[]'::jsonb) AS calculation_lines
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
