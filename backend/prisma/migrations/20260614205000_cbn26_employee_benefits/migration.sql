-- CBN26 - Beneficios/descuentos laborales para anticipos y prestamos.
-- Rollback documentado:
--   DROP TABLE IF EXISTS beneficios_empleados;

CREATE TABLE IF NOT EXISTS "beneficios_empleados" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "empleado_id" UUID NOT NULL,
    "tipo" VARCHAR(40) NOT NULL,
    "descripcion" TEXT NOT NULL DEFAULT '',
    "monto_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "saldo_pendiente" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cuota_mensual" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "anio_inicio" INTEGER NOT NULL,
    "mes_inicio" INTEGER NOT NULL,
    "estado" VARCHAR(40) NOT NULL DEFAULT 'pendiente',
    "aprobado_por" UUID,
    "aprobado_en" TIMESTAMPTZ(6),
    "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

    CONSTRAINT "beneficios_empleados_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "beneficios_empleados_tipo_check" CHECK ("tipo" IN ('anticipo', 'prestamo')),
    CONSTRAINT "beneficios_empleados_estado_check" CHECK ("estado" IN ('pendiente', 'aprobado', 'descontado', 'anulado')),
    CONSTRAINT "beneficios_empleados_monto_check" CHECK ("monto_total" >= 0 AND "saldo_pendiente" >= 0 AND "cuota_mensual" >= 0),
    CONSTRAINT "beneficios_empleados_periodo_check" CHECK ("mes_inicio" BETWEEN 1 AND 12 AND "anio_inicio" BETWEEN 2000 AND 2100)
);

CREATE INDEX IF NOT EXISTS "beneficios_empleados_tenant_estado_idx"
  ON "beneficios_empleados"("tenant_id", "estado");

CREATE INDEX IF NOT EXISTS "beneficios_empleados_empleado_periodo_idx"
  ON "beneficios_empleados"("empleado_id", "anio_inicio", "mes_inicio");

ALTER TABLE "beneficios_empleados"
  ADD CONSTRAINT "beneficios_empleados_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "beneficios_empleados"
  ADD CONSTRAINT "beneficios_empleados_empleado_id_fkey"
  FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;
