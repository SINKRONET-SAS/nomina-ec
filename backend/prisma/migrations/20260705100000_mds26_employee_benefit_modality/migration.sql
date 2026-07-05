-- MDS26: Mensualizacion de decimos
-- Agrega campos modalidad_decimo_tercero y modalidad_decimo_cuarto al modelo de empleados.
-- Default 'acumulado' preserva comportamiento actual sin regresion.

ALTER TABLE "empleados"
ADD COLUMN "modalidad_decimo_tercero" VARCHAR(40) NOT NULL DEFAULT 'acumulado',
ADD COLUMN "modalidad_decimo_cuarto" VARCHAR(40) NOT NULL DEFAULT 'acumulado';

ALTER TABLE "empleados"
ADD CONSTRAINT "empleados_modalidad_decimo_tercero_check"
CHECK ("modalidad_decimo_tercero" IN ('mensual', 'acumulado'));

ALTER TABLE "empleados"
ADD CONSTRAINT "empleados_modalidad_decimo_cuarto_check"
CHECK ("modalidad_decimo_cuarto" IN ('mensual', 'acumulado'));
