// ============================================================
// SKNOMINA - Seed comercial DCEN26
// ============================================================
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const correlationId = process.env.CORRELATION_ID || `dcen26-demo-${Date.now()}`;
const demoCode = 'DCEN26';
const demoDomain = process.env.DEMO_EMAIL_DOMAIN || 'demo.sknomina.local';
const demoRuc = process.env.DEMO_TENANT_RUC || '1799999999001';
const demoPlanId = 'demo_comercial_2026';
const credentialsPath = path.join(__dirname, '..', '.demo-credentials.json');
const demoBankKey = process.env.DEMO_BANK_ACCOUNT_ENCRYPTION_KEY || 'd'.repeat(64);

function isValidBankKey(value) {
  return /^[a-fA-F0-9]{64}$/.test(String(value || '')) || Buffer.from(String(value || ''), 'utf8').length === 32;
}

if (!isValidBankKey(process.env.BANK_ACCOUNT_ENCRYPTION_KEY)) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[DCEN26] Clave bancaria invalida en produccion', {
      code: 'DCEN26_BANK_KEY_INVALID',
      statusCode: 500,
      correlationId,
      userId: null,
    });
    process.exit(1);
  }
  process.env.BANK_ACCOUNT_ENCRYPTION_KEY = demoBankKey;
}

process.env.REQUIRE_VALIDATED_LEGAL_PARAMETERS = 'false';

const db = require('../src/config/database');
const { encryptBankAccount } = require('../src/services/bankAccountCrypto');
const { calcularNominaMensual } = require('../src/services/calculoNominaService');
const { loadMandatoryLegalParameters } = require('../src/services/configurationService');

function toJson(value) {
  return JSON.stringify(value || {});
}

function demoMetadata(extra = {}) {
  return {
    demo: true,
    demoCode,
    source: 'seed-demo-commercial',
    generatedAt: new Date().toISOString(),
    ...extra,
  };
}

function validateDemoTenant(row) {
  if (!row) return;
  const config = row.configuracion || {};
  if (config.demo !== true || config.demoCode !== demoCode) {
    const err = new Error('Existe un tenant con RUC demo sin bandera demo. Reset bloqueado para evitar perdida de datos.');
    err.code = 'DCEN26_TENANT_NOT_DEMO';
    err.statusCode = 409;
    throw err;
  }
}

function cedulaCheckDigit(firstNineDigits) {
  const coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  const sum = String(firstNineDigits).split('').reduce((total, digit, index) => {
    let value = Number(digit) * coefficients[index];
    if (value >= 10) value -= 9;
    return total + value;
  }, 0);
  const residue = sum % 10;
  return residue === 0 ? 0 : 10 - residue;
}

function generateCedula(provinceCode, sequence) {
  const province = String(provinceCode).padStart(2, '0');
  const serial = String(sequence).padStart(7, '0').slice(-7);
  const firstNine = `${province}${serial}`;
  return `${firstNine}${cedulaCheckDigit(firstNine)}`;
}

function buildPassword(role) {
  const envName = `DEMO_${role.toUpperCase()}_PASSWORD`;
  if (process.env[envName]) return { value: process.env[envName], generated: false };
  if (process.env.DEMO_SHARED_PASSWORD) return { value: process.env.DEMO_SHARED_PASSWORD, generated: false };
  return { value: `${crypto.randomBytes(9).toString('base64url')}A1!`, generated: true };
}

function localDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function todayInEcuador() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function localTimestamp(date, time) {
  const [hour, minute] = time.split(':').map(Number);
  const utcHour = hour + 5;
  return `${date}T${String(utcHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`;
}

function dayName(date) {
  return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getUTCDay()];
}

function workDatesForMonth(year, month, workDays) {
  const dates = [];
  const date = new Date(Date.UTC(year, month - 1, 1));
  while (date.getUTCMonth() === month - 1) {
    if (workDays.includes(dayName(date))) {
      dates.push(localDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()));
    }
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return dates;
}

function shiftedCoordinate(base, offset) {
  return Number((Number(base) + offset).toFixed(7));
}

async function getUserIdsForTenant(client, tenantId) {
  const result = await client.query('SELECT id FROM usuarios WHERE tenant_id = $1', [tenantId]);
  return result.rows.map((row) => row.id);
}

async function resetDemoTenant(client) {
  const existing = await client.query(`
    SELECT id, ruc, configuracion
    FROM tenants
    WHERE ruc = $1
       OR configuracion->>'demoCode' = $2
  `, [demoRuc, demoCode]);

  for (const row of existing.rows) {
    validateDemoTenant(row);
    const userIds = await getUserIdsForTenant(client, row.id);
    if (userIds.length > 0) {
      await client.query('DELETE FROM sesiones WHERE usuario_id = ANY($1::uuid[])', [userIds]);
      await client.query('DELETE FROM password_reset_tokens WHERE usuario_id = ANY($1::uuid[])', [userIds]);
      await client.query('DELETE FROM email_verification_tokens WHERE usuario_id = ANY($1::uuid[])', [userIds]);
    }

    const tenantTables = [
      'communication_events',
      'api_idempotency_keys',
      'api_clients',
      'route_exceptions',
      'informe_movilizacion',
      'route_visit_marks',
      'route_stops',
      'route_days',
      'route_sites',
      'employee_app_links',
      'employee_app_invites',
      'beneficios_empleados',
      'acta_entrega_equipos',
      'documentos_legales',
      'marcaciones',
      'novedades_asistencia',
      'novelty_batches',
      'payroll_calculation_lines',
      'nominas',
      'payroll_calculation_batches',
      'payroll_periods',
      'payroll_accounting_mappings',
      'employee_family_dependents',
      'empleados',
      'employee_import_batches',
      'job_positions',
      'organization_units',
      'work_zones',
      'work_shifts',
      'novelty_type_configs',
      'legal_parameter_versions',
      'parametros_legales',
      'bank_field_mappings',
      'perfiles_bancarios',
      'configuration_catalogs',
      'tenant_onboarding_steps',
      'support_incidents',
      'transacciones_pago',
      'metodos_pago',
      'suscripciones',
      'audit_logs',
    ];

    for (const table of tenantTables) {
      await client.query(`DELETE FROM ${table} WHERE tenant_id = $1`, [row.id]);
    }
    await client.query('DELETE FROM usuarios WHERE tenant_id = $1', [row.id]);
    await client.query('DELETE FROM tenants WHERE id = $1', [row.id]);
  }

  return existing.rows.length;
}

async function insertCommercialPlan(client) {
  await client.query(`
    INSERT INTO planes_comerciales (
      id, nombre, descripcion, precio_mensual_centavos, moneda,
      empleados_max, empresas_max, usuarios_max, archivos_bancarios,
      reportes_avanzados, soporte, publico, activo, orden, metadata
    )
    VALUES ($1,$2,$3,$4,'USD',100,1,8,true,true,'prioritario',false,true,90,$5)
    ON CONFLICT (id) DO UPDATE SET
      nombre = EXCLUDED.nombre,
      descripcion = EXCLUDED.descripcion,
      empleados_max = EXCLUDED.empleados_max,
      usuarios_max = EXCLUDED.usuarios_max,
      archivos_bancarios = true,
      reportes_avanzados = true,
      soporte = EXCLUDED.soporte,
      activo = true,
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
  `, [
    demoPlanId,
    'Demo Comercial SKNOMINA',
    'Plan interno para presentaciones comerciales con datos ficticios.',
    0,
    toJson(demoMetadata({ commercialDemo: true })),
  ]);
}

