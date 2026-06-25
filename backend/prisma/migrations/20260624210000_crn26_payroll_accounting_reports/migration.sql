-- CRN26 - Contabilidad y reportes de nomina.
-- Rollback documentado:
--   DROP TABLE IF EXISTS payroll_calculation_lines;
--   DROP TABLE IF EXISTS payroll_accounting_mappings;

CREATE TABLE IF NOT EXISTS "payroll_accounting_mappings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "concept_code" VARCHAR(100) NOT NULL,
  "concept_label" VARCHAR(180) NOT NULL,
  "category" VARCHAR(40) NOT NULL,
  "entry_type" VARCHAR(40) NOT NULL DEFAULT 'DEVENGAMIENTO',
  "debit_account_code" VARCHAR(80) NOT NULL,
  "debit_account_name" VARCHAR(180) NOT NULL,
  "credit_account_code" VARCHAR(80) NOT NULL,
  "credit_account_name" VARCHAR(180) NOT NULL,
  "cost_center_mode" VARCHAR(40) NOT NULL DEFAULT 'employee',
  "fixed_cost_center_code" VARCHAR(80) NOT NULL DEFAULT '',
  "requires_employee_breakdown" BOOLEAN NOT NULL DEFAULT TRUE,
  "status" VARCHAR(30) NOT NULL DEFAULT 'activo',
  "valid_from" DATE NOT NULL DEFAULT CURRENT_DATE,
  "valid_to" DATE,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

  CONSTRAINT "payroll_accounting_mappings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_accounting_mappings_category_check" CHECK ("category" IN ('ingreso', 'deduccion', 'provision', 'costo_empleador', 'pago')),
  CONSTRAINT "payroll_accounting_mappings_entry_type_check" CHECK ("entry_type" IN ('DEVENGAMIENTO', 'PROVISION', 'PAGO', 'AJUSTE')),
  CONSTRAINT "payroll_accounting_mappings_cost_center_check" CHECK ("cost_center_mode" IN ('employee', 'fixed', 'none')),
  CONSTRAINT "payroll_accounting_mappings_validity_check" CHECK ("valid_to" IS NULL OR "valid_to" >= "valid_from")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payroll_accounting_mappings_tenant_concept_entry_valid_key"
  ON "payroll_accounting_mappings"("tenant_id", "concept_code", "entry_type", "valid_from");

CREATE INDEX IF NOT EXISTS "payroll_accounting_mappings_tenant_status_concept_idx"
  ON "payroll_accounting_mappings"("tenant_id", "status", "concept_code");

ALTER TABLE "payroll_accounting_mappings"
  ADD CONSTRAINT "payroll_accounting_mappings_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "payroll_calculation_lines" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "payroll_id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "empleado_id" UUID NOT NULL,
  "anio" INTEGER NOT NULL,
  "mes" INTEGER NOT NULL,
  "concept_code" VARCHAR(100) NOT NULL,
  "concept_label" VARCHAR(180) NOT NULL,
  "category" VARCHAR(40) NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "source" VARCHAR(60) NOT NULL DEFAULT 'calculo_nomina',
  "source_id" VARCHAR(120) NOT NULL DEFAULT '',
  "source_version" VARCHAR(80) NOT NULL DEFAULT 'CRN26',
  "legal_parameter_key" VARCHAR(120) NOT NULL DEFAULT '',
  "cost_center_code" VARCHAR(80) NOT NULL DEFAULT '',
  "organization_unit_code" VARCHAR(80) NOT NULL DEFAULT '',
  "position_code" VARCHAR(80) NOT NULL DEFAULT '',
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

  CONSTRAINT "payroll_calculation_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_calculation_lines_category_check" CHECK ("category" IN ('ingreso', 'deduccion', 'provision', 'costo_empleador', 'pago')),
  CONSTRAINT "payroll_calculation_lines_amount_check" CHECK ("amount" >= 0),
  CONSTRAINT "payroll_calculation_lines_period_check" CHECK ("mes" BETWEEN 1 AND 12 AND "anio" BETWEEN 2000 AND 2100)
);

CREATE INDEX IF NOT EXISTS "payroll_calculation_lines_tenant_period_idx"
  ON "payroll_calculation_lines"("tenant_id", "anio", "mes");

