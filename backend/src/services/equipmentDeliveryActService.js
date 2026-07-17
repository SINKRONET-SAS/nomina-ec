const pdfmake = require('pdfmake/build/pdfmake');
pdfmake.vfs = require('pdfmake/build/vfs_fonts');

const db = require('../config/database');
const { s3Upload } = require('../config/s3');
const AppError = require('../utils/AppError');
const { AUDIT_ACTIONS, recordAudit } = require('./auditService');
const { resolveCompanyIdentity } = require('./companyIdentityService');

const MAX_ITEMS = 30;
const ITEM_CATEGORIES = new Map([
  ['ropa_trabajo', 'Ropa de trabajo'],
  ['epp', 'Equipo de proteccion personal'],
  ['equipo', 'Equipo'],
  ['herramienta', 'Herramienta'],
  ['otro', 'Otro'],
]);

function cleanText(value, maxLength = 500) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function requireText(value, fieldName) {
  const text = cleanText(value);
  if (!text) {
    throw new AppError(`${fieldName} es requerido para generar el acta.`, {
      code: 'ACTA_DOTACION_DATO_REQUERIDO',
      statusCode: 400,
    });
  }
  return text;
}

function normalizeDate(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const text = String(value).slice(0, 10);
  const date = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    throw new AppError('La fecha de entrega no es valida.', {
      code: 'ACTA_DOTACION_FECHA_INVALIDA',
      statusCode: 400,
    });
  }
  return text;
}

function normalizeItem(item, index) {
  const categoria = String(item?.categoria || item?.tipo || 'equipo').trim().toLowerCase();
  const normalizedCategory = ITEM_CATEGORIES.has(categoria) ? categoria : 'otro';
  const descripcion = requireText(item?.descripcion, `descripcion del item ${index + 1}`);
  const cantidad = Number(item?.cantidad ?? 1);

  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    throw new AppError(`La cantidad del item ${index + 1} debe ser mayor a cero.`, {
      code: 'ACTA_DOTACION_CANTIDAD_INVALIDA',
      statusCode: 400,
    });
  }

  return {
    categoria: normalizedCategory,
    categoriaLabel: ITEM_CATEGORIES.get(normalizedCategory),
    descripcion,
    cantidad,
    codigo: cleanText(item?.codigo, 80),
    serial: cleanText(item?.serial, 120),
    talla: cleanText(item?.talla, 40),
    estado: cleanText(item?.estado || 'entregado', 80),
    observaciones: cleanText(item?.observaciones, 300),
  };
}

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('Registra al menos una prenda, equipo o herramienta para el acta.', {
      code: 'ACTA_DOTACION_ITEMS_REQUERIDOS',
      statusCode: 400,
    });
  }

  if (items.length > MAX_ITEMS) {
    throw new AppError(`El acta admite hasta ${MAX_ITEMS} items por entrega.`, {
      code: 'ACTA_DOTACION_ITEMS_MAXIMO',
      statusCode: 400,
    });
  }

  return items.map(normalizeItem);
}

function compactDescription(items) {
  return items
    .map((item) => `${item.cantidad} x ${item.descripcion}`)
    .join('; ')
    .slice(0, 1000);
}

function compactSerial(items) {
  return items
    .map((item) => item.serial || item.codigo)
    .filter(Boolean)
    .join(', ')
    .slice(0, 120);
}

