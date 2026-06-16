CREATE TABLE IF NOT EXISTS "employee_import_batches" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by" UUID REFERENCES "usuarios"("id") ON DELETE SET NULL,
  "source_name" VARCHAR(180) NOT NULL DEFAULT 'carga_manual',
  "status" VARCHAR(30) NOT NULL DEFAULT 'preview',
  "total_rows" INTEGER NOT NULL DEFAULT 0,
  "valid_rows" INTEGER NOT NULL DEFAULT 0,
  "error_rows" INTEGER NOT NULL DEFAULT 0,
  "summary" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "completed_at" TIMESTAMPTZ
);

ALTER TABLE "empleados"
  ADD COLUMN IF NOT EXISTS "import_batch_id" UUID REFERENCES "employee_import_batches"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "employee_import_batches_tenant_created_idx"
  ON "employee_import_batches"("tenant_id", "created_at");

CREATE INDEX IF NOT EXISTS "empleados_import_batch_idx"
  ON "empleados"("tenant_id", "import_batch_id");
