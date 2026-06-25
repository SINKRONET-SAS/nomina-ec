-- CRN26 - Lotes obligatorios para corridas de calculo de nomina.
-- Rollback documentado:
--   ALTER TABLE payroll_calculation_lines DROP COLUMN IF EXISTS calculation_batch_id;
--   ALTER TABLE nominas DROP COLUMN IF EXISTS calculation_batch_id;
--   DROP TABLE IF EXISTS payroll_calculation_batches;

CREATE TABLE IF NOT EXISTS "payroll_calculation_batches" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "period_id" UUID,
  "anio" INTEGER NOT NULL,
  "mes" INTEGER NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'processing',
  "total_empleados" INTEGER NOT NULL DEFAULT 0,
  "total_calculadas" INTEGER NOT NULL DEFAULT 0,
  "total_errores" INTEGER NOT NULL DEFAULT 0,
  "errores" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "started_by" UUID,
  "correlation_id" VARCHAR(120) NOT NULL DEFAULT '',
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "completed_at" TIMESTAMPTZ(6),

  CONSTRAINT "payroll_calculation_batches_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_calculation_batches_status_check" CHECK ("status" IN ('processing', 'completed', 'failed')),
  CONSTRAINT "payroll_calculation_batches_period_check" CHECK ("mes" BETWEEN 1 AND 12 AND "anio" BETWEEN 2000 AND 2100)
);

CREATE INDEX IF NOT EXISTS "payroll_calculation_batches_tenant_period_idx"
  ON "payroll_calculation_batches"("tenant_id", "anio", "mes", "created_at");

CREATE INDEX IF NOT EXISTS "payroll_calculation_batches_tenant_status_idx"
  ON "payroll_calculation_batches"("tenant_id", "status");

ALTER TABLE "payroll_calculation_batches"
  ADD CONSTRAINT "payroll_calculation_batches_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payroll_calculation_batches"
  ADD CONSTRAINT "payroll_calculation_batches_period_id_fkey"
  FOREIGN KEY ("period_id") REFERENCES "payroll_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "nominas"
  ADD COLUMN IF NOT EXISTS "calculation_batch_id" UUID;

ALTER TABLE "nominas"
  ADD CONSTRAINT "nominas_calculation_batch_id_fkey"
  FOREIGN KEY ("calculation_batch_id") REFERENCES "payroll_calculation_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "nominas_tenant_calculation_batch_idx"
  ON "nominas"("tenant_id", "calculation_batch_id");

ALTER TABLE "payroll_calculation_lines"
  ADD COLUMN IF NOT EXISTS "calculation_batch_id" UUID;

ALTER TABLE "payroll_calculation_lines"
  ADD CONSTRAINT "payroll_calculation_lines_calculation_batch_id_fkey"
  FOREIGN KEY ("calculation_batch_id") REFERENCES "payroll_calculation_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "payroll_calculation_lines_tenant_batch_idx"
  ON "payroll_calculation_lines"("tenant_id", "calculation_batch_id");

ALTER TABLE nominas DISABLE TRIGGER trg_prevent_update_closed_nomina;

WITH grouped_payrolls AS (
  SELECT
    n.tenant_id,
    n.anio,
    n.mes,
    pp.id AS period_id,
    COUNT(*)::int AS total_nominas
  FROM nominas n
  LEFT JOIN payroll_periods pp
    ON pp.tenant_id = n.tenant_id
   AND pp.anio = n.anio
   AND pp.mes = n.mes
  WHERE n.calculation_batch_id IS NULL
  GROUP BY n.tenant_id, n.anio, n.mes, pp.id
),
created_batches AS (
  INSERT INTO payroll_calculation_batches (
    tenant_id, period_id, anio, mes, status,
    total_empleados, total_calculadas, total_errores,
    errores, correlation_id, metadata, completed_at
  )
  SELECT
    tenant_id,
    period_id,
    anio,
    mes,
    'completed',
    total_nominas,
    total_nominas,
    0,
    '[]'::jsonb,
    'CRN26-backfill',
    jsonb_build_object(
      'source', 'CRN26-legacy-payroll-backfill',
      'reason', 'Asignar lote auditable a nominas existentes antes de CRN26'
    ),
    NOW()
  FROM grouped_payrolls
  RETURNING id, tenant_id, anio, mes
)
UPDATE nominas n
SET calculation_batch_id = cb.id
FROM created_batches cb
WHERE n.tenant_id = cb.tenant_id
  AND n.anio = cb.anio
  AND n.mes = cb.mes
  AND n.calculation_batch_id IS NULL;

UPDATE payroll_calculation_lines pcl
SET calculation_batch_id = n.calculation_batch_id
FROM nominas n
WHERE pcl.payroll_id = n.id
  AND pcl.tenant_id = n.tenant_id
  AND pcl.calculation_batch_id IS NULL
  AND n.calculation_batch_id IS NOT NULL;

ALTER TABLE nominas ENABLE TRIGGER trg_prevent_update_closed_nomina;

ALTER TABLE payroll_calculation_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_payroll_calculation_batches_policy ON payroll_calculation_batches;
CREATE POLICY tenant_payroll_calculation_batches_policy ON payroll_calculation_batches
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());
