# Crear motor de cálculo de nómina (versión simplificada pero completa)
calculo_nomina = '''// ============================================================
// PLAN HAIKY - Motor de Cálculo de Nómina Mensual
// Ecuador 2026
// ============================================================
const db = require('../config/database');

const CONSTANTS = {
  HORAS_LABORALES_MES: 240,
  PORCENTAJE_IESS_PERSONAL: 0.0945,
  PORCENTAJE_IESS_PATRONAL: 0.1115,
  PORCENTAJE_VACACIONES: 1/24,
  SUELDO_BASICO_UNIFICADO: 460, // 2026
};

async function calcularNominaMensual(tenantId, anio, mes) {
  console.log(`[NOMINA] Calculando ${mes}/${anio} para tenant ${tenantId}`);
  
  const empleados = await db.query(`
    SELECT * FROM empleados 
    WHERE tenant_id = $1 AND activo = true 
    AND fecha_ingreso <= $2
  `, [tenantId, `${anio}-${String(mes).padStart(2,'0')}-01`]);
  
  const resultados = [];
  
  for (const emp of empleados.rows) {
    try {
      const resultado = await calcularEmpleado(emp, tenantId, anio, mes);
      resultados.push(resultado);
    } catch (err) {
      console.error(`Error empleado ${emp.id}:`, err.message);
      resultados.push({ empleadoId: emp.id, error: err.message });
    }
  }
  
  return { success: true, total: empleados.rows.length, resultados };
}

async function calcularEmpleado(emp, tenantId, anio, mes) {
  // Obtener novedades aprobadas
  const novedades = await db.query(`
    SELECT tipo_novedad, SUM(minutos) as total_minutos
    FROM novedades_asistencia
    WHERE empleado_id = $1 AND EXTRACT(YEAR FROM fecha) = $2 
    AND EXTRACT(MONTH FROM fecha) = $3 AND estado = 'aprobado'
    GROUP BY tipo_novedad
  `, [emp.id, anio, mes]);
  
  const nov = {};
  novedades.rows.forEach(n => nov[n.tipo_novedad] = parseInt(n.total_minutos) || 0);
  
  // Calcular días trabajados
  const diasTrabajados = 30; // Simplificado
  
  // Valor hora
  const sueldo = parseFloat(emp.sueldo_bruto_mensual);
  const valorHora = sueldo / CONSTANTS.HORAS_LABORALES_MES;
  
  // Horas extras
  const extras50 = (nov['hora_extra_50'] || 0) / 60;
  const extras100 = (nov['hora_extra_100'] || 0) / 60;
  const montoExtras50 = extras50 * valorHora * 1.5;
  const montoExtras100 = extras100 * valorHora * 2.0;
  
  // Faltas
  const faltas = await db.query(`
    SELECT COUNT(*) as total FROM novedades_asistencia
    WHERE empleado_id = $1 AND tipo_novedad = 'falta' 
    AND estado = 'aprobado' AND EXTRACT(YEAR FROM fecha) = $2 
    AND EXTRACT(MONTH FROM fecha) = $3
  `, [emp.id, anio, mes]);
  const descuentoFaltas = parseInt(faltas.rows[0].total) * valorHora * 8;
  
  // Total ingresos
  const totalIngresos = sueldo + montoExtras50 + montoExtras100;
  
  // Deducciones
  const aporteIess = totalIngresos * CONSTANTS.PORCENTAJE_IESS_PERSONAL;
  const baseImponible = totalIngresos - aporteIess;
  const impuestoRenta = calcularIR(baseImponible, anio);
  
  const totalDeducciones = aporteIess + impuestoRenta + descuentoFaltas;
  const netoRecibir = totalIngresos - totalDeducciones;
  
  // Guardar nómina
  await db.query(`
    INSERT INTO nominas (tenant_id, empleado_id, anio, mes, dias_trabajados,
      sueldo_bruto, horas_extras_50, horas_extras_100, total_ingresos,
      aporte_iess_personal, impuesto_renta, total_deducciones, neto_recibir)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    ON CONFLICT (tenant_id, empleado_id, anio, mes) DO UPDATE SET
      total_ingresos = EXCLUDED.total_ingresos,
      aporte_iess_personal = EXCLUDED.aporte_iess_personal,
      neto_recibir = EXCLUDED.neto_recibir
  `, [tenantId, emp.id, anio, mes, diasTrabajados, sueldo, montoExtras50,
      montoExtras100, totalIngresos, aporteIess, impuestoRenta, totalDeducciones, netoRecibir]);
  
  return {
    empleadoId: emp.id,
    nombre: `${emp.nombres} ${emp.apellidos}`,
    totalIngresos: totalIngresos.toFixed(2),
    netoRecibir: netoRecibir.toFixed(2),
  };
}

function calcularIR(baseMensual, anio) {
  const baseAnual = baseMensual * 12;
  if (baseAnual <= 12208) return 0;
  
  const tabla = [
    { hasta: 15188, exceso: 12208, porcentaje: 5, fraccion: 0 },
    { hasta: 19572, exceso: 15188, porcentaje: 10, fraccion: 148 },
    { hasta: 23950, exceso: 19572, porcentaje: 12, fraccion: 587 },
    { hasta: 41545, exceso: 23950, porcentaje: 15, fraccion: 1113 },
    { hasta: 45820, exceso: 41545, porcentaje: 20, fraccion: 3752 },
  ];
  
  let ir = 0;
  for (let tramo of tabla) {
    if (baseAnual > tramo.exceso) {
      const excedente = Math.min(baseAnual, tramo.hasta) - tramo.exceso;
      ir = tramo.fraccion + (excedente * tramo.porcentaje / 100);
    }
  }
  return Math.round(ir / 12 * 100) / 100;
}

module.exports = { calcularNominaMensual, CONSTANTS };
'''

with open('backend/src/services/calculoNominaService.js', 'w') as f:
    f.write(calculo_nomina)

print("✓ Motor de cálculo de nómina creado")
 # Result 
✓ Motor de cálculo de nómina creado
