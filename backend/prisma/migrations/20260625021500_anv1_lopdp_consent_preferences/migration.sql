-- ANV1: Preferencias LOPDP por usuario y alcance.
CREATE TABLE IF NOT EXISTS "consent_preferences" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "scope" VARCHAR(80) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "given_at" TIMESTAMPTZ(6) NULL,
  "withdrawn_at" TIMESTAMPTZ(6) NULL,
  "source" VARCHAR(80) NOT NULL DEFAULT 'dashboard',
  "version" VARCHAR(40) NOT NULL DEFAULT 'LOPDP-2026-06',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "consent_preferences_user_scope_key" UNIQUE ("user_id", "scope")
);

CREATE INDEX IF NOT EXISTS "consent_preferences_tenant_user_idx"
  ON "consent_preferences"("tenant_id", "user_id");

CREATE INDEX IF NOT EXISTS "consent_preferences_scope_active_idx"
  ON "consent_preferences"("scope", "active");

COMMENT ON TABLE "consent_preferences" IS
  'ANV1: estado vigente de consentimientos LOPDP por usuario y alcance; el historico queda en audit_logs.';
