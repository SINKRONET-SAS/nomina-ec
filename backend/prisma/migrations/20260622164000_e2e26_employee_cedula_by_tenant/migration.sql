DROP INDEX IF EXISTS "empleados_cedula_key";

CREATE UNIQUE INDEX IF NOT EXISTS "empleados_tenant_id_cedula_key"
  ON "empleados"("tenant_id", "cedula");
