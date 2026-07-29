-- PVE26-P2: una corrección o validación puede crear una versión nueva
-- con la misma fecha de vigencia. Las versiones históricas deben conservarse;
-- la unicidad solo debe impedir más de una versión vigente por parámetro.
DROP INDEX IF EXISTS legal_parameter_versions_unique_scope;

CREATE UNIQUE INDEX IF NOT EXISTS legal_parameter_versions_unique_scope
  ON legal_parameter_versions (
    COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    country_code,
    region_code,
    period_year,
    parameter_key
  )
  WHERE valid_to IS NULL;
