WITH ranked_active_parameters AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY
        COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
        country_code,
        region_code,
        period_year,
        parameter_key
      ORDER BY valid_from DESC, updated_at DESC, created_at DESC, id DESC
    ) AS row_number
  FROM legal_parameter_versions
  WHERE valid_to IS NULL
)
UPDATE legal_parameter_versions AS parameter
SET valid_to = CURRENT_DATE,
    updated_at = now(),
    notes = CONCAT(
      parameter.notes,
      CASE WHEN parameter.notes = '' THEN '' ELSE E'\n' END,
      'Cerrado automaticamente por migracion: existe una version activa mas reciente para el mismo parametro.'
    )
FROM ranked_active_parameters AS ranked
WHERE parameter.id = ranked.id
  AND ranked.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS legal_parameter_versions_active_unique_scope
  ON legal_parameter_versions (
    COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    country_code,
    region_code,
    period_year,
    parameter_key
  )
  WHERE valid_to IS NULL;

CREATE INDEX IF NOT EXISTS legal_parameter_versions_active_lookup_idx
  ON legal_parameter_versions (
    tenant_id,
    period_year,
    parameter_key,
    validation_status,
    updated_at DESC
  )
  WHERE valid_to IS NULL;
