CREATE TABLE IF NOT EXISTS "payroll_periods" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "anio" INTEGER NOT NULL,
  "mes" INTEGER NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'open',
  "opened_by" UUID REFERENCES "usuarios"("id") ON DELETE SET NULL,
  "opened_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "calculated_at" TIMESTAMPTZ,
  "closed_at" TIMESTAMPTZ,
  "summary" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "payroll_periods_tenant_period_key" UNIQUE ("tenant_id", "anio", "mes")
);

CREATE TABLE IF NOT EXISTS "novelty_batches" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "period_id" UUID NOT NULL REFERENCES "payroll_periods"("id") ON DELETE CASCADE,
  "scope_type" VARCHAR(40) NOT NULL,
  "scope_value" VARCHAR(160) NOT NULL DEFAULT '',
  "tipo_novedad" "AttendanceNoveltyType" NOT NULL,
  "fecha" DATE NOT NULL,
  "minutos" INTEGER NOT NULL DEFAULT 0,
  "justificacion" TEXT NOT NULL DEFAULT '',
  "status" VARCHAR(30) NOT NULL DEFAULT 'procesando',
  "idempotency_key" VARCHAR(160),
  "total_empleados" INTEGER NOT NULL DEFAULT 0,
  "total_creadas" INTEGER NOT NULL DEFAULT 0,
  "errores" JSONB NOT NULL DEFAULT '[]',
  "created_by" UUID REFERENCES "usuarios"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "completed_at" TIMESTAMPTZ,
  CONSTRAINT "novelty_batches_tenant_idempotency_key" UNIQUE ("tenant_id", "idempotency_key")
);

ALTER TABLE "novedades_asistencia"
  ADD COLUMN IF NOT EXISTS "novelty_batch_id" UUID REFERENCES "novelty_batches"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "payroll_periods_tenant_status_idx"
  ON "payroll_periods"("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "novelty_batches_period_idx"
  ON "novelty_batches"("tenant_id", "period_id", "created_at");

CREATE INDEX IF NOT EXISTS "novedades_asistencia_batch_idx"
  ON "novedades_asistencia"("tenant_id", "novelty_batch_id");
