// ============================================================
// SKNOMINA - Generador de contratos legales versionados
// ============================================================
const fs = require('fs');
const path = require('path');
const pdfmake = require('pdfmake/build/pdfmake');
pdfmake.vfs = require('pdfmake/build/vfs_fonts');

const { s3Upload } = require('../config/s3');
const db = require('../config/database');
const AppError = require('../utils/AppError');
const { getLegalParameters } = require('../config/legal-ecuador');
const { isAcceptedEcuadorContractType, listEcuadorContractTypes } = require('../config/ecuadorContractTypes');

const BACKEND_ROOT = path.join(__dirname, '..', '..');
const CONTRACT_TEMPLATE_DIR = path.join(__dirname, '..', 'templates', 'legal', 'contracts');
const DEFAULT_TEMPLATE_KEY = 'contrato_indefinido_general';
const CONTRACT_TYPE_ALIASES = new Map([
  ['indefinido', DEFAULT_TEMPLATE_KEY],
  ['contrato_indefinido', DEFAULT_TEMPLATE_KEY],
  ['general', DEFAULT_TEMPLATE_KEY],
  ['jornada_parcial_permanente', 'contrato_jornada_parcial_permanente'],
  ['eventual', 'contrato_eventual'],
  ['ocasional', 'contrato_ocasional'],
  ['temporada', 'contrato_temporada'],
  ['obra', 'contrato_obra_cierta'],
  ['obra_cierta', 'contrato_obra_cierta'],
  ['obra_servicio_giro_negocio', 'contrato_obra_servicio_giro_negocio'],
  ['tarea', 'contrato_por_tarea'],
  ['destajo', 'contrato_a_destajo'],
  ['teletrabajo', 'contrato_teletrabajo'],
  ['trabajo_juvenil', 'contrato_trabajo_juvenil'],
  ['productivo', 'contrato_productivo'],
  ['especial_emergente', 'contrato_especial_emergente'],
  ['emprendimiento', 'contrato_emprendimiento'],
  ['turistico_cultural_creativo', 'contrato_turistico_cultural_creativo'],
  ['aprendizaje', 'contrato_aprendizaje'],
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
    console.error('[CONTRATO] Configuración JSON inválida', {
      code: 'CONTRATO_CONFIG_JSON_INVALIDO',
      statusCode: 400,
      correlationId: null,
      userId: null,
      message: err.message,
    });
    return {};
  }
}