async function insertTenant(client) {
  const result = await client.query(`
    INSERT INTO tenants (
      ruc, razon_social, nombre_comercial, activo, configuracion,
      ubicacion_lat, ubicacion_lng, radio_perimetro_metros
    )
    VALUES ($1,$2,$3,true,$4,$5,$6,250)
    RETURNING id
  `, [
    demoRuc,
    'EMPRESA DEMO SKNOMINA S.A.',
    'Demo SKNOMINA',
    toJson(demoMetadata({
      codigo: 'EMPRESA_DEMO_COMERCIAL',
      ambiente: 'demo_comercial',
      horario_laboral: { inicio: '08:00', fin: '17:00' },
      tolerancia_minutos_tardia: 10,
      radio_permitido_metros: 250,
      advertencia: 'Datos ficticios para presentacion comercial.',
    })),
    '-0.1806530',
    '-78.4678340',
  ]);
  return result.rows[0].id;
}

async function insertSubscription(client, tenantId) {
  await client.query(`
    INSERT INTO suscripciones (tenant_id, plan_id, estado, inicio_en, vence_en, renovacion_automatica, metadata)
    VALUES ($1,$2,'trial','2026-01-01T00:00:00Z','2026-12-31T23:59:59Z',false,$3)
    ON CONFLICT (tenant_id) DO UPDATE SET
      plan_id = EXCLUDED.plan_id,
      estado = EXCLUDED.estado,
      vence_en = EXCLUDED.vence_en,
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
  `, [tenantId, demoPlanId, toJson(demoMetadata({ trial: 'demo_comercial_2026' }))]);
}

async function upsertTenantUser(client, tenantId, user) {
  const passwordHash = await bcrypt.hash(user.password, 10);
  const result = await client.query(`
    INSERT INTO usuarios (tenant_id, email, password_hash, rol, nombres, apellidos, activo, email_verificado_en)
    VALUES ($1,$2,$3,$4,$5,$6,true,NOW())
    ON CONFLICT (tenant_id, email) DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      rol = EXCLUDED.rol,
      nombres = EXCLUDED.nombres,
      apellidos = EXCLUDED.apellidos,
      activo = true,
      email_verificado_en = NOW(),
      updated_at = NOW()
    RETURNING id, email, rol, nombres, apellidos
  `, [tenantId, user.email, passwordHash, user.role, user.names, user.lastNames]);
  return result.rows[0];
}

async function createUsers(client, tenantId) {
  const definitions = [
    { key: 'owner', role: 'owner', email: `owner@${demoDomain}`, names: 'Owner', lastNames: 'Demo Comercial' },
    { key: 'rrhh', role: 'admin_rrhh', email: `rrhh@${demoDomain}`, names: 'RRHH', lastNames: 'Demo Comercial' },
    { key: 'supervisor', role: 'supervisor', email: `supervisor@${demoDomain}`, names: 'Supervisor', lastNames: 'Quito Guayaquil' },
    { key: 'employee', role: 'empleado', email: `empleado@${demoDomain}`, names: 'Empleado', lastNames: 'Autoservicio Demo' },
  ];
  const credentials = {};
  const users = {};

  for (const definition of definitions) {
    const password = buildPassword(definition.key);
    const user = await upsertTenantUser(client, tenantId, { ...definition, password: password.value });
    credentials[definition.key] = {
      email: definition.email,
      password: password.value,
      generated: password.generated,
      role: definition.role,
    };
    users[definition.key] = user;
  }

  return { credentials, users };
}

async function seedLegalParameters(tenantId, ownerUser) {
  await db.runWithTenantContext({ tenantId, userId: ownerUser.id }, async () => {
    await loadMandatoryLegalParameters(2026, {
      id: ownerUser.id,
      tenantId,
      rol: 'owner',
    }, { correlationId, ipAddress: '127.0.0.1' });
  });
}

async function insertBankProfile(client, tenantId) {
  const profile = await client.query(`
    INSERT INTO perfiles_bancarios (
      tenant_id, banco_codigo, banco_nombre, delimiter, encoding, date_format,
      include_header, include_trailer, field_map, activo
    )
    VALUES ($1,'DEMO','Banco Demo SKNOMINA',';','utf8','YYYYMMDD',true,true,$2,true)
    RETURNING id
  `, [tenantId, toJson({
    profile: 'DEMO',
    bankCode: '9999',
    fields: ['tipoRegistro', 'bancoCodigo', 'cuenta', 'cedula', 'nombre', 'concepto', 'fechaOperacion', 'importe', 'referencia'],
    accountLength: 10,
    lineEnding: '\n',
    amountDecimals: 2,
    decimalSeparator: '.',
    demo: true,
    demoCode,
  })]);

  const mappings = [
    ['tipoRegistro', 'TIPO_REGISTRO', 1, 'fixed:1'],
    ['bancoCodigo', 'CODIGO_BANCO', 2, 'leftPad:4'],
    ['cuenta', 'CUENTA_BENEFICIARIO', 3, 'leftPad:10'],
    ['cedula', 'IDENTIFICACION', 4, 'digits:10'],
    ['nombre', 'BENEFICIARIO', 5, 'uppercase:40'],
    ['concepto', 'CONCEPTO', 6, 'text:40'],
    ['fechaOperacion', 'FECHA_OPERACION', 7, 'date:YYYYMMDD'],
    ['importe', 'VALOR', 8, 'amount:2'],
    ['referencia', 'REFERENCIA', 9, 'text:20'],
  ];

  for (const [canonical, bankName, position, formatter] of mappings) {
    await client.query(`
      INSERT INTO bank_field_mappings (
        tenant_id, bank_profile_id, banco_codigo, canonical_field,
        bank_field_name, position, formatter, required, metadata
      )
      VALUES ($1,$2,'DEMO',$3,$4,$5,$6,true,$7)
    `, [tenantId, profile.rows[0].id, canonical, bankName, position, formatter, toJson(demoMetadata())]);
  }

  const pacifico = await client.query(`
    INSERT INTO perfiles_bancarios (
      tenant_id, banco_codigo, banco_nombre, delimiter, encoding, date_format,
      include_header, include_trailer, field_map, activo
    )
    VALUES ($1,'PACIFICO','Banco Pacifico',';','latin1','YYYYMMDD',false,true,$2,true)
    RETURNING id
  `, [tenantId, toJson({
    profile: 'PACIFICO',
    layout: 'pacifico_interbank_immediate',
    bankCode: '2013',
    fields: [
      'tipoRegistro',
      'tipoIdentificacion',
      'cedula',
      'nombre',
      'bancoCodigo',
      'tipoCuenta',
      'cuenta',
      'importe',
      'concepto',
      'referencia',
    ],
    accountLength: 10,
    lineEnding: '\r\n',
    amountDecimals: 2,
    decimalSeparator: '.',
    sourceDocument: 'docs2/Formato_para_transferencias_interbancarias_inmediatas.pdf',
    demo: true,
    demoCode,
  })]);

  const pacificoMappings = [
    ['tipoRegistro', 'TIPO_REGISTRO', 1, 'fixed:D'],
    ['tipoIdentificacion', 'TIPO_IDENTIFICACION', 2, 'C/R/P'],
    ['cedula', 'IDENTIFICACION', 3, 'digits:10|13'],
    ['nombre', 'BENEFICIARIO', 4, 'uppercase:60'],
    ['bancoCodigo', 'BANCO_DESTINO', 5, 'leftPad:4'],
    ['tipoCuenta', 'TIPO_CUENTA', 6, 'AH|CC'],
    ['cuenta', 'CUENTA_BENEFICIARIO', 7, 'leftPad:10'],
    ['importe', 'VALOR', 8, 'amount:2'],
    ['concepto', 'CONCEPTO', 9, 'text:30'],
    ['referencia', 'REFERENCIA', 10, 'text:20'],
  ];

  for (const [canonical, bankName, position, formatter] of pacificoMappings) {
    await client.query(`
      INSERT INTO bank_field_mappings (
        tenant_id, bank_profile_id, banco_codigo, canonical_field,
        bank_field_name, position, formatter, required, metadata
      )
      VALUES ($1,$2,'PACIFICO',$3,$4,$5,$6,true,$7)
    `, [tenantId, pacifico.rows[0].id, canonical, bankName, position, formatter, toJson(demoMetadata({
      sourceDocument: 'docs2/Formato_para_transferencias_interbancarias_inmediatas.pdf',
    }))]);
  }
}

