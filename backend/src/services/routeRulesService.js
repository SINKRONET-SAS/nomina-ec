const db = require('../config/database');
const AppError = require('../utils/AppError');

async function findOpenRouteVisit({ tenantId, empleadoId, operationalDate, queryable = db }) {
  const result = await queryable.query(`
    SELECT
      rs.id AS stop_id,
      rs.unplanned_name,
      rs.status,
      rd.operational_date,
      COALESCE(site.name, rs.unplanned_name, 'Visita abierta') AS site_name
    FROM route_stops rs
    JOIN route_days rd
      ON rd.id = rs.route_day_id
     AND rd.tenant_id = rs.tenant_id
    LEFT JOIN route_sites site
      ON site.id = rs.site_id
     AND site.tenant_id = rs.tenant_id
    WHERE rs.tenant_id = $1
      AND rd.empleado_id = $2
      AND rd.operational_date = $3::date
      AND rs.status = 'in_site'
    ORDER BY rs.started_at DESC NULLS LAST, rs.updated_at DESC
    LIMIT 1
  `, [tenantId, empleadoId, operationalDate]);

  return result.rows[0] || null;
}

async function assertNoOpenRouteVisit({ tenantId, empleadoId, operationalDate, queryable = db, correlationId, userId }) {
  const openVisit = await findOpenRouteVisit({ tenantId, empleadoId, operationalDate, queryable });
  if (!openVisit) return null;

  throw new AppError('Cierra la visita abierta antes de continuar.', {
    code: 'ROUTE_VISIT_OPEN_BLOCKS_ACTION',
    statusCode: 409,
    correlationId,
    userId,
    details: {
      stopId: openVisit.stop_id,
      siteName: openVisit.site_name,
      operationalDate: openVisit.operational_date,
    },
  });
}

async function assertNoOpenRouteVisitForEndOfDay({ tenantId, empleadoId, operationalDate, queryable = db, correlationId, userId }) {
  const openVisit = await findOpenRouteVisit({ tenantId, empleadoId, operationalDate, queryable });
  if (!openVisit) return null;

  throw new AppError('No puedes finalizar jornada con una visita abierta. Registra la salida de la tienda primero.', {
    code: 'ROUTE_VISIT_OPEN_BLOCKS_DAY_END',
    statusCode: 409,
    correlationId,
    userId,
    details: {
      stopId: openVisit.stop_id,
      siteName: openVisit.site_name,
      operationalDate: openVisit.operational_date,
    },
  });
}

module.exports = {
  assertNoOpenRouteVisit,
  assertNoOpenRouteVisitForEndOfDay,
  findOpenRouteVisit,
};
