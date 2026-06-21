// ============================================================
// PLAN HAIKY - Controlador de Empleados
// ============================================================
const db = require('../config/database');
const { validarCedula } = require('../utils/validarCedula');
const { encryptBankAccount } = require('../services/bankAccountCrypto');
const { getBankProfileForTenant } = require('../services/bancoAebGenerator');
const { generarContrato } = require('../services/templateGenerator');
const {
  commitEmployeeImport,
  listEmployeeImportBatches,
  previewEmployeeImport,
  rollbackEmployeeImport,
} = require('../services/employeeImportService');

const FOURTEENTH_REGION_PARAMETERS = {
  costa_galapagos: 'decimo_cuarto_costa_galapagos',
  sierra_amazonia: 'decimo_cuarto_sierra_amazonia',
};

function normalizeFourteenthRegion(value) {
  const normalized = String(value || 'sierra_amazonia').trim().toLowerCase();
  return FOURTEENTH_REGION_PARAMETERS[normalized] ? normalized : null;
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
  return profile.profileKey || bankCode;
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

async function listar(req, res) {
  try {
    const { tenantId } = req;
    const { activo = true } = req.query;
    
    const result = await db.query(`
      SELECT id, cedula, nombres, apellidos, cargo, departamento,
        sueldo_bruto_mensual, jornada_horas_mensuales, gastos_personales_anuales,
        fecha_ingreso, tipo_contrato, activo
      FROM empleados
      WHERE tenant_id = $1 AND activo = $2
      ORDER BY apellidos, nombres
    `, [tenantId, activo === 'true']);
    
    res.json({ success: true, empleados: result.rows });
  } catch (err) {
    console.error('[EMPLEADOS] Error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

async function obtener(req, res) {
  try {
    const { id } = req.params;
    const { tenantId } = req;
    
    const result = await db.query(`
      SELECT * FROM empleados WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    
    res.json({ success: true, empleado: result.rows[0] });
  } catch (err) {
    console.error('[EMPLEADOS] Error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

async function crear(req, res) {
  try {
    const { tenantId } = req;
    const {
      cedula, nombres, apellidos, cargo, departamento,
      sueldo_bruto_mensual, fecha_ingreso, tipo_contrato,
      jornada_horas_mensuales, gastos_personales_anuales,
      cuenta_bancaria, banco, tipo_cuenta, forma_pago, region_decimo_cuarto,
      jornada_codigo, unidad_organizativa_codigo, zona_marcacion_codigo,
      direccion, ciudad, provincia, estado_civil, cargas_familiares, telefono, email
    } = req.body;
    
    // Validaciones
    if (!validarCedula(cedula)) {
      return res.status(400).json({ error: 'Cedula invalida' });
    }
    
    if (!nombres || !apellidos || !sueldo_bruto_mensual || !fecha_ingreso) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const normalizedRegion = normalizeFourteenthRegion(region_decimo_cuarto);
    if (!normalizedRegion) {
      return res.status(400).json({
        error: 'REGION_DECIMO_CUARTO_INVALIDA',
        message: 'Selecciona Costa/Galapagos o Sierra/Amazonia para calcular decimo cuarto.',
        correlationId: req.correlationId,
      });
    }

    const normalizedBankCode = await resolveEmployeeBankCode(tenantId, forma_pago, banco);
    const normalizedWorkShiftCode = await resolveConfiguredCode(tenantId, 'work_shifts', jornada_codigo, 'La jornada', 'EMPLEADO_JORNADA_INVALIDA');
    const normalizedOrgUnitCode = await resolveConfiguredCode(tenantId, 'organization_units', unidad_organizativa_codigo, 'La unidad organizativa', 'EMPLEADO_UNIDAD_INVALIDA');
    const normalizedWorkZoneCode = await resolveConfiguredCode(tenantId, 'work_zones', zona_marcacion_codigo, 'La zona de marcacion', 'EMPLEADO_ZONA_INVALIDA');
    
    // Verificar que la cedula no exista
    const existe = await db.query(
      'SELECT id FROM empleados WHERE cedula = $1',
      [cedula]
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
        tenant_id, cedula, nombres, apellidos, cargo, departamento,
        unidad_organizativa_codigo, jornada_codigo, zona_marcacion_codigo,
        sueldo_bruto_mensual, jornada_horas_mensuales, gastos_personales_anuales,
        fecha_ingreso, tipo_contrato,
        cuenta_bancaria_cifrada, banco, tipo_cuenta, forma_pago,
        region_decimo_cuarto,
        direccion_domicilio, ciudad_domicilio, provincia_domicilio, estado_civil, cargas_familiares, telefono, email_personal
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
      RETURNING id, cedula, nombres, apellidos, cargo, sueldo_bruto_mensual,
        jornada_horas_mensuales, gastos_personales_anuales, fecha_ingreso, tipo_contrato, banco, region_decimo_cuarto,
        unidad_organizativa_codigo, jornada_codigo, zona_marcacion_codigo
    `, [
      tenantId, cedula, nombres, apellidos, cargo || '', departamento || '',
      normalizedOrgUnitCode, normalizedWorkShiftCode, normalizedWorkZoneCode,
      sueldo_bruto_mensual,
      jornada_horas_mensuales || null,
      gastos_personales_anuales || 0,
      fecha_ingreso, tipo_contrato || 'indefinido',
      cuentaCifrada, normalizedBankCode, tipo_cuenta || '', forma_pago || 'transferencia', normalizedRegion,
      direccion || '', ciudad || '', provincia || '', estado_civil || '', Number(cargas_familiares || 0), telefono || '', email || ''
    ]);
    
    const empleado = result.rows[0];
    
    // Generar contrato automaticamente
    const tenant = await db.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
    if (tenant.rows.length > 0) {
      try {
        await generarContrato(empleado, tenant.rows[0], tipo_contrato || 'indefinido');
        console.log(`[CONTRATO] Generado para empleado ${empleado.id}`);
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
    const preview = await previewEmployeeImport(req.body || {});
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
      cargo: 'cargo',
      departamento: 'departamento',
      unidad_organizativa_codigo: 'unidad_organizativa_codigo',
      jornada_codigo: 'jornada_codigo',
      zona_marcacion_codigo: 'zona_marcacion_codigo',
      sueldo_bruto_mensual: 'sueldo_bruto_mensual',
      jornada_horas_mensuales: 'jornada_horas_mensuales',
      gastos_personales_anuales: 'gastos_personales_anuales',
      fecha_ingreso: 'fecha_ingreso',
      tipo_contrato: 'tipo_contrato',
      banco: 'banco',
      tipo_cuenta: 'tipo_cuenta',
      forma_pago: 'forma_pago',
      region_decimo_cuarto: 'region_decimo_cuarto',
      direccion_domicilio: 'direccion_domicilio',
      ciudad_domicilio: 'ciudad_domicilio',
      provincia_domicilio: 'provincia_domicilio',
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
      body.zona_marcacion_codigo = await resolveConfiguredCode(tenantId, 'work_zones', body.zona_marcacion_codigo, 'La zona de marcacion', 'EMPLEADO_ZONA_INVALIDA');
    }
    if (Object.prototype.hasOwnProperty.call(body, 'cargas_familiares')) {
      body.cargas_familiares = Number(body.cargas_familiares || 0);
    }
    const entries = Object.entries(body).filter(([key]) => (
      Object.prototype.hasOwnProperty.call(updateColumns, key)
    ));
    const fields = entries.map(([key], i) => `${updateColumns[key]} = $${i + 1}`).join(', ');
    const values = entries.map(([, value]) => value);
    
    if (values.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }
    
    const result = await db.query(`
      UPDATE empleados SET ${fields}, updated_at = NOW()
      WHERE id = $${values.length + 1} AND tenant_id = $${values.length + 2}
      RETURNING id, nombres, apellidos, cargo, sueldo_bruto_mensual
    `, [...values, id, tenantId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
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
      return res.status(400).json({ error: 'Causa de terminacion requerida' });
    }
    
    // Calcular liquidacion
    const { calcularLiquidacion } = require('../services/liquidacionService');
    const liquidacion = await calcularLiquidacion(id, tenantId, causa, { fechaSalida: fecha_salida });
    
    res.json({ success: true, liquidacion });
  } catch (err) {
    console.error('[EMPLEADOS] Error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  listar,
  obtener,
  crear,
  actualizar,
  terminar,
  previewImportacion,
  confirmarImportacion,
  listarLotesImportacion,
  revertirImportacion,
};

