// ============================================================
// PLAN HAIKY - Motor de Cálculo de Nómina Mensual
// Ecuador 2026
// ============================================================
const db = require('../config/database');
const { getLegalParameters } = require('../config/legal-ecuador');
const { roundMoney, toMoneyString } = require('../utils/money');

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
  const legalParameters = getLegalParameters(anio);
  const payrollParameters = legalParameters.payroll;
  const sueldo = parseFloat(emp.sueldo_bruto_mensual);
  const valorHora = sueldo / payrollParameters.monthlyWorkHours;
  
  // Horas extras
  const extras50 = (nov['hora_extra_50'] || 0) / 60;
  const extras100 = (nov['hora_extra_100'] || 0) / 60;
  const montoExtras50 = roundMoney(extras50 * valorHora * 1.5);
  const montoExtras100 = roundMoney(extras100 * valorHora * 2.0);
  
  // Faltas
  const faltas = await db.query(`
    SELECT COUNT(*) as total FROM novedades_asistencia
    WHERE empleado_id = $1 AND tipo_novedad = 'falta' 
    AND estado = 'aprobado' AND EXTRACT(YEAR FROM fecha) = $2 
    AND EXTRACT(MONTH FROM fecha) = $3
  `, [emp.id, anio, mes]);
  const descuentoFaltas = roundMoney(parseInt(faltas.rows[0].total) * valorHora * payrollParameters.dailyMaxHours);
  
  // Total ingresos
  const totalIngresos = roundMoney(sueldo + montoExtras50 + montoExtras100);
  
  // Deducciones
  const aporteIess = roundMoney(totalIngresos * payrollParameters.personalIessRate);
  const baseImponible = roundMoney(totalIngresos - aporteIess);
  const impuestoRenta = calcularIR(baseImponible, anio);
  
  const totalDeducciones = roundMoney(aporteIess + impuestoRenta + descuentoFaltas);
  const netoRecibir = roundMoney(totalIngresos - totalDeducciones);
  
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
    totalIngresos: toMoneyString(totalIngresos),
    netoRecibir: toMoneyString(netoRecibir),
  };
}

function calcularIR(baseMensual, anio) {
  const legalParameters = getLegalParameters(anio);
  const baseAnual = baseMensual * 12;
  let annualTax = 0;

  for (const bracket of legalParameters.incomeTax) {
    const upperLimit = bracket.to || Number.POSITIVE_INFINITY;

    if (baseAnual > bracket.from && baseAnual <= upperLimit) {
      annualTax = bracket.baseTax + ((baseAnual - bracket.from) * bracket.rate);
      break;
    }
  }

  return roundMoney(annualTax / 12);
}

module.exports = { calcularNominaMensual };

