// ============================================================
// SKNOMINA - Controlador de Reportes
// ============================================================
const { generarXML_RDEP, precheckRDEP } = require('../services/sriRdepGenerator');
const { generarXML_SAE, precheckSAE } = require('../services/iessSaeGenerator');
const { generarArchivoBanco, precheckArchivoBanco } = require('../services/bancoAebGenerator');
const {
  generarConsolidadoAnualNomina,
  generarReporteNomina,
  getReportColumnCatalog,
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

function noveltyReportPeriod(req) {
  const anio = Number(req.params.anio);
  const mes = Number(req.params.mes);
  if (!Number.isInteger(anio) || anio < 2020 || anio > 2100 || !Number.isInteger(mes) || mes < 1 || mes > 12) {
    const error = new Error('Selecciona un mes y año válidos para consultar las novedades.');
    error.code = 'PERIODO_INVALIDO';
    error.statusCode = 400;
    throw error;
  }
  return { anio, mes };
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

async function getNoveltyReportRows({ tenantId, anio, mes, filters = {} }) {
  const params = [tenantId, anio, mes];
  const clauses = [
    'na.tenant_id = $1',
    'EXTRACT(YEAR FROM na.fecha) = $2',
    'EXTRACT(MONTH FROM na.fecha) = $3',
  ];

  if (filters.estado) {
    params.push(String(filters.estado).trim().toLowerCase());
    clauses.push(`na.estado = $${params.length}`);
  }
  if (filters.tipo) {
    params.push(String(filters.tipo).trim().toLowerCase());
    clauses.push(`na.tipo_novedad = $${params.length}`);
  }
  if (filters.origen === 'manual') {
    clauses.push("COALESCE(na.metadata->>'source', '') <> 'carga_masiva_novedades' AND na.novelty_batch_id IS NULL");
  } else if (filters.origen === 'carga_masiva') {
    clauses.push("(na.metadata->>'source' = 'carga_masiva_novedades' OR na.novelty_batch_id IS NOT NULL)");
  }
  if (filters.buscar) {
    params.push(`%${String(filters.buscar).trim()}%`);
    clauses.push(`(
      e.cedula ILIKE $${params.length}
      OR e.nombres ILIKE $${params.length}
      OR e.apellidos ILIKE $${params.length}
      OR na.justificacion ILIKE $${params.length}
    )`);
  }

  const result = await db.query(`
    SELECT
      na.id,
      na.empleado_id,
      e.cedula,
      e.nombres,
      e.apellidos,
      (e.nombres || ' ' || e.apellidos) AS empleado_nombre,
      na.fecha::text AS fecha,
      na.periodo_nomina,
      na.tipo_novedad,
      na.minutos,
      ROUND(na.minutos::numeric / 60, 2) AS horas,
      na.monto,
      na.justificacion,
      na.estado,
      CASE
        WHEN na.metadata->>'source' = 'carga_masiva_novedades' OR na.novelty_batch_id IS NOT NULL THEN 'carga_masiva'
        ELSE 'manual'
      END AS origen,
      na.novelty_batch_id,
      na.aprobado_por,
      approver.email AS aprobador_email,
      na.aprobado_en,
      na.created_at,
      na.updated_at,
      EXISTS (
        SELECT 1
        FROM payroll_calculation_lines pcl
        WHERE pcl.tenant_id = na.tenant_id
          AND pcl.source = 'novedad'
          AND pcl.source_id = na.id::text
      ) AS consumida_por_rol
    FROM novedades_asistencia na
    JOIN empleados e ON e.id = na.empleado_id AND e.tenant_id = na.tenant_id
    LEFT JOIN usuarios approver ON approver.id = na.aprobado_por AND approver.tenant_id = na.tenant_id
    WHERE ${clauses.join(' AND ')}
    ORDER BY na.fecha DESC, e.apellidos, e.nombres, na.created_at DESC
  `, params);

  return result.rows;
}

async function reporteNovedades(req, res) {
  try {
    const { anio, mes } = noveltyReportPeriod(req);
    const rows = await getNoveltyReportRows({
      tenantId: req.tenantId,
      anio,
      mes,
      filters: req.query || {},
    });
    const summary = rows.reduce((acc, row) => {
      const status = String(row.estado || 'pendiente');
      acc.total += 1;
      acc.porEstado[status] = (acc.porEstado[status] || 0) + 1;
      acc.totalHoras += Number(row.horas || 0);
      acc.totalMonto += Number(row.monto || 0);
      if (row.origen === 'carga_masiva') acc.cargaMasiva += 1;
      else acc.manual += 1;
      return acc;
    }, { total: 0, totalHoras: 0, totalMonto: 0, manual: 0, cargaMasiva: 0, porEstado: {} });

    return res.json({
      success: true,
      reporte: {
        periodo: { anio, mes },
        filtros: req.query || {},
        resumen: {
          ...summary,
          totalHoras: Number(summary.totalHoras.toFixed(2)),
          totalMonto: Number(summary.totalMonto.toFixed(2)),
        },
        filas: rows,
      },
      correlationId: req.correlationId,
    });
  } catch (err) {
    console.error('[REPORTES] Error reporte novedades', {
      code: err.code || 'REPORTE_NOVEDADES_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'REPORTE_NOVEDADES_ERROR',
      message: err.message || 'No pudimos consultar el reporte de novedades.',
      correlationId: req.correlationId,
    });
  }
}

async function exportarReporteNovedadesCsv(req, res) {
  try {
    const { anio, mes } = noveltyReportPeriod(req);
    const rows = await getNoveltyReportRows({ tenantId: req.tenantId, anio, mes, filters: req.query || {} });
    const headers = ['empleado', 'cedula', 'fecha', 'periodoNomina', 'tipoNovedad', 'horas', 'monto', 'estado', 'origen', 'justificacion', 'aprobador', 'consumidaPorRol'];
    const csvRows = rows.map((row) => [
      row.empleado_nombre,
      row.cedula,
      row.fecha,
      row.periodo_nomina,
      row.tipo_novedad,
      row.horas,
      row.monto,
      row.estado,
      row.origen,
      row.justificacion,
      row.aprobador_email,
      row.consumida_por_rol ? 'si' : 'no',
    ].map(csvCell).join(','));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="reporte_novedades_${anio}_${String(mes).padStart(2, '0')}.csv"`);
    return res.send(`\ufeff${[headers.join(','), ...csvRows].join('\r\n')}`);
  } catch (err) {
    console.error('[REPORTES] Error exportando novedades CSV', {
      code: err.code || 'REPORTE_NOVEDADES_CSV_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'REPORTE_NOVEDADES_CSV_ERROR',
      message: err.message || 'No pudimos exportar el reporte de novedades.',
      correlationId: req.correlationId,
    });
  }
}

function listarColumnasNomina(req, res) {
  try {
    const columns = getReportColumnCatalog(req.query.reportCode);
    return res.json({
      success: true,
      reportCode: String(req.query.reportCode || 'PAYROLL_DETAIL_TABULAR').trim().toUpperCase(),
      columns,
      correlationId: req.correlationId,
    });
  } catch (err) {
    console.error('[REPORTES] Error listando columnas de nómina', {
      code: err.code || 'REPORTE_COLUMNAS_LIST_ERROR',
      statusCode: err.statusCode || 500,
      correlationId: req.correlationId,
      userId: req.usuarioId || null,
      message: err.message,
    });
    return res.status(err.statusCode || 500).json({
      error: err.code || 'REPORTE_COLUMNAS_LIST_ERROR',
      message: err.message,
      correlationId: req.correlationId,
    });
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
  reporteNovedades,
  exportarReporteNovedadesCsv,
  exportarNomina,
  listarColumnasNomina,
  exportarConsolidadoAnual,
};
