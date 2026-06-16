# Crear generador de archivo bancario (formato AEB)
banco_aeb_generator = '''// ============================================================
// PLAN HAIKY - Generador de Archivo Bancario (Formato AEB)
// Para pago de nómina vía banco
// ============================================================
const ExcelJS = require('exceljs');
const { s3Upload } = require('../config/s3');
const db = require('../config/database');

/**
 * Genera archivo CSV/Excel para pago bancario
 */
async function generarArchivoBanco(tenantId, anio, mes, banco = 'PICHINCHA') {
  // 1. Obtener datos del tenant
  const tenantResult = await db.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
  if (tenantResult.rows.length === 0) throw new Error('Tenant no encontrado');
  const tenant = tenantResult.rows[0];
  
  // 2. Obtener nóminas con cuentas bancarias
  const nominasResult = await db.query(`
    SELECT e.cedula, e.nombres, e.apellidos, e.cuenta_bancaria_cifrada,
      e.banco, e.tipo_cuenta, n.neto_recibir
    FROM nominas n
    JOIN empleados e ON n.empleado_id = e.id
    WHERE n.tenant_id = $1 AND n.anio = $2 AND n.mes = $3
    AND e.cuenta_bancaria_cifrada IS NOT NULL
    ORDER BY e.apellidos, e.nombres
  `, [tenantId, anio, mes]);
  
  if (nominasResult.rows.length === 0) {
    throw new Error('No hay empleados con cuenta bancaria para el período');
  }
  
  // 3. Generar CSV formato AEB (Asociación Española de Banca - adaptado a Ecuador)
  const rows = [];
  
  // Cabecera
  rows.push([
    'TIPO_REGISTRO',
    'OFICINA',
    'DC',
    'CUENTA',
    'CEDULA',
    'NOMBRE',
    'CONCEPTO',
    'FECHA_OPERACION',
    'IMPORT',
    'REFERENCIA'
  ]);
  
  let totalPagos = 0;
  
  nominasResult.rows.forEach((n, index) => {
    // En producción, descifrar la cuenta bancaria con pgp_sym_decrypt
    const cuenta = '0000000000'; // Placeholder - en producción descifrar
    const bancoCodigo = obtenerCodigoBanco(n.banco || banco);
    
    rows.push([
      '1', // Tipo registro: pago
      bancoCodigo.padStart(4, '0'), // Código banco
      '00', // DC
      cuenta.padStart(10, '0'), // Cuenta
      n.cedula, // Cédula
      `${n.apellidos} ${n.nombres}`.substring(0, 40), // Nombre
      `NOMINA ${String(mes).padStart(2, '0')}/${anio}`.substring(0, 40), // Concepto
      `${anio}${String(mes).padStart(2, '0')}28`, // Fecha operación (último día)
      parseFloat(n.neto_recibir).toFixed(2), // Importe
      `NOM${tenantId.substring(0, 8)}${String(index + 1).padStart(4, '0')}` // Referencia
    ]);
    
    totalPagos += parseFloat(n.neto_recibir);
  });
  
  // Total
  rows.push([
    '9', // Tipo registro: total
    '', '', '', '', '', '', '',
    totalPagos.toFixed(2),
    nominasResult.rows.length.toString()
  ]);
  
  // 4. Convertir a CSV
  const csvContent = rows.map(row => row.join(';')).join('\\n');
  
  // 5. Subir a S3
  const key = `reportes/${tenantId}/banco/PAGO_NOMINA_${anio}${String(mes).padStart(2, '0')}_${banco}.csv`;
  const url = await s3Upload(Buffer.from(csvContent, 'utf8'), key, 'text/csv');
  
  // 6. También generar Excel
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Pagos');
  
  sheet.columns = [
    { header: 'Cédula', key: 'cedula', width: 15 },
    { header: 'Nombre', key: 'nombre', width: 40 },
    { header: 'Banco', key: 'banco', width: 15 },
    { header: 'Cuenta', key: 'cuenta', width: 15 },
    { header: 'Monto', key: 'monto', width: 12 },
  ];
  
  nominasResult.rows.forEach(n => {
    sheet.addRow({
      cedula: n.cedula,
      nombre: `${n.apellidos} ${n.nombres}`,
      banco: n.banco || banco,
      cuenta: '****', // No mostrar cuenta completa
      monto: parseFloat(n.neto_recibir),
    });
  });
  
  const excelBuffer = await workbook.xlsx.writeBuffer();
  const excelKey = `reportes/${tenantId}/banco/PAGO_NOMINA_${anio}${String(mes).padStart(2, '0')}.xlsx`;
  const excelUrl = await s3Upload(excelBuffer, excelKey, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  
  console.log(`[BANCO] Archivo generado para ${tenantId} - ${mes}/${anio}: ${nominasResult.rows.length} pagos, total $${totalPagos.toFixed(2)}`);
  
  return { csvUrl: url, excelUrl, totalPagos: totalPagos.toFixed(2), totalEmpleados: nominasResult.rows.length };
}

/**
 * Obtiene código del banco
 */
function obtenerCodigoBanco(banco) {
  const bancos = {
    'PICHINCHA': '2011',
    'GUAYAQUIL': '2009',
    'PRODUBANCO': '2017',
    'INTERNACIONAL': '2021',
    'AUSTRO': '2003',
    'MANABI': '2013',
    'LOJA': '2012',
    'DEL_LITTORAL': '2007',
    'MUTUALISTA_PICHINCHA': '2901',
  };
  return bancos[banco.toUpperCase()] || '0000';
}

module.exports = { generarArchivoBanco };
'''

