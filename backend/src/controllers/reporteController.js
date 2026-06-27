// ============================================================
// Nomina-Ec - Controlador de Reportes
// ============================================================
const { generarXML_RDEP, precheckRDEP } = require('../services/sriRdepGenerator');
const { generarXML_SAE } = require('../services/iessSaeGenerator');
const { generarArchivoBanco, precheckArchivoBanco } = require('../services/bancoAebGenerator');
const { generarReporteNomina } = require('../services/payrollReportService');
const {
  generarFormulario107,
  precheckFormulario107,
} = require('../services/sriFormulario107Service');
const db = require('../config/database');
const { assertCapability, getTenantPlanCapabilities } = require('../services/planCapabilityService');

async function generarRDEP(req, res) {
  try {
    const { tenantId } = req;
    const { anio, mes } = req.body;

    if (!anio || !mes) {
      return res.status(400).json({ error: 'Anio y mes requeridos', correlationId: req.correlationId });
    }

    const resultado = await generarXML_RDEP(tenantId, anio, mes);
    return res.json({ success: true, reporte: resultado, correlationId: req.correlationId });
  } catch (err) {
    console.error('[REPORTES] Error RDEP', {
      code: err.code || 'REPORTE_RDEP_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({ error: err.message, correlationId: req.correlationId });
  }
}

async function validarRDEP(req, res) {
  try {
    const { tenantId } = req;
    const { anio, mes } = req.body;

    if (!anio || !mes) {
      return res.status(400).json({ error: 'Anio y mes requeridos', correlationId: req.correlationId });
    }

    const resultado = await precheckRDEP(tenantId, anio, mes);
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
    const { anio, mes } = req.body;

    if (!anio || !mes) {
      return res.status(400).json({ error: 'Anio y mes requeridos', correlationId: req.correlationId });
    }

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

async function validarFormulario107(req, res) {
  try {
    const { tenantId } = req;
    const { anio, empleadoId } = req.body;

    if (!anio || !empleadoId) {
      return res.status(400).json({
        error: 'FORM107_PARAMETROS_REQUERIDOS',
        message: 'Anio y empleado son requeridos para validar Formulario 107.',
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
        message: 'Anio y empleado son requeridos para generar Formulario 107.',
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
    const { anio, mes, banco } = req.body;

    if (!anio || !mes) {
      return res.status(400).json({ error: 'Anio y mes requeridos', correlationId: req.correlationId });
    }

    await assertCapability(tenantId, 'bankFiles', {
      userId: req.usuarioId,
      correlationId: req.correlationId,
    });

    const resultado = await generarArchivoBanco(tenantId, anio, mes, banco, {
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
    const { anio, mes, banco } = req.body;

    if (!anio || !mes) {
      return res.status(400).json({ error: 'Anio y mes requeridos', correlationId: req.correlationId });
    }

    const [capabilities, precheck] = await Promise.all([
      getTenantPlanCapabilities(tenantId),
      precheckArchivoBanco(tenantId, anio, mes, banco),
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
    const { anio, mes } = req.params;
    const { tenantId } = req;
    const result = await db.query(`
      SELECT
        e.id as empleado_id,
        e.cedula,
        e.nombres || ' ' || e.apellidos as nombre,
        COUNT(DISTINCT DATE(m.timestamp)) as dias_trabajados,
        SUM(CASE WHEN m.tipo_marcacion = 'inicio_jornada' THEN 1 ELSE 0 END) as marcaciones_inicio,
        SUM(CASE WHEN m.tipo_marcacion = 'fin_jornada' THEN 1 ELSE 0 END) as marcaciones_fin,
        COUNT(n.id) as novedades,
        COALESCE(SUM(CASE WHEN n.tipo_novedad = 'atraso' THEN n.minutos ELSE 0 END), 0) as minutos_atraso,
        COALESCE(SUM(CASE WHEN n.tipo_novedad = 'hora_extra_50' THEN n.minutos ELSE 0 END), 0) as minutos_extra_50,
        COALESCE(SUM(CASE WHEN n.tipo_novedad = 'hora_extra_100' THEN n.minutos ELSE 0 END), 0) as minutos_extra_100
      FROM empleados e
      LEFT JOIN marcaciones m ON e.id = m.empleado_id
        AND EXTRACT(YEAR FROM m.timestamp) = $2
        AND EXTRACT(MONTH FROM m.timestamp) = $3
      LEFT JOIN novedades_asistencia n ON e.id = n.empleado_id
        AND EXTRACT(YEAR FROM n.fecha) = $2
        AND EXTRACT(MONTH FROM n.fecha) = $3
        AND n.estado = 'aprobado'
      WHERE e.tenant_id = $1 AND e.activo = true
      GROUP BY e.id, e.cedula, e.nombres, e.apellidos
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
    const { anio, mes, reportCode, format, filters } = req.body;

    if (!anio || !mes) {
      return res.status(400).json({ error: 'Anio y mes requeridos', correlationId: req.correlationId });
    }

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
    console.error('[REPORTES] Error exportando nomina', {
      code: err.code || 'REPORTE_NOMINA_EXPORT_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({ error: err.message, correlationId: req.correlationId });
  }
}

module.exports = {
  generarRDEP,
  validarRDEP,
  generarFormulario107: generarFormulario107Ctrl,
  validarFormulario107,
  generarSAE,
  generarArchivoBanco: generarArchivoBancoCtrl,
  validarArchivoBanco,
  reporteAsistencia,
  exportarNomina,
};
