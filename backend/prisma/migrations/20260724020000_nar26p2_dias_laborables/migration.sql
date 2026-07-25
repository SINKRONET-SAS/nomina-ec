-- NAR26-P2: dia laborable calculado como novedad informativa.
-- Rollback documentado: DELETE FROM novelty_type_configs WHERE tenant_id IS NULL AND code = 'dia_laborado';
INSERT INTO novelty_type_configs (
  tenant_id, code, name, description, category, payroll_impact,
  affects_iess, affects_income_tax, affects_decimos, affects_vacation,
  affects_bank_file, requires_evidence, approval_flow, applicability, status, valid_from
)
SELECT
  NULL,
  'dia_laborado',
  'Dia laborado calculado',
  'Evidencia informativa del dia laborable calculado desde la jornada y la carga de asistencia.',
  'asistencia',
  'informativo',
  FALSE, FALSE, FALSE, FALSE, FALSE, FALSE,
  '{"requiredRoles":["admin_rrhh","owner"]}'::jsonb,
  '{"calculationMode":"informational","source":"attendance_workday_calculation"}'::jsonb,
  'activo',
  DATE '2026-01-01'
WHERE NOT EXISTS (
  SELECT 1 FROM novelty_type_configs
  WHERE tenant_id IS NULL AND LOWER(code) = 'dia_laborado'
);
