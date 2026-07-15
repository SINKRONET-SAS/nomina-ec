ALTER TABLE "empleados"
ADD COLUMN IF NOT EXISTS "controla_asistencia" BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN "empleados"."controla_asistencia" IS
'Define si el empleado participa en reportes y cargas globales de asistencia. No genera descuentos automáticos de nómina.';