async function insertNoveltyTypes(client, tenantId, ownerId) {
  const rows = [
    ['HORA_EXTRA_50', 'Hora extra 50%', 'ingreso', 'ingreso', true, true, true],
    ['HORA_EXTRA_100', 'Hora extra 100%', 'ingreso', 'ingreso', true, true, true],
    ['ATRASO', 'Atraso', 'descuento', 'descuento', false, false, false],
    ['FALTA', 'Falta injustificada', 'ausencia', 'descuento', false, false, false],
    ['PERMISO_REMUNERADO', 'Permiso remunerado', 'permiso', 'informativo', false, false, true],
    ['BONO_DESEMPENO', 'Bono de desempeno', 'ingreso', 'ingreso', true, true, true],
  ];
  for (const row of rows) {
    await client.query(`
      INSERT INTO novelty_type_configs (
        tenant_id, code, name, category, payroll_impact, affects_iess,
        affects_income_tax, affects_bank_file, requires_evidence,
        approval_flow, applicability, status, valid_from, created_by, approved_by, approved_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'activo','2026-01-01',$12,$12,NOW())
    `, [
      tenantId,
      row[0],
      row[1],
      row[2],
      row[3],
      row[4],
      row[5],
      row[6],
      row[6],
      toJson({ requiredRoles: ['admin_rrhh', 'owner'], demo: true }),
      toJson(demoMetadata({ payrollDemo: true })),
      ownerId,
    ]);
  }
}

async function insertWorkShifts(client, tenantId, ownerId) {
  const shifts = [
    {
      code: 'UIO_LV_8H',
      name: 'Quito lunes a viernes 8 horas',
      workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      start: '08:00',
      end: '17:00',
    },
    {
      code: 'GYE_MS_8H',
      name: 'Guayaquil martes a sabado 8 horas',
      workDays: ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      start: '09:00',
      end: '18:00',
    },
  ];
  const result = {};
  for (const shift of shifts) {
    const row = await client.query(`
      INSERT INTO work_shifts (
        tenant_id, code, name, shift_type, weekly_hours, start_time, end_time,
        break_minutes, tolerance_minutes, overtime_rules, calendar_rules,
        status, valid_from, created_by
      )
      VALUES ($1,$2,$3,'ordinaria',40,$4,$5,60,10,$6,$7,'activo','2026-01-01',$8)
      RETURNING *
    `, [
      tenantId,
      shift.code,
      shift.name,
      shift.start,
      shift.end,
      toJson({ overtime50AfterDailyHours: 8, overtime100Holidays: true, demo: true }),
      toJson({
        workDays: shift.workDays,
        requiresMdtAuthorizationReview: true,
        legalNotice: 'Jornada demo: validar autorizaciones MDT antes de uso productivo.',
        demo: true,
      }),
      ownerId,
    ]);
    result[shift.code] = row.rows[0];
  }
  return result;
}

async function insertWorkZones(client, tenantId, ownerId) {
  const zones = [
    ['UIO_CENTRO_NORTE', 'Quito Centro Norte Demo', '-0.1806530', '-78.4678340'],
    ['GYE_CENTRO', 'Guayaquil Centro Demo', '-2.1709980', '-79.9223590'],
  ];
  const result = {};
  for (const zone of zones) {
    const row = await client.query(`
      INSERT INTO work_zones (
        tenant_id, code, name, latitude, longitude, radius_meters,
        min_accuracy_meters, requires_photo, allows_offline, status,
        valid_from, rules, created_by
      )
      VALUES ($1,$2,$3,$4,$5,250,80,false,false,'activo','2026-01-01',$6,$7)
      RETURNING *
    `, [tenantId, zone[0], zone[1], zone[2], zone[3], toJson(demoMetadata({ publicReference: true })), ownerId]);
    result[zone[0]] = row.rows[0];
  }
  return result;
}

async function insertOrganizationUnits(client, tenantId, users, zones, shifts) {
  const units = [
    ['UIO_MATRIZ', 'sucursal', 'Matriz Quito', 'CC-UIO', zones.UIO_CENTRO_NORTE.id, shifts.UIO_LV_8H.id, 'UIO_LV_8H'],
    ['UIO_ADMIN', 'departamento', 'Administracion Quito', 'CC-ADM-UIO', zones.UIO_CENTRO_NORTE.id, shifts.UIO_LV_8H.id, 'UIO_LV_8H'],
    ['UIO_OPER', 'area', 'Operacion Quito', 'CC-OPE-UIO', zones.UIO_CENTRO_NORTE.id, shifts.UIO_LV_8H.id, 'UIO_LV_8H'],
    ['GYE_SUCURSAL', 'sucursal', 'Sucursal Guayaquil', 'CC-GYE', zones.GYE_CENTRO.id, shifts.GYE_MS_8H.id, 'GYE_MS_8H'],
    ['GYE_COMERCIAL', 'area', 'Comercial Guayaquil', 'CC-COM-GYE', zones.GYE_CENTRO.id, shifts.GYE_MS_8H.id, 'GYE_MS_8H'],
    ['GYE_LOG', 'area', 'Logistica Guayaquil', 'CC-LOG-GYE', zones.GYE_CENTRO.id, shifts.GYE_MS_8H.id, 'GYE_MS_8H'],
  ];
  const result = {};
  for (const unit of units) {
    const row = await client.query(`
      INSERT INTO organization_units (
        tenant_id, unit_type, code, name, description, cost_center_code,
        manager_user_id, work_zone_id, status, valid_from, metadata, created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'activo','2026-01-01',$9,$10)
      RETURNING *
    `, [
      tenantId,
      unit[1],
      unit[0],
      unit[2],
      'Unidad demo para presentacion comercial.',
      unit[3],
      users.supervisor.id,
      unit[4],
      toJson(demoMetadata({ workShiftId: unit[5], workShiftCode: unit[6] })),
      users.owner.id,
    ]);
    result[unit[0]] = row.rows[0];
  }
  return result;
}

