CREATE TABLE IF NOT EXISTS "support_incidents" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID REFERENCES "tenants"("id") ON DELETE SET NULL,
  "title" VARCHAR(180) NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "severity" VARCHAR(30) NOT NULL DEFAULT 'media',
  "status" VARCHAR(30) NOT NULL DEFAULT 'abierta',
  "created_by" UUID REFERENCES "usuarios"("id") ON DELETE SET NULL,
  "assigned_to" UUID REFERENCES "usuarios"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "closed_at" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "support_incidents_status_idx"
  ON "support_incidents"("status", "severity", "created_at");

CREATE INDEX IF NOT EXISTS "support_incidents_tenant_idx"
  ON "support_incidents"("tenant_id", "created_at");