function formatDateEC(value) {
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  return new Intl.DateTimeFormat('es-EC', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function employeeFullName(employee) {
  return `${employee.nombres || ''} ${employee.apellidos || ''}`.trim();
}

function employerSigner({ tenant, entregadoPor }) {
  return {
    name: cleanText(entregadoPor || tenant.representante_legal || tenant.razon_social, 'Representante del empleador'),
    idNumber: cleanText(tenant.representante_legal_identificacion, 'no registrada'),
  };
}

function buildItemsTable(items) {
  return [
    [
      { text: 'Tipo', bold: true },
      { text: 'Descripción', bold: true },
      { text: 'Cant.', bold: true },
      { text: 'Código/serial', bold: true },
      { text: 'Talla', bold: true },
      { text: 'Estado', bold: true },
    ],
    ...items.map((item) => [
      item.categoriaLabel,
      item.descripcion,
      String(item.cantidad),
      [item.codigo, item.serial].filter(Boolean).join(' / ') || '-',
      item.talla || '-',
      item.estado || 'entregado',
    ]),
  ];
}

async function buildActPdf({ employee, tenant, items, fechaEntrega, observaciones, entregadoPor, correlationId }) {
  const employeeName = employeeFullName(employee);
  const signer = employerSigner({ tenant, entregadoPor });
  const generatedAt = new Date().toISOString();
  const config = typeof employee.configuracion === 'object' ? employee.configuracion : {};
  const logoBase64 = config.logoBase64 || tenant.logoBase64 || null;

  const headerContent = [];
  if (logoBase64) {
    headerContent.push({
      columns: [
        { image: logoBase64, width: 70, margin: [0, 0, 0, 6] },
        {
          stack: [
            { text: 'ACTA DE ENTREGA DE DOTACION Y EQUIPOS', style: 'title' },
            { text: 'Documento generado con SKNOMINA', style: 'audit', alignment: 'center', margin: [0, 0, 0, 8] },
          ],
          alignment: 'center',
          width: '*',
        },
      ],
      columnGap: 12,
      margin: [0, 0, 0, 8],
    });
  } else {
    headerContent.push(
      { text: 'ACTA DE ENTREGA DE DOTACION Y EQUIPOS', style: 'title' },
      { text: 'Documento generado con SKNOMINA', style: 'audit', alignment: 'center', margin: [0, 0, 0, 16] },
    );
  }

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [36, 42, 36, 42],
    content: [
      ...headerContent,
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'Empleador', style: 'section' },
              { text: tenant.razon_social || tenant.razonSocial || 'Empleador' },
              { text: `RUC: ${tenant.ruc || 'no registrado'}` },
              { text: `Dirección: ${tenant.direccion || 'no registrada'}` },
              { text: `Representante legal: ${tenant.representante_legal || 'no registrado'}` },
              { text: `ID representante: ${tenant.representante_legal_identificacion || 'no registrada'}` },
            ],
          },
          {
            width: '*',
            stack: [
              { text: 'Trabajador', style: 'section' },
              { text: employeeName },
              { text: `Cédula: ${employee.cedula || 'no registrada'}` },
              { text: `Cargo: ${employee.cargo || 'no registrado'}` },
            ],
          },
        ],
        columnGap: 18,
      },
      { text: `Fecha de entrega: ${formatDateEC(fechaEntrega)}`, margin: [0, 16, 0, 8], bold: true },
      {
        text: 'El empleador deja constancia de la entrega de los siguientes bienes, prendas, equipos o herramientas para uso laboral. El trabajador declara recibirlos en el estado indicado y se obliga a conservarlos, usarlos para las labores asignadas y devolver los bienes retornables cuando corresponda.',
        margin: [0, 0, 0, 12],
      },
      {
        table: {
          headerRows: 1,
          widths: [78, '*', 38, 88, 48, 62],
          body: buildItemsTable(items),
        },
        layout: 'lightHorizontalLines',
      },
      observaciones
        ? { text: `Observaciones: ${observaciones}`, margin: [0, 14, 0, 8] }
        : { text: 'Observaciones: sin observaciones adicionales.', margin: [0, 14, 0, 8] },
      {
        text: 'La firma de esta acta no reemplaza obligaciones legales, reglamentarias o de seguridad industrial que deban gestionarse ante autoridades competentes o mediante documentos externos.',
        style: 'notice',
        margin: [0, 8, 0, 20],
      },
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: '\n\n____________________________', alignment: 'center' },
              { text: employeeName, alignment: 'center', bold: true },
              { text: 'Trabajador', alignment: 'center' },
              { text: `C.C. ${employee.cedula || ''}`, alignment: 'center' },
            ],
          },
          {
            width: '*',
            stack: [
              { text: '\n\n____________________________', alignment: 'center' },
              { text: signer.name, alignment: 'center', bold: true },
              { text: 'Representante legal / delegado del empleador', alignment: 'center' },
              { text: `Identificacion: ${signer.idNumber}`, alignment: 'center' },
            ],
          },
        ],
        columnGap: 26,
      },
      {
        text: `Documento generado con SKNOMINA. Fecha: ${generatedAt}.`,
        style: 'audit',
        margin: [0, 20, 0, 0],
      },
    ],
    styles: {
      title: { fontSize: 16, bold: true, alignment: 'center', margin: [0, 0, 0, 4] },
      section: { fontSize: 10, bold: true, color: '#0f766e', margin: [0, 0, 0, 4] },
      notice: { fontSize: 8, color: '#475569', italics: true },
      audit: { fontSize: 8, color: '#64748b' },
    },
    defaultStyle: { fontSize: 9, lineHeight: 1.25 },
  };

  return new Promise((resolve) => {
    pdfmake.createPdf(docDefinition).getBuffer((buffer) => resolve(buffer));
  });
}