function buildEmployees() {
  const firstNames = [
    ['Carla', 'Fernanda'], ['Marco', 'Antonio'], ['Lucia', 'Estefania'], ['Andres', 'Sebastian'], ['Diana', 'Paola'],
    ['Jorge', 'Luis'], ['Valeria', 'Noemi'], ['Pedro', 'Xavier'], ['Maria', 'Belen'], ['Santiago', 'David'],
    ['Gabriela', 'Isabel'], ['Felipe', 'Esteban'], ['Daniela', 'Alejandra'], ['Ricardo', 'Jose'], ['Ana', 'Victoria'],
    ['Carlos', 'Eduardo'], ['Natalia', 'Mercedes'], ['Miguel', 'Angel'], ['Camila', 'Monserrate'], ['Juan', 'Pablo'],
    ['Paula', 'Andrea'], ['Diego', 'Fernando'], ['Elena', 'Patricia'], ['Roberto', 'Carlos'], ['Sofia', 'Catalina'],
    ['Hugo', 'Rafael'], ['Adriana', 'Cristina'], ['Ivan', 'Mauricio'], ['Lorena', 'Elizabeth'], ['Emilio', 'Gabriel'],
  ];
  const lastNames = [
    ['Almeida', 'Rojas'], ['Benitez', 'Cueva'], ['Carrion', 'Mora'], ['Duran', 'Santos'], ['Espinosa', 'Vega'],
    ['Flores', 'Lema'], ['Garcia', 'Paredes'], ['Herrera', 'Navas'], ['Ibarra', 'Salazar'], ['Jaramillo', 'Ordonez'],
    ['Lara', 'Ponce'], ['Mendoza', 'Quiroz'], ['Narvaez', 'Reyes'], ['Ortega', 'Viteri'], ['Pazmino', 'Zambrano'],
    ['Aguirre', 'Cedeño'], ['Bravo', 'Mieles'], ['Cantos', 'Macas'], ['Delgado', 'Moreira'], ['Estrada', 'Vera'],
    ['Franco', 'Solorzano'], ['Galarza', 'Mendoza'], ['Hidalgo', 'Palacios'], ['Izquierdo', 'Baque'], ['Jimenez', 'Anchundia'],
    ['Loor', 'Alava'], ['Medina', 'Quijije'], ['Noboa', 'Tigua'], ['Pincay', 'Zuniga'], ['Rivadeneira', 'Cevallos'],
  ];
  const hireYears = [2015, 2015, 2016, 2016, 2017, 2017, 2018, 2018, 2019, 2019, 2020, 2020, 2021, 2021, 2022, 2022, 2023, 2023, 2024, 2024, 2025, 2025, 2025, 2025, 2026, 2026, 2026, 2026, 2026, 2026];
  const employees = [];
  for (let index = 0; index < 30; index += 1) {
    const isQuito = index < 15;
    const provinceCode = isQuito ? '17' : '09';
    const cityCode = isQuito ? '1701' : '0901';
    const unitCodes = isQuito ? ['UIO_ADMIN', 'UIO_OPER', 'UIO_MATRIZ'] : ['GYE_COMERCIAL', 'GYE_LOG', 'GYE_SUCURSAL'];
    const birthYear = index === 0 ? 1958 : 1978 + (index % 22);
    const cargas = index % 5 === 0 ? 2 : (index % 3 === 0 ? 1 : 0);
    employees.push({
      index,
      cedula: generateCedula(Number(provinceCode), 730000 + index),
      nombres: firstNames[index].join(' '),
      apellidos: lastNames[index].join(' '),
      fechaNacimiento: localDate(birthYear, (index % 12) + 1, ((index * 2) % 24) + 1),
      cargo: index === 0 ? 'Mercaderista' : (isQuito ? (index % 2 === 0 ? 'Analista de Nomina' : 'Asistente Administrativo') : (index % 2 === 0 ? 'Ejecutivo Comercial' : 'Asistente Logistico')),
      departamento: index === 0 ? 'Operacion Quito' : (isQuito ? (index % 2 === 0 ? 'Operacion Quito' : 'Administracion Quito') : (index % 2 === 0 ? 'Comercial Guayaquil' : 'Logistica Guayaquil')),
      unitCode: index === 0 ? 'UIO_OPER' : unitCodes[index % unitCodes.length],
      shiftCode: isQuito ? 'UIO_LV_8H' : 'GYE_MS_8H',
      zoneCode: isQuito ? 'UIO_CENTRO_NORTE' : 'GYE_CENTRO',
      salary: 720 + (index * 35),
      gastos: index % 4 === 0 ? 1200 + (index * 10) : 0,
      fechaIngreso: localDate(hireYears[index], index >= 24 ? 1 : index % 12 + 1, index >= 24 ? 1 : ((index % 20) + 1)),
      tipoContrato: index % 7 === 0 ? 'ocasional' : 'indefinido',
      estadoCivil: ['soltero', 'casado', 'union_hecho', 'divorciado'][index % 4],
      cargasFamiliares: cargas,
      direccion: `${isQuito ? 'Av. Demo Quito' : 'Av. Demo Guayaquil'} N${index + 10}-00 y Calle ${index + 1}`,
      provinciaCodigo: provinceCode,
      ciudadCodigo: cityCode,
      ciudadNombre: isQuito ? 'Distrito Metropolitano de Quito' : 'Guayaquil',
      provinciaNombre: isQuito ? 'Pichincha' : 'Guayas',
      telefono: `099${String(7000000 + index).slice(-7)}`,
      email: index === 0 ? `empleado@${demoDomain}` : `empleado${String(index + 1).padStart(2, '0')}@${demoDomain}`,
      region: isQuito ? 'sierra_amazonia' : 'costa_galapagos',
      cuenta: `2200${String(100000 + index).padStart(6, '0')}`,
      dependientes: Array.from({ length: cargas }, (_, dependentIndex) => ({
        nombres: dependentIndex === 0 ? 'Carga Familiar' : 'Soporte Familiar',
        apellidos: lastNames[index][0],
        identificacion: generateCedula(Number(provinceCode), 820000 + (index * 3) + dependentIndex),
        parentesco: dependentIndex === 0 ? 'hijo' : 'conyuge',
        fechaNacimiento: localDate(2014 + dependentIndex + (index % 5), ((index + dependentIndex) % 12) + 1, 10),
        discapacidad: index % 10 === 0 && dependentIndex === 0,
        porcentajeDiscapacidad: index % 10 === 0 && dependentIndex === 0 ? 35 : null,
      })),
    });
  }
  return employees;
}

async function insertEmployeeImportBatch(client, tenantId, ownerId) {
  const result = await client.query(`
    INSERT INTO employee_import_batches (
      tenant_id, created_by, source_name, status, total_rows, valid_rows,
      error_rows, summary, completed_at
    )
    VALUES ($1,$2,'dcen26-demo-commercial','completado',30,30,0,$3,NOW())
    RETURNING id
  `, [tenantId, ownerId, toJson(demoMetadata({ kind: 'seed_30_empleados' }))]);
  return result.rows[0].id;
}

async function ensureUniqueCedula(client, tenantId, preferred, provinceCode, offset) {
  let candidate = preferred;
  let sequence = 930000 + offset;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const exists = await client.query('SELECT id FROM empleados WHERE tenant_id = $1 AND cedula = $2', [tenantId, candidate]);
    if (exists.rows.length === 0) return candidate;
    candidate = generateCedula(Number(provinceCode), sequence + attempt);
  }
  throw new Error('No se pudo generar cedula demo unica.');
}

