# Crear controlador de empleados
empleado_controller = '''// ============================================================
// PLAN HAIKY - Controlador de Empleados
// ============================================================
const db = require('../config/database');
const { validarCedula } = require('../utils/validarCedula');
const { generarContrato } = require('../services/templateGenerator');

async function listar(req, res) {
  try {
    const { tenantId } = req;
    const { activo = true } = req.query;
    
    const result = await db.query(`
      SELECT id, cedula, nombres, apellidos, cargo, departamento,
        sueldo_bruto_mensual, fecha_ingreso, tipo_contrato, activo
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
        "SELECT pgp_sym_encrypt($1, 'clave-secreta-cifrado') as cifrado",
        [cuenta_bancaria]
      );
      cuentaCifrada = cifrado.rows[0].cifrado;
    }
    
    // Crear empleado
    const result = await db.query(`
      INSERT INTO empleados (
        tenant_id, cedula, nombres, apellidos, cargo, departamento,
        sueldo_bruto_mensual, fecha_ingreso, tipo_contrato,
        cuenta_bancaria_cifrada, banco, tipo_cuenta,
        direccion_domicilio, telefono, email_personal
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING id, cedula, nombres, apellidos, cargo, sueldo_bruto_mensual, fecha_ingreso, tipo_contrato
    `, [
      tenantId, cedula, nombres, apellidos, cargo || '', departamento || '',
      sueldo_bruto_mensual, fecha_ingreso, tipo_contrato || 'indefinido',
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

async function actualizar(req, res) {
  try {
    const { id } = req.params;
    const { tenantId } = req;
    const updates = req.body;
    
    // No permitir cambiar cédula
    delete updates.cedula;
    
    const fields = Object.keys(updates).map((key, i) => `${key} = $${i + 1}`).join(', ');
    const values = Object.values(updates);
    
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
    const { causa } = req.body;
    
    if (!causa) {
      return res.status(400).json({ error: 'Causa de terminación requerida' });
    }
    
    // Calcular liquidación
    const { calcularLiquidacion } = require('../services/liquidacionService');
    const liquidacion = await calcularLiquidacion(id, tenantId, causa);
    
    res.json({ success: true, liquidacion });
  } catch (err) {
    console.error('[EMPLEADOS] Error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listar, obtener, crear, actualizar, terminar };
'''

with open('backend/src/controllers/empleadoController.js', 'w') as f:
    f.write(empleado_controller)

print("✓ Controlador de empleados creado")
 # Result 
✓ Controlador de empleados creado
