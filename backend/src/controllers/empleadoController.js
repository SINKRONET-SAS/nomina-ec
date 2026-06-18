// ============================================================
// PLAN HAIKY - Controlador de Empleados
// ============================================================
const db = require('../config/database');
const { validarCedula } = require('../utils/validarCedula');
const { generarContrato } = require('../services/templateGenerator');
const {
  commitEmployeeImport,
  listEmployeeImportBatches,
  previewEmployeeImport,
  rollbackEmployeeImport,
} = require('../services/employeeImportService');

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
      cuenta_bancaria, banco, tipo_cuenta, direccion, telefono, email
    } = req.body;
    
    // Validaciones
    if (!validarCedula(cedula)) {
      return res.status(400).json({ error: 'Cédula inválida' });
    }
    
    if (!nombres || !apellidos || !sueldo_bruto_mensual || !fecha_ingreso) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }
    
    // Verificar que la cédula no exista
    const existe = await db.query(
      'SELECT id FROM empleados WHERE cedula = $1',
      [cedula]
    );
    
    if (existe.rows.length > 0) {
      return res.status(400).json({ error: 'La cédula ya está registrada' });
    }
    
    // Cifrar cuenta bancaria
    let cuentaCifrada = null;
    if (cuenta_bancaria) {
      const cifrado = await db.query(
        'SELECT pgp_sym_encrypt($1, $2) as cifrado',
        [cuenta_bancaria, process.env.BANK_ACCOUNT_ENCRYPTION_KEY || 'change-this-local-bank-key']
      );
      cuentaCifrada = cifrado.rows[0].cifrado;
    }
    
    // Crear empleado
    const result = await db.query(`
      INSERT INTO empleados (
        tenant_id, cedula, nombres, apellidos, cargo, departamento,
        sueldo_bruto_mensual, jornada_horas_mensuales, gastos_personales_anuales,
        fecha_ingreso, tipo_contrato,
        cuenta_bancaria_cifrada, banco, tipo_cuenta,
        direccion_domicilio, telefono, email_personal
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING id, cedula, nombres, apellidos, cargo, sueldo_bruto_mensual,
        jornada_horas_mensuales, gastos_personales_anuales, fecha_ingreso, tipo_contrato
    `, [
      tenantId, cedula, nombres, apellidos, cargo || '', departamento || '',
      sueldo_bruto_mensual,
      jornada_horas_mensuales || null,
      gastos_personales_anuales || 0,
      fecha_ingreso, tipo_contrato || 'indefinido',
      cuentaCifrada, banco || '', tipo_cuenta || '',
      direccion || '', telefono || '', email || ''
    ]);
    
    const empleado = result.rows[0];
    
    // Generar contrato automáticamente
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
    console.error('[EMPLEADOS] Error:', err);
    res.status(500).json({ error: 'Error interno: ' + err.message });
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
      sueldo_bruto_mensual: 'sueldo_bruto_mensual',
      jornada_horas_mensuales: 'jornada_horas_mensuales',
      gastos_personales_anuales: 'gastos_personales_anuales',
      fecha_ingreso: 'fecha_ingreso',
      tipo_contrato: 'tipo_contrato',
      banco: 'banco',
      cuenta_bancaria: 'cuenta_bancaria',
      tipo_cuenta: 'tipo_cuenta',
      direccion_domicilio: 'direccion_domicilio',
      telefono: 'telefono',
      email_personal: 'email_personal',
    };
    const entries = Object.entries(req.body || {}).filter(([key]) => (
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
    console.error('[EMPLEADOS] Error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

async function terminar(req, res) {
  try {
    const { id } = req.params;
    const { tenantId } = req;
    const { causa, fecha_salida } = req.body;
    
    if (!causa) {
      return res.status(400).json({ error: 'Causa de terminación requerida' });
    }
    
    // Calcular liquidación
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