async function generateEquipmentDeliveryAct({
  tenantId,
  empleadoId,
  fechaEntrega,
  items,
  observaciones = '',
  entregadoPor = '',
  correlationId,
  userId,
  ipAddress,
}) {
  if (!tenantId) {
    throw new AppError('Tenant requerido para generar el acta.', {
      code: 'TENANT_REQUERIDO',
      statusCode: 400,
    });
  }
  if (!empleadoId) {
    throw new AppError('empleadoId requerido para generar el acta.', {
      code: 'ACTA_DOTACION_EMPLEADO_REQUERIDO',
      statusCode: 400,
    });
  }

  const normalizedItems = normalizeItems(items);
  const deliveryDate = normalizeDate(fechaEntrega);
  const cleanObservations = cleanText(observaciones, 1000);
  const cleanDeliveredBy = cleanText(entregadoPor, 180);

  const employeeResult = await db.query(`
    SELECT
      e.*,
      t.razon_social,
      t.ruc,
      t.configuracion,
      (
        SELECT cc.payload
        FROM configuration_catalogs cc
        WHERE cc.tenant_id = t.id
          AND cc.catalog_type = 'empresa_operativa'
          AND cc.status = 'activo'
        ORDER BY cc.updated_at DESC, cc.created_at DESC
        LIMIT 1
      ) AS company_operativa_payload
    FROM empleados e
    JOIN tenants t ON t.id = e.tenant_id
    WHERE e.id = $1 AND e.tenant_id = $2
  `, [empleadoId, tenantId]);

  if (employeeResult.rows.length === 0) {
    throw new AppError('Empleado no encontrado para generar el acta.', {
      code: 'EMPLEADO_NO_ENCONTRADO',
      statusCode: 404,
    });
  }

  const employee = employeeResult.rows[0];
  const company = await resolveCompanyIdentity({
    tenantId,
    tenantRow: employee,
    correlationId,
    userId,
  });
  const tenant = {
    ...company,
    id: tenantId,
  };
  const pdfBuffer = await buildActPdf({
    employee,
    tenant,
    items: normalizedItems,
    fechaEntrega: deliveryDate,
    observaciones: cleanObservations,
    entregadoPor: cleanDeliveredBy,
    correlationId,
  });
  const key = `documentos/${tenantId}/${empleadoId}/actas-dotacion/acta_entrega_dotacion_${Date.now()}.pdf`;
  const url = await s3Upload(pdfBuffer, key, 'application/pdf');
  const client = await db.getClient(tenantId, userId);
  let result;

  try {
    const actResult = await client.query(`
      INSERT INTO acta_entrega_equipos (
        tenant_id, empleado_id, descripcion, serial, items, fecha_entrega, observaciones
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      tenantId,
      empleadoId,
      compactDescription(normalizedItems),
      compactSerial(normalizedItems),
      JSON.stringify(normalizedItems),
      deliveryDate,
      cleanObservations,
    ]);

    const acta = actResult.rows[0];
    const metadata = {
      source: 'sistema_sknomina',
      documentKind: 'acta_entrega_dotacion',
      equipmentDeliveryActId: acta.id,
      storageKey: key,
      fechaEntrega: deliveryDate,
      entregadoPor: cleanDeliveredBy,
      representanteLegal: tenant.representante_legal,
      representanteLegalIdentificacion: tenant.representante_legal_identificacion,
      representanteLegalFuente: tenant.companyIdentitySource,
      items: normalizedItems,
    };

    const documentResult = await client.query(`
      INSERT INTO documentos_legales (tenant_id, empleado_id, tipo_documento, documento_url, metadata)
      VALUES ($1, $2, 'acta_entrega_dotacion', $3, $4)
      RETURNING *
    `, [tenantId, empleadoId, url, JSON.stringify(metadata)]);

    const documento = documentResult.rows[0];
    const updatedActResult = await client.query(`
      UPDATE acta_entrega_equipos
      SET documento_legal_id = $1
      WHERE id = $2 AND tenant_id = $3
      RETURNING *
    `, [documento.id, acta.id, tenantId]);

    await db.commit(client);

    result = {
      acta: updatedActResult.rows[0],
      documento,
      url,
      items: normalizedItems,
    };
  } catch (err) {
    await db.rollback(client);
    throw err;
  }

  try {
    await recordAudit({
      tenantId,
      userId,
      correlationId,
      action: AUDIT_ACTIONS.DOCUMENTO_GENERADO,
      entity: 'acta_entrega_equipos',
      entityId: result.acta.id,
      newData: {
        empleadoId,
        documentoId: result.documento.id,
        fechaEntrega: deliveryDate,
        itemCount: normalizedItems.length,
      },
      ipAddress,
      metadata: { documentKind: 'acta_entrega_dotacion' },
    });
  } catch (err) {
    console.error('[AUDITORIA] No se pudo registrar acta de entrega de dotacion', {
      code: err.code || 'AUDIT_ACTA_DOTACION_ERROR',
      correlationId,
      userId,
      tenantId,
      message: err.message,
    });
  }

  return result;
}

module.exports = {
  generateEquipmentDeliveryAct,
  normalizeItems,
  normalizeDate,
  buildActPdf,
};