CREATE INDEX IF NOT EXISTS "payroll_calculation_lines_payroll_concept_idx"
  ON "payroll_calculation_lines"("payroll_id", "concept_code");

CREATE INDEX IF NOT EXISTS "payroll_calculation_lines_employee_period_idx"
  ON "payroll_calculation_lines"("tenant_id", "empleado_id", "anio", "mes");

ALTER TABLE "payroll_calculation_lines"
  ADD CONSTRAINT "payroll_calculation_lines_payroll_id_fkey"
  FOREIGN KEY ("payroll_id") REFERENCES "nominas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payroll_calculation_lines"
  ADD CONSTRAINT "payroll_calculation_lines_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payroll_calculation_lines"
  ADD CONSTRAINT "payroll_calculation_lines_empleado_id_fkey"
  FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE payroll_accounting_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_calculation_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_payroll_accounting_mappings_policy ON payroll_accounting_mappings;
CREATE POLICY tenant_payroll_accounting_mappings_policy ON payroll_accounting_mappings
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

DROP POLICY IF EXISTS tenant_payroll_calculation_lines_policy ON payroll_calculation_lines;
CREATE POLICY tenant_payroll_calculation_lines_policy ON payroll_calculation_lines
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

WITH default_mappings (
  concept_code, concept_label, category, entry_type,
  debit_account_code, debit_account_name, credit_account_code, credit_account_name,
  cost_center_mode, fixed_cost_center_code, requires_employee_breakdown, status, valid_from, metadata
) AS (
  VALUES
  ('sueldo_base', 'Sueldo proporcional', 'ingreso', 'DEVENGAMIENTO', '510101', 'Sueldos y salarios', '210101', 'Nomina por pagar', 'employee', '', TRUE, 'activo', DATE '2026-01-01', '{"source":"CRN26-default-seed","editableByTenant":true}'::jsonb),
  ('horas_extra_50', 'Horas extra 50%', 'ingreso', 'DEVENGAMIENTO', '510102', 'Horas suplementarias', '210101', 'Nomina por pagar', 'employee', '', TRUE, 'activo', DATE '2026-01-01', '{"source":"CRN26-default-seed","editableByTenant":true}'::jsonb),
  ('horas_extra_100', 'Horas extra 100%', 'ingreso', 'DEVENGAMIENTO', '510103', 'Horas extraordinarias', '210101', 'Nomina por pagar', 'employee', '', TRUE, 'activo', DATE '2026-01-01', '{"source":"CRN26-default-seed","editableByTenant":true}'::jsonb),
  ('bono_desempeno', 'Bono de desempeno', 'ingreso', 'DEVENGAMIENTO', '510104', 'Bonos de nomina', '210101', 'Nomina por pagar', 'employee', '', TRUE, 'activo', DATE '2026-01-01', '{"source":"CRN26-default-seed","editableByTenant":true}'::jsonb),
  ('comision', 'Comisiones', 'ingreso', 'DEVENGAMIENTO', '510105', 'Comisiones de nomina', '210101', 'Nomina por pagar', 'employee', '', TRUE, 'activo', DATE '2026-01-01', '{"source":"CRN26-default-seed","editableByTenant":true}'::jsonb),
  ('fondo_reserva_pagado', 'Fondo de reserva pagado', 'ingreso', 'DEVENGAMIENTO', '510106', 'Fondos de reserva pagados', '210101', 'Nomina por pagar', 'employee', '', TRUE, 'activo', DATE '2026-01-01', '{"source":"CRN26-default-seed","editableByTenant":true}'::jsonb),
  ('aporte_iess_personal', 'Aporte IESS personal', 'deduccion', 'DEVENGAMIENTO', '210101', 'Nomina por pagar', '210201', 'IESS personal por pagar', 'employee', '', TRUE, 'activo', DATE '2026-01-01', '{"source":"CRN26-default-seed","editableByTenant":true}'::jsonb),
  ('impuesto_renta', 'Impuesto a la renta', 'deduccion', 'DEVENGAMIENTO', '210101', 'Nomina por pagar', '210202', 'Impuesto a la renta por pagar', 'employee', '', TRUE, 'activo', DATE '2026-01-01', '{"source":"CRN26-default-seed","editableByTenant":true}'::jsonb),
  ('descuento_faltas', 'Descuento por faltas', 'deduccion', 'DEVENGAMIENTO', '210101', 'Nomina por pagar', '510107', 'Recupero por faltas', 'employee', '', TRUE, 'activo', DATE '2026-01-01', '{"source":"CRN26-default-seed","editableByTenant":true}'::jsonb),
  ('anticipo', 'Anticipo descontado', 'deduccion', 'DEVENGAMIENTO', '210101', 'Nomina por pagar', '112101', 'Anticipos a empleados por cobrar', 'employee', '', TRUE, 'activo', DATE '2026-01-01', '{"source":"CRN26-default-seed","editableByTenant":true}'::jsonb),
  ('prestamo', 'Prestamo descontado', 'deduccion', 'DEVENGAMIENTO', '210101', 'Nomina por pagar', '112102', 'Prestamos a empleados por cobrar', 'employee', '', TRUE, 'activo', DATE '2026-01-01', '{"source":"CRN26-default-seed","editableByTenant":true}'::jsonb),
  ('aporte_iess_patronal', 'Aporte IESS patronal', 'costo_empleador', 'DEVENGAMIENTO', '510201', 'Aporte patronal IESS', '210301', 'IESS patronal por pagar', 'employee', '', TRUE, 'activo', DATE '2026-01-01', '{"source":"CRN26-default-seed","editableByTenant":true}'::jsonb),
  ('decimo_tercero', 'Provision decimo tercero', 'provision', 'PROVISION', '510202', 'Gasto decimo tercero', '210302', 'Provision decimo tercero por pagar', 'employee', '', TRUE, 'activo', DATE '2026-01-01', '{"source":"CRN26-default-seed","editableByTenant":true}'::jsonb),
  ('decimo_cuarto', 'Provision decimo cuarto', 'provision', 'PROVISION', '510203', 'Gasto decimo cuarto', '210303', 'Provision decimo cuarto por pagar', 'employee', '', TRUE, 'activo', DATE '2026-01-01', '{"source":"CRN26-default-seed","editableByTenant":true}'::jsonb),
  ('vacaciones', 'Provision vacaciones', 'provision', 'PROVISION', '510204', 'Gasto vacaciones', '210304', 'Provision vacaciones por pagar', 'employee', '', TRUE, 'activo', DATE '2026-01-01', '{"source":"CRN26-default-seed","editableByTenant":true}'::jsonb),
  ('fondo_reserva_iess', 'Fondo de reserva depositado IESS', 'provision', 'PROVISION', '510205', 'Gasto fondos de reserva', '210305', 'Fondos de reserva por pagar', 'employee', '', TRUE, 'activo', DATE '2026-01-01', '{"source":"CRN26-default-seed","editableByTenant":true}'::jsonb),
  ('neto_banco', 'Pago neto por banco', 'pago', 'PAGO', '210101', 'Nomina por pagar', '110201', 'Bancos', 'employee', '', TRUE, 'activo', DATE '2026-01-01', '{"source":"CRN26-default-seed","editableByTenant":true}'::jsonb)
)
INSERT INTO payroll_accounting_mappings (
  tenant_id, concept_code, concept_label, category, entry_type,
  debit_account_code, debit_account_name, credit_account_code, credit_account_name,
  cost_center_mode, fixed_cost_center_code, requires_employee_breakdown,
  status, valid_from, metadata
)
SELECT
  t.id, dm.concept_code, dm.concept_label, dm.category, dm.entry_type,
  dm.debit_account_code, dm.debit_account_name, dm.credit_account_code, dm.credit_account_name,
  dm.cost_center_mode, dm.fixed_cost_center_code, dm.requires_employee_breakdown,
  dm.status, dm.valid_from, dm.metadata
FROM tenants t
CROSS JOIN default_mappings dm
WHERE NOT EXISTS (
  SELECT 1
  FROM payroll_accounting_mappings existing
  WHERE existing.tenant_id = t.id
)
ON CONFLICT DO NOTHING;
