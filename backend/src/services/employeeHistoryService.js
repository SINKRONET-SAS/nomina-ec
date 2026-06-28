const db = require('../config/database');

async function getEmployeeHistory({ tenantId, empleadoId, limit = 24 }) {
  const safeLimit = Math.min(Math.max(Number(limit || 24), 1), 60);

  const [payrolls, novelties, documents] = await Promise.all([
    db.query(`
      SELECT id, anio, mes, dias_trabajados, sueldo_bruto, total_ingresos,
        total_deducciones, neto_recibir, estado, rol_pdf_url, cerrado_en, updated_at
      FROM nominas
      WHERE tenant_id = $1 AND empleado_id = $2
      ORDER BY anio DESC, mes DESC
      LIMIT $3
    `, [tenantId, empleadoId, safeLimit]),
    db.query(`
      SELECT id, fecha, tipo_novedad, minutos, monto, justificacion, estado,
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

  const permisos = novelties.rows.filter((row) => String(row.tipo_novedad || '').startsWith('permiso_'));

  return {
    empleadoId,
    roles: payrolls.rows,
    novedades: novelties.rows,
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
