const db = require('../config/database');
const { resolveStorageUrl } = require('../config/s3');

function resolveNoveltyMetadata(row = {}) {
  const metadata = row.metadata && typeof row.metadata === 'object' ? { ...row.metadata } : row.metadata;
  if (!metadata || typeof metadata !== 'object') return row;
  const support = metadata.soporteMedico;
  if (!support || typeof support !== 'object') return row;
  return {
    ...row,
    metadata: {
      ...metadata,
      soporteMedico: {
        ...support,
        url: resolveStorageUrl(support.url, support.storageKey),
      },
    },
  };
}

async function getEmployeeHistory({ tenantId, empleadoId, limit = 24, closedPayrollOnly = false }) {
  const safeLimit = Math.min(Math.max(Number(limit || 24), 1), 60);
  const payrollStateFilter = closedPayrollOnly ? "AND estado IN ('cerrada', 'pagada')" : '';

  const [payrolls, novelties, documents] = await Promise.all([
    db.query(`
      SELECT id, anio, mes, dias_trabajados, sueldo_bruto, total_ingresos,
        total_deducciones, neto_recibir, estado, rol_pdf_url, cerrado_en, updated_at
      FROM nominas
      WHERE tenant_id = $1 AND empleado_id = $2
        ${payrollStateFilter}
      ORDER BY anio DESC, mes DESC
      LIMIT $3
    `, [tenantId, empleadoId, safeLimit]),
    db.query(`
      SELECT id, fecha, tipo_novedad, minutos, monto, justificacion, estado, metadata,
        aprobado_por, aprobado_en, created_at, updated_at
      FROM novedades_asistencia
      WHERE tenant_id = $1 AND empleado_id = $2
      ORDER BY fecha DESC, created_at DESC
      LIMIT $3
    `, [tenantId, empleadoId, safeLimit]),
    db.query(`
      SELECT id, tipo_documento, documento_url, firmado, metadata, created_at
      FROM documentos_legales
      WHERE tenant_id = $1 AND empleado_id = $2
      ORDER BY created_at DESC
      LIMIT $3
    `, [tenantId, empleadoId, safeLimit]),
  ]);

  const novedades = novelties.rows.map(resolveNoveltyMetadata);
  const permisos = novedades.filter((row) => String(row.tipo_novedad || '').startsWith('permiso_'));

  return {
    empleadoId,
    roles: payrolls.rows,
    novedades,
    permisos,
    documentos: documents.rows,
    resumen: {
      roles: payrolls.rows.length,
      novedades: novelties.rows.length,
      permisos: permisos.length,
      documentos: documents.rows.length,
    },
  };
}

module.exports = {
  getEmployeeHistory,
};
