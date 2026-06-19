ALTER TYPE "AttendanceNoveltyType" ADD VALUE IF NOT EXISTS 'bono_desempeno';

ALTER TABLE "novedades_asistencia"
  ADD COLUMN IF NOT EXISTS "monto" DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE "novelty_batches"
  ADD COLUMN IF NOT EXISTS "monto" DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE "novedades_asistencia"
  ADD COLUMN IF NOT EXISTS "period_id" UUID,
  ADD COLUMN IF NOT EXISTS "periodo_nomina" VARCHAR(7) NOT NULL DEFAULT '';

UPDATE "novedades_asistencia"
SET "periodo_nomina" = TO_CHAR("fecha", 'YYYY-MM')
WHERE "periodo_nomina" = '';

UPDATE "novedades_asistencia" na
SET "period_id" = pp."id"
FROM "payroll_periods" pp
WHERE na."period_id" IS NULL
  AND na."tenant_id" = pp."tenant_id"
  AND EXTRACT(YEAR FROM na."fecha")::int = pp."anio"
  AND EXTRACT(MONTH FROM na."fecha")::int = pp."mes";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'novedades_asistencia_period_id_fkey'
  ) THEN
    ALTER TABLE "novedades_asistencia"
      ADD CONSTRAINT "novedades_asistencia_period_id_fkey"
      FOREIGN KEY ("period_id") REFERENCES "payroll_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "novedades_asistencia_tenant_tipo_fecha_idx"
  ON "novedades_asistencia"("tenant_id", "tipo_novedad", "fecha");

CREATE INDEX IF NOT EXISTS "novedades_asistencia_tenant_period_idx"
  ON "novedades_asistencia"("tenant_id", "period_id");

CREATE INDEX IF NOT EXISTS "novedades_asistencia_tenant_periodo_nomina_idx"
  ON "novedades_asistencia"("tenant_id", "periodo_nomina");
