// ============================================================
// SKNOMINA - Controlador de Reportes
// ============================================================
const { generarXML_RDEP, precheckRDEP } = require('../services/sriRdepGenerator');
const { generarXML_SAE, precheckSAE } = require('../services/iessSaeGenerator');
const { generarArchivoBanco, precheckArchivoBanco } = require('../services/bancoAebGenerator');
const {
  generarConsolidadoAnualNomina,
  generarReporteNomina,
} = require('../services/payrollReportService');
const {
  generarFormulario107,
  precheckFormulario107,
} = require('../services/sriFormulario107Service');
const db = require('../config/database');
const { assertCapability, getTenantPlanCapabilities } = require('../services/planCapabilityService');

function normalizeRequiredBankCode(banco) {
  return String(banco || '').trim().toUpperCase();
}

function requireFiscalYear(req, res, action) {
  const anio = Number(req.body.anio);
  if (!Number.isInteger(anio) || anio < 2020 || anio > 2100) {
    res.status(400).json({
      error: 'ANIO_FISCAL_REQUERIDO',
      message: `Selecciona el año fiscal para ${action}.`,
      correlationId: req.correlationId,
    });
    return null;
  }
  return anio;
}

function requirePeriod(req, res) {
  const anio = Number(req.body.anio);
  const mes = Number(req.body.mes);
  if (!Number.isInteger(anio) || anio < 2020 || anio > 2100) {
    res.status(400).json({
      error: 'PERIODO_ANIO_INVALIDO',
      message: 'Selecciona un año válido para el período.',
      correlationId: req.correlationId,
    });
    return null;
  }
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    res.status(400).json({
      error: 'PERIODO_MES_INVALIDO',
      message: 'Selecciona un mes válido entre 1 y 12.',
      correlationId: req.correlationId,
    });
    return null;
  }
  return { anio, mes };
}

async function generarRDEP(req, res) {
  try {
    const { tenantId } = req;
    const anio = requireFiscalYear(req, res, 'generar RDEP');
    if (!anio) return null;

    const resultado = await generarXML_RDEP(tenantId, anio);
    return res.json({ success: true, reporte: resultado, correlationId: req.correlationId });
  } catch (err) {
    console.error('[REPORTES] Error RDEP', {
      code: err.code || 'REPORTE_RDEP_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'REPORTE_RDEP_ERROR',
      message: err.message,
      details: err.details,
      correlationId: req.correlationId,
    });
  }
}

