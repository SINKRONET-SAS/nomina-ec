// ============================================================
// SKNOMINA - Controlador de Empleados
// ============================================================
const db = require('../config/database');
const { validarCedula } = require('../utils/validarCedula');
const { encryptBankAccount } = require('../services/bankAccountCrypto');
const { recordAudit } = require('../services/auditService');
const { getBankProfileForTenant } = require('../services/bancoAebGenerator');
const { s3Upload } = require('../config/s3');
const { generarContrato } = require('../services/templateGenerator');
const { getEmployeeHistory } = require('../services/employeeHistoryService');
const { buildEmployeeMasterReport } = require('../services/employeeMasterReportService');
const { listTerminationCauses } = require('../config/terminationCauses');
const logger = require('../utils/logger');
const {
  buildEmployeeImportTemplateCsv,
  commitEmployeeImport,
  listEmployeeImportBatches,
  previewEmployeeImport,
  rollbackEmployeeImport,
} = require('../services/employeeImportService');

const FOURTEENTH_REGION_PARAMETERS = {
  costa_galapagos: 'decimo_cuarto_costa_galapagos',
  sierra_amazonia: 'decimo_cuarto_sierra_amazonia',
};
const MIN_EMPLOYEE_AGE = 18;
const OLDER_ADULT_AGE = 65;
const DEPENDENT_DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;
const DEPENDENT_DOCUMENT_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const EMPLOYEE_CROQUIS_MAX_BYTES = 5 * 1024 * 1024;
const EMPLOYEE_CROQUIS_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const EMPLOYEE_SENSITIVE_READ_ROLES = new Set(['owner', 'admin_rrhh', 'superadmin']);
const EMPLOYEE_READ_ROLES = new Set(['owner', 'admin_rrhh', 'supervisor', 'superadmin']);
const IESS_RELATION_TYPES = new Set([
  'relacion_dependencia',
  'jornada_parcial_permanente',
  'sin_relacion_dependencia',
  'servicios_profesionales',
  'pasante',
]);
const SENSITIVE_EMPLOYEE_FIELDS = [
  'sueldo_bruto_mensual',
  'gastos_personales_anuales',
  'cargo_salary_min',
  'cargo_salary_max',
];

function normalizeFourteenthRegion(value) {
  const normalized = String(value || 'sierra_amazonia').trim().toLowerCase();
  return FOURTEENTH_REGION_PARAMETERS[normalized] ? normalized : null;
}

function normalizeReserveFundMode(value) {
  const normalized = String(value || 'mensual').trim().toLowerCase();
  return ['mensual', 'iess_directo'].includes(normalized) ? normalized : null;
}

function normalizeBenefitModality(value) {
  const normalized = String(value || 'acumulado').trim().toLowerCase();
  return ['mensual', 'acumulado'].includes(normalized) ? normalized : null;
}

function normalizeIessAffiliated(value) {
  if (typeof value === 'undefined' || value === null || value === '') return true;
  if (typeof value === 'boolean') return value;
  return !['false', '0', 'no', 'sin_iess'].includes(String(value).trim().toLowerCase());
}

function normalizeIessRelationType(value) {
  const normalized = String(value || 'relacion_dependencia').trim().toLowerCase();
  return IESS_RELATION_TYPES.has(normalized) ? normalized : null;
}

function normalizeOptionalText(value, maxLength = 255) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeEmail(value, fieldLabel = 'email') {
  const email = normalizeOptionalText(value, 255).toLowerCase();
  if (!email) return '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const err = new Error(`Registra un ${fieldLabel} valido.`);
    err.code = 'EMPLEADO_EMAIL_INVALIDO';
    err.statusCode = 400;
    throw err;
  }
  return email;
}

function normalizeCoordinate(value, { min, max, label }) {
  if (typeof value === 'undefined' || value === null || value === '') return null;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < min || numberValue > max) {
    const err = new Error(`${label} debe estar entre ${min} y ${max}.`);
    err.code = 'EMPLEADO_COORDENADA_INVALIDA';
    err.statusCode = 400;
    throw err;
  }
  return Number(numberValue.toFixed(7));
}

function normalizeHomeReference(body) {
  const keys = [
    'referencia_no_convive_nombres',
    'referencia_no_convive_email',
    'referencia_no_convive_telefono',
  ];
  const hasReferencePayload = keys.some((key) => Object.prototype.hasOwnProperty.call(body, key));
  if (!hasReferencePayload) return;

  body.referencia_no_convive_nombres = normalizeOptionalText(body.referencia_no_convive_nombres, 160);
  body.referencia_no_convive_email = normalizeEmail(body.referencia_no_convive_email, 'email de la referencia');
  body.referencia_no_convive_telefono = normalizeOptionalText(body.referencia_no_convive_telefono, 40);
}

function normalizeHomeCoordinates(body) {
  if (Object.prototype.hasOwnProperty.call(body, 'domicilio_lat')) {
    body.domicilio_lat = normalizeCoordinate(body.domicilio_lat, { min: -90, max: 90, label: 'Latitud del domicilio' });
  }
  if (Object.prototype.hasOwnProperty.call(body, 'domicilio_lng')) {
    body.domicilio_lng = normalizeCoordinate(body.domicilio_lng, { min: -180, max: 180, label: 'Longitud del domicilio' });
  }
}

function ensureEmployeeReadRole(req, res) {
  const role = req.usuario?.rol || '';
  if (!EMPLOYEE_READ_ROLES.has(role)) {
    res.status(403).json({
      error: 'PERMISO_DENEGADO',
      message: 'No tiene permisos para consultar fichas laborales.',
      correlationId: req.correlationId,
    });
    return false;
  }
  return true;
}

function hasSensitiveEmployeeAccess(req) {
  return EMPLOYEE_SENSITIVE_READ_ROLES.has(req.usuario?.rol || '');
}

function redactEmployeeForRole(row, req) {
  if (hasSensitiveEmployeeAccess(req)) return row;
  const redacted = { ...row, datos_sensibles_redactados: true };
  for (const field of SENSITIVE_EMPLOYEE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(redacted, field)) redacted[field] = null;
  }
  return redacted;
}

function serializeEmployee(row, req) {
  const empleado = redactEmployeeForRole(row, req);
  const serialized = {
    ...empleado,
    cuenta_bancaria_registrada: Boolean(row.cuenta_bancaria_cifrada),
  };
  delete serialized.cuenta_bancaria_cifrada;
  return serialized;
}