with open('backend/src/services/bancoAebGenerator.js', 'w') as f:
    f.write(banco_aeb_generator)

# Crear servicio de liquidación (finiquito)
liquidacion_service = '''// ============================================================
// PLAN HAIKY - Servicio de Liquidación (Finiquito)
// Cálculo de haberes al terminar relación laboral
// ============================================================
const db = require('../config/database');
const { generarActaFiniquito } = require('./templateGenerator');

/**
 * Calcula la liquidación de un empleado
 */
async function calcularLiquidacion(empleadoId, tenantId, causaTerminacion) {
  // 1. Obtener datos del empleado
  const empResult = await db.query(`
    SELECT * FROM empleados WHERE id = $1 AND tenant_id = $2
  `, [empleadoId, tenantId]);
  
  if (empResult.rows.length === 0) throw new Error('Empleado no encontrado');
  const emp = empResult.rows[0];
  
  // 2. Obtener datos del tenant
  const tenantResult = await db.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
  const tenant = tenantResult.rows[0];
  
  // 3. Calcular tiempo de servicio
  const fechaIngreso = new Date(emp.fecha_ingreso);
  const fechaSalida = new Date();
  const aniosServicio = (fechaSalida - fechaIngreso) / (1000 * 60 * 60 * 24 * 365.25);
  const mesesServicio = Math.floor(aniosServicio * 12);
  const diasServicio = Math.floor((fechaSalida - fechaIngreso) / (1000 * 60 * 60 * 24));
  
  // 4. Calcular sueldo pendiente (días del último mes)
  const ultimoDiaMes = new Date(fechaSalida.getFullYear(), fechaSalida.getMonth() + 1, 0).getDate();
  const diasMesActual = fechaSalida.getDate();
  const sueldoDiario = parseFloat(emp.sueldo_bruto_mensual) / 30;
  const sueldoPendiente = sueldoDiario * diasMesActual;
  
  // 5. Calcular décimo tercero proporcional
  const decimoTercero = parseFloat(emp.sueldo_bruto_mensual) * (mesesServicio % 12) / 12;
  
  // 6. Calcular décimo cuarto proporcional
  const decimoCuarto = 460 * (diasServicio % 365) / 365; // $460 anuales (2026)
  
  // 7. Calcular vacaciones proporcionales
  // 1 mes de sueldo por cada 2 años = 1/24 del sueldo mensual por mes trabajado
  const vacaciones = parseFloat(emp.sueldo_bruto_mensual) * mesesServicio / 24;
  
  // 8. Calcular indemnización por despido intempestivo (si aplica)
  let indemnizacion = 0;
  if (causaTerminacion === 'despido_intempestivo') {
    // Art. 188 Código del Trabajo
    if (aniosServicio < 3) {
      indemnizacion = parseFloat(emp.sueldo_bruto_mensual) * 3; // 3 meses
    } else if (aniosServicio < 5) {
      indemnizacion = parseFloat(emp.sueldo_bruto_mensual) * 4; // 4 meses
    } else {
      // 1 mes por cada año de servicio a partir del 5to
      indemnizacion = parseFloat(emp.sueldo_bruto_mensual) * Math.max(4, Math.floor(aniosServicio));
    }
  }
  
  // 9. Calcular desahucio (si aplica)
  let desahucio = 0;
  if (causaTerminacion === 'desahucio') {
    // Art. 185 Código del Trabajo: 25% del último sueldo por cada año
    desahucio = parseFloat(emp.sueldo_bruto_mensual) * 0.25 * Math.floor(aniosServicio);
  }
  
  // 10. Total liquidación
  const total = sueldoPendiente + decimoTercero + decimoCuarto + vacaciones + indemnizacion + desahucio;
  
  // 11. VALIDACIÓN REGLA IRRENUNCIABLE: Verificar devolución de equipos
  const equiposPendientes = await verificarDevolucionEquipos(empleadoId, tenantId);
  if (equiposPendientes > 0) {
    throw new Error(`VIOLACION_REGLA_IRRENUNCIABLE: El empleado tiene ${equiposPendientes} equipos sin devolver. No se puede generar el acta de finiquito.`);
  }
  
  // 12. Actualizar empleado como inactivo
  await db.query(`
    UPDATE empleados SET 
      activo = false, 
      fecha_salida = CURRENT_DATE,
      causa_salida = $1
    WHERE id = $2
  `, [causaTerminacion, empleadoId]);
  
  // 13. Generar acta de finiquito
  const liquidacion = {
    sueldoPendiente: sueldoPendiente.toFixed(2),
    decimoTercero: decimoTercero.toFixed(2),
    decimoCuarto: decimoCuarto.toFixed(2),
    vacaciones: vacaciones.toFixed(2),
    indemnizacion: indemnizacion.toFixed(2),
    desahucio: desahucio.toFixed(2),
    total: total.toFixed(2),
  };
  
  const actaUrl = await generarActaFiniquito(emp, tenant, causaTerminacion, liquidacion);
  
  return {
    empleadoId,
    nombre: `${emp.nombres} ${emp.apellidos}`,
    cedula: emp.cedula,
    aniosServicio: aniosServicio.toFixed(2),
    liquidacion,
    actaUrl,
  };
}

/**
 * Verifica si el empleado tiene equipos sin devolver
 */
async function verificarDevolucionEquipos(empleadoId, tenantId) {
  const result = await db.query(`
    SELECT COUNT(*) as pendientes FROM acta_entrega_equipos
    WHERE empleado_id = $1 AND tenant_id = $2 AND tipo = 'entrega'
    AND NOT EXISTS (
      SELECT 1 FROM acta_entrega_equipos d
      WHERE d.empleado_id = $1 AND d.tipo = 'devolucion'
      AND d.items @> acta_entrega_equipos.items
    )
  `, [empleadoId, tenantId]);
  
  return parseInt(result.rows[0].pendientes) || 0;
}

module.exports = { calcularLiquidacion };
'''

with open('backend/src/services/liquidacionService.js', 'w') as f:
    f.write(liquidacion_service)

print("✓ Generador de archivo bancario y servicio de liquidación creados")
 # Result 
✓ Generador de archivo bancario y servicio de liquidación creados
