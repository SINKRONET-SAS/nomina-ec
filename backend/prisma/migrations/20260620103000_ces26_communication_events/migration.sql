CREATE TABLE IF NOT EXISTS "communication_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID,
  "user_id" UUID,
  "correlation_id" VARCHAR(120) NOT NULL DEFAULT 'sin-correlacion',
  "channel" VARCHAR(30) NOT NULL,
  "provider" VARCHAR(60) NOT NULL,
  "template" VARCHAR(80) NOT NULL,
  "status" VARCHAR(40) NOT NULL,
  "recipient_hash" VARCHAR(128) NOT NULL DEFAULT '',
  "recipient_hint" VARCHAR(120) NOT NULL DEFAULT '',
  "message_id_hash" VARCHAR(128) NOT NULL DEFAULT '',
  "retention_until" TIMESTAMPTZ(6) NOT NULL DEFAULT (NOW() + INTERVAL '365 days'),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "communication_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "communication_events_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "communication_events_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "communication_events_tenant_created_at_idx"
  ON "communication_events"("tenant_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "communication_events_tenant_template_status_idx"
  ON "communication_events"("tenant_id", "template", "status");

CREATE INDEX IF NOT EXISTS "communication_events_retention_until_idx"
  ON "communication_events"("retention_until");

ALTER TABLE "communication_events" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_communication_events_policy ON "communication_events";
CREATE POLICY tenant_communication_events_policy ON "communication_events"
  USING (
    "tenant_id" IS NULL
    OR "tenant_id"::text = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    "tenant_id" IS NULL
    OR "tenant_id"::text = current_setting('app.current_tenant_id', true)
  );
