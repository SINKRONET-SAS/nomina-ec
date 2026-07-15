-- Permite conservar un lote con roles calculados y empleados que requieren correccion.
-- Rollback documentado: antes de restaurar la restriccion anterior, convertir
-- los registros partial_failed a failed o completed segun la decision operativa.

ALTER TABLE "payroll_calculation_batches"
  DROP CONSTRAINT IF EXISTS "payroll_calculation_batches_status_check";

ALTER TABLE "payroll_calculation_batches"
  ADD CONSTRAINT "payroll_calculation_batches_status_check"
  CHECK ("status" IN ('processing', 'completed', 'failed', 'partial_failed'));
