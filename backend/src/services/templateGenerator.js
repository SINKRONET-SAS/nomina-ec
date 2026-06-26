// ============================================================
// Nomina-Ec - Generador de contratos legales versionados
// ============================================================
const fs = require('fs');
const path = require('path');
const pdfmake = require('pdfmake/build/pdfmake');
pdfmake.vfs = require('pdfmake/build/vfs_fonts');

const { s3Upload } = require('../config/s3');
const db = require('../config/database');
const AppError = require('../utils/AppError');
const { getLegalParameters } = require('../config/legal-ecuador');

const BACKEND_ROOT = path.join(__dirname, '..', '..');
const CONTRACT_TEMPLATE_DIR = path.join(__dirname, '..', 'templates', 'legal', 'contracts');
const DEFAULT_TEMPLATE_KEY = 'contrato_indefinido_general';
const CONTRACT_TYPE_ALIASES = new Map([
  ['indefinido', DEFAULT_TEMPLATE_KEY],
  ['contrato_indefinido', DEFAULT_TEMPLATE_KEY],
  ['general', DEFAULT_TEMPLATE_KEY],
  ['prueba', 'contrato_indefinido_mercaderista_prueba'],
  ['contrato_prueba', 'contrato_indefinido_mercaderista_prueba'],
  ['mercaderista_prueba', 'contrato_indefinido_mercaderista_prueba'],
  ['indefinido_mercaderista_prueba', 'contrato_indefinido_mercaderista_prueba'],
  ['contrato_indefinido_mercaderista_prueba', 'contrato_indefinido_mercaderista_prueba'],
]);

function cleanText(value, fallback = '') {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ');
  return text || fallback;
}

function normalizeCode(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}

function safeJson(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (err) {
    console.error('[CONTRATO] Configuracion JSON invalida', {
      code: 'CONTRATO_CONFIG_JSON_INVALIDO',
      statusCode: 400,
      correlationId: null,
      userId: null,
      message: err.message,
    });
    return {};
  }
}

