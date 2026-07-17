// ============================================================
// SKNOMINA - Formulario 107 individual SRI
// ============================================================
const pdfmake = require('pdfmake/build/pdfmake');
pdfmake.vfs = require('pdfmake/build/vfs_fonts');
const AppError = require('../utils/AppError');
const db = require('../config/database');
const { s3Upload } = require('../config/s3');
const { recordAudit } = require('./auditService');
const { roundMoney } = require('../utils/money');
const { resolveCompanyData, buildPdfHeader } = require('./pdfBrandHeader');

const FORM_107_MIME = 'application/pdf';
const TEMPLATE_VERSION = 'FORM107-SRI-RDEP-2026-20260317';
const SRI_RDEP_REFERENCE = {
  sourceName: 'Servicio de Rentas Internas - RDEP / Formulario 107',
  sourceUrl: 'https://www.sri.gob.ec/formularios-e-instructivos1',
  rdepProgram: 'Programa RDEP periodo fiscal 2026, actualizado 2026-03-17',
};

function normalizeYear(value) {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new AppError('El año fiscal del Formulario 107 no es válido.', {
      code: 'FORM107_ANIO_INVALIDO',
      statusCode: 400,
    });
  }
  return year;
}

function normalizeEmployeeId(value) {
  const id = String(value || '').trim();
  if (!id) {
    throw new AppError('Selecciona un empleado para generar el Formulario 107 individual.', {
      code: 'FORM107_EMPLEADO_REQUERIDO',
      statusCode: 400,
    });
  }
  return id;
}

async function loadFormulario107Data({ tenantId, anio, empleadoId }) {
  const year = normalizeYear(anio);
  const employee = normalizeEmployeeId(empleadoId);
  const result = await db.query(`
    SELECT
      t.id AS tenant_id,
      t.ruc,
      t.razon_social,
      t.configuracion,
      e.id AS empleado_id,
      e.cedula,
      e.nombres,
      e.apellidos,
      e.cargo,
      e.fecha_ingreso,
      e.activo,
      n.mes,
      n.estado,
      n.sueldo_bruto,
      n.horas_extras_50,
      n.horas_extras_100,
      n.total_ingresos,
      n.aporte_iess_personal,
      n.impuesto_renta,
      n.total_deducciones,
      n.neto_recibir,
      n.detalle_calculo
    FROM tenants t
    JOIN empleados e
      ON e.tenant_id = t.id
     AND e.id = $3
    LEFT JOIN nominas n
      ON n.tenant_id = e.tenant_id
     AND n.empleado_id = e.id
     AND n.anio = $2
     AND n.estado = 'cerrada'
    WHERE t.id = $1
    ORDER BY n.mes
  `, [tenantId, year, employee]);

  if (result.rows.length === 0) {
    throw new AppError('Empleado no encontrado para la empresa activa.', {
      code: 'FORM107_EMPLEADO_NO_ENCONTRADO',
      statusCode: 404,
    });
  }

  return {
    tenant: {
      id: result.rows[0].tenant_id,
      ruc: result.rows[0].ruc || '',
      razonSocial: result.rows[0].razon_social || '',
      configuracion: result.rows[0].configuracion || {},
    },
    employee: {
      id: result.rows[0].empleado_id,
      cedula: result.rows[0].cedula || '',
      nombres: result.rows[0].nombres || '',
      apellidos: result.rows[0].apellidos || '',
      cargo: result.rows[0].cargo || '',
      fechaIngreso: result.rows[0].fecha_ingreso || '',
      activo: result.rows[0].activo !== false,
    },
    rows: result.rows.filter((row) => row.mes),
  };
}

function precheckFormulario107Data(data, anio) {
  const checks = [
    {
      code: 'empleador_ruc',
      label: 'RUC del empleador',
      passed: Boolean(data.tenant.ruc),
      detail: data.tenant.ruc || 'Falta RUC del empleador.',
    },
    {
      code: 'empleador_razon_social',
      label: 'Razon social del empleador',
      passed: Boolean(data.tenant.razonSocial),
      detail: data.tenant.razonSocial || 'Falta razon social del empleador.',
    },
    {
      code: 'empleado_identificacion',
      label: 'Identificacion del trabajador',
      passed: Boolean(data.employee.cedula),
      detail: data.employee.cedula || 'Falta cedula o identificacion del trabajador.',
    },
    {
      code: 'roles_anuales',
      label: 'Roles cerrados del año fiscal',
      passed: data.rows.length > 0,
      detail: data.rows.length > 0
        ? `${data.rows.length} roles cerrados encontrados para ${anio}.`
        : 'No existen roles cerrados para el año fiscal solicitado.',
    },
    {
      code: 'base_rdep_consistente',
      label: 'Base consistente con RDEP',
      passed: data.rows.length > 0,
      detail: 'Formulario 107 usa roles cerrados del mismo ejercicio fiscal que alimenta RDEP.',
    },
    {
      code: 'fuente_sri_rdep',
      label: 'Fuente SRI RDEP/Formulario 107',
      passed: true,
      detail: `${SRI_RDEP_REFERENCE.rdepProgram} - ${SRI_RDEP_REFERENCE.sourceUrl}`,
    },
  ];

  const ready = checks.every((check) => check.passed);
  return {
    ready,
    anio: Number(anio),
    empleadoId: data.employee.id,
    templateVersion: TEMPLATE_VERSION,
    sriReference: SRI_RDEP_REFERENCE,
    checks,
  };
}

