-- Agrega la novedad operativa de horas extra nocturnas al catalogo global
-- y su mapeo contable por tenant.

WITH default_novelty_types (
  code, name, description, category, payroll_impact,
  affects_iess, affects_income_tax, affects_decimos, affects_vacation,
  affects_bank_file, requires_evidence, calculation_mode
) AS (
  VALUES
    ('hora_extra_nocturna', 'Hora extra nocturna', 'Ingreso por hora extra nocturna calculada como extraordinaria.', 'ingreso', 'ingreso', TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, 'minutes_hourly_2')
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
  payroll_impact = 'ingreso',
  affects_iess = TRUE,
  affects_income_tax = TRUE,
  affects_decimos = TRUE,
  affects_vacation = TRUE,
  affects_bank_file = TRUE,
  applicability = COALESCE(applicability, '{}'::jsonb) || '{"calculationMode":"minutes_hourly_2"}'::jsonb,
  updated_at = NOW()
WHERE LOWER(code) = 'hora_extra_nocturna'
  AND tenant_id IS NULL;

INSERT INTO payroll_accounting_mappings (
  tenant_id, concept_code, concept_label, category, entry_type,
  debit_account_code, debit_account_name, credit_account_code, credit_account_name,
  cost_center_mode, fixed_cost_center_code, requires_employee_breakdown,
  status, valid_from, metadata
)
SELECT
  t.id,
  'horas_extra_nocturna',
  'Horas extra nocturna',
  'ingreso',
  'DEVENGAMIENTO',
  '510103',
  'Horas extraordinarias',
  '210101',
  'Nomina por pagar',
  'employee',
  '',
  TRUE,
  'activo',
  DATE '2026-01-01',
  '{"source":"CRN26-default-seed","editableByTenant":true}'::jsonb
FROM tenants t
ON CONFLICT DO NOTHING;