async function insertEmployees(client, tenantId, users, units, importBatchId) {
  const employees = [];
  for (const employee of buildEmployees()) {
    const cedula = await ensureUniqueCedula(client, tenantId, employee.cedula, employee.provinciaCodigo, employee.index);
    const account = encryptBankAccount(employee.cuenta);
    const row = await client.query(`
      INSERT INTO empleados (
        tenant_id, cedula, nombres, apellidos, fecha_nacimiento, cargo, departamento,
        unidad_organizativa_codigo, jornada_codigo, zona_marcacion_codigo,
        sueldo_bruto_mensual, jornada_horas_mensuales, gastos_personales_anuales,
        fecha_ingreso, tipo_contrato, cuenta_bancaria_cifrada, banco, tipo_cuenta,
        direccion_domicilio, provincia_codigo, ciudad_codigo, ciudad_domicilio,
        provincia_domicilio, estado_civil, cargas_familiares, forma_pago,
        region_decimo_cuarto, modalidad_fondo_reserva, whatsapp_consent_at, telefono, email_personal, import_batch_id
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NULL,$12,$13,$14,$15,
        'DEMO','AHORROS',$16,$17,$18,$19,$20,$21,$22,'transferencia',
        $23,'mensual',$24,$25,$26,$27
      )
      RETURNING *
    `, [
      tenantId,
      cedula,
      employee.nombres,
      employee.apellidos,
      employee.fechaNacimiento,
      employee.cargo,
      employee.departamento,
      employee.unitCode,
      employee.shiftCode,
      employee.zoneCode,
      employee.salary,
      employee.gastos,
      employee.fechaIngreso,
      employee.tipoContrato,
      account,
      employee.direccion,
      employee.provinciaCodigo,
      employee.ciudadCodigo,
      employee.ciudadNombre,
      employee.provinciaNombre,
      employee.estadoCivil,
      employee.cargasFamiliares,
      employee.region,
      employee.email === users.employee.email ? new Date() : null,
      employee.telefono,
      employee.email,
      importBatchId,
    ]);
    const inserted = row.rows[0];
    employees.push({ ...inserted, seed: employee, unit: units[employee.unitCode] });

    for (const dependent of employee.dependientes) {
      await client.query(`
        INSERT INTO employee_family_dependents (
          tenant_id, employee_id, nombres, apellidos, identificacion, parentesco,
          fecha_nacimiento, discapacidad, porcentaje_discapacidad, documento_url, metadata
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `, [
        tenantId,
        inserted.id,
        dependent.nombres,
        dependent.apellidos,
        dependent.identificacion,
        dependent.parentesco,
        dependent.fechaNacimiento,
        dependent.discapacidad,
        dependent.porcentajeDiscapacidad,
        `demo://dcen26/cargas/${inserted.id}/${dependent.identificacion}.pdf`,
        toJson(demoMetadata({ legalUse: 'cargas_familiares_impuesto_renta' })),
      ]);
    }

    await client.query(`
      INSERT INTO documentos_legales (tenant_id, empleado_id, tipo_documento, documento_url, metadata, firmado)
      VALUES ($1,$2,'contrato',$3,$4,true)
    `, [
      tenantId,
      inserted.id,
      `demo://dcen26/contratos/${inserted.id}.pdf`,
      toJson(demoMetadata({ documento: 'contrato_firmado_demo' })),
    ]);
  }

  await client.query(`
    INSERT INTO employee_app_links (
      tenant_id, empleado_id, user_id, status, privacy_notice_version,
      consent_snapshot, device_hint_hash
    )
    VALUES ($1,$2,$3,'ACTIVE','LOPDP-DEMO-2026',$4,$5)
  `, [
    tenantId,
    employees[0].id,
    users.employee.id,
    toJson(demoMetadata({ consent: 'demo_autoservicio_empleado' })),
    crypto.createHash('sha256').update(`${demoCode}:${employees[0].id}`).digest('hex'),
  ]);

  return employees;
}

async function insertOnboarding(client, tenantId, ownerId) {
  const steps = ['empresa', 'legal', 'organizacion', 'jornadas', 'zonas', 'novedades', 'bancos', 'usuarios'];
  for (const step of steps) {
    await client.query(`
      INSERT INTO tenant_onboarding_steps (
        tenant_id, step_code, status, completed_by, completed_at, evidence, notes
      )
      VALUES ($1,$2,'completado',$3,NOW(),$4,$5)
      ON CONFLICT (tenant_id, step_code) DO UPDATE SET
        status = 'completado',
        completed_by = EXCLUDED.completed_by,
        completed_at = NOW(),
        evidence = EXCLUDED.evidence,
        notes = EXCLUDED.notes,
        updated_at = NOW()
    `, [tenantId, step, ownerId, toJson(demoMetadata({ step })), `Completado por seed comercial ${demoCode}.`]);
  }
}

async function insertAttendance(client, tenantId, employees, shifts, zones, units, ownerId) {
  const mayPeriod = await client.query(`
    INSERT INTO payroll_periods (tenant_id, anio, mes, status, opened_by, summary)
    VALUES ($1,2026,5,'open',$2,$3)
    ON CONFLICT (tenant_id, anio, mes) DO UPDATE SET
      status = 'open',
      opened_by = EXCLUDED.opened_by,
      summary = EXCLUDED.summary,
      updated_at = NOW()
    RETURNING id
  `, [tenantId, ownerId, toJson(demoMetadata({ periodo: '2026-05', asistencia: true }))]);
  const periodId = mayPeriod.rows[0].id;

  for (const [position, employee] of employees.entries()) {
    const shift = shifts[employee.jornada_codigo];
    const zone = zones[employee.zona_marcacion_codigo];
    const unit = units[employee.unidad_organizativa_codigo];
    const workDays = shift.calendar_rules.workDays || [];
    const dates = workDatesForMonth(2026, 5, workDays);
    const absenceDate = position % 11 === 0 ? dates[5] : null;
    const lateDate = position % 4 === 0 ? dates[2] : null;
    const outsideDate = position % 10 === 0 ? dates[8] : null;

    for (const date of dates) {
      if (date === absenceDate) continue;
      const lateMinutes = date === lateDate ? 18 : 0;
      const outside = date === outsideDate;
      const lat = outside ? shiftedCoordinate(zone.latitude, 0.018) : Number(zone.latitude);
      const lng = outside ? shiftedCoordinate(zone.longitude, 0.018) : Number(zone.longitude);
      const distance = outside ? 2700 : 18 + (position % 8);
      await client.query(`
        INSERT INTO marcaciones (
          empleado_id, tenant_id, period_id, operational_date, work_zone_id,
          organization_unit_id, work_shift_id, tipo_marcacion, timestamp,
          latitud, longitud, accuracy_meters, dentro_perimetro, distancia_metros,
          ip_address, source, audit_correlation_id, metadata
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,'inicio_jornada',$8,$9,$10,18,$11,$12,'127.0.0.1','demo_seed',$13,$14)
      `, [
        employee.id,
        tenantId,
        periodId,
        date,
        zone.id,
        unit.id,
        shift.id,
        localTimestamp(date, addMinutes(shift.start_time, lateMinutes)),
        lat,
        lng,
        !outside,
        distance,
        correlationId,
        toJson(demoMetadata({ outside, lateMinutes })),
      ]);
      await client.query(`
        INSERT INTO marcaciones (
          empleado_id, tenant_id, period_id, operational_date, work_zone_id,
          organization_unit_id, work_shift_id, tipo_marcacion, timestamp,
          latitud, longitud, accuracy_meters, dentro_perimetro, distancia_metros,
          ip_address, source, audit_correlation_id, metadata
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,'fin_jornada',$8,$9,$10,20,$11,$12,'127.0.0.1','demo_seed',$13,$14)
      `, [
        employee.id,
        tenantId,
        periodId,
        date,
        zone.id,
        unit.id,
        shift.id,
        localTimestamp(date, shift.end_time),
        lat,
        lng,
        !outside,
        distance,
        correlationId,
        toJson(demoMetadata({ outside })),
      ]);
    }
  }
}

