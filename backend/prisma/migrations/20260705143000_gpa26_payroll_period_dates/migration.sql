ALTER TABLE "payroll_periods"
  ADD COLUMN IF NOT EXISTS "fecha_desde" DATE,
  ADD COLUMN IF NOT EXISTS "fecha_hasta" DATE;

UPDATE "payroll_periods"
SET
  "fecha_desde" = COALESCE("fecha_desde", make_date("anio", "mes", 1)),
  "fecha_hasta" = COALESCE("fecha_hasta", (make_date("anio", "mes", 1) + INTERVAL '1 month - 1 day')::date);

ALTER TABLE "payroll_periods"
  ALTER COLUMN "fecha_desde" SET NOT NULL,
  ALTER COLUMN "fecha_hasta" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "payroll_periods_tenant_dates_idx"
  ON "payroll_periods"("tenant_id", "fecha_desde", "fecha_hasta");
