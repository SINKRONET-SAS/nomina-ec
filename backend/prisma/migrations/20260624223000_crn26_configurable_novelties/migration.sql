-- CRN26 - Novedades configurables consumidas por calculo y contabilidad.
-- Rollback documentado:
--   CREATE TYPE "AttendanceNoveltyType" AS ENUM ('falta', 'atraso', 'salida_temprana', 'hora_extra_50', 'hora_extra_100', 'bono_desempeno');
--   ALTER TABLE "novedades_asistencia" ALTER COLUMN "tipo_novedad" TYPE "AttendanceNoveltyType" USING "tipo_novedad"::"AttendanceNoveltyType";
--   ALTER TABLE "novelty_batches" ALTER COLUMN "tipo_novedad" TYPE "AttendanceNoveltyType" USING "tipo_novedad"::"AttendanceNoveltyType";

ALTER TABLE "novedades_asistencia"
  ALTER COLUMN "tipo_novedad" TYPE VARCHAR(80) USING LOWER("tipo_novedad"::text);

ALTER TABLE "novelty_batches"
  ALTER COLUMN "tipo_novedad" TYPE VARCHAR(80) USING LOWER("tipo_novedad"::text);

DROP TYPE IF EXISTS "AttendanceNoveltyType";

WITH default_novelty_types (
  code, name, description, category, payroll_impact,
  affects_iess, affects_income_tax, affects_decimos, affects_vacation,
  affects_bank_file, requires_evidence, calculation_mode
) AS (
  VALUES
    ('hora_extra_50', 'Hora extra 50%', 'Ingreso por hora suplementaria calculada al 150%.', 'ingreso', 'ingreso', TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, 'minutes_hourly_1_5'),
    ('hora_extra_100', 'Hora extra 100%', 'Ingreso por hora extraordinaria calculada al 200%.', 'ingreso', 'ingreso', TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, 'minutes_hourly_2'),
    ('bono_desempeno', 'Bono de desempeno', 'Ingreso variable aprobado por desempeno.', 'ingreso', 'ingreso', TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, 'amount'),
    ('comision', 'Comisiones', 'Ingreso variable por comisiones aprobadas.', 'ingreso', 'ingreso', TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, 'amount'),
    ('falta', 'Falta injustificada', 'Descuento por ausencia injustificada aprobada.', 'ausencia', 'descuento', FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, 'absence_day'),
    ('atraso', 'Atraso', 'Descuento por minutos de atraso aprobados.', 'descuento', 'descuento', FALSE, FALSE, FALSE, FALSE, TRUE, FALSE, 'minutes_hourly'),
    ('salida_temprana', 'Salida temprana', 'Descuento por salida temprana aprobada.', 'descuento', 'descuento', FALSE, FALSE, FALSE, FALSE, TRUE, FALSE, 'minutes_hourly')
)
INSERT INTO novelty_type_configs (
  tenant_id, code, name, description, category, payroll_impact,
  affects_iess, affects_income_tax, affects_decimos, affects_vacation,
  affects_bank_file, requires_evidence, approval_flow, applicability, status, valid_from
)
SELECT
  NULL,
  code,
  name,
  description,
  category,
  payroll_impact,
  affects_iess,
  affects_income_tax,
  affects_decimos,
  affects_vacation,
  affects_bank_file,
  requires_evidence,
  '{"requiredRoles":["admin_rrhh","owner"]}'::jsonb,
  jsonb_build_object('calculationMode', calculation_mode),
  'activo',
  DATE '2026-01-01'
FROM default_novelty_types d
WHERE NOT EXISTS (
  SELECT 1
  FROM novelty_type_configs n
  WHERE n.tenant_id IS NULL
    AND LOWER(n.code) = d.code
);

UPDATE novelty_type_configs
SET
  code = LOWER(code),
  payroll_impact = CASE
    WHEN LOWER(code) IN ('hora_extra_50', 'hora_extra_100', 'bono_desempeno', 'comision') THEN 'ingreso'
    WHEN LOWER(code) IN ('falta', 'atraso', 'salida_temprana') THEN 'descuento'
    ELSE payroll_impact
  END,
  affects_iess = CASE WHEN LOWER(code) IN ('hora_extra_50', 'hora_extra_100', 'bono_desempeno', 'comision') THEN TRUE ELSE affects_iess END,
  affects_income_tax = CASE WHEN LOWER(code) IN ('hora_extra_50', 'hora_extra_100', 'bono_desempeno', 'comision') THEN TRUE ELSE affects_income_tax END,
  affects_decimos = CASE WHEN LOWER(code) IN ('hora_extra_50', 'hora_extra_100', 'bono_desempeno', 'comision') THEN TRUE ELSE affects_decimos END,
  affects_vacation = CASE WHEN LOWER(code) IN ('hora_extra_50', 'hora_extra_100', 'bono_desempeno', 'comision') THEN TRUE ELSE affects_vacation END,
  affects_bank_file = CASE WHEN LOWER(code) IN ('hora_extra_50', 'hora_extra_100', 'bono_desempeno', 'comision', 'falta', 'atraso', 'salida_temprana') THEN TRUE ELSE affects_bank_file END,
  applicability = COALESCE(applicability, '{}'::jsonb)
    || CASE LOWER(code)
      WHEN 'hora_extra_50' THEN '{"calculationMode":"minutes_hourly_1_5"}'::jsonb
      WHEN 'hora_extra_100' THEN '{"calculationMode":"minutes_hourly_2"}'::jsonb
      WHEN 'bono_desempeno' THEN '{"calculationMode":"amount"}'::jsonb
      WHEN 'comision' THEN '{"calculationMode":"amount"}'::jsonb
      WHEN 'falta' THEN '{"calculationMode":"absence_day"}'::jsonb
      WHEN 'atraso' THEN '{"calculationMode":"minutes_hourly"}'::jsonb
      WHEN 'salida_temprana' THEN '{"calculationMode":"minutes_hourly"}'::jsonb
      ELSE '{}'::jsonb
    END,
  updated_at = NOW()
WHERE LOWER(code) IN ('hora_extra_50', 'hora_extra_100', 'bono_desempeno', 'comision', 'falta', 'atraso', 'salida_temprana');

CREATE INDEX IF NOT EXISTS "novedades_asistencia_tenant_tipo_text_idx"
  ON "novedades_asistencia"("tenant_id", "tipo_novedad", "fecha");

CREATE INDEX IF NOT EXISTS "novelty_batches_tenant_tipo_text_idx"
  ON "novelty_batches"("tenant_id", "tipo_novedad", "fecha");