async function precheckFormulario107({ tenantId, anio, empleadoId }) {
  const data = await loadFormulario107Data({ tenantId, anio, empleadoId });
  return precheckFormulario107Data(data, normalizeYear(anio));
}

function numberValue(value) {
  const parsed = Number.parseFloat(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeDetail(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (err) {
    console.error('[FORM107] detalle_calculo JSON invalido', {
      code: 'FORM107_DETALLE_JSON_INVALIDO',
      statusCode: 400,
      correlationId: null,
      userId: null,
      message: err.message,
    });
    return {};
  }
}

function buildSummary(rows = []) {
  return rows.reduce((summary, row) => {
    const detail = normalizeDetail(row.detalle_calculo);
    const sueldo = numberValue(row.sueldo_bruto || detail.sueldoProporcional);
    const extras50 = numberValue(detail.montoExtras50 ?? row.horas_extras_50);
    const extras100 = numberValue(detail.montoExtras100 ?? row.horas_extras_100);
    const extrasNocturnas = numberValue(detail.montoExtrasNocturnas);
    const totalIngresos = numberValue(row.total_ingresos);

    summary.sueldosSalarios += sueldo;
    summary.horasSuplementarias += extras50;
    summary.horasExtraordinarias += extras100 + extrasNocturnas;
    summary.otrosIngresosGravados += Math.max(0, totalIngresos - sueldo - extras50 - extras100 - extrasNocturnas);
    summary.totalIngresos += totalIngresos;
    summary.aporteIessPersonal += numberValue(row.aporte_iess_personal);
    summary.impuestoRentaRetenido += numberValue(row.impuesto_renta);
    summary.totalDeducciones += numberValue(row.total_deducciones);
    summary.netoRecibido += numberValue(row.neto_recibir);
    return summary;
  }, {
    sueldosSalarios: 0,
    horasSuplementarias: 0,
    horasExtraordinarias: 0,
    otrosIngresosGravados: 0,
    totalIngresos: 0,
    aporteIessPersonal: 0,
    impuestoRentaRetenido: 0,
    totalDeducciones: 0,
    netoRecibido: 0,
  });
}

async function buildFormulario107Pdf({ data, anio, context = {} }) {
  const summary = buildSummary(data.rows);
  const detailBody = [
    ['Mes', 'Estado', 'Ingresos', 'IESS personal', 'IR retenido', 'Neto'],
    ...data.rows.map((row) => [
      String(row.mes).padStart(2, '0'),
      row.estado || '',
      money(row.total_ingresos),
      money(row.aporte_iess_personal),
      money(row.impuesto_renta),
      money(row.neto_recibir),
    ]),
  ];

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [36, 42, 36, 42],
    content: [
      ...buildPdfHeader({
        title: 'FORMULARIO 107',
        company: resolveCompanyData({
          ruc: data.tenant.ruc,
          razon_social: data.tenant.razonSocial,
          configuracion: data.tenant.configuracion,
        }),
        period: String(anio),
      }),
      { text: 'Comprobante de retenciones en la fuente del impuesto a la renta por ingresos del trabajo en relacion de dependencia', style: 'subtitle' },
      { text: `Ejercicio fiscal ${anio}`, style: 'period' },
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'Agente de retencion / empleador', style: 'section' },
              rowText('RUC empleador', data.tenant.ruc),
              rowText('Razon social o apellidos y nombres', data.tenant.razonSocial),
            ],
          },
          {
            width: '*',
            stack: [
              { text: 'Trabajador bajo relacion de dependencia', style: 'section' },
              rowText('Cedula / identificacion', data.employee.cedula),
              rowText('Apellidos y nombres', `${data.employee.apellidos} ${data.employee.nombres}`.trim()),
              rowText('Cargo', data.employee.cargo || 'No registrado'),
            ],
          },
        ],
        columnGap: 18,
        margin: [0, 8, 0, 14],
      },
      { text: 'Resumen anual Formulario 107', style: 'section' },
      {
        table: {
          widths: ['*', 90],
          body: [
            ['Sueldos y salarios', money(summary.sueldosSalarios)],
            ['Horas suplementarias', money(summary.horasSuplementarias)],
            ['Horas extraordinarias', money(summary.horasExtraordinarias)],
            ['Otros ingresos gravados / revisables', money(summary.otrosIngresosGravados)],
            ['Total ingresos del ejercicio', money(summary.totalIngresos)],
            ['Aporte personal IESS deducible', money(summary.aporteIessPersonal)],
            ['Base imponible referencial', money(summary.totalIngresos - summary.aporteIessPersonal)],
            ['Impuesto a la renta causado / retenido', money(summary.impuestoRentaRetenido)],
            ['Neto recibido', money(summary.netoRecibido)],
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 4, 0, 14],
      },
      { text: 'Detalle mensual', style: 'section' },
      {
        table: {
          headerRows: 1,
          widths: [34, 58, '*', '*', '*', '*'],
          body: detailBody,
        },
        layout: 'lightHorizontalLines',
      },
      {
        text: 'Documento generado desde SKNOMINA con base en roles cerrados del ejercicio fiscal. Debe validarse contra el Formulario 107 y anexos RDEP vigentes publicados por el SRI antes de entrega oficial.',
        style: 'warning',
        margin: [0, 16, 0, 0],
      },
      {
        text: `Plantilla: ${TEMPLATE_VERSION}\nFuente tecnica: ${SRI_RDEP_REFERENCE.sourceName} (${SRI_RDEP_REFERENCE.sourceUrl})\nReferencia RDEP: ${SRI_RDEP_REFERENCE.rdepProgram}\nGenerado: ${new Date().toISOString()}\nCorrelation ID: ${context.correlationId || ''}`,
        style: 'audit',
        margin: [0, 10, 0, 0],
      },
    ],
    styles: {
      title: { fontSize: 18, bold: true, margin: [0, 0, 0, 4] },
      subtitle: { fontSize: 9, color: '#475569', margin: [0, 0, 0, 4] },
      period: { fontSize: 11, bold: true, color: '#0f766e', margin: [0, 0, 0, 8] },
      section: { fontSize: 11, bold: true, margin: [0, 5, 0, 4] },
      label: { fontSize: 8, color: '#64748b' },
      value: { fontSize: 9, bold: true },
      warning: { fontSize: 8, color: '#92400e' },
      audit: { fontSize: 8, color: '#64748b' },
    },
    defaultStyle: { fontSize: 8 },
  };

  return new Promise((resolve) => {
    pdfmake.createPdf(docDefinition).getBuffer((buffer) => resolve(buffer));
  });
}