async function validarRDEP(req, res) {
  try {
    const { tenantId } = req;
    const anio = requireFiscalYear(req, res, 'validar RDEP');
    if (!anio) return null;

    const resultado = await precheckRDEP(tenantId, anio);
    return res.json({ success: true, precheck: resultado, correlationId: req.correlationId });
  } catch (err) {
    console.error('[REPORTES] Error precheck RDEP', {
      code: err.code || 'RDEP_PRECHECK_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({ error: err.message, details: err.details, correlationId: req.correlationId });
  }
}

async function generarSAE(req, res) {
  try {
    const { tenantId } = req;
    const period = requirePeriod(req, res);
    if (!period) return null;
    const { anio, mes } = period;

    const resultado = await generarXML_SAE(tenantId, anio, mes);
    res.json({ success: true, reporte: resultado, correlationId: req.correlationId });
  } catch (err) {
    console.error('[REPORTES] Error SAE', {
      code: err.code || 'REPORTE_SAE_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    res.status(err.statusCode || 500).json({ error: err.message, correlationId: req.correlationId });
  }
}

async function validarSAE(req, res) {
  try {
    const { tenantId } = req;
    const period = requirePeriod(req, res);
    if (!period) return null;
    const { anio, mes } = period;

    const resultado = await precheckSAE(tenantId, anio, mes);
    return res.json({ success: true, precheck: resultado, correlationId: req.correlationId });
  } catch (err) {
    console.error('[REPORTES] Error precheck SAE', {
      code: err.code || 'SAE_PRECHECK_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'SAE_PRECHECK_ERROR',
      message: err.message,
      details: err.details,
      correlationId: req.correlationId,
    });
  }
}

async function validarFormulario107(req, res) {
  try {
    const { tenantId } = req;
    const { anio, empleadoId } = req.body;

    if (!anio || !empleadoId) {
      return res.status(400).json({
        error: 'FORM107_PARAMETROS_REQUERIDOS',
        message: 'Año y empleado son requeridos para validar Formulario 107.',
        correlationId: req.correlationId,
      });
    }

    const resultado = await precheckFormulario107({ tenantId, anio, empleadoId });
    return res.json({ success: true, precheck: resultado, correlationId: req.correlationId });
  } catch (err) {
    console.error('[REPORTES] Error precheck Formulario 107', {
      code: err.code || 'FORM107_PRECHECK_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'FORM107_PRECHECK_ERROR',
      message: err.message,
      details: err.details,
      correlationId: req.correlationId,
    });
  }
}

async function generarFormulario107Ctrl(req, res) {
  try {
    const { tenantId } = req;
    const { anio, empleadoId } = req.body;

    if (!anio || !empleadoId) {
      return res.status(400).json({
        error: 'FORM107_PARAMETROS_REQUERIDOS',
        message: 'Año y empleado son requeridos para generar Formulario 107.',
        correlationId: req.correlationId,
      });
    }

    const resultado = await generarFormulario107({
      tenantId,
      anio,
      empleadoId,
      context: {
        correlationId: req.correlationId,
        userId: req.usuarioId,
        ipAddress: req.ip,
      },
    });
    return res.json({ success: true, reporte: resultado, correlationId: req.correlationId });
  } catch (err) {
    console.error('[REPORTES] Error Formulario 107', {
      code: err.code || 'FORM107_GENERATE_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'FORM107_GENERATE_ERROR',
      message: err.message,
      details: err.details,
      correlationId: req.correlationId,
    });
  }
}

async function generarArchivoBancoCtrl(req, res) {
  try {
    const { tenantId } = req;
    const { banco } = req.body;

    const period = requirePeriod(req, res);
    if (!period) return null;
    const { anio, mes } = period;
    const bancoCodigo = normalizeRequiredBankCode(banco);
    if (!bancoCodigo) {
      return res.status(400).json({
        error: 'BANCO_REQUERIDO',
        message: 'Selecciona el banco antes de generar el archivo de pago.',
        correlationId: req.correlationId,
      });
    }

    await assertCapability(tenantId, 'bankFiles', {
      userId: req.usuarioId,
      correlationId: req.correlationId,
    });

    const resultado = await generarArchivoBanco(tenantId, anio, mes, bancoCodigo, {
      correlationId: req.correlationId,
      userId: req.usuarioId,
      ipAddress: req.ip,
    });

    res.json({ success: true, reporte: resultado, correlationId: req.correlationId });
  } catch (err) {
    console.error('[REPORTES] Error Banco', {
      code: err.code || 'REPORTE_BANCO_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    res.status(err.statusCode || 500).json({ error: err.message, correlationId: req.correlationId });
  }
}

async function validarArchivoBanco(req, res) {
  try {
    const { tenantId } = req;
    const { banco } = req.body;

    const period = requirePeriod(req, res);
    if (!period) return null;
    const { anio, mes } = period;
    const bancoCodigo = normalizeRequiredBankCode(banco);
    if (!bancoCodigo) {
      return res.status(400).json({
        error: 'BANCO_REQUERIDO',
        message: 'Selecciona el banco antes de validar el archivo de pago.',
        correlationId: req.correlationId,
      });
    }

    const [capabilities, precheck] = await Promise.all([
      getTenantPlanCapabilities(tenantId),
      precheckArchivoBanco(tenantId, anio, mes, bancoCodigo),
    ]);
    const planCheck = {
      code: 'plan_archivos_bancarios',
      label: 'Plan con archivos bancarios',
      passed: Boolean(capabilities.allowed.bankFiles),
      detail: capabilities.planNombre,
    };

    const result = {
      ...precheck,
      ready: precheck.ready && planCheck.passed,
      checks: [planCheck, ...precheck.checks],
    };

    return res.json({ success: true, precheck: result, correlationId: req.correlationId });
  } catch (err) {
    console.error('[REPORTES] Error precheck Banco', {
      code: err.code || 'BANCO_PRECHECK_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({ error: err.message, correlationId: req.correlationId });
  }
}

async function reporteAsistencia(req, res) {
  try {
    const anio = Number(req.params.anio);
    const mes = Number(req.params.mes);
    const { tenantId } = req;
    if (!Number.isInteger(anio) || anio < 2020 || anio > 2100 || !Number.isInteger(mes) || mes < 1 || mes > 12) {
      return res.status(400).json({
        error: 'PERIODO_INVALIDO',
        message: 'Selecciona un mes y año válidos para consultar la asistencia.',
        correlationId: req.correlationId,
      });
    }
    const result = await db.query(`
      WITH limites AS (
        SELECT
          make_date($2::int, $3::int, 1) AS fecha_desde,
          (make_date($2::int, $3::int, 1) + INTERVAL '1 month')::date AS fecha_hasta
      ), asistencia AS (
        SELECT
          m.empleado_id,
          COUNT(DISTINCT COALESCE(
            m.operational_date,
            DATE(m.timestamp AT TIME ZONE 'America/Guayaquil')
          ))::int AS dias_con_marcacion,
          COUNT(*) FILTER (WHERE m.tipo_marcacion = 'inicio_jornada')::int AS marcaciones_inicio,
          COUNT(*) FILTER (WHERE m.tipo_marcacion = 'fin_jornada')::int AS marcaciones_fin
        FROM marcaciones m
        CROSS JOIN limites l
        WHERE m.tenant_id = $1
          AND COALESCE(m.operational_date, DATE(m.timestamp AT TIME ZONE 'America/Guayaquil')) >= l.fecha_desde
          AND COALESCE(m.operational_date, DATE(m.timestamp AT TIME ZONE 'America/Guayaquil')) < l.fecha_hasta
        GROUP BY m.empleado_id
      ), novedades AS (
        SELECT
          n.empleado_id,
          COUNT(*)::int AS novedades,
          COUNT(*) FILTER (WHERE n.tipo_novedad = 'falta')::int AS faltas_aprobadas,
          COALESCE(SUM(n.minutos) FILTER (WHERE n.tipo_novedad = 'atraso'), 0)::int AS minutos_tardia,
          COALESCE(SUM(n.minutos) FILTER (WHERE n.tipo_novedad = 'hora_extra_50'), 0)::int AS minutos_extra_50,
          COALESCE(SUM(n.minutos) FILTER (WHERE n.tipo_novedad = 'hora_extra_100'), 0)::int AS minutos_extra_100,
          COALESCE(SUM(n.minutos) FILTER (WHERE n.tipo_novedad = 'hora_extra_nocturna'), 0)::int AS minutos_extra_nocturna
        FROM novedades_asistencia n
        CROSS JOIN limites l
        WHERE n.tenant_id = $1
          AND n.fecha >= l.fecha_desde
          AND n.fecha < l.fecha_hasta
          AND n.estado = 'aprobado'
        GROUP BY n.empleado_id
      )
      SELECT
        e.id AS empleado_id,
        e.cedula,
        e.apellidos || ' ' || e.nombres AS nombre,
        e.controla_asistencia,
        COALESCE(a.dias_con_marcacion, 0) AS dias_con_marcacion,
        COALESCE(a.marcaciones_inicio, 0) AS marcaciones_inicio,
        COALESCE(a.marcaciones_fin, 0) AS marcaciones_fin,
        COALESCE(n.novedades, 0) AS novedades,
        COALESCE(n.faltas_aprobadas, 0) AS faltas_aprobadas,
        COALESCE(n.minutos_tardia, 0) AS minutos_tardia,
        COALESCE(n.minutos_extra_50, 0) AS minutos_extra_50,
        COALESCE(n.minutos_extra_100, 0) AS minutos_extra_100,
        COALESCE(n.minutos_extra_nocturna, 0) AS minutos_extra_nocturna,
        ROUND(COALESCE(n.minutos_extra_50, 0)::numeric / 60, 2) AS horas_extra_50,
        ROUND(COALESCE(n.minutos_extra_100, 0)::numeric / 60, 2) AS horas_extra_100,
        ROUND(COALESCE(n.minutos_extra_nocturna, 0)::numeric / 60, 2) AS horas_extra_nocturna
      FROM empleados e
      CROSS JOIN limites l
      LEFT JOIN asistencia a ON a.empleado_id = e.id
      LEFT JOIN novedades n ON n.empleado_id = e.id
      WHERE e.tenant_id = $1
        AND e.fecha_ingreso < l.fecha_hasta
        AND (e.fecha_salida IS NULL OR e.fecha_salida >= l.fecha_desde)
      ORDER BY e.apellidos, e.nombres
    `, [tenantId, anio, mes]);

    res.json({ success: true, reporte: result.rows, correlationId: req.correlationId });
  } catch (err) {
    console.error('[REPORTES] Error asistencia', {
      code: err.code || 'REPORTE_ASISTENCIA_ERROR',
      statusCode: 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    res.status(500).json({ error: 'Error interno', correlationId: req.correlationId });
  }
}

async function exportarNomina(req, res) {
  try {
    const { tenantId } = req;
    const { reportCode, format, filters } = req.body;

    const period = requirePeriod(req, res);
    if (!period) return null;
    const { anio, mes } = period;

    await assertCapability(tenantId, 'advancedReports', {
      userId: req.usuarioId,
      correlationId: req.correlationId,
    });

    const resultado = await generarReporteNomina({
      tenantId,
      anio,
      mes,
      reportCode,
      format,
      filters: filters || {},
      context: {
        correlationId: req.correlationId,
        userId: req.usuarioId,
        ipAddress: req.ip,
      },
    });

    return res.json({ success: true, reporte: resultado, correlationId: req.correlationId });
  } catch (err) {
    console.error('[REPORTES] Error exportando nómina', {
      code: err.code || 'REPORTE_NOMINA_EXPORT_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({ error: err.message, correlationId: req.correlationId });
  }
}

async function exportarConsolidadoAnual(req, res) {
  try {
    const { tenantId } = req;
    const anio = Number(req.params.anio);
    const { reportCode, filters } = req.query;

    if (!Number.isInteger(anio) || anio < 2020 || anio > 2100) {
      return res.status(400).json({
        error: 'PERIODO_ANIO_INVALIDO',
        message: 'Selecciona un año válido para el consolidado anual.',
        correlationId: req.correlationId,
      });
    }

    await assertCapability(tenantId, 'advancedReports', {
      userId: req.usuarioId,
      correlationId: req.correlationId,
    });

    const parsedFilters = filters ? JSON.parse(filters) : {};
    const resultado = await generarConsolidadoAnualNomina({
      tenantId,
      anio,
      reportCode: reportCode || 'PAYROLL_DETAIL_TABULAR',
      filters: parsedFilters,
      context: {
        correlationId: req.correlationId,
        userId: req.usuarioId,
        ipAddress: req.ip,
      },
    });

    return res.json({ success: true, reporte: resultado, correlationId: req.correlationId });
  } catch (err) {
    console.error('[REPORTES] Error exportando consolidado anual de nómina', {
      code: err.code || 'REPORTE_NOMINA_ANUAL_EXPORT_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'REPORTE_NOMINA_ANUAL_EXPORT_ERROR',
      message: err.message,
      correlationId: req.correlationId,
    });
  }
}

module.exports = {
  generarRDEP,
  validarRDEP,
  generarFormulario107: generarFormulario107Ctrl,
  validarFormulario107,
  generarSAE,
  validarSAE,
  generarArchivoBanco: generarArchivoBancoCtrl,
  validarArchivoBanco,
  reporteAsistencia,
  exportarNomina,
  exportarConsolidadoAnual,
};