async function recordSensitiveEmployeeRead(req, { entityId = null, count = 0, scope = 'list' } = {}) {
  if (!hasSensitiveEmployeeAccess(req) || count <= 0) return;
  try {
    await recordAudit({
      tenantId: req.tenantId,
      userId: req.usuarioId || req.usuario?.id || null,
      correlationId: req.correlationId || 'empleados-read',
      action: 'empleado.datos_sensibles.leidos',
      entity: 'empleados',
      entityId,
      newData: { count, fields: SENSITIVE_EMPLOYEE_FIELDS, scope },
      metadata: { role: req.usuario?.rol || '', lopdpPurpose: 'gestion_laboral_nomina' },
      ipAddress: req.ip,
    });
  } catch (err) {
    console.error('[EMPLEADOS] No se pudo auditar lectura sensible', {
      code: err.code || 'EMPLOYEE_SENSITIVE_READ_AUDIT_ERROR',
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
  }
}

function calculateAge(fechaNacimiento, today = new Date()) {
  if (!fechaNacimiento) return null;
  const birthDate = new Date(`${String(fechaNacimiento).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(birthDate.getTime())) return null;
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDelta = today.getUTCMonth() - birthDate.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getUTCDate() < birthDate.getUTCDate())) {
    age -= 1;
  }
  return age;
}

function validateEmployeeBirthdate(fechaNacimiento) {
  const age = calculateAge(fechaNacimiento);
  if (age === null) {
    const err = new Error('Registra una fecha de nacimiento valida del trabajador.');
    err.code = 'EMPLEADO_FECHA_NACIMIENTO_INVALIDA';
    err.statusCode = 400;
    throw err;
  }
  if (age < MIN_EMPLOYEE_AGE) {
    const err = new Error('No se permite crear una ficha laboral para menores de edad en este flujo.');
    err.code = 'EMPLEADO_MENOR_EDAD_BLOQUEADO';
    err.statusCode = 422;
    throw err;
  }
  return {
    age,
    isOlderAdult: age >= OLDER_ADULT_AGE,
  };
}

async function resolveEmployeeBankCode(tenantId, formaPago, banco) {
  const paymentMethod = String(formaPago || 'transferencia').trim().toLowerCase();
  const bankCode = String(banco || '').trim().toUpperCase();

  if (paymentMethod !== 'transferencia') {
    return bankCode;
  }

  if (!bankCode) {
    const err = new Error('Selecciona una entidad bancaria configurada para el trabajador.');
    err.code = 'EMPLEADO_BANCO_REQUERIDO';
    err.statusCode = 400;
    throw err;
  }

  const profile = await getBankProfileForTenant(tenantId, bankCode);
  return profile.bankCode || bankCode;
}

async function resolveConfiguredCode(tenantId, table, code, label, errorCode) {
  const normalized = String(code || '').trim().toUpperCase();
  if (!normalized) return '';

  const result = await db.query(`
    SELECT code
    FROM ${table}
    WHERE tenant_id = $1
      AND UPPER(code) = $2
      AND status = 'activo'
    LIMIT 1
  `, [tenantId, normalized]);

  if (result.rows.length === 0) {
    const err = new Error(`${label} no existe o no esta activo en parametrizacion.`);
    err.code = errorCode;
    err.statusCode = 400;
    throw err;
  }

  return result.rows[0].code;
}

function raiseEmployeeError(message, code, statusCode = 400) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  throw err;
}

async function resolveJobPositionAssignment(tenantId, { positionId, cargo, sueldoBrutoMensual, unidadOrganizativaCodigo }) {
  const identifier = String(positionId || cargo || '').trim();
  if (!identifier) {
    raiseEmployeeError('Selecciona un cargo o puesto parametrizado para el trabajador.', 'EMPLEADO_CARGO_REQUERIDO');
  }

  const result = await db.query(`
    SELECT
      jp.id,
      jp.code,
      jp.name,
      jp.salary_min,
      jp.salary_max,
      jp.status,
      jp.effective_from,
      jp.effective_to,
      ou.code AS organization_unit_code,
      ou.name AS organization_unit_name
    FROM job_positions jp
    INNER JOIN organization_units ou
      ON ou.id = jp.organization_unit_id
     AND ou.tenant_id = jp.tenant_id
    WHERE jp.tenant_id = $1
      AND (
        jp.id::text = $2
        OR UPPER(jp.code) = UPPER($2)
        OR UPPER(jp.name) = UPPER($2)
      )
    LIMIT 1
  `, [tenantId, identifier]);

  if (result.rows.length === 0 || result.rows[0].status !== 'activo') {
    raiseEmployeeError('El cargo seleccionado no existe o no esta activo para esta empresa.', 'EMPLEADO_CARGO_INVALIDO');
  }

  const position = result.rows[0];
  const expectedUnitCode = String(unidadOrganizativaCodigo || '').trim().toUpperCase();
  if (expectedUnitCode && expectedUnitCode !== String(position.organization_unit_code || '').toUpperCase()) {
    raiseEmployeeError('El cargo seleccionado pertenece a otra unidad organizativa.', 'EMPLEADO_CARGO_UNIDAD_INVALIDA');
  }

  const salary = Number(sueldoBrutoMensual);
  if (!Number.isFinite(salary) || salary <= 0) {
    raiseEmployeeError('El sueldo bruto mensual debe ser un numero positivo.', 'EMPLEADO_SUELDO_INVALIDO');
  }

  const salaryMin = Number(position.salary_min || 0);
  const salaryMax = Number(position.salary_max || 0);
  if (salary < salaryMin || salary > salaryMax) {
    raiseEmployeeError(
      `El sueldo bruto mensual esta fuera del rango permitido para ${position.name}: USD ${salaryMin.toFixed(2)} a USD ${salaryMax.toFixed(2)}.`,
      'EMPLEADO_CARGO_SUELDO_FUERA_RANGO'
    );
  }

  return {
    positionId: position.id,
    cargo: position.name,
    cargoCodigo: position.code,
    unidadOrganizativaCodigo: position.organization_unit_code,
    unidadOrganizativaNombre: position.organization_unit_name,
    salaryMin,
    salaryMax,
  };
}

async function resolveLocationCodes(provinciaCodigo, ciudadCodigo) {
  const provinceCode = String(provinciaCodigo || '').trim();
  const cityCode = String(ciudadCodigo || '').trim();
  if (!provinceCode || !cityCode) {
    const err = new Error('Selecciona provincia y ciudad desde el catalogo de division politica.');
    err.code = 'EMPLEADO_UBICACION_REQUERIDA';
    err.statusCode = 400;
    throw err;
  }

  const result = await db.query(`
    SELECT p.code AS provincia_codigo, p.name AS provincia_nombre,
      c.code AS ciudad_codigo, c.name AS ciudad_nombre
    FROM ecuador_cities c
    JOIN ecuador_provinces p ON p.code = c.province_code
    WHERE p.active = true
      AND c.active = true
      AND p.code = $1
      AND c.code = $2
    LIMIT 1
  `, [provinceCode, cityCode]);

  if (result.rows.length === 0) {
    const err = new Error('La ciudad seleccionada no pertenece a la provincia o no esta activa.');
    err.code = 'EMPLEADO_UBICACION_INVALIDA';
    err.statusCode = 400;
    throw err;
  }

  return result.rows[0];
}

async function uploadDependentDocument(tenantId, employeeId, dependent, index) {
  if (!dependent.documento_base64) return '';
  const mimeType = dependent.documento_mime_type || 'application/pdf';
  if (!DEPENDENT_DOCUMENT_TYPES.has(mimeType)) {
    const err = new Error('El documento de carga familiar debe ser PDF, JPG o PNG.');
    err.code = 'DEPENDIENTE_DOCUMENTO_TIPO_INVALIDO';
    err.statusCode = 400;
    throw err;
  }

  const cleanBase64 = String(dependent.documento_base64).replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(cleanBase64, 'base64');
  if (buffer.length === 0 || buffer.length > DEPENDENT_DOCUMENT_MAX_BYTES) {
    const err = new Error('El documento de carga familiar debe pesar hasta 5 MB.');
    err.code = 'DEPENDIENTE_DOCUMENTO_TAMANO_INVALIDO';
    err.statusCode = 400;
    throw err;
  }

  const safeName = String(dependent.documento_nombre || `carga-familiar-${index + 1}.pdf`).replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 120);
  const key = `documentos/${tenantId}/${employeeId}/cargas-familiares/${Date.now()}_${index}_${safeName}`;
  return s3Upload(buffer, key, mimeType);
}

async function uploadEmployeeCroquis(tenantId, employeeId, payload) {
  if (!payload.croquis_domicilio_base64) return null;

  const mimeType = payload.croquis_domicilio_mime_type || 'image/png';
  if (!EMPLOYEE_CROQUIS_TYPES.has(mimeType)) {
    const err = new Error('El croquis del domicilio debe ser una imagen JPG, PNG o WebP.');
    err.code = 'EMPLEADO_CROQUIS_TIPO_INVALIDO';
    err.statusCode = 400;
    throw err;
  }

  const cleanBase64 = String(payload.croquis_domicilio_base64).replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(cleanBase64, 'base64');
  if (buffer.length === 0 || buffer.length > EMPLOYEE_CROQUIS_MAX_BYTES) {
    const err = new Error('El croquis del domicilio debe pesar hasta 5 MB.');
    err.code = 'EMPLEADO_CROQUIS_TAMANO_INVALIDO';
    err.statusCode = 400;
    throw err;
  }

  const defaultName = mimeType === 'image/jpeg' ? 'croquis-domicilio.jpg' : 'croquis-domicilio.png';
  const safeName = String(payload.croquis_domicilio_nombre || defaultName)
    .replace(/[^a-zA-Z0-9_.-]/g, '_')
    .slice(0, 120);
  const key = `documentos/${tenantId}/${employeeId}/domicilio/${Date.now()}_${safeName}`;
  const url = await s3Upload(buffer, key, mimeType);

  return {
    url,
    metadata: {
      originalName: payload.croquis_domicilio_nombre || safeName,
      mimeType,
      sizeBytes: buffer.length,
      source: 'ficha_trabajador',
      documentUse: 'croquis_domicilio_ruta_principal',
    },
  };
}

function normalizeDependents(dependientes = [], cargasFamiliares = 0) {
  const expected = Number(cargasFamiliares || 0);
  if (expected <= 0) return [];
  if (!Array.isArray(dependientes) || dependientes.length !== expected) {
    const err = new Error('Registra el detalle de cada carga familiar declarada.');
    err.code = 'DEPENDIENTES_DETALLE_REQUERIDO';
    err.statusCode = 400;
    throw err;
  }

  return dependientes.map((dependent, index) => {
    const nombres = String(dependent.nombres || '').trim();
    const parentesco = String(dependent.parentesco || '').trim().toLowerCase();
    if (!nombres || !parentesco) {
      const err = new Error(`Completa nombres y parentesco de la carga familiar ${index + 1}.`);
      err.code = 'DEPENDIENTE_DATOS_INCOMPLETOS';
      err.statusCode = 400;
      throw err;
    }

    return {
      nombres,
      apellidos: String(dependent.apellidos || '').trim(),
      identificacion: String(dependent.identificacion || '').trim(),
      parentesco,
      fecha_nacimiento: dependent.fecha_nacimiento || null,
      discapacidad: Boolean(dependent.discapacidad),
      porcentaje_discapacidad: dependent.discapacidad ? Number(dependent.porcentaje_discapacidad || 0) : null,
      documento_base64: dependent.documento_base64 || '',
      documento_nombre: dependent.documento_nombre || '',
      documento_mime_type: dependent.documento_mime_type || '',
    };
  });
}

async function replaceEmployeeDependents(tenantId, employeeId, dependientes, cargasFamiliares) {
  const normalized = normalizeDependents(dependientes, cargasFamiliares);
  await db.query('DELETE FROM employee_family_dependents WHERE tenant_id = $1 AND employee_id = $2', [tenantId, employeeId]);

  for (const [index, dependent] of normalized.entries()) {
    const documentoUrl = await uploadDependentDocument(tenantId, employeeId, dependent, index);
    await db.query(`
      INSERT INTO employee_family_dependents (
        tenant_id, employee_id, nombres, apellidos, identificacion, parentesco,
        fecha_nacimiento, discapacidad, porcentaje_discapacidad, documento_url, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `, [
      tenantId,
      employeeId,
      dependent.nombres,
      dependent.apellidos,
      dependent.identificacion,
      dependent.parentesco,
      dependent.fecha_nacimiento,
      dependent.discapacidad,
      dependent.porcentaje_discapacidad,
      documentoUrl,
      JSON.stringify({
        source: 'ficha_trabajador',
        legalUse: 'cargas_familiares_impuesto_renta',
      }),
    ]);
  }
}

async function listar(req, res) {
  try {
    if (!ensureEmployeeReadRole(req, res)) return;
    const { tenantId } = req;
    const { activo = 'true' } = req.query;
    const activoFilter = String(activo).toLowerCase() === 'true';
    
    const result = await db.query(`
      SELECT
        e.id,
        e.cedula,
        e.nombres,
        e.apellidos,
        COALESCE(jp.name, e.cargo) AS cargo,
        e.position_id,
        jp.code AS cargo_codigo,
        jp.salary_min AS cargo_salary_min,
        jp.salary_max AS cargo_salary_max,
        e.departamento,
        e.sueldo_bruto_mensual,
        e.jornada_horas_mensuales,
        e.gastos_personales_anuales,
        e.fecha_ingreso,
        e.tipo_contrato,
        e.iess_afiliado,
        e.iess_tipo_relacion,
        e.controla_asistencia,
        e.activo
      FROM empleados e
      LEFT JOIN job_positions jp
        ON jp.id = e.position_id
       AND jp.tenant_id = e.tenant_id
      WHERE e.tenant_id = $1 AND e.activo = $2
      ORDER BY e.apellidos, e.nombres
    `, [tenantId, activoFilter]);
    
    await recordSensitiveEmployeeRead(req, { count: result.rows.length, scope: 'list' });
    res.json({ success: true, empleados: result.rows.map((row) => serializeEmployee(row, req)) });
  } catch (err) {
    console.error('[EMPLEADOS] Error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

async function obtener(req, res) {
  try {
    if (!ensureEmployeeReadRole(req, res)) return;
    const { id } = req.params;
    const { tenantId } = req;
    
    const result = await db.query(`
      SELECT
        e.*,
        COALESCE(jp.name, e.cargo) AS cargo,
        jp.code AS cargo_codigo,
        jp.salary_min AS cargo_salary_min,
        jp.salary_max AS cargo_salary_max,
        jp.organization_unit_id AS cargo_organization_unit_id
      FROM empleados e
      LEFT JOIN job_positions jp
        ON jp.id = e.position_id
       AND jp.tenant_id = e.tenant_id
      WHERE e.id = $1 AND e.tenant_id = $2
    `, [id, tenantId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    
    const dependents = await db.query(`
      SELECT id, nombres, apellidos, identificacion, parentesco, fecha_nacimiento,
        discapacidad, porcentaje_discapacidad, documento_url
      FROM employee_family_dependents
      WHERE tenant_id = $1 AND employee_id = $2 AND activo = true
      ORDER BY created_at ASC
    `, [tenantId, id]);

    const empleado = result.rows[0];
    empleado.edad = calculateAge(empleado.fecha_nacimiento);
    empleado.es_adulto_mayor = (empleado.edad || 0) >= OLDER_ADULT_AGE;
    empleado.dependientes = dependents.rows;
    await recordSensitiveEmployeeRead(req, { entityId: empleado.id, count: 1, scope: 'detail' });
    res.json({ success: true, empleado: serializeEmployee(empleado, req) });
  } catch (err) {
    console.error('[EMPLEADOS] Error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

async function historial(req, res) {
  try {
    if (!ensureEmployeeReadRole(req, res)) return;
    const { id } = req.params;
    const employee = await db.query(
      'SELECT id FROM empleados WHERE id = $1 AND tenant_id = $2 LIMIT 1',
      [id, req.tenantId]
    );
    if (employee.rows.length === 0) {
      return res.status(404).json({
        error: 'EMPLEADO_NO_ENCONTRADO',
        message: 'Empleado no encontrado para el tenant actual.',
        correlationId: req.correlationId,
      });
    }

    const history = await getEmployeeHistory({
      tenantId: req.tenantId,
      empleadoId: id,
      limit: req.query.limit,
    });
    return res.json({ success: true, history, correlationId: req.correlationId });
  } catch (err) {
    console.error('[EMPLEADOS] Error consultando historial', {
      code: err.code || 'EMPLEADO_HISTORIAL_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'EMPLEADO_HISTORIAL_ERROR',
      message: err.message || 'No pudimos consultar el historial laboral.',
      correlationId: req.correlationId,
    });
  }
}

async function crear(req, res) {
  try {
    const { tenantId } = req;
    const profileData = { ...(req.body || {}) };
    const {
      cedula, nombres, apellidos, fecha_nacimiento, cargo, position_id, cargo_codigo, departamento,
      sueldo_bruto_mensual, fecha_ingreso, tipo_contrato,
      iess_afiliado, iess_tipo_relacion,
      jornada_horas_mensuales, gastos_personales_anuales,
      cuenta_bancaria, banco, tipo_cuenta, forma_pago, region_decimo_cuarto, modalidad_fondo_reserva,
      modalidad_decimo_tercero, modalidad_decimo_cuarto,
      jornada_codigo, unidad_organizativa_codigo, zona_marcacion_codigo, controla_asistencia,
      direccion, ciudad_codigo, provincia_codigo, estado_civil, cargas_familiares, dependientes, telefono, email,
      whatsapp_consent
    } = profileData;
    
    // Validaciones
    if (!validarCedula(cedula)) {
      return res.status(400).json({ error: 'Cédula inválida' });
    }
    
    if (!nombres || !apellidos || !fecha_nacimiento || !sueldo_bruto_mensual || !fecha_ingreso) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }
    const ageInfo = validateEmployeeBirthdate(fecha_nacimiento);

    const normalizedRegion = normalizeFourteenthRegion(region_decimo_cuarto);
    if (!normalizedRegion) {
      return res.status(400).json({
        error: 'REGION_DECIMO_CUARTO_INVALIDA',
        message: 'Selecciona Costa/Galapagos o Sierra/Amazonia para calcular decimo cuarto.',
        correlationId: req.correlationId,
      });
    }
    const normalizedReserveFundMode = normalizeReserveFundMode(modalidad_fondo_reserva);
    if (!normalizedReserveFundMode) {
      return res.status(400).json({
        error: 'MODALIDAD_FONDO_RESERVA_INVALIDA',
        message: 'Selecciona si el fondo de reserva se paga mensual o se deposita al IESS.',
        correlationId: req.correlationId,
      });
    }
    const normalizedThirteenthMode = normalizeBenefitModality(modalidad_decimo_tercero);
    if (!normalizedThirteenthMode) {
      return res.status(400).json({
        error: 'MODALIDAD_DECIMO_TERCERO_INVALIDA',
        message: 'Selecciona si el decimo tercero se paga mensual o se acumula.',
        correlationId: req.correlationId,
      });
    }
    const normalizedFourteenthMode = normalizeBenefitModality(modalidad_decimo_cuarto);
    if (!normalizedFourteenthMode) {
      return res.status(400).json({
        error: 'MODALIDAD_DECIMO_CUARTO_INVALIDA',
        message: 'Selecciona si el decimo cuarto se paga mensual o se acumula.',
        correlationId: req.correlationId,
      });
    }
    const normalizedIessRelationType = normalizeIessRelationType(iess_tipo_relacion);
    if (!normalizedIessRelationType) {
      return res.status(400).json({
        error: 'IESS_TIPO_RELACION_INVALIDO',
        message: 'Selecciona un tipo de relacion IESS valido para el trabajador.',
        correlationId: req.correlationId,
      });
    }
    const normalizedIessAffiliated = normalizeIessAffiliated(iess_afiliado);
    const normalizedAttendanceControl = normalizeIessAffiliated(controla_asistencia);
    normalizeHomeReference(profileData);
    normalizeHomeCoordinates(profileData);

    const normalizedBankCode = await resolveEmployeeBankCode(tenantId, forma_pago, banco);
    const normalizedWorkShiftCode = await resolveConfiguredCode(tenantId, 'work_shifts', jornada_codigo, 'La jornada', 'EMPLEADO_JORNADA_INVALIDA');
    const normalizedOrgUnitCode = await resolveConfiguredCode(tenantId, 'organization_units', unidad_organizativa_codigo, 'La unidad organizativa', 'EMPLEADO_UNIDAD_INVALIDA');
    const normalizedWorkZoneCode = await resolveConfiguredCode(tenantId, 'work_zones', zona_marcacion_codigo, 'La zona de marcación', 'EMPLEADO_ZONA_INVALIDA');
    const positionAssignment = await resolveJobPositionAssignment(tenantId, {
      positionId: position_id || cargo_codigo,
      cargo,
      sueldoBrutoMensual: sueldo_bruto_mensual,
      unidadOrganizativaCodigo: normalizedOrgUnitCode,
    });
    const location = await resolveLocationCodes(provincia_codigo, ciudad_codigo);
    
    // Verificar que la cedula no exista dentro del tenant actual.
    const existe = await db.query(
      'SELECT id FROM empleados WHERE tenant_id = $1 AND cedula = $2',
      [tenantId, cedula]
    );
    
    if (existe.rows.length > 0) {
      return res.status(400).json({ error: 'La cedula ya esta registrada' });
    }
    
    // Cifrar cuenta bancaria con AES-256-GCM antes de persistir.
    let cuentaCifrada = null;
    if (cuenta_bancaria) {
      cuentaCifrada = encryptBankAccount(cuenta_bancaria);
    }
    
    // Crear empleado
    const result = await db.query(`
      INSERT INTO empleados (
        tenant_id, cedula, nombres, apellidos, fecha_nacimiento, position_id, cargo, departamento,
        unidad_organizativa_codigo, jornada_codigo, zona_marcacion_codigo, controla_asistencia,
        sueldo_bruto_mensual, jornada_horas_mensuales, gastos_personales_anuales,
        fecha_ingreso, tipo_contrato, iess_afiliado, iess_tipo_relacion,
        cuenta_bancaria_cifrada, banco, tipo_cuenta, forma_pago,
        region_decimo_cuarto, modalidad_fondo_reserva, modalidad_decimo_tercero, modalidad_decimo_cuarto,
        whatsapp_consent_at,
        direccion_domicilio, provincia_codigo, ciudad_codigo, ciudad_domicilio, provincia_domicilio,
        referencia_no_convive_nombres, referencia_no_convive_email, referencia_no_convive_telefono,
        domicilio_lat, domicilio_lng, estado_civil, cargas_familiares, telefono, email_personal
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42)
      RETURNING id, cedula, nombres, apellidos, fecha_nacimiento, position_id, cargo, sueldo_bruto_mensual,
        jornada_horas_mensuales, gastos_personales_anuales, fecha_ingreso, tipo_contrato, iess_afiliado, iess_tipo_relacion,
        banco, tipo_cuenta, forma_pago, region_decimo_cuarto, modalidad_fondo_reserva,
        modalidad_decimo_tercero, modalidad_decimo_cuarto, whatsapp_consent_at,
        unidad_organizativa_codigo, jornada_codigo, zona_marcacion_codigo, controla_asistencia,
        direccion_domicilio, provincia_codigo, ciudad_codigo, ciudad_domicilio, provincia_domicilio,
        referencia_no_convive_nombres, referencia_no_convive_email, referencia_no_convive_telefono,
        domicilio_lat, domicilio_lng, croquis_domicilio_url
    `, [
      tenantId, cedula, nombres, apellidos, fecha_nacimiento, positionAssignment.positionId, positionAssignment.cargo, departamento || positionAssignment.unidadOrganizativaNombre || '',
      positionAssignment.unidadOrganizativaCodigo, normalizedWorkShiftCode, normalizedWorkZoneCode, normalizedAttendanceControl,
      sueldo_bruto_mensual,
      jornada_horas_mensuales || null,
      gastos_personales_anuales || 0,
      fecha_ingreso, tipo_contrato || 'indefinido',
      normalizedIessAffiliated, normalizedIessRelationType,
      cuentaCifrada, normalizedBankCode, tipo_cuenta || '', forma_pago || 'transferencia', normalizedRegion,
      normalizedReserveFundMode, normalizedThirteenthMode, normalizedFourteenthMode,
      whatsapp_consent ? new Date() : null,
      direccion || '', location.provincia_codigo, location.ciudad_codigo, location.ciudad_nombre, location.provincia_nombre,
      profileData.referencia_no_convive_nombres || '',
      profileData.referencia_no_convive_email || '',
      profileData.referencia_no_convive_telefono || '',
      profileData.domicilio_lat,
      profileData.domicilio_lng,
      estado_civil || '', Number(cargas_familiares || 0), telefono || '', email || ''
    ]);
    
    const empleado = result.rows[0];
    empleado.edad = ageInfo.age;
    empleado.es_adulto_mayor = ageInfo.isOlderAdult;
    empleado.cuenta_bancaria_registrada = Boolean(cuentaCifrada);
    const croquis = await uploadEmployeeCroquis(tenantId, empleado.id, profileData);
    if (croquis) {
      await db.query(`
        UPDATE empleados
        SET croquis_domicilio_url = $1,
            croquis_domicilio_metadata = $2,
            updated_at = NOW()
        WHERE id = $3 AND tenant_id = $4
      `, [croquis.url, JSON.stringify(croquis.metadata), empleado.id, tenantId]);
      empleado.croquis_domicilio_url = croquis.url;
      empleado.croquis_domicilio_metadata = croquis.metadata;
    }
    await replaceEmployeeDependents(tenantId, empleado.id, dependientes, cargas_familiares);
    
    // Generar contrato automaticamente
    const tenant = await db.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
    if (tenant.rows.length > 0) {
      try {
        await generarContrato(empleado, tenant.rows[0], tipo_contrato || 'indefinido');
        logger.info({
          code: 'EMPLOYEE_CONTRACT_GENERATED',
          correlationId: req.correlationId || 'empleado-contrato',
          userId: req.usuarioId || null,
          tenantId,
          empleadoId: empleado.id,
        }, 'Contrato generado para empleado');
      } catch (err) {
        console.error('[CONTRATO] Error generando contrato:', err.message);
      }
    }
    
    res.status(201).json({ success: true, empleado });
  } catch (err) {
    console.error('[EMPLEADOS] Error creando empleado', {
      code: err.code || 'EMPLEADO_CREATE_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    res.status(err.statusCode || 500).json({ error: err.code || 'EMPLEADO_CREATE_ERROR', message: err.message, correlationId: req.correlationId });
  }
}

async function previewImportacion(req, res) {
  try {
    const preview = await previewEmployeeImport(req.body || {}, req.tenantId);
    return res.json({ success: true, preview, correlationId: req.correlationId });
  } catch (err) {
    console.error('[EMPLEADOS] Error prevalidando importacion', {
      code: err.code || 'EMPLOYEE_IMPORT_PREVIEW_ERROR',
      statusCode: 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(500).json({
      error: 'EMPLOYEE_IMPORT_PREVIEW_ERROR',
      message: 'No pudimos prevalidar la carga. Revisa el archivo e intenta nuevamente.',
      correlationId: req.correlationId,
    });
  }
}

async function descargarReporteMaestro(req, res) {
  try {
    const activeOnly = String(req.query.incluirDesvinculados || '').toLowerCase() !== 'true';
    const report = await buildEmployeeMasterReport({ tenantId: req.tenantId, activeOnly });
    await recordAudit({
      tenantId: req.tenantId,
      userId: req.usuarioId || req.usuario?.id || null,
      correlationId: req.correlationId,
      action: 'empleado.reporte_maestro.exportado',
      entity: 'empleados',
      newData: { total: report.total, activeOnly },
      metadata: { role: req.usuario?.rol || '', lopdpPurpose: 'gestion_laboral_nomina' },
      ipAddress: req.ip,
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);
    return res.send(report.buffer);
  } catch (err) {
    console.error('[EMPLEADOS] Error exportando listado maestro', {
      code: err.code || 'EMPLOYEE_MASTER_REPORT_ERROR',
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'EMPLOYEE_MASTER_REPORT_ERROR',
      message: err.message || 'No pudimos generar el listado de empleados.',
      correlationId: req.correlationId,
    });
  }
}

async function descargarPlantillaImportacion(_req, res) {
  const csv = buildEmployeeImportTemplateCsv();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="plantilla_carga_masiva_empleados_sknomina.csv"');
  return res.status(200).send(`\ufeff${csv}`);
}

async function confirmarImportacion(req, res) {
  try {
    const result = await commitEmployeeImport({
      tenantId: req.tenantId,
      userId: req.usuarioId,
      correlationId: req.correlationId,
      ipAddress: req.ip,
      payload: req.body || {},
    });

    if (!result.ok) {
      return res.status(result.status).json({
        success: false,
        error: 'EMPLOYEE_IMPORT_HAS_ERRORS',
        message: 'La carga contiene filas con errores. Corrige el archivo y vuelve a prevalidar.',
        preview: result.preview,
        correlationId: req.correlationId,
      });
    }

    return res.status(result.status).json({
      success: true,
      batchId: result.batchId,
      totalImported: result.totalImported,
      preview: result.preview,
      correlationId: req.correlationId,
    });
  } catch (err) {
    console.error('[EMPLEADOS] Error confirmando importacion', {
      code: err.code || 'EMPLOYEE_IMPORT_COMMIT_ERROR',
      statusCode: 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(500).json({
      error: 'EMPLOYEE_IMPORT_COMMIT_ERROR',
      message: 'No pudimos importar empleados. No se aplicaron filas parciales.',
      correlationId: req.correlationId,
    });
  }
}

async function listarLotesImportacion(req, res) {
  try {
    const batches = await listEmployeeImportBatches({
      tenantId: req.tenantId,
      limit: Number(req.query.limit || 10),
    });
    return res.json({ success: true, batches, correlationId: req.correlationId });
  } catch (err) {
    console.error('[EMPLEADOS] Error listando lotes de importacion', {
      code: err.code || 'EMPLOYEE_IMPORT_BATCH_LIST_ERROR',
      statusCode: 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(500).json({
      error: 'EMPLOYEE_IMPORT_BATCH_LIST_ERROR',
      message: 'No pudimos cargar los lotes recientes de importacion.',
      correlationId: req.correlationId,
    });
  }
}

async function revertirImportacion(req, res) {
  try {
    const result = await rollbackEmployeeImport({
      tenantId: req.tenantId,
      batchId: req.params.batchId,
      userId: req.usuarioId,
      correlationId: req.correlationId,
      ipAddress: req.ip,
    });

    if (!result.ok) {
      return res.status(result.status).json({
        success: false,
        error: result.error,
        message: result.message,
        blockers: result.blockers,
        correlationId: req.correlationId,
      });
    }

    return res.status(result.status).json({
      success: true,
      batchId: result.batchId,
      deletedEmployees: result.deletedEmployees,
      employees: result.employees || [],
      message: result.message,
      correlationId: req.correlationId,
    });
  } catch (err) {
    console.error('[EMPLEADOS] Error revirtiendo importacion', {
      code: err.code || 'EMPLOYEE_IMPORT_ROLLBACK_ERROR',
      statusCode: 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(500).json({
      error: 'EMPLOYEE_IMPORT_ROLLBACK_ERROR',
      message: 'No pudimos revertir el lote. No se aplicaron cambios parciales.',
      correlationId: req.correlationId,
    });
  }
}

async function actualizar(req, res) {
  try {
    const { id } = req.params;
    const { tenantId } = req;
    const updateColumns = {
      nombres: 'nombres',
      apellidos: 'apellidos',
      fecha_nacimiento: 'fecha_nacimiento',
      position_id: 'position_id',
      cargo: 'cargo',
      departamento: 'departamento',
      unidad_organizativa_codigo: 'unidad_organizativa_codigo',
      jornada_codigo: 'jornada_codigo',
      zona_marcacion_codigo: 'zona_marcacion_codigo',
      controla_asistencia: 'controla_asistencia',
      sueldo_bruto_mensual: 'sueldo_bruto_mensual',
      jornada_horas_mensuales: 'jornada_horas_mensuales',
      gastos_personales_anuales: 'gastos_personales_anuales',
      fecha_ingreso: 'fecha_ingreso',
      tipo_contrato: 'tipo_contrato',
      iess_afiliado: 'iess_afiliado',
      iess_tipo_relacion: 'iess_tipo_relacion',
      banco: 'banco',
      tipo_cuenta: 'tipo_cuenta',
      forma_pago: 'forma_pago',
      region_decimo_cuarto: 'region_decimo_cuarto',
      modalidad_fondo_reserva: 'modalidad_fondo_reserva',
      modalidad_decimo_tercero: 'modalidad_decimo_tercero',
      modalidad_decimo_cuarto: 'modalidad_decimo_cuarto',
      whatsapp_consent_at: 'whatsapp_consent_at',
      direccion_domicilio: 'direccion_domicilio',
      provincia_codigo: 'provincia_codigo',
      ciudad_codigo: 'ciudad_codigo',
      ciudad_domicilio: 'ciudad_domicilio',
      provincia_domicilio: 'provincia_domicilio',
      referencia_no_convive_nombres: 'referencia_no_convive_nombres',
      referencia_no_convive_email: 'referencia_no_convive_email',
      referencia_no_convive_telefono: 'referencia_no_convive_telefono',
      domicilio_lat: 'domicilio_lat',
      domicilio_lng: 'domicilio_lng',
      estado_civil: 'estado_civil',
      cargas_familiares: 'cargas_familiares',
      telefono: 'telefono',
      email_personal: 'email_personal',
    };
    const body = { ...(req.body || {}) };
    if (Object.prototype.hasOwnProperty.call(body, 'cuenta_bancaria')) {
      body.cuenta_bancaria_cifrada = body.cuenta_bancaria ? encryptBankAccount(body.cuenta_bancaria) : null;
      delete body.cuenta_bancaria;
      updateColumns.cuenta_bancaria_cifrada = 'cuenta_bancaria_cifrada';
    }
    if (Object.prototype.hasOwnProperty.call(body, 'fecha_nacimiento')) {
      validateEmployeeBirthdate(body.fecha_nacimiento);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'region_decimo_cuarto')) {
      body.region_decimo_cuarto = normalizeFourteenthRegion(body.region_decimo_cuarto);
      if (!body.region_decimo_cuarto) {
        return res.status(400).json({
          error: 'REGION_DECIMO_CUARTO_INVALIDA',
          message: 'Selecciona Costa/Galapagos o Sierra/Amazonia para calcular decimo cuarto.',
          correlationId: req.correlationId,
        });
      }
    }
    if (Object.prototype.hasOwnProperty.call(body, 'modalidad_fondo_reserva')) {
      body.modalidad_fondo_reserva = normalizeReserveFundMode(body.modalidad_fondo_reserva);
      if (!body.modalidad_fondo_reserva) {
        return res.status(400).json({
          error: 'MODALIDAD_FONDO_RESERVA_INVALIDA',
          message: 'Selecciona si el fondo de reserva se paga mensual o se deposita al IESS.',
          correlationId: req.correlationId,
        });
      }
    }
    if (Object.prototype.hasOwnProperty.call(body, 'modalidad_decimo_tercero')) {
      body.modalidad_decimo_tercero = normalizeBenefitModality(body.modalidad_decimo_tercero);
      if (!body.modalidad_decimo_tercero) {
        return res.status(400).json({
          error: 'MODALIDAD_DECIMO_TERCERO_INVALIDA',
          message: 'Selecciona si el decimo tercero se paga mensual o se acumula.',
          correlationId: req.correlationId,
        });
      }
    }
    if (Object.prototype.hasOwnProperty.call(body, 'modalidad_decimo_cuarto')) {
      body.modalidad_decimo_cuarto = normalizeBenefitModality(body.modalidad_decimo_cuarto);
      if (!body.modalidad_decimo_cuarto) {
        return res.status(400).json({
          error: 'MODALIDAD_DECIMO_CUARTO_INVALIDA',
          message: 'Selecciona si el decimo cuarto se paga mensual o se acumula.',
          correlationId: req.correlationId,
        });
      }
    }
    if (Object.prototype.hasOwnProperty.call(body, 'iess_afiliado')) {
      body.iess_afiliado = normalizeIessAffiliated(body.iess_afiliado);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'controla_asistencia')) {
      body.controla_asistencia = normalizeIessAffiliated(body.controla_asistencia);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'iess_tipo_relacion')) {
      body.iess_tipo_relacion = normalizeIessRelationType(body.iess_tipo_relacion);
      if (!body.iess_tipo_relacion) {
        return res.status(400).json({
          error: 'IESS_TIPO_RELACION_INVALIDO',
          message: 'Selecciona un tipo de relacion IESS valido para el trabajador.',
          correlationId: req.correlationId,
        });
      }
    }
    if (Object.prototype.hasOwnProperty.call(body, 'whatsapp_consent')) {
      body.whatsapp_consent_at = body.whatsapp_consent ? new Date() : null;
      delete body.whatsapp_consent;
    }
    normalizeHomeReference(body);
    normalizeHomeCoordinates(body);
    if (Object.prototype.hasOwnProperty.call(body, 'banco') || Object.prototype.hasOwnProperty.call(body, 'forma_pago')) {
      body.banco = await resolveEmployeeBankCode(
        tenantId,
        body.forma_pago || req.body.forma_pago,
        Object.prototype.hasOwnProperty.call(body, 'banco') ? body.banco : ''
      );
    }
    if (Object.prototype.hasOwnProperty.call(body, 'jornada_codigo')) {
      body.jornada_codigo = await resolveConfiguredCode(tenantId, 'work_shifts', body.jornada_codigo, 'La jornada', 'EMPLEADO_JORNADA_INVALIDA');
    }
    if (Object.prototype.hasOwnProperty.call(body, 'unidad_organizativa_codigo')) {
      body.unidad_organizativa_codigo = await resolveConfiguredCode(tenantId, 'organization_units', body.unidad_organizativa_codigo, 'La unidad organizativa', 'EMPLEADO_UNIDAD_INVALIDA');
    }
    if (Object.prototype.hasOwnProperty.call(body, 'zona_marcacion_codigo')) {
      body.zona_marcacion_codigo = await resolveConfiguredCode(tenantId, 'work_zones', body.zona_marcacion_codigo, 'La zona de marcación', 'EMPLEADO_ZONA_INVALIDA');
    }
    const needsPositionValidation = [
      'position_id',
      'cargo_codigo',
      'cargo',
      'sueldo_bruto_mensual',
      'unidad_organizativa_codigo',
    ].some((field) => Object.prototype.hasOwnProperty.call(body, field));
    if (needsPositionValidation) {
      const currentEmployee = await db.query(`
        SELECT id, position_id, cargo, sueldo_bruto_mensual, unidad_organizativa_codigo
        FROM empleados
        WHERE id = $1 AND tenant_id = $2
        LIMIT 1
      `, [id, tenantId]);

      if (currentEmployee.rows.length === 0) {
        return res.status(404).json({ error: 'Empleado no encontrado' });
      }

      const current = currentEmployee.rows[0];
      const assignment = await resolveJobPositionAssignment(tenantId, {
        positionId: body.position_id || body.cargo_codigo || current.position_id,
        cargo: body.cargo,
        sueldoBrutoMensual: Object.prototype.hasOwnProperty.call(body, 'sueldo_bruto_mensual')
          ? body.sueldo_bruto_mensual
          : current.sueldo_bruto_mensual,
        unidadOrganizativaCodigo: Object.prototype.hasOwnProperty.call(body, 'unidad_organizativa_codigo')
          ? body.unidad_organizativa_codigo
          : current.unidad_organizativa_codigo,
      });

      body.position_id = assignment.positionId;
      body.cargo = assignment.cargo;
      body.unidad_organizativa_codigo = assignment.unidadOrganizativaCodigo;
      delete body.cargo_codigo;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'provincia_codigo') || Object.prototype.hasOwnProperty.call(body, 'ciudad_codigo')) {
      const location = await resolveLocationCodes(body.provincia_codigo, body.ciudad_codigo);
      body.provincia_codigo = location.provincia_codigo;
      body.ciudad_codigo = location.ciudad_codigo;
      body.provincia_domicilio = location.provincia_nombre;
      body.ciudad_domicilio = location.ciudad_nombre;
    }
    if (body.croquis_domicilio_base64) {
      const existingEmployee = await db.query(
        'SELECT id FROM empleados WHERE id = $1 AND tenant_id = $2 LIMIT 1',
        [id, tenantId]
      );
      if (existingEmployee.rows.length === 0) {
        return res.status(404).json({ error: 'Empleado no encontrado' });
      }
      const croquis = await uploadEmployeeCroquis(tenantId, id, body);
      body.croquis_domicilio_url = croquis.url;
      body.croquis_domicilio_metadata = JSON.stringify(croquis.metadata);
      updateColumns.croquis_domicilio_url = 'croquis_domicilio_url';
      updateColumns.croquis_domicilio_metadata = 'croquis_domicilio_metadata';
    }
    delete body.croquis_domicilio_base64;
    delete body.croquis_domicilio_nombre;
    delete body.croquis_domicilio_mime_type;
    if (Object.prototype.hasOwnProperty.call(body, 'cargas_familiares')) {
      body.cargas_familiares = Number(body.cargas_familiares || 0);
    }
    const shouldReplaceDependents = Object.prototype.hasOwnProperty.call(body, 'dependientes');
    const dependientes = body.dependientes;
    delete body.dependientes;
    const entries = Object.entries(body).filter(([key]) => (
      Object.prototype.hasOwnProperty.call(updateColumns, key)
    ));
    const fields = entries.map(([key], i) => `${updateColumns[key]} = $${i + 1}`).join(', ');
    const values = entries.map(([, value]) => value);
    
    if (values.length === 0 && !shouldReplaceDependents) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    let result = { rows: [{ id }] };
    if (values.length > 0) {
      result = await db.query(`
        UPDATE empleados SET ${fields}, updated_at = NOW()
        WHERE id = $${values.length + 1} AND tenant_id = $${values.length + 2}
        RETURNING id, nombres, apellidos, cargo, sueldo_bruto_mensual,
          banco, tipo_cuenta, forma_pago,
          referencia_no_convive_nombres, referencia_no_convive_email, referencia_no_convive_telefono,
          domicilio_lat, domicilio_lng, croquis_domicilio_url,
          cuenta_bancaria_cifrada IS NOT NULL AS cuenta_bancaria_registrada
      `, [...values, id, tenantId]);
    } else {
      result = await db.query('SELECT id FROM empleados WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
    }
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    if (shouldReplaceDependents) {
      await replaceEmployeeDependents(tenantId, id, dependientes, body.cargas_familiares ?? req.body.cargas_familiares);
    }

    res.json({ success: true, empleado: result.rows[0] });
  } catch (err) {
    console.error('[EMPLEADOS] Error actualizando empleado', {
      code: err.code || 'EMPLEADO_UPDATE_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    res.status(err.statusCode || 500).json({ error: err.code || 'EMPLEADO_UPDATE_ERROR', message: err.message, correlationId: req.correlationId });
  }
}

async function terminar(req, res) {
  try {
    const { id } = req.params;
    const { tenantId } = req;
    const { causa, fecha_salida } = req.body;
    
    if (!causa) {
      return res.status(400).json({
        error: 'TERMINACION_CAUSAL_REQUERIDA',
        message: 'Causa de terminacion requerida',
        correlationId: req.correlationId,
      });
    }
    
    // Calcular liquidacion
    const { calcularLiquidacion } = require('../services/liquidacionService');
    const liquidacion = await calcularLiquidacion(id, tenantId, causa, {
      fechaSalida: fecha_salida,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
    });
    
    res.json({ success: true, liquidacion, correlationId: req.correlationId });
  } catch (err) {
    console.error('[EMPLEADOS] Error terminando relacion laboral', {
      code: err.code || 'EMPLEADO_TERMINACION_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    res.status(err.statusCode || 500).json({
      error: err.code || 'EMPLEADO_TERMINACION_ERROR',
      message: err.message,
      details: err.details || null,
      correlationId: req.correlationId,
    });
  }
}

async function listarCausalesTerminacion(req, res) {
  try {
    res.json({
      success: true,
      causas: listTerminationCauses(),
      correlationId: req.correlationId,
    });
  } catch (err) {
    console.error('[EMPLEADOS] Error listando causales de terminacion', {
      code: err.code || 'TERMINACION_CAUSALES_LIST_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    res.status(err.statusCode || 500).json({
      error: err.code || 'TERMINACION_CAUSALES_LIST_ERROR',
      message: err.message,
      correlationId: req.correlationId,
    });
  }
}

async function eliminar(req, res) {
  try {
    const { id } = req.params;
    const { tenantId } = req;

    const finalPayroll = await db.query(`
      SELECT
        COUNT(*)::int AS total,
        MIN(anio * 100 + mes)::int AS primer_periodo,
        MAX(anio * 100 + mes)::int AS ultimo_periodo
      FROM nominas
      WHERE tenant_id = $1
        AND empleado_id = $2
        AND estado IN ('cerrada', 'pagada')
    `, [tenantId, id]);

    const finalPayrollCount = Number(finalPayroll.rows[0]?.total || 0);
    if (finalPayrollCount > 0) {
      return res.status(409).json({
        error: 'EMPLEADO_ELIMINACION_BLOQUEADA_NOMINA_CERRADA',
        message: 'No se puede eliminar la ficha porque el trabajador ya tiene roles de nomina cerrados o pagados.',
        details: {
          totalRolesFinales: finalPayrollCount,
          primerPeriodo: finalPayroll.rows[0]?.primer_periodo || null,
          ultimoPeriodo: finalPayroll.rows[0]?.ultimo_periodo || null,
        },
        correlationId: req.correlationId,
      });
    }

    const result = await db.query(`
      UPDATE empleados
      SET activo = false, updated_at = NOW()
      WHERE tenant_id = $1
        AND id = $2
        AND activo = true
      RETURNING id, cedula, nombres, apellidos, activo
    `, [tenantId, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'EMPLEADO_NO_ENCONTRADO',
        message: 'Empleado no encontrado o ya eliminado.',
        correlationId: req.correlationId,
      });
    }

    await recordAudit({
      tenantId,
      userId: req.usuarioId || req.usuario?.id || null,
      correlationId: req.correlationId || 'empleado-delete',
      action: 'empleado.eliminado',
      entity: 'empleados',
      entityId: id,
      newData: {
        activo: false,
        deletionMode: 'logical',
        reason: 'sin_nomina_cerrada',
      },
      metadata: {
        role: req.usuario?.rol || '',
        finalPayrollCount,
        lopdpPurpose: 'gestion_laboral_nomina',
      },
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      empleado: result.rows[0],
      message: 'Ficha eliminada de la base activa.',
      deletionMode: 'logical',
      correlationId: req.correlationId,
    });
  } catch (err) {
    console.error('[EMPLEADOS] Error eliminando ficha laboral', {
      code: err.code || 'EMPLEADO_DELETE_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'EMPLEADO_DELETE_ERROR',
      message: err.message || 'No pudimos eliminar la ficha laboral.',
      correlationId: req.correlationId,
    });
  }
}

module.exports = {
  listar,
  descargarReporteMaestro,
  obtener,
  historial,
  crear,
  actualizar,
  eliminar,
  terminar,
  listarCausalesTerminacion,
  descargarPlantillaImportacion,
  previewImportacion,
  confirmarImportacion,
  listarLotesImportacion,
  revertirImportacion,
};