async function insertDemoRoutes(client, tenantId, employees, zones, units, ownerId) {
  const routeEmployee = employees[0];
  const routeDate = todayInEcuador();
  const [year, month] = routeDate.split('-').map(Number);
  const period = await ensurePeriod(client, tenantId, ownerId, year, month);
  const unit = units.UIO_OPER || routeEmployee.unit;
  const zone = zones.UIO_CENTRO_NORTE || zones[routeEmployee.zona_marcacion_codigo];
  const siteDefinitions = [
    {
      code: 'UIO_SUPERMERCADO_INAQUITO',
      name: 'Supermercado Inaquito',
      clientName: 'Cliente retail demo',
      address: 'Av. Naciones Unidas y Amazonas, Quito',
      latitude: -0.175213,
      longitude: -78.481921,
      radius: 140,
      start: '09:00',
      end: '10:00',
    },
    {
      code: 'UIO_FARMACIA_CAROLINA',
      name: 'Farmacia La Carolina',
      clientName: 'Cliente farmacia demo',
      address: 'Av. Republica y Eloy Alfaro, Quito',
      latitude: -0.184532,
      longitude: -78.484604,
      radius: 120,
      start: '11:00',
      end: '12:00',
    },
    {
      code: 'UIO_TIENDA_QUICENTRO',
      name: 'Tienda Quicentro',
      clientName: 'Cliente autoservicio demo',
      address: 'Av. Naciones Unidas y 6 de Diciembre, Quito',
      latitude: -0.176748,
      longitude: -78.479299,
      radius: 120,
      start: '15:00',
      end: '16:00',
    },
  ];

  const siteIds = [];
  for (const site of siteDefinitions) {
    const result = await client.query(`
      INSERT INTO route_sites (
        tenant_id, organization_unit_id, work_zone_id, code, name, client_name,
        address, latitude, longitude, radius_meters, min_accuracy_meters,
        requires_photo, requires_qr, allows_unplanned, status, valid_from,
        metadata, created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,80,false,false,true,'activo',$11,$12,$13)
      ON CONFLICT (tenant_id, code) DO UPDATE SET
        organization_unit_id = EXCLUDED.organization_unit_id,
        work_zone_id = EXCLUDED.work_zone_id,
        name = EXCLUDED.name,
        client_name = EXCLUDED.client_name,
        address = EXCLUDED.address,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        radius_meters = EXCLUDED.radius_meters,
        status = 'activo',
        updated_at = NOW()
      RETURNING id
    `, [
      tenantId,
      unit.id,
      zone.id,
      site.code,
      site.name,
      site.clientName,
      site.address,
      site.latitude,
      site.longitude,
      site.radius,
      routeDate,
      toJson(demoMetadata({ routeDemo: true, mobileReview: true })),
      ownerId,
    ]);
    siteIds.push({ ...site, id: result.rows[0].id });
  }

  const routeDay = await client.query(`
    INSERT INTO route_days (
      tenant_id, empleado_id, period_id, operational_date, status,
      allow_reorder, allow_unplanned, source, metadata, created_by
    )
    VALUES ($1,$2,$3,$4,'planned',true,true,'demo_seed',$5,$6)
    ON CONFLICT (tenant_id, empleado_id, operational_date) DO UPDATE SET
      period_id = EXCLUDED.period_id,
      status = CASE
        WHEN route_days.status IN ('completed', 'exception_pending') THEN route_days.status
        ELSE 'planned'
      END,
      allow_reorder = true,
      allow_unplanned = true,
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
    RETURNING id
  `, [
    tenantId,
    routeEmployee.id,
    period.id,
    routeDate,
    toJson(demoMetadata({ routeDemo: true, employeeEmail: routeEmployee.email_personal })),
    ownerId,
  ]);

  await client.query('DELETE FROM route_stops WHERE tenant_id = $1 AND route_day_id = $2', [tenantId, routeDay.rows[0].id]);
  for (const [index, site] of siteIds.entries()) {
    const status = index === 0 ? 'completed' : index === 1 ? 'in_site' : 'pending';
    const result = await client.query(`
      INSERT INTO route_stops (
        tenant_id, route_day_id, site_id, sequence_order,
        planned_start_time, planned_end_time, status, required_evidence, notes,
        started_at, completed_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING id
    `, [
      tenantId,
      routeDay.rows[0].id,
      site.id,
      index + 1,
      site.start,
      site.end,
      status,
      toJson({ gps: true, foto: false, qr: false }),
      'Parada demo para validar llegada, salida, omision y visita no programada.',
      index <= 1 ? localTimestamp(routeDate, addMinutes(site.start, 5)) : null,
      index === 0 ? localTimestamp(routeDate, addMinutes(site.start, 45)) : null,
    ]);

    if (index <= 1) {
      await client.query(`
        INSERT INTO route_visit_marks (
          tenant_id, empleado_id, route_day_id, route_stop_id, site_id, period_id,
          operational_date, mark_type, device_timestamp, server_timestamp,
          latitude, longitude, accuracy_meters, within_geofence, distance_meters,
          status, comment, source, audit_correlation_id, metadata
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,'arrival',$8,$8,$9,$10,18,true,12,'valid',$11,'demo_seed',$12,$13)
      `, [
        tenantId,
        routeEmployee.id,
        routeDay.rows[0].id,
        result.rows[0].id,
        site.id,
        period.id,
        routeDate,
        localTimestamp(routeDate, addMinutes(site.start, 5)),
        site.latitude,
        site.longitude,
        'Llegada demo para smoke de reporte de rutas.',
        correlationId,
        toJson(demoMetadata({ routeSmoke: true, markType: 'arrival', siteCode: site.code })),
      ]);
    }

    if (index === 0) {
      await client.query(`
        INSERT INTO route_visit_marks (
          tenant_id, empleado_id, route_day_id, route_stop_id, site_id, period_id,
          operational_date, mark_type, device_timestamp, server_timestamp,
          latitude, longitude, accuracy_meters, within_geofence, distance_meters,
          status, comment, source, audit_correlation_id, metadata
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,'departure',$8,$8,$9,$10,21,true,16,'valid',$11,'demo_seed',$12,$13)
      `, [
        tenantId,
        routeEmployee.id,
        routeDay.rows[0].id,
        result.rows[0].id,
        site.id,
        period.id,
        routeDate,
        localTimestamp(routeDate, addMinutes(site.start, 45)),
        site.latitude,
        site.longitude,
        'Salida demo para smoke de reporte de rutas.',
        correlationId,
        toJson(demoMetadata({ routeSmoke: true, markType: 'departure', siteCode: site.code })),
      ]);
    }
  }

  await client.query(`
    UPDATE route_days
    SET status = 'in_progress',
        updated_at = NOW(),
        metadata = metadata || $3::jsonb
    WHERE tenant_id = $1
      AND id = $2
  `, [
    tenantId,
    routeDay.rows[0].id,
    toJson(demoMetadata({
      routeSmoke: true,
      scenario: '1 parada completa, 1 llegada sin salida, 1 pendiente',
    })),
  ]);
}

