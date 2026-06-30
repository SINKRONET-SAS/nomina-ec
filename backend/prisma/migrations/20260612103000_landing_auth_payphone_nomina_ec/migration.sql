-- Fases 20-26: marca SKNOMINA, auth publico, planes y PayPhone.

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expira_en" TIMESTAMPTZ(6) NOT NULL,
    "usado_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "password_reset_tokens_usuario_id_idx" ON "password_reset_tokens"("usuario_id");
CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

ALTER TABLE "password_reset_tokens"
  ADD CONSTRAINT "password_reset_tokens_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expira_en" TIMESTAMPTZ(6) NOT NULL,
    "confirmado_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "email_verification_tokens_usuario_id_idx" ON "email_verification_tokens"("usuario_id");
CREATE UNIQUE INDEX IF NOT EXISTS "email_verification_tokens_token_hash_key" ON "email_verification_tokens"("token_hash");

ALTER TABLE "email_verification_tokens"
  ADD CONSTRAINT "email_verification_tokens_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "usuarios"
  ADD COLUMN IF NOT EXISTS "email_verificado_en" TIMESTAMPTZ(6);

CREATE TABLE IF NOT EXISTS "planes_comerciales" (
    "id" VARCHAR(40) NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "descripcion" TEXT NOT NULL DEFAULT '',
    "precio_mensual_centavos" INTEGER NOT NULL DEFAULT 0,
    "moneda" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "empleados_max" INTEGER,
    "empresas_max" INTEGER NOT NULL DEFAULT 1,
    "usuarios_max" INTEGER NOT NULL DEFAULT 3,
    "archivos_bancarios" BOOLEAN NOT NULL DEFAULT false,
    "reportes_avanzados" BOOLEAN NOT NULL DEFAULT false,
    "soporte" VARCHAR(80) NOT NULL DEFAULT 'comunidad',
    "publico" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "planes_comerciales_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "suscripciones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "plan_id" VARCHAR(40) NOT NULL,
    "estado" VARCHAR(40) NOT NULL DEFAULT 'trial',
    "inicio_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vence_en" TIMESTAMPTZ(6),
    "renovacion_automatica" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "suscripciones_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "suscripciones_tenant_id_key" ON "suscripciones"("tenant_id");
CREATE INDEX IF NOT EXISTS "suscripciones_plan_id_estado_idx" ON "suscripciones"("plan_id", "estado");

ALTER TABLE "suscripciones"
  ADD CONSTRAINT "suscripciones_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "suscripciones"
  ADD CONSTRAINT "suscripciones_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "planes_comerciales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "metodos_pago" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "proveedor" VARCHAR(40) NOT NULL DEFAULT 'PAYPHONE',
    "estado" VARCHAR(40) NOT NULL DEFAULT 'PENDING',
    "referencia_proveedor" VARCHAR(160),
    "es_principal" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "metodos_pago_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "metodos_pago_tenant_id_estado_idx" ON "metodos_pago"("tenant_id", "estado");

ALTER TABLE "metodos_pago"
  ADD CONSTRAINT "metodos_pago_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "transacciones_pago" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "usuario_id" UUID,
    "plan_id" VARCHAR(40),
    "proveedor" VARCHAR(40) NOT NULL DEFAULT 'PAYPHONE',
    "estado" VARCHAR(40) NOT NULL DEFAULT 'PENDING',
    "monto_centavos" INTEGER NOT NULL DEFAULT 0,
    "base_gravada_centavos" INTEGER NOT NULL DEFAULT 0,
    "base_no_gravada_centavos" INTEGER NOT NULL DEFAULT 0,
    "iva_centavos" INTEGER NOT NULL DEFAULT 0,
    "moneda" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "client_transaction_id" VARCHAR(160) NOT NULL,
    "provider_transaction_id" VARCHAR(160),
    "checkout_url" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transacciones_pago_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "transacciones_pago_client_transaction_id_key"
  ON "transacciones_pago"("client_transaction_id");
CREATE INDEX IF NOT EXISTS "transacciones_pago_tenant_id_estado_idx"
  ON "transacciones_pago"("tenant_id", "estado");

ALTER TABLE "transacciones_pago"
  ADD CONSTRAINT "transacciones_pago_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "transacciones_pago"
  ADD CONSTRAINT "transacciones_pago_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "transacciones_pago"
  ADD CONSTRAINT "transacciones_pago_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "planes_comerciales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "planes_comerciales" (
  "id", "nombre", "descripcion", "precio_mensual_centavos", "empleados_max",
  "empresas_max", "usuarios_max", "archivos_bancarios", "reportes_avanzados",
  "soporte", "orden", "metadata"
) VALUES
  ('TRIAL', 'Prueba', 'Evaluacion controlada de SKNOMINA para validar la operacion inicial.', 0, 10, 1, 2, false, false, 'comunidad', 10, '{"trialDays": 14}'),
  ('MICRO', 'Micro', 'Nomina mensual para negocios pequenos con una empresa activa.', 1900, 25, 1, 3, true, false, 'email', 20, '{}'),
  ('PYME', 'Pyme', 'Gestion recurrente de nomina, reportes y archivos bancarios.', 4900, 100, 3, 8, true, true, 'prioritario', 30, '{}'),
  ('EMPRESA', 'Empresa', 'Operacion multiempresa con auditoria visible y soporte ampliado.', 9900, 500, 10, 20, true, true, 'prioritario', 40, '{}'),
  ('CORPORATIVO', 'Corporativo', 'Plan con limites y acompanamiento pactados por contrato.', 0, NULL, 25, 50, true, true, 'dedicado', 50, '{"requiresContract": true}')
ON CONFLICT ("id") DO UPDATE SET
  "nombre" = EXCLUDED."nombre",
  "descripcion" = EXCLUDED."descripcion",
  "precio_mensual_centavos" = EXCLUDED."precio_mensual_centavos",
  "empleados_max" = EXCLUDED."empleados_max",
  "empresas_max" = EXCLUDED."empresas_max",
  "usuarios_max" = EXCLUDED."usuarios_max",
  "archivos_bancarios" = EXCLUDED."archivos_bancarios",
  "reportes_avanzados" = EXCLUDED."reportes_avanzados",
  "soporte" = EXCLUDED."soporte",
  "orden" = EXCLUDED."orden",
  "metadata" = EXCLUDED."metadata",
  "updated_at" = CURRENT_TIMESTAMP;
