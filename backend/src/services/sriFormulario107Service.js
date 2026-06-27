// ============================================================
// Nomina-Ec - Formulario 107 individual SRI
// ============================================================
const pdfmake = require('pdfmake/build/pdfmake');
pdfmake.vfs = require('pdfmake/build/vfs_fonts');
const AppError = require('../utils/AppError');
const db = require('../config/database');
const { s3Upload } = require('../config/s3');
const { recordAudit } = require('./auditService');
const { roundMoney } = require('../utils/money');

const FORM_107_MIME = 'application/pdf';
const TEMPLATE_VERSION = 'FORM107-SRI-2026-CDAN26';

function normalizeYear(value) {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new AppError('El anio fiscal del Formulario 107 no es valido.', {
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
      e.id AS empleado_id,
      e.cedula,
      e.nombres,
      e.apellidos,
      e.cargo,
      e.fecha_ingreso,
      e.activo,
      n.mes,
      n.estado,
      n.total_ingresos,
      n.aporte_iess_personal,
      n.impuesto_renta,
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
      label: 'Roles del anio fiscal',
      passed: data.rows.length > 0,
      detail: data.rows.length > 0
        ? `${data.rows.length} roles encontrados para ${anio}.`
        : 'No existen roles de pago para el anio fiscal solicitado.',
    },
  ];

  const ready = checks.every((check) => check.passed);
  return {
    ready,
    anio: Number(anio),
    empleadoId: data.employee.id,
    templateVersion: TEMPLATE_VERSION,
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

function buildSummary(rows = []) {
  return rows.reduce((summary, row) => {
    summary.totalIngresos += numberValue(row.total_ingresos);
    summary.aporteIessPersonal += numberValue(row.aporte_iess_personal);
    summary.impuestoRentaRetenido += numberValue(row.impuesto_renta);
    summary.netoRecibido += numberValue(row.neto_recibir);
    return summary;
  }, {
    totalIngresos: 0,
    aporteIessPersonal: 0,
    impuestoRentaRetenido: 0,
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
      { text: 'Formulario 107 individual', style: 'title' },
      { text: 'Comprobante de retenciones en la fuente del impuesto a la renta por ingresos del trabajo en relacion de dependencia', style: 'subtitle' },
      { text: `Anio fiscal ${anio}`, style: 'period' },
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'Empleador', style: 'section' },
              rowText('RUC', data.tenant.ruc),
              rowText('Razon social', data.tenant.razonSocial),
            ],
          },
          {
            width: '*',
            stack: [
              { text: 'Trabajador', style: 'section' },
              rowText('Identificacion', data.employee.cedula),
              rowText('Nombre', `${data.employee.apellidos} ${data.employee.nombres}`.trim()),
              rowText('Cargo', data.employee.cargo || 'No registrado'),
            ],
          },
        ],
        columnGap: 18,
        margin: [0, 8, 0, 14],
      },
      { text: 'Resumen anual', style: 'section' },
      {
        table: {
          widths: ['*', 90],
          body: [
            ['Total ingresos gravados/revisables', money(summary.totalIngresos)],
            ['Aporte personal IESS', money(summary.aporteIessPersonal)],
            ['Impuesto a la renta retenido', money(summary.impuestoRentaRetenido)],
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
        text: 'Documento generado desde Nomina-Ec con base en roles de pago registrados. Debe validarse contra la ficha tecnica SRI vigente antes de presentacion oficial.',
        style: 'warning',
        margin: [0, 16, 0, 0],
      },
      {
        text: `Plantilla: ${TEMPLATE_VERSION}\nGenerado: ${new Date().toISOString()}\nCorrelation ID: ${context.correlationId || ''}`,
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
  };
}

module.exports = {
  FORM_107_MIME,
  TEMPLATE_VERSION,
  generarFormulario107,
  precheckFormulario107,
};
