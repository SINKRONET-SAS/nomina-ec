ALTER TYPE "PayrollStatus" ADD VALUE IF NOT EXISTS 'aprobado';
ALTER TYPE "PayrollStatus" ADD VALUE IF NOT EXISTS 'anulado';

ALTER TABLE "nominas"
  ADD COLUMN IF NOT EXISTS "aprobado_por" UUID,
  ADD COLUMN IF NOT EXISTS "aprobado_en" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "anulado_por" UUID,
  ADD COLUMN IF NOT EXISTS "anulado_en" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "motivo_anulacion" VARCHAR(500);

CREATE INDEX IF NOT EXISTS "nominas_tenant_estado_idx"
  ON "nominas"("tenant_id", "estado");

CREATE OR REPLACE FUNCTION prevent_update_closed_nomina()
RETURNS trigger AS $$
BEGIN
  IF OLD.estado = 'cerrada'
     AND COALESCE(current_setting('app.allow_payroll_reopen', true), 'off') <> 'on'
     AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'Nomina cerrada inmutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
