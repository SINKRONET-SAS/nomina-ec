-- MSF26 - Saldos iniciales y facturacion fiscal SKNOMINA.
-- Rollback documentado:
--   DROP TABLE IF EXISTS fiscal_invoice_requests;
--   DROP TABLE IF EXISTS initial_balance_items;
--   DROP TABLE IF EXISTS initial_balance_batches;
-- Ejecutar rollback solo en ambiente controlado y despues de exportar evidencia de auditoria.

CREATE TABLE IF NOT EXISTS "initial_balance_batches" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "period_cut" DATE NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'validated',
  "template_version" VARCHAR(40) NOT NULL DEFAULT 'MSF26-v1',
  "source_filename" VARCHAR(220) NOT NULL DEFAULT '',
  "source_hash" VARCHAR(128) NOT NULL,
  "total_rows" INTEGER NOT NULL DEFAULT 0,
  "valid_rows" INTEGER NOT NULL DEFAULT 0,
  "error_rows" INTEGER NOT NULL DEFAULT 0,
  "summary" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_by" UUID,
  "approved_by" UUID,
  "approved_at" TIMESTAMPTZ,
  "committed_at" TIMESTAMPTZ,
  "reverted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_initial_balance_batches_tenant_status"
  ON "initial_balance_batches"("tenant_id", "status", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_initial_balance_batches_period"
  ON "initial_balance_batches"("tenant_id", "period_cut");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_initial_balance_batches_source_hash"
  ON "initial_balance_batches"("tenant_id", "source_hash");

CREATE TABLE IF NOT EXISTS "initial_balance_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "batch_id" UUID NOT NULL REFERENCES "initial_balance_batches"("id") ON DELETE CASCADE,
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "empleado_id" UUID REFERENCES "empleados"("id") ON DELETE SET NULL,
  "row_number" INTEGER NOT NULL,
  "cedula" VARCHAR(20) NOT NULL DEFAULT '',
  "employee_name" VARCHAR(240) NOT NULL DEFAULT '',
  "balance_type" VARCHAR(80) NOT NULL,
  "period_key" VARCHAR(20) NOT NULL DEFAULT '',
  "amount" NUMERIC(12,2) NOT NULL DEFAULT 0,
  "hours" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "days" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "description" TEXT NOT NULL DEFAULT '',
  "status" VARCHAR(30) NOT NULL DEFAULT 'valid',
  "errors" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "applied_at" TIMESTAMPTZ,
  "applied_by" UUID,
  "reverted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_initial_balance_items_batch"
  ON "initial_balance_items"("batch_id", "row_number");

CREATE INDEX IF NOT EXISTS "idx_initial_balance_items_employee"
  ON "initial_balance_items"("tenant_id", "empleado_id", "balance_type");

CREATE INDEX IF NOT EXISTS "idx_initial_balance_items_status"
  ON "initial_balance_items"("tenant_id", "status", "balance_type");

CREATE TABLE IF NOT EXISTS "fiscal_invoice_requests" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "payment_transaction_id" UUID REFERENCES "transacciones_pago"("id") ON DELETE SET NULL,
  "external_reference" VARCHAR(180) NOT NULL,
  "idempotency_key" VARCHAR(180) NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'blocked',
  "customer_payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "invoice_payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "facturador_request_id" VARCHAR(180),
  "invoice_number" VARCHAR(80),
  "access_key" VARCHAR(120),
  "ride_url" TEXT,
  "xml_url" TEXT,
  "last_error" TEXT NOT NULL DEFAULT '',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "requested_by" UUID,
  "requested_at" TIMESTAMPTZ,
  "authorized_at" TIMESTAMPTZ,
  "rejected_at" TIMESTAMPTZ,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_fiscal_invoice_requests_reference"
  ON "fiscal_invoice_requests"("tenant_id", "external_reference");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_fiscal_invoice_requests_idempotency"
  ON "fiscal_invoice_requests"("idempotency_key");

CREATE INDEX IF NOT EXISTS "idx_fiscal_invoice_requests_status"
  ON "fiscal_invoice_requests"("tenant_id", "status", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_fiscal_invoice_requests_payment"
  ON "fiscal_invoice_requests"("payment_transaction_id");
