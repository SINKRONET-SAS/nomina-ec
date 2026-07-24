-- NAR26-01: distingue la anulacion de una novedad del rechazo de aprobacion.
-- La migracion es compatible con instalaciones existentes y no modifica filas.
ALTER TYPE "ApprovalStatus" ADD VALUE IF NOT EXISTS 'anulado';

CREATE INDEX IF NOT EXISTS novedades_asistencia_tenant_fecha_estado_idx
  ON novedades_asistencia (tenant_id, fecha, estado);