function formatDateEC(value) {
  const date = value instanceof Date
    ? value
    : new Date(`${String(value || new Date().toISOString()).slice(0, 10)}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) return 'fecha no registrada';

  return new Intl.DateTimeFormat('es-EC', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function isoDate(value) {
  const date = value instanceof Date
    ? value
    : new Date(`${String(value || new Date().toISOString()).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function addDays(value, days) {
  const date = new Date(`${isoDate(value)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function toMoney(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
}

function fileTemplateKey(fileName) {
  return path.basename(fileName, '.json');
}

function readTemplateFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const template = JSON.parse(raw);
    const templateKey = cleanText(template.templateKey || fileTemplateKey(filePath));

    if (!templateKey || !Array.isArray(template.sections) || template.sections.length === 0) {
      throw new Error('La plantilla no define templateKey o secciones.');
    }

    return {
      ...template,
      templateKey,
      sourcePath: `backend/${path.relative(BACKEND_ROOT, filePath).replace(/\\/g, '/')}`,
    };
  } catch (err) {
    throw new AppError(`Plantilla de contrato invalida: ${path.basename(filePath)}`, {
      code: 'CONTRATO_TEMPLATE_INVALIDO',
      statusCode: 500,
      details: err.message,
    });
  }
}

function listContractTemplates() {
  if (!fs.existsSync(CONTRACT_TEMPLATE_DIR)) {
    throw new AppError('No existe el directorio de plantillas de contrato.', {
      code: 'CONTRATO_TEMPLATE_DIR_NO_EXISTE',
      statusCode: 500,
      details: CONTRACT_TEMPLATE_DIR,
    });
  }

  return fs.readdirSync(CONTRACT_TEMPLATE_DIR)
    .filter((fileName) => fileName.endsWith('.json'))
    .map((fileName) => readTemplateFile(path.join(CONTRACT_TEMPLATE_DIR, fileName)))
    .sort((a, b) => Number(a.sortOrder || 999) - Number(b.sortOrder || 999))
    .map((template) => ({
      templateKey: template.templateKey,
      displayName: template.displayName,
      description: template.description,
      version: template.version,
      contractType: template.contractType || 'indefinido',
      appliesTo: template.appliesTo || [],
      probation: template.probation || { enabled: false },
      legalReviewRequired: template.legalReviewRequired !== false,
      sourcePath: template.sourcePath,
    }));
}

function resolveTemplateKey({ templateKey, tipoContrato }) {
  const requested = normalizeCode(templateKey || tipoContrato || DEFAULT_TEMPLATE_KEY);
  return CONTRACT_TYPE_ALIASES.get(requested) || requested || DEFAULT_TEMPLATE_KEY;
}

function loadContractTemplate({ templateKey, tipoContrato } = {}) {
  const resolvedKey = resolveTemplateKey({ templateKey, tipoContrato });
  const filePath = path.join(CONTRACT_TEMPLATE_DIR, `${resolvedKey}.json`);

  if (!fs.existsSync(filePath)) {
    throw new AppError(`La plantilla de contrato '${resolvedKey}' no existe.`, {
      code: 'CONTRATO_TEMPLATE_NO_EXISTE',
      statusCode: 404,
      details: { resolvedKey, directory: CONTRACT_TEMPLATE_DIR },
    });
  }

  return readTemplateFile(filePath);
}

async function enrichEmployee(employee, tenant) {
  const employeeId = employee?.id;
  const tenantId = tenant?.id || employee?.tenant_id;

  if (!employeeId || !tenantId) {
    throw new AppError('Empleado y tenant son requeridos para generar contrato.', {
      code: 'CONTRATO_DATOS_BASE_REQUERIDOS',
      statusCode: 400,
    });
  }

  const result = await db.query(`
    SELECT
      e.*,
      COALESCE(jp.name, e.cargo) AS position_name,
      jp.code AS position_code,
      ou.name AS organization_unit_name,
      wz.name AS work_zone_name,
      ws.name AS work_shift_name,
      ws.weekly_hours,
      ws.start_time,
      ws.end_time,
      ws.break_minutes
    FROM empleados e
    LEFT JOIN job_positions jp
      ON jp.id = e.position_id
     AND jp.tenant_id = e.tenant_id
    LEFT JOIN organization_units ou
      ON ou.code = e.unidad_organizativa_codigo
     AND ou.tenant_id = e.tenant_id
    LEFT JOIN work_zones wz
      ON wz.code = e.zona_marcacion_codigo
     AND wz.tenant_id = e.tenant_id
    LEFT JOIN work_shifts ws
      ON ws.code = e.jornada_codigo
     AND ws.tenant_id = e.tenant_id
    WHERE e.id = $1 AND e.tenant_id = $2
    LIMIT 1
  `, [employeeId, tenantId]);

  if (result.rows.length === 0) {
    throw new AppError('Empleado no encontrado para generar contrato.', {
      code: 'CONTRATO_EMPLEADO_NO_ENCONTRADO',
      statusCode: 404,
    });
  }

  return result.rows[0];
}

function validateSalaryAgainstSbu(employee, legalParameters, year) {
  const salary = Number(employee.sueldo_bruto_mensual || 0);
  const sbu = Number(legalParameters.payroll?.unifiedBaseSalary || 0);

  if (!Number.isFinite(salary) || salary <= 0) {
    throw new AppError('El empleado no tiene sueldo bruto mensual valido para generar contrato.', {
      code: 'CONTRATO_SUELDO_INVALIDO',
      statusCode: 422,
    });
  }

  if (sbu > 0 && salary < sbu) {
    throw new AppError(`El sueldo USD ${toMoney(salary)} es menor al SBU ${year} de USD ${toMoney(sbu)}. No se emite contrato con remuneracion inferior al minimo configurado.`, {
      code: 'CONTRATO_SUELDO_MENOR_SBU',
      statusCode: 422,
      details: { salary, sbu, year },
    });
  }
}

function getPathValue(source, key) {
  return String(key || '').split('.').reduce((current, part) => {
    if (current && Object.prototype.hasOwnProperty.call(current, part)) return current[part];
    return undefined;
  }, source);
}

function interpolate(text, context) {
  return String(text || '').replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, key) => {
    const value = getPathValue(context, key);
    if (value === 0) return '0';
    return cleanText(value, 'no registrado');
  });
}

function employeeName(employee) {
  return cleanText(`${employee.nombres || ''} ${employee.apellidos || ''}`, 'Trabajador');
}

function buildWorkShift(employee) {
  const start = cleanText(employee.start_time || employee.jornada_inicio);
  const end = cleanText(employee.end_time || employee.jornada_fin);
  const weeklyHours = employee.weekly_hours || employee.jornada_horas_semanales || '';
  const breakMinutes = employee.break_minutes;

  if (start && end) {
    return `${start} a ${end}${weeklyHours ? `, ${weeklyHours} horas semanales` : ''}${breakMinutes ? `, con ${breakMinutes} minutos de descanso` : ''}`;
  }

  if (employee.work_shift_name) return cleanText(employee.work_shift_name);
  return 'jornada ordinaria parametrizada por el empleador';
}

function buildContractContext({ employee, tenant, template, legalParameters, year, generatedAt }) {
  const tenantConfig = safeJson(tenant.configuracion);
  const probationDays = Number(template.probation?.days || 0);
  const startDate = employee.fecha_ingreso || generatedAt;
  const salary = Number(employee.sueldo_bruto_mensual || 0);
  const cents = String(Math.round((salary - Math.floor(salary)) * 100)).padStart(2, '0');
  const probationEndDate = probationDays > 0 ? addDays(startDate, probationDays - 1) : '';

  return {
    company: {
      legalName: cleanText(tenant.razon_social || tenant.razonSocial, 'Empleador'),
      commercialName: cleanText(tenant.nombre_comercial || tenant.nombreComercial),
      ruc: cleanText(tenant.ruc, 'no registrado'),
      address: cleanText(tenant.direccion || tenantConfig.direccion || tenantConfig.direccionMatriz, 'no registrada'),
      city: cleanText(tenantConfig.ciudad || tenantConfig.canton || 'Quito'),
      legalRepresentative: cleanText(tenantConfig.representanteLegal || tenantConfig.representante_legal, 'representante autorizado'),
      legalRepresentativeId: cleanText(
        tenantConfig.representanteLegalIdentificacion
          || tenantConfig.representante_legal_identificacion
          || tenantConfig.legalRepresentativeId
          || tenantConfig.cedulaRepresentanteLegal,
        'no registrada'
      ),
    },
    employee: {
      fullName: employeeName(employee),
      idNumber: cleanText(employee.cedula, 'no registrada'),
      address: cleanText(employee.direccion_domicilio || employee.direccion, 'no registrado'),
      position: cleanText(employee.position_name || employee.cargo, 'cargo no registrado'),
      positionCode: cleanText(employee.position_code || employee.cargo_codigo),
      organizationUnit: cleanText(employee.organization_unit_name || employee.unidad_organizativa_codigo, 'unidad no registrada'),
      workZone: cleanText(employee.work_zone_name || employee.zona_marcacion_codigo, 'zona no registrada'),
      workShift: buildWorkShift(employee),
      startDate: formatDateEC(startDate),
      startDateIso: isoDate(startDate),
      salaryAmount: toMoney(salary),
      salaryWords: `${numeroALetras(Math.floor(salary))} con ${cents}/100 dolares de los Estados Unidos de America`,
      paymentMethod: cleanText(employee.forma_pago, 'segun politica interna de pago'),
    },
    contract: {
      generatedDate: formatDateEC(generatedAt),
      generatedAtIso: generatedAt.toISOString(),
      templateKey: template.templateKey,
      templateVersion: template.version,
      displayName: template.displayName,
      type: template.contractType || 'indefinido',
      probationEnabled: template.probation?.enabled ? 'si' : 'no',
      probationDays: probationDays ? String(probationDays) : 'no aplica',
      probationEndDate: probationEndDate ? formatDateEC(probationEndDate) : 'no aplica',
      sutRegistrationStatus: 'pendiente de gestion externa',
      legalReviewStatus: 'requiere revision laboral previa a produccion',
    },
    legal: {
      year: String(year),
      sbuAmount: toMoney(legalParameters.payroll?.unifiedBaseSalary || 0),
      personalIessRate: `${Number((legalParameters.payroll?.personalIessRate || 0) * 100).toFixed(2)}%`,
      employerIessRate: `${Number((legalParameters.payroll?.employerIessRate || 0) * 100).toFixed(2)}%`,
      weeklyMaxHours: String(legalParameters.payroll?.weeklyMaxHours || 40),
      sourceStatus: legalParameters.sourceStatus || 'pendiente_validacion_oficial',
    },
    system: {
      product: 'Nomina-Ec',
    },
  };
}

function paragraphNode(text, context) {
  return {
    text: interpolate(text, context),
    style: 'paragraph',
    margin: [0, 0, 0, 8],
  };
}

function buildContractDocDefinition({ template, context }) {
  const content = [
    { text: template.documentTitle || template.displayName || 'CONTRATO DE TRABAJO', style: 'title' },
    {
      text: `Plantilla ${template.templateKey} v${template.version || '1'} | Generado por ${context.system.product}`,
      style: 'audit',
      alignment: 'center',
      margin: [0, 0, 0, 14],
    },
    {
      columns: [
        {
          width: '*',
          stack: [
            { text: 'Empleador', style: 'boxTitle' },
            { text: context.company.legalName },
            { text: `RUC: ${context.company.ruc}` },
            { text: `Direccion: ${context.company.address}` },
            { text: `Representante: ${context.company.legalRepresentative}` },
            { text: `ID representante: ${context.company.legalRepresentativeId}` },
          ],
        },
        {
          width: '*',
          stack: [
            { text: 'Trabajador', style: 'boxTitle' },
            { text: context.employee.fullName },
            { text: `Cedula: ${context.employee.idNumber}` },
            { text: `Cargo: ${context.employee.position}` },
            { text: `Inicio: ${context.employee.startDate}` },
          ],
        },
      ],
      columnGap: 18,
      margin: [0, 0, 0, 14],
    },
  ];

  if (Array.isArray(template.legalBasis) && template.legalBasis.length > 0) {
    content.push(
      { text: 'Base legal y controles de emision', style: 'sectionTitle' },
      {
        ul: template.legalBasis.map((item) => interpolate(`${item.label}: ${item.note}`, context)),
        style: 'small',
        margin: [0, 0, 0, 10],
      },
    );
  }

  if (Array.isArray(template.notices)) {
    for (const notice of template.notices) {
      content.push({
        text: interpolate(notice, context),
        style: 'notice',
        margin: [0, 0, 0, 10],
      });
    }
  }

  for (const section of template.sections) {
    content.push({ text: interpolate(section.title, context), style: 'sectionTitle' });
    for (const paragraph of section.paragraphs || []) {
      content.push(paragraphNode(paragraph, context));
    }
  }

  content.push({
    text: 'Para constancia, las partes suscriben el presente documento en dos ejemplares de igual tenor.',
    style: 'paragraph',
    margin: [0, 10, 0, 18],
  });

  content.push({
    columns: [
      {
        width: '*',
        stack: [
          { text: '\n\n____________________________', alignment: 'center' },
          { text: context.company.legalRepresentative, alignment: 'center', bold: true },
          { text: `Identificacion: ${context.company.legalRepresentativeId}`, alignment: 'center' },
          { text: context.company.legalName, alignment: 'center' },
          { text: `RUC: ${context.company.ruc}`, alignment: 'center' },
        ],
      },
      {
        width: '*',
        stack: [
          { text: '\n\n____________________________', alignment: 'center' },
          { text: context.employee.fullName, alignment: 'center', bold: true },
          { text: 'Trabajador', alignment: 'center' },
          { text: `C.C.: ${context.employee.idNumber}`, alignment: 'center' },
        ],
      },
    ],
    columnGap: 26,
  });

  content.push({
    text: `Estado SUT/MDT: ${context.contract.sutRegistrationStatus}. Revision legal: ${context.contract.legalReviewStatus}. Fecha de generacion: ${context.contract.generatedAtIso}.`,
    style: 'audit',
    margin: [0, 22, 0, 0],
  });

  return {
    pageSize: 'A4',
    pageMargins: [38, 42, 38, 42],
    content,
    defaultStyle: { fontSize: 9, lineHeight: 1.25 },
    styles: {
      title: { fontSize: 15, bold: true, alignment: 'center', margin: [0, 0, 0, 4] },
      sectionTitle: { fontSize: 10, bold: true, color: '#0f766e', margin: [0, 9, 0, 4] },
      paragraph: { alignment: 'justify' },
      boxTitle: { fontSize: 9, bold: true, color: '#0f766e', margin: [0, 0, 0, 3] },
      notice: { fontSize: 8, color: '#475569', italics: true },
      small: { fontSize: 8, color: '#334155' },
      audit: { fontSize: 7, color: '#64748b' },
    },
  };
}

function pdfBufferFromDefinition(docDefinition) {
  return new Promise((resolve) => {
    pdfmake.createPdf(docDefinition).getBuffer((buffer) => resolve(buffer));
  });
}

async function generarContrato(empleado, tenant, tipoContrato = DEFAULT_TEMPLATE_KEY, options = {}) {
  const template = loadContractTemplate({
    templateKey: options.templateKey,
    tipoContrato,
  });
  const employee = await enrichEmployee(empleado, tenant);
  const year = Number(options.year || new Date().getFullYear());
  const legalParameters = getLegalParameters(year);

  validateSalaryAgainstSbu(employee, legalParameters, year);

  const generatedAt = options.generatedAt || new Date();
  const context = buildContractContext({
    employee,
    tenant,
    template,
    legalParameters,
    year,
    generatedAt,
  });
  const docDefinition = buildContractDocDefinition({ template, context });
  const pdfBuffer = await pdfBufferFromDefinition(docDefinition);
  const key = `documentos/${tenant.id}/${employee.id}/contratos/${template.templateKey}_${Date.now()}.pdf`;
  const url = await s3Upload(pdfBuffer, key, 'application/pdf');
  const metadata = {
    source: 'sistema_nomina_ec',
    documentKind: 'contrato',
    templateKey: template.templateKey,
    templateDisplayName: template.displayName,
    templateVersion: template.version,
    templateSource: template.sourcePath,
    tipoContrato: template.contractType || tipoContrato,
    legalReviewStatus: context.contract.legalReviewStatus,
    sutRegistrationStatus: context.contract.sutRegistrationStatus,
    probation: template.probation || { enabled: false },
    storageKey: key,
    snapshot: context,
  };

  const result = await db.query(`
    INSERT INTO documentos_legales (tenant_id, empleado_id, tipo_documento, documento_url, metadata)
    VALUES ($1, $2, 'contrato', $3, $4)
    RETURNING *
  `, [
    tenant.id,
    employee.id,
    url,
    JSON.stringify(metadata),
  ]);

  return {
    url,
    data: context,
    template: {
      templateKey: template.templateKey,
      displayName: template.displayName,
      version: template.version,
      sourcePath: template.sourcePath,
    },
    documento: result.rows[0],
  };
}

function numeroALetras(num) {
  const value = Math.floor(Number(num || 0));
  if (!Number.isFinite(value) || value === 0) return 'cero';

  const unidades = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  const especiales = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciseis', 'diecisiete', 'dieciocho', 'diecinueve'];
  const decenas = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

  function belowThousand(n) {
    if (n === 100) return 'cien';
    const parts = [];
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    if (hundred > 0) parts.push(centenas[hundred]);
    if (rest >= 10 && rest < 20) {
      parts.push(especiales[rest - 10]);
    } else {
      const ten = Math.floor(rest / 10);
      const unit = rest % 10;
      if (ten > 0) parts.push(unit > 0 ? `${decenas[ten]} y ${unidades[unit]}` : decenas[ten]);
      if (ten === 0 && unit > 0) parts.push(unidades[unit]);
    }
    return parts.join(' ');
  }

  if (value >= 1000000) {
    const millions = Math.floor(value / 1000000);
    const rest = value % 1000000;
    return `${millions === 1 ? 'un millon' : `${numeroALetras(millions)} millones`}${rest ? ` ${numeroALetras(rest)}` : ''}`.trim();
  }

  if (value >= 1000) {
    const thousands = Math.floor(value / 1000);
    const rest = value % 1000;
    return `${thousands === 1 ? 'mil' : `${numeroALetras(thousands)} mil`}${rest ? ` ${belowThousand(rest)}` : ''}`.trim();
  }

  return belowThousand(value).trim();
}

module.exports = {
  CONTRACT_TEMPLATE_DIR,
  DEFAULT_TEMPLATE_KEY,
  generarContrato,
  listContractTemplates,
  loadContractTemplate,
  buildContractContext,
  buildContractDocDefinition,
  interpolate,
  numeroALetras,
};