async function insertDemoMobilization(client, tenantId, employees, ownerId) {
  const selected = employees.slice(0, 3);
  const reports = [
    {
      employee: selected[0],
      periodo: '2026-06',
      estado: 'pendiente',
      total: 38.5,
      dias: 2,
      detalle: [
        { fecha: '2026-06-10', origen: 'Oficina Quito', destino: 'Supermercado Inaquito', concepto: 'taxi', km: 5.2, valor_usd: 12.5 },
        { fecha: '2026-06-11', origen: 'Farmacia La Carolina', destino: 'Tienda Quicentro', concepto: 'uber', km: 8.1, valor_usd: 26 },
      ],
    },
    {
      employee: selected[1],
      periodo: '2026-06',
      estado: 'aprobado',
      total: 24,
      dias: 1,
      anticipo: 24,
      detalle: [
        { fecha: '2026-06-12', origen: 'Bodega Quito', destino: 'Cliente norte', concepto: 'bus', km: null, valor_usd: 24 },
      ],
    },
    {
      employee: selected[2],
      periodo: '2026-06',
      estado: 'rechazado',
      total: 18,
      dias: 1,
      motivo: 'Recibo no legible en demo smoke.',
      detalle: [
        { fecha: '2026-06-13', origen: 'Sucursal', destino: 'Cliente demo', concepto: 'taxi', km: 4, valor_usd: 18 },
      ],
    },
  ].filter((report) => report.employee);

  for (const report of reports) {
    await client.query(`
      INSERT INTO informe_movilizacion (
        tenant_id, empleado_id, periodo, estado, total_usd, dias, detalle_json,
        anticipo_generado_usd, aprobado_por, aprobado_at, rechazo_motivo
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (tenant_id, empleado_id, periodo) DO UPDATE SET
        estado = EXCLUDED.estado,
        total_usd = EXCLUDED.total_usd,
        dias = EXCLUDED.dias,
        detalle_json = EXCLUDED.detalle_json,
        anticipo_generado_usd = EXCLUDED.anticipo_generado_usd,
        aprobado_por = EXCLUDED.aprobado_por,
        aprobado_at = EXCLUDED.aprobado_at,
        rechazo_motivo = EXCLUDED.rechazo_motivo,
        updated_at = NOW()
    `, [
      tenantId,
      report.employee.id,
      report.periodo,
      report.estado,
      report.total,
      report.dias,
      toJson(report.detalle.map((item) => ({ ...item, demo: true }))),
      report.anticipo || null,
      report.estado === 'pendiente' ? null : ownerId,
      report.estado === 'pendiente' ? null : new Date().toISOString(),
      report.motivo || null,
    ]);
  }
}

