-- PLAN HAIKY - Parametros por empleado para calculo de nomina
-- Permite gastos personales anuales y jornada mensual configurable sin cambiar el contrato base.

ALTER TABLE empleados
  ADD COLUMN IF NOT EXISTS jornada_horas_mensuales DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS gastos_personales_anuales DECIMAL(12,2) NOT NULL DEFAULT 0;
