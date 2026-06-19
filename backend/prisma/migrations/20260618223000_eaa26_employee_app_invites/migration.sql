CREATE TABLE IF NOT EXISTS "employee_app_invites" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "empleado_id" UUID NOT NULL,
  "email" VARCHAR(255) NOT NULL DEFAULT '',
  "invite_code_hash" VARCHAR(128) NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING_INVITE',
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "invited_by_user_id" UUID,
  "invite_resend_count" INTEGER NOT NULL DEFAULT 0,
  "accepted_at" TIMESTAMPTZ(6),
  "accepted_by_user_id" UUID,
  "revoked_at" TIMESTAMPTZ(6),
  "revoked_by_user_id" UUID,
  "privacy_notice_version" VARCHAR(40) NOT NULL DEFAULT '',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "employee_app_invites_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "employee_app_invites_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "employee_app_invites_empleado_id_fkey"
    FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "employee_app_invites_invited_by_user_id_fkey"
    FOREIGN KEY ("invited_by_user_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "employee_app_invites_accepted_by_user_id_fkey"
    FOREIGN KEY ("accepted_by_user_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "employee_app_invites_revoked_by_user_id_fkey"
    FOREIGN KEY ("revoked_by_user_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "employee_app_links" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "empleado_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  "activated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "disabled_at" TIMESTAMPTZ(6),
  "last_seen_at" TIMESTAMPTZ(6),
  "privacy_notice_version" VARCHAR(40) NOT NULL DEFAULT '',
  "consent_snapshot" JSONB NOT NULL DEFAULT '{}',
  "device_hint_hash" VARCHAR(128),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "employee_app_links_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "employee_app_links_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "employee_app_links_empleado_id_fkey"
    FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "employee_app_links_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "employee_app_invites_active_hash_key"
  ON "employee_app_invites"("invite_code_hash")
  WHERE "status" = 'PENDING_INVITE';

CREATE UNIQUE INDEX IF NOT EXISTS "employee_app_invites_one_pending_employee_key"
  ON "employee_app_invites"("tenant_id", "empleado_id")
  WHERE "status" = 'PENDING_INVITE';

CREATE INDEX IF NOT EXISTS "employee_app_invites_tenant_employee_status_idx"
  ON "employee_app_invites"("tenant_id", "empleado_id", "status");

CREATE INDEX IF NOT EXISTS "employee_app_invites_tenant_status_expires_idx"
  ON "employee_app_invites"("tenant_id", "status", "expires_at");

CREATE UNIQUE INDEX IF NOT EXISTS "employee_app_links_active_employee_key"
  ON "employee_app_links"("tenant_id", "empleado_id")
  WHERE "status" = 'ACTIVE';

CREATE UNIQUE INDEX IF NOT EXISTS "employee_app_links_active_user_key"
  ON "employee_app_links"("tenant_id", "user_id")
  WHERE "status" = 'ACTIVE';

CREATE INDEX IF NOT EXISTS "employee_app_links_tenant_employee_status_idx"
  ON "employee_app_links"("tenant_id", "empleado_id", "status");

CREATE INDEX IF NOT EXISTS "employee_app_links_tenant_user_status_idx"
  ON "employee_app_links"("tenant_id", "user_id", "status");

ALTER TABLE "marcaciones"
  ADD COLUMN IF NOT EXISTS "period_id" UUID,
  ADD COLUMN IF NOT EXISTS "operational_date" DATE,
  ADD COLUMN IF NOT EXISTS "work_zone_id" UUID,
  ADD COLUMN IF NOT EXISTS "organization_unit_id" UUID,
  ADD COLUMN IF NOT EXISTS "work_shift_id" UUID,
  ADD COLUMN IF NOT EXISTS "accuracy_meters" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "source" VARCHAR(40) NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS "audit_correlation_id" VARCHAR(120);

UPDATE "marcaciones"
SET "operational_date" = COALESCE("operational_date", ("timestamp" AT TIME ZONE 'America/Guayaquil')::date)
WHERE "operational_date" IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'marcaciones_period_id_fkey'
  ) THEN
    ALTER TABLE "marcaciones"
      ADD CONSTRAINT "marcaciones_period_id_fkey"
      FOREIGN KEY ("period_id") REFERENCES "payroll_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'marcaciones_work_zone_id_fkey'
  ) THEN
    ALTER TABLE "marcaciones"
      ADD CONSTRAINT "marcaciones_work_zone_id_fkey"
      FOREIGN KEY ("work_zone_id") REFERENCES "work_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'marcaciones_organization_unit_id_fkey'
  ) THEN
    ALTER TABLE "marcaciones"
      ADD CONSTRAINT "marcaciones_organization_unit_id_fkey"
      FOREIGN KEY ("organization_unit_id") REFERENCES "organization_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'marcaciones_work_shift_id_fkey'
  ) THEN
    ALTER TABLE "marcaciones"
      ADD CONSTRAINT "marcaciones_work_shift_id_fkey"
      FOREIGN KEY ("work_shift_id") REFERENCES "work_shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "marcaciones_tenant_empleado_operational_date_idx"
  ON "marcaciones"("tenant_id", "empleado_id", "operational_date");

CREATE INDEX IF NOT EXISTS "marcaciones_tenant_period_empleado_idx"
  ON "marcaciones"("tenant_id", "period_id", "empleado_id");

CREATE INDEX IF NOT EXISTS "marcaciones_tenant_work_zone_operational_date_idx"
  ON "marcaciones"("tenant_id", "work_zone_id", "operational_date");