function addMinutes(time, minutesToAdd) {
  const [hour, minute] = time.split(':').map(Number);
  const total = hour * 60 + minute + minutesToAdd;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

async function ensurePeriod(client, tenantId, ownerId, year, month) {
  const result = await client.query(`
    INSERT INTO payroll_periods (tenant_id, anio, mes, status, opened_by, summary)
    VALUES ($1,$2,$3,'open',$4,$5)
    ON CONFLICT (tenant_id, anio, mes) DO UPDATE SET
      status = 'open',
      opened_by = EXCLUDED.opened_by,
      closed_at = NULL,
      calculated_at = NULL,
      summary = EXCLUDED.summary,
      updated_at = NOW()
    RETURNING id, anio, mes
  `, [tenantId, year, month, ownerId, toJson(demoMetadata({ periodo: `${year}-${String(month).padStart(2, '0')}` }))]);
  return result.rows[0];
}

async function insertNoveltyBatch(client, tenantId, ownerId, period, payload, employees) {
  const selected = employees.filter(payload.filter);
  const batch = await client.query(`
    INSERT INTO novelty_batches (
      tenant_id, period_id, scope_type, scope_value, tipo_novedad, fecha,
      minutos, monto, justificacion, status, idempotency_key, total_empleados,
      total_creadas, created_by, completed_at, errores
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'completado',$10,$11,0,$12,NOW(),'[]'::jsonb)
    RETURNING id
  `, [
    tenantId,
    period.id,
    payload.scopeType,
    payload.scopeValue,
    payload.type,
    payload.date,
    payload.minutes || 0,
    payload.amount || 0,
    payload.justification,
    `${demoCode}-${period.anio}-${period.mes}-${payload.type}-${payload.date}-${payload.scopeValue}`,
    selected.length,
    ownerId,
  ]);
  let created = 0;
  for (const employee of selected) {
    const inserted = await client.query(`
      INSERT INTO novedades_asistencia (
        empleado_id, tenant_id, period_id, periodo_nomina, fecha, tipo_novedad,
        minutos, monto, justificacion, estado, aprobado_por, aprobado_en, novelty_batch_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'aprobado',$10,NOW(),$11)
      ON CONFLICT (empleado_id, fecha, tipo_novedad) DO NOTHING
      RETURNING id
    `, [
      employee.id,
      tenantId,
      period.id,
      `${period.anio}-${String(period.mes).padStart(2, '0')}`,
      payload.date,
      payload.type,
      payload.minutes || 0,
      payload.amount || 0,
      payload.justification,
      ownerId,
      batch.rows[0].id,
    ]);
    created += inserted.rows.length;
  }
  await client.query('UPDATE novelty_batches SET total_creadas = $1 WHERE id = $2', [created, batch.rows[0].id]);
}

async function insertPayrollNovelties(client, tenantId, ownerId, employees) {
  const periods = [];
  for (const month of [1, 2, 3, 4, 5]) {
    const period = await ensurePeriod(client, tenantId, ownerId, 2026, month);
    periods.push(period);
    await insertNoveltyBatch(client, tenantId, ownerId, period, {
      scopeType: 'company',
      scopeValue: 'all',
      type: 'bono_desempeno',
      date: localDate(2026, month, 15),
      amount: month % 2 === 0 ? 60 : 45,
      justification: `Bono demo comercial mes ${month}`,
      filter: (_, index) => index % 3 === 0,
    }, employees);
    await insertNoveltyBatch(client, tenantId, ownerId, period, {
      scopeType: 'company',
      scopeValue: 'operativo',
      type: 'hora_extra_50',
      date: localDate(2026, month, 20),
      minutes: 120,
      justification: `Horas extra demo mes ${month}`,
      filter: (_, index) => index % 4 === 1,
    }, employees);
  }

  const may = periods.find((period) => period.mes === 5);
  await insertNoveltyBatch(client, tenantId, ownerId, may, {
    scopeType: 'company',
    scopeValue: 'faltas-demo',
    type: 'falta',
    date: '2026-05-08',
    minutes: 480,
    justification: 'Falta demo para reporte de asistencia',
    filter: (_, index) => index % 11 === 0,
  }, employees);
  await insertNoveltyBatch(client, tenantId, ownerId, may, {
    scopeType: 'company',
    scopeValue: 'atrasos-demo',
    type: 'atraso',
    date: '2026-05-05',
    minutes: 18,
    justification: 'Atraso demo por trafico',
    filter: (_, index) => index % 4 === 0,
  }, employees);
  return periods;
}

async function calculateAndClosePayroll(tenantId, ownerId, periods) {
  for (const period of periods) {
    await db.runWithTenantContext({ tenantId, userId: ownerId }, async () => {
      const result = await calcularNominaMensual(tenantId, period.anio, period.mes);
      const errors = result.resultados.filter((row) => row.error);
      if (errors.length > 0) {
        const err = new Error(`Nomina demo con errores en ${period.anio}-${period.mes}: ${errors.length}`);
        err.code = 'DCEN26_PAYROLL_ERRORS';
        throw err;
      }
      await db.query(`
        UPDATE nominas
        SET estado = 'cerrada',
            cerrado_en = NOW(),
            rol_pdf_url = CONCAT('demo://dcen26/roles/', anio, '-', LPAD(mes::text, 2, '0'), '/', id, '.pdf'),
            updated_at = NOW()
        WHERE tenant_id = $1 AND anio = $2 AND mes = $3 AND estado = 'borrador'
      `, [tenantId, period.anio, period.mes]);
      await db.query(`
        UPDATE payroll_periods
        SET status = 'closed',
            calculated_at = NOW(),
            closed_at = NOW(),
            summary = $4,
            updated_at = NOW()
        WHERE tenant_id = $1 AND anio = $2 AND mes = $3
      `, [
        tenantId,
        period.anio,
        period.mes,
        toJson(demoMetadata({
          payrollClosed: true,
          totalEmployees: result.total,
          bankFileDemoUrl: `demo://dcen26/banco/PAGO_NOMINA_${period.anio}${String(period.mes).padStart(2, '0')}.csv`,
          warning: 'Archivo bancario demo no debe cargarse en bancos reales.',
        })),
      ]);
    });
  }
}

async function writeCredentialsFile(credentials, tenantId) {
  const payload = {
    demoCode,
    tenantId,
    ruc: demoRuc,
    generatedAt: new Date().toISOString(),
    warning: 'Credenciales locales de demo. No subir a GitHub.',
    users: credentials,
  };
  fs.writeFileSync(credentialsPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function verifyDemo() {
  const result = await db.query(`
    WITH tenant AS (
      SELECT id FROM tenants WHERE ruc = $1 AND configuracion->>'demoCode' = $2
    )
    SELECT
      (SELECT COUNT(*)::int FROM tenant) AS tenants,
      (SELECT COUNT(*)::int FROM usuarios WHERE tenant_id = (SELECT id FROM tenant)) AS users,
      (SELECT COUNT(*)::int FROM empleados WHERE tenant_id = (SELECT id FROM tenant) AND activo = true) AS employees,
      (SELECT COUNT(*)::int FROM employee_family_dependents WHERE tenant_id = (SELECT id FROM tenant)) AS dependents,
      (SELECT COUNT(*)::int FROM work_zones WHERE tenant_id = (SELECT id FROM tenant)) AS zones,
      (SELECT COUNT(*)::int FROM organization_units WHERE tenant_id = (SELECT id FROM tenant)) AS units,
      (SELECT COUNT(*)::int FROM work_shifts WHERE tenant_id = (SELECT id FROM tenant)) AS shifts,
      (SELECT COUNT(*)::int FROM route_sites WHERE tenant_id = (SELECT id FROM tenant) AND status = 'activo') AS route_sites,
      (SELECT COUNT(*)::int FROM route_days WHERE tenant_id = (SELECT id FROM tenant)) AS route_days,
      (SELECT COUNT(*)::int FROM route_stops WHERE tenant_id = (SELECT id FROM tenant)) AS route_stops,
      (SELECT COUNT(*)::int FROM route_visit_marks WHERE tenant_id = (SELECT id FROM tenant)) AS route_visit_marks,
      (SELECT COUNT(*)::int FROM informe_movilizacion WHERE tenant_id = (SELECT id FROM tenant)) AS mobilization_reports,
      (SELECT COUNT(*)::int FROM marcaciones WHERE tenant_id = (SELECT id FROM tenant)) AS marks,
      (SELECT COUNT(*)::int FROM novedades_asistencia WHERE tenant_id = (SELECT id FROM tenant)) AS novelties,
      (SELECT COUNT(*)::int FROM payroll_periods WHERE tenant_id = (SELECT id FROM tenant) AND anio = 2026 AND status = 'closed') AS closed_periods,
      (SELECT COUNT(*)::int FROM nominas WHERE tenant_id = (SELECT id FROM tenant) AND anio = 2026 AND estado = 'cerrada') AS closed_payrolls,
      (SELECT COUNT(*)::int FROM perfiles_bancarios WHERE tenant_id = (SELECT id FROM tenant) AND activo = true) AS bank_profiles
  `, [demoRuc, demoCode]);
  const row = result.rows[0];
  const expectations = [
    ['tenants', 1],
    ['users', 4],
    ['employees', 30],
    ['zones', 2],
    ['shifts', 2],
    ['route_sites', 3],
    ['route_days', 1],
    ['route_stops', 3],
    ['route_visit_marks', 3],
    ['mobilization_reports', 3],
    ['closed_periods', 5],
    ['bank_profiles', 2],
  ];
  for (const [key, expected] of expectations) {
    if (Number(row[key]) !== expected) {
      const err = new Error(`Verificacion demo fallo: ${key}=${row[key]}, esperado ${expected}`);
      err.code = 'DCEN26_VERIFY_FAILED';
      throw err;
    }
  }
  if (Number(row.marks) < 1000 || Number(row.closed_payrolls) < 140) {
    const err = new Error('Verificacion demo fallo: asistencia o nominas insuficientes.');
    err.code = 'DCEN26_VERIFY_COUNTS_LOW';
    err.details = row;
    throw err;
  }
  return row;
}

async function seedDemo() {
  const setupClient = await db.getClient(null, null);
  let tenantId;
  let users;
  let credentials;
  try {
    await resetDemoTenant(setupClient);
    await insertCommercialPlan(setupClient);
    tenantId = await insertTenant(setupClient);
    await insertSubscription(setupClient, tenantId);
    const userResult = await createUsers(setupClient, tenantId);
    users = userResult.users;
    credentials = userResult.credentials;
    await db.commit(setupClient);
  } catch (err) {
    await db.rollback(setupClient);
    throw err;
  }

  await seedLegalParameters(tenantId, users.owner);

  const client = await db.getClient(tenantId, users.owner.id);
  let periods;
  try {
    await insertBankProfile(client, tenantId);
    await insertNoveltyTypes(client, tenantId, users.owner.id);
    const shifts = await insertWorkShifts(client, tenantId, users.owner.id);
    const zones = await insertWorkZones(client, tenantId, users.owner.id);
    const units = await insertOrganizationUnits(client, tenantId, users, zones, shifts);
    const batchId = await insertEmployeeImportBatch(client, tenantId, users.owner.id);
    const employees = await insertEmployees(client, tenantId, users, units, batchId);
    await insertOnboarding(client, tenantId, users.owner.id);
    await insertAttendance(client, tenantId, employees, shifts, zones, units, users.owner.id);
    await insertDemoRoutes(client, tenantId, employees, zones, units, users.owner.id);
    await insertDemoMobilization(client, tenantId, employees, users.owner.id);
    periods = await insertPayrollNovelties(client, tenantId, users.owner.id, employees);
    await db.commit(client);
  } catch (err) {
    await db.rollback(client);
    throw err;
  }

  await calculateAndClosePayroll(tenantId, users.owner.id, periods);
  await writeCredentialsFile(credentials, tenantId);
  return verifyDemo();
}

async function resetOnly() {
  const client = await db.getClient(null, null);
  try {
    const deleted = await resetDemoTenant(client);
    await db.commit(client);
    return { deleted };
  } catch (err) {
    await db.rollback(client);
    throw err;
  }
}

async function main() {
  const mode = process.argv[2] || 'seed';
  try {
    if (mode === 'seed') {
      const summary = await seedDemo();
      console.log('[DCEN26] Demo comercial sembrada y verificada', { correlationId, summary, credentialsPath });
      return;
    }
    if (mode === 'verify') {
      const summary = await verifyDemo();
      console.log('[DCEN26] Demo comercial verificada', { correlationId, summary });
      return;
    }
    if (mode === 'reset') {
      const summary = await resetOnly();
      console.log('[DCEN26] Demo comercial eliminada', { correlationId, summary });
      return;
    }
    throw new Error('Modo invalido. Usa seed, verify o reset.');
  } catch (err) {
    console.error('[DCEN26] Error ejecutando demo comercial', {
      code: err.code || 'DCEN26_SEED_ERROR',
      statusCode: err.statusCode || 500,
      correlationId,
      userId: null,
      message: err.message,
      details: err.details || null,
    });
    process.exitCode = 1;
  } finally {
    await db.pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  buildEmployees,
  cedulaCheckDigit,
  generateCedula,
  resetDemoTenant,
  verifyDemo,
  workDatesForMonth,
};