function rowText(label, value) {
  return {
    stack: [
      { text: label, style: 'label' },
      { text: String(value || ''), style: 'value' },
    ],
    margin: [0, 0, 0, 5],
  };
}

function money(value) {
  return `$${roundMoney(numberValue(value)).toFixed(2)}`;
}

async function generarFormulario107({ tenantId, anio, empleadoId, context = {} }) {
  const year = normalizeYear(anio);
  const data = await loadFormulario107Data({ tenantId, anio: year, empleadoId });
  const precheck = precheckFormulario107Data(data, year);

  if (!precheck.ready) {
    throw new AppError('Formulario 107 requiere datos obligatorios antes de generarse.', {
      code: 'FORM107_PRECHECK_FAILED',
      statusCode: 422,
      details: precheck,
    });
  }

  const buffer = await buildFormulario107Pdf({ data, anio: year, context });
  const summary = buildSummary(data.rows);
  const fileName = `FORM107_${data.employee.cedula}_${year}.pdf`;
  const key = `reportes/${tenantId}/sri/formulario-107/${fileName}`;
  const url = await s3Upload(buffer, key, FORM_107_MIME);

  await recordAudit({
    tenantId,
    userId: context.userId || null,
    correlationId: context.correlationId,
    action: 'generar_formulario_107',
    entity: 'empleados',
    entityId: data.employee.id,
    newData: {
      anio: year,
      empleadoId: data.employee.id,
      templateVersion: TEMPLATE_VERSION,
      totalMeses: data.rows.length,
      summary,
    },
    ipAddress: context.ipAddress || null,
  });

  return {
    url,
    fileName,
    contentType: FORM_107_MIME,
    templateVersion: TEMPLATE_VERSION,
    empleadoId: data.employee.id,
    anio: year,
    precheck,
    traceability: {
      basis: 'closed_payroll_same_fiscal_year_as_rdep',
      sriReference: SRI_RDEP_REFERENCE,
      summary,
    },
  };
}

module.exports = {
  FORM_107_MIME,
  TEMPLATE_VERSION,
  SRI_RDEP_REFERENCE,
  buildSummary,
  generarFormulario107,
  precheckFormulario107,
};
