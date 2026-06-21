ALTER TABLE "empleados"
  ADD COLUMN IF NOT EXISTS "region_decimo_cuarto" VARCHAR(40) NOT NULL DEFAULT 'sierra_amazonia';

ALTER TABLE "empleados"
  ADD COLUMN IF NOT EXISTS "jornada_codigo" VARCHAR(80) NOT NULL DEFAULT '';

ALTER TABLE "empleados"
  ADD COLUMN IF NOT EXISTS "unidad_organizativa_codigo" VARCHAR(80) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "zona_marcacion_codigo" VARCHAR(80) NOT NULL DEFAULT '';

ALTER TABLE "empleados"
  DROP CONSTRAINT IF EXISTS "empleados_region_decimo_cuarto_check";

ALTER TABLE "empleados"
  ADD CONSTRAINT "empleados_region_decimo_cuarto_check"
  CHECK ("region_decimo_cuarto" IN ('costa_galapagos', 'sierra_amazonia'));

CREATE TABLE IF NOT EXISTS "bank_field_mappings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID,
  "bank_profile_id" UUID,
  "banco_codigo" VARCHAR(20) NOT NULL,
  "canonical_field" VARCHAR(80) NOT NULL,
  "bank_field_name" VARCHAR(120) NOT NULL,
  "position" INTEGER NOT NULL,
  "formatter" VARCHAR(80) NOT NULL DEFAULT '',
  "required" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "bank_field_mappings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bank_field_mappings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "bank_field_mappings_bank_profile_id_fkey" FOREIGN KEY ("bank_profile_id") REFERENCES "perfiles_bancarios"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "bank_field_mappings_scope_field_key"
  ON "bank_field_mappings" (
    COALESCE("tenant_id", '00000000-0000-0000-0000-000000000000'::uuid),
    UPPER("banco_codigo"),
    "canonical_field"
  );

CREATE INDEX IF NOT EXISTS "bank_field_mappings_lookup_idx"
  ON "bank_field_mappings" ("tenant_id", "banco_codigo", "position");