function objectValue(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function firstClean(values, fallback = '') {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return fallback;
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
      contractTypeAcceptedEcuador: isAcceptedEcuadorContractType(template.contractType || 'indefinido'),
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

async function enrichTenantForContract(tenant, template) {
  if (template.documentPresentation !== 'signature_ready') return tenant;

  const result = await db.query(`
    SELECT payload
    FROM configuration_catalogs
    WHERE tenant_id = $1
      AND catalog_type = 'empresa_operativa'
      AND status = 'activo'
    ORDER BY updated_at DESC, created_at DESC
    LIMIT 1
  `, [tenant.id]);
  const companyConfiguration = safeJson(result.rows[0]?.payload);

  return {
    ...tenant,
    configuracion: {
      ...safeJson(tenant.configuracion),
      ...companyConfiguration,
    },
  };
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
  const contractDefaults = objectValue(tenantConfig.contratos || tenantConfig.contracts);
  const obraServicioConfig = objectValue(
    tenantConfig.obraServicioGiroNegocio
      || tenantConfig.obra_servicio_giro_negocio
      || tenantConfig.contratoObraServicio
      || tenantConfig.contrato_obra_servicio
      || contractDefaults.obraServicioGiroNegocio
      || contractDefaults.obra_servicio_giro_negocio
      || contractDefaults.obraServicio
      || contractDefaults.obra_servicio
  );
  const companyCity = firstClean([tenantConfig.ciudad, tenantConfig.canton], 'Quito');
  const companyAddress = firstClean([
    tenant.direccion,
    tenantConfig.direccion,
    tenantConfig.direccionMatriz,
    tenantConfig.direccion_matriz,
  ], 'no registrada');
  const companyProvince = firstClean([tenantConfig.provincia, tenantConfig.province], '');
  const businessPurpose = firstClean([
    obraServicioConfig.giroNegocio,
    obraServicioConfig.giro_negocio,
    tenantConfig.giroNegocio,
    tenantConfig.giro_negocio,
    tenantConfig.actividadEconomica,
    tenantConfig.actividad_economica,
    tenantConfig.objetoSocial,
    tenantConfig.objeto_social,
  ], 'el giro de negocio y actividades economicas registradas por LA EMPLEADORA');
  const employeePosition = cleanText(employee.position_name || employee.cargo, 'mercaderista');
  const serviceDescription = firstClean([
    obraServicioConfig.descripcionServicio,
    obraServicioConfig.descripcion_servicio,
    obraServicioConfig.servicio,
    obraServicioConfig.proyecto,
    tenantConfig.descripcionServicio,
    tenantConfig.descripcion_servicio,
  ], `servicios de ${employeePosition} dentro del giro del negocio de LA EMPLEADORA`);
  const estimatedDuration = firstClean([
    obraServicioConfig.duracionEstimada,
    obraServicioConfig.duracion_estimada,
    obraServicioConfig.plazoEstimado,
    obraServicioConfig.plazo_estimado,
    tenantConfig.contratoObraServicioDuracionEstimada,
  ], '6 meses');
  const workCity = firstClean([
    obraServicioConfig.ciudadPrestacion,
    obraServicioConfig.ciudad_prestacion,
    obraServicioConfig.ciudad,
    employee.ciudad_domicilio,
    companyCity,
  ], companyCity);
  const workProvince = firstClean([
    obraServicioConfig.provinciaPrestacion,
    obraServicioConfig.provincia_prestacion,
    obraServicioConfig.provincia,
    employee.provincia_domicilio,
    companyProvince,
  ], companyProvince || 'provincia no registrada');
  const legalReviewStatus = template.legalReviewRequired === false
    ? 'modelo revisado por asesor legal del empleador; validar datos variables antes de firma y registro'
    : 'requiere revisión laboral previa a producción';

  return {
    company: {
      legalName: cleanText(tenant.razon_social || tenant.razonSocial, 'Empleador'),
      commercialName: cleanText(tenant.nombre_comercial || tenant.nombreComercial),
      ruc: cleanText(tenant.ruc, 'no registrado'),
      logoBase64: tenantConfig.logoBase64 || null,
      address: companyAddress,
      city: companyCity,
      province: companyProvince || 'provincia no registrada',
      businessPurpose,
      administrativeEmail: firstClean([tenant.email, tenantConfig.email, tenantConfig.correoAdministrativo], 'no registrado'),
      phone: firstClean([tenant.telefono, tenantConfig.telefono, tenantConfig.phone], 'no registrado'),
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
      city: firstClean([employee.ciudad_domicilio, employee.ciudad_nombre], 'ciudad no registrada'),
      province: firstClean([employee.provincia_domicilio, employee.provincia_nombre], 'provincia no registrada'),
      contactEmail: firstClean([employee.email_personal, employee.email], 'no registrado'),
      contactPhone: firstClean([employee.telefono, employee.celular, employee.phone], 'no registrado'),
      position: employeePosition,
      positionCode: cleanText(employee.position_code || employee.cargo_codigo),
      organizationUnit: cleanText(employee.organization_unit_name || employee.unidad_organizativa_codigo, 'unidad no registrada'),
      workZone: cleanText(employee.work_zone_name || employee.zona_marcacion_codigo, 'zona no registrada'),
      workShift: buildWorkShift(employee),
      startDate: formatDateEC(startDate),
      startDateIso: isoDate(startDate),
      salaryAmount: toMoney(salary),
      salaryWords: `${numeroALetras(Math.floor(salary))} con ${cents}/100 dolares de los Estados Unidos de America`,
      paymentMethod: cleanText(employee.forma_pago, 'según política interna de pago'),
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
      serviceDescription,
      estimatedDuration,
      workCity,
      workProvince,
      workAddress: firstClean([
        obraServicioConfig.lugarTrabajo,
        obraServicioConfig.lugar_trabajo,
        obraServicioConfig.direccionPrestacion,
        obraServicioConfig.direccion_prestacion,
        companyAddress,
      ], companyAddress),
      sutRegistrationStatus: 'pendiente de gestion externa',
      legalReviewStatus,
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
      product: 'SKNOMINA',
    },
  };
}

function isIncompleteSignatureValue(value) {
  const normalized = cleanText(value).toLowerCase();
  if (!normalized) return true;
  if (normalized.includes('no registrad')) return true;
  if (normalized === 'el giro de negocio y actividades economicas registradas por la empleadora') return true;
  if (/^servicios de .+ dentro del giro del negocio de la empleadora$/.test(normalized)) return true;
  return [
    'empleador',
    'trabajador',
    'representante autorizado',
    'ciudad no registrada',
    'provincia no registrada',
    'zona no registrada',
    'unidad no registrada',
  ].includes(normalized);
}

function validateSignatureReadyContext(template, context) {
  if (template.documentPresentation !== 'signature_ready') return;

  const requiredFields = Array.isArray(template.requiredSignatureFields)
    ? template.requiredSignatureFields
    : [];
  const missingFields = requiredFields
    .filter((field) => isIncompleteSignatureValue(getPathValue(context, field.path)))
    .map((field) => ({ path: field.path, label: field.label || field.path }));

  if (missingFields.length > 0) {
    throw new AppError(
      `No se puede emitir el contrato listo para firma. Completa: ${missingFields.map((field) => field.label).join(', ')}.`,
      {
        code: 'CONTRATO_DATOS_FIRMA_INCOMPLETOS',
        statusCode: 422,
        details: { missingFields },
      },
    );
  }
}

function paragraphNode(text, context) {
  return {
    text: interpolate(text, context),
    style: 'paragraph',
    margin: [0, 0, 0, 8],
  };
}

function buildContractDocDefinition({ template, context }) {
  const signatureReady = template.documentPresentation === 'signature_ready';
  const content = [];

  if (context.company.logoBase64) {
    content.push({
      columns: [
        { image: context.company.logoBase64, width: 70, margin: [0, 0, 0, 6] },
        {
          stack: [
            { text: template.documentTitle || template.displayName || 'CONTRATO DE TRABAJO', style: 'title' },
          ],
          alignment: 'center',
          width: '*',
        },
      ],
      columnGap: 12,
      margin: [0, 0, 0, 8],
    });
  } else {
    content.push({ text: template.documentTitle || template.displayName || 'CONTRATO DE TRABAJO', style: 'title' });
  }

  if (!signatureReady) {
    content.push({
      text: `Documento generado con ${context.system.product}`,
      style: 'audit',
      alignment: 'center',
      margin: [0, 0, 0, 14],
    });
    content.push({
      columns: [
        {
          width: '*',
          stack: [
            { text: 'Empleador', style: 'boxTitle' },
            { text: context.company.legalName },
            { text: `RUC: ${context.company.ruc}` },
            { text: `Dirección: ${context.company.address}` },
            { text: `Representante: ${context.company.legalRepresentative}` },
            { text: `ID representante: ${context.company.legalRepresentativeId}` },
          ],
        },
        {
          width: '*',
          stack: [
            { text: 'Trabajador', style: 'boxTitle' },
            { text: context.employee.fullName },
            { text: `Cédula: ${context.employee.idNumber}` },
            { text: `Cargo: ${context.employee.position}` },
            { text: `Inicio: ${context.employee.startDate}` },
          ],
        },
      ],
      columnGap: 18,
      margin: [0, 0, 0, 14],
    });
  }

  if (!signatureReady && Array.isArray(template.legalBasis) && template.legalBasis.length > 0) {
    content.push(
      { text: 'Base legal y controles de emision', style: 'sectionTitle' },
      {
        ul: template.legalBasis.map((item) => interpolate(`${item.label}: ${item.note}`, context)),
        style: 'small',
        margin: [0, 0, 0, 10],
      },
    );
  }

  if (!signatureReady && Array.isArray(template.notices)) {
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

  if (!signatureReady) {
    content.push({
      text: 'Para constancia, las partes suscriben el presente documento en dos ejemplares de igual tenor.',
      style: 'paragraph',
      margin: [0, 10, 0, 18],
    });
  }

  content.push({
    columns: [
      {
        width: '*',
        stack: [
          { text: '\n\n____________________________', alignment: 'center' },
          { text: context.company.legalRepresentative, alignment: 'center', bold: true },
          { text: `Identificación: ${context.company.legalRepresentativeId}`, alignment: 'center' },
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

  if (!signatureReady) {
    content.push({
      text: `Documento generado con SKNOMINA. Fecha: ${context.contract.generatedAtIso}.`,
      style: 'audit',
      margin: [0, 22, 0, 0],
    });
  }

  return {
    pageSize: 'A4',
    pageMargins: [38, 42, 38, 42],
    content,
    defaultStyle: { fontSize: 9, lineHeight: 1.25 },
    styles: {
      title: { fontSize: 15, bold: true, alignment: 'center', margin: [0, 0, 0, 4] },
      sectionTitle: {
        fontSize: 10,
        bold: true,
        color: signatureReady ? '#000000' : '#0f766e',
        margin: [0, 9, 0, 4],
      },
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

async function generarContrato(empleado, tenant, tipoContrato = null, options = {}) {
  const employee = await enrichEmployee(empleado, tenant);
  const resolvedTemplateKey = options.templateKey
    || tipoContrato
    || employee.tipo_contrato
    || DEFAULT_TEMPLATE_KEY;
  const template = loadContractTemplate({
    templateKey: resolvedTemplateKey,
    tipoContrato: resolvedTemplateKey,
  });
  if (!isAcceptedEcuadorContractType(template.contractType || 'indefinido')) {
    throw new AppError(`El tipo de contrato '${template.contractType}' no esta homologado para Ecuador en SKNOMINA.`, {
      code: 'CONTRATO_TIPO_NO_HOMOLOGADO_ECUADOR',
      statusCode: 422,
      details: {
        templateKey: template.templateKey,
        contractType: template.contractType,
        acceptedTypes: listEcuadorContractTypes().map((type) => type.code),
      },
    });
  }
  const year = Number(options.year || new Date().getFullYear());
  const legalParameters = getLegalParameters(year);

  validateSalaryAgainstSbu(employee, legalParameters, year);

  const generatedAt = options.generatedAt || new Date();
  const contractTenant = await enrichTenantForContract(tenant, template);
  const context = buildContractContext({
    employee,
    tenant: contractTenant,
    template,
    legalParameters,
    year,
    generatedAt,
  });
  validateSignatureReadyContext(template, context);
  const docDefinition = buildContractDocDefinition({ template, context });
  const pdfBuffer = await pdfBufferFromDefinition(docDefinition);
  const key = `documentos/${tenant.id}/${employee.id}/contratos/${template.templateKey}_${Date.now()}.pdf`;
  const url = await s3Upload(pdfBuffer, key, 'application/pdf');
  const metadata = {
    source: 'sistema_sknomina',
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

function buildFiniquitoDocDefinition({ empleado, tenant, cause, liquidacion, generatedAt }) {
  const detail = liquidacion.detalle || {};
  const tenantConfig = safeJson(tenant.configuracion);
  const logoBase64 = tenantConfig.logoBase64 || null;
  const razonSocial = cleanText(tenant.razon_social || tenant.razonSocial || tenant.nombre, 'Empleador');
  const ruc = cleanText(tenant.ruc, 'no registrado');
  const rows = [
    ['Sueldo pendiente', `$${toMoney(liquidacion.sueldoPendiente)}`],
    ['Decimo tercero proporcional', `$${toMoney(liquidacion.decimoTercero)}`],
    ['Decimo cuarto proporcional', `$${toMoney(liquidacion.decimoCuarto)}`],
    ['Vacaciones no gozadas', `$${toMoney(liquidacion.vacaciones)}`],
    ['Fondo de reserva', `$${toMoney(liquidacion.fondoReserva)}`],
    ['Indemnizacion', `$${toMoney(liquidacion.indemnizacion)}`],
    ['Bonificacion por desahucio', `$${toMoney(liquidacion.desahucio)}`],
    [{ text: 'Total liquidacion', bold: true }, { text: `$${toMoney(liquidacion.total)}`, bold: true, alignment: 'right' }],
  ];

  const headerContent = [];
  if (logoBase64) {
    headerContent.push({
      columns: [
        { image: logoBase64, width: 70, margin: [0, 0, 0, 6] },
        {
          stack: [
            { text: 'ACTA DE FINIQUITO LABORAL', style: 'title' },
            { text: razonSocial, style: 'subtitle' },
            { text: `RUC: ${ruc}`, style: 'audit', alignment: 'center', margin: [0, 0, 0, 14] },
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
      { text: 'ACTA DE FINIQUITO LABORAL', style: 'title' },
      { text: razonSocial, style: 'subtitle' },
      { text: `RUC: ${ruc}`, style: 'audit', alignment: 'center', margin: [0, 0, 0, 14] },
    );
  }

  return {
    pageSize: 'A4',
    pageMargins: [38, 42, 38, 42],
    content: [
      ...headerContent,
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'Trabajador', style: 'sectionTitle' },
              `Nombre: ${cleanText(`${empleado.nombres || ''} ${empleado.apellidos || ''}`, 'no registrado')}`,
              `Identificacion: ${cleanText(empleado.cedula, 'no registrada')}`,
              `Cargo: ${cleanText(empleado.cargo, 'no registrado')}`,
              `Fecha ingreso: ${formatDateEC(empleado.fecha_ingreso)}`,
              `Fecha salida: ${formatDateEC(detail.fechaSalida)}`,
            ],
          },
          {
            width: '*',
            stack: [
              { text: 'Causal', style: 'sectionTitle' },
              cause.label || cause.code || 'Causal no registrada',
              `Base legal: ${cause.legalBasis || detail.baseLegalTerminacion || 'revision legal requerida'}`,
              `Dias de servicio: ${detail.diasServicio || 0}`,
            ],
          },
        ],
        columnGap: 20,
        margin: [0, 0, 0, 12],
      },
      { text: 'Liquidacion pormenorizada', style: 'sectionTitle' },
      {
        table: {
          widths: ['*', 95],
          body: [
            [{ text: 'Concepto', bold: true }, { text: 'Valor', bold: true, alignment: 'right' }],
            ...rows.map(([label, value]) => [
              label,
              typeof value === 'string' ? { text: value, alignment: 'right' } : value,
            ]),
          ],
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 12],
      },
      {
        text: 'Este documento deja evidencia del calculo interno. Debe revisarse frente al expediente laboral y registrarse o validarse ante la autoridad competente cuando corresponda. El finiquito puede ser impugnado si la liquidacion no ha sido practicada ante inspector del trabajo.',
        style: 'notice',
        margin: [0, 0, 0, 18],
      },
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: '\n\n____________________________', alignment: 'center' },
              { text: cleanText(tenantConfig.representanteLegal || tenantConfig.representante_legal, 'Representante legal / delegado'), alignment: 'center', bold: true },
              { text: cleanText(tenantConfig.representanteLegalCargo || tenantConfig.representante_legal_cargo, 'Representante legal / delegado del empleador'), alignment: 'center' },
              { text: `Identificacion: ${cleanText(tenantConfig.representanteLegalIdentificacion || tenantConfig.representante_legal_identificacion, 'no registrada')}`, alignment: 'center' },
            ],
          },
          {
            width: '*',
            stack: [
              { text: '\n\n____________________________', alignment: 'center' },
              { text: cleanText(`${empleado.nombres || ''} ${empleado.apellidos || ''}`, 'Trabajador'), alignment: 'center', bold: true },
              { text: 'Trabajador', alignment: 'center' },
              { text: `C.C.: ${cleanText(empleado.cedula, 'no registrada')}`, alignment: 'center' },
            ],
          },
        ],
        columnGap: 26,
      },
      {
        text: 'Documento generado con SKNOMINA.',
        style: 'audit',
        margin: [0, 18, 0, 0],
      },
    ],
    defaultStyle: { fontSize: 9, lineHeight: 1.25 },
    styles: {
      title: { fontSize: 15, bold: true, alignment: 'center', margin: [0, 0, 0, 4] },
      subtitle: { fontSize: 11, bold: true, alignment: 'center', color: '#0f766e', margin: [0, 0, 0, 4] },
      sectionTitle: { fontSize: 10, bold: true, color: '#0f766e', margin: [0, 9, 0, 4] },
      notice: { fontSize: 8, color: '#475569', italics: true },
      audit: { fontSize: 7, color: '#64748b' },
    },
  };
}

async function generarActaFiniquito(empleado, tenant, causaTerminacion, liquidacion, options = {}) {
  const cause = typeof causaTerminacion === 'object'
    ? causaTerminacion
    : { code: String(causaTerminacion || ''), label: String(causaTerminacion || '').replace(/_/g, ' ') };
  const generatedAt = options.generatedAt || new Date();
  const docDefinition = buildFiniquitoDocDefinition({
    empleado,
    tenant,
    cause,
    liquidacion,
    generatedAt,
  });
  const pdfBuffer = await pdfBufferFromDefinition(docDefinition);
  const key = `documentos/${tenant.id}/${empleado.id}/finiquitos/acta_finiquito_${Date.now()}.pdf`;
  const url = await s3Upload(pdfBuffer, key, 'application/pdf');
  const metadata = {
    source: 'sistema_sknomina',
    documentKind: 'acta_finiquito',
    templateKey: 'acta_finiquito_sknomina',
    templateVersion: '2026.07',
    causaTerminacion: cause.code,
    causaTerminacionLabel: cause.label,
    legalBasis: cause.legalBasis || liquidacion?.detalle?.baseLegalTerminacion || '',
    storageKey: key,
    generatedAt: generatedAt.toISOString(),
    correlationId: options.correlationId || null,
    snapshot: {
      liquidacion,
      empleadoId: empleado.id,
      tenantId: tenant.id,
    },
  };

  const result = await db.query(`
    INSERT INTO documentos_legales (tenant_id, empleado_id, tipo_documento, documento_url, metadata)
    VALUES ($1, $2, 'acta_finiquito', $3, $4)
    RETURNING *
  `, [
    tenant.id,
    empleado.id,
    url,
    JSON.stringify(metadata),
  ]);

  return {
    url,
    documento: result.rows[0],
    template: {
      templateKey: 'acta_finiquito_sknomina',
      version: '2026.07',
    },
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
  generarActaFiniquito,
  listContractTemplates,
  loadContractTemplate,
  buildContractContext,
  validateSignatureReadyContext,
  buildContractDocDefinition,
  buildFiniquitoDocDefinition,
  interpolate,
  numeroALetras,
};
