-- TPC26-02 - Activaciones tenant de plantillas de contrato.
-- La fuente legal permanece compartida en backend/src/templates/legal/contracts.

CREATE INDEX IF NOT EXISTS configuration_catalogs_contract_template_lookup_idx
  ON configuration_catalogs (tenant_id, catalog_type, status, code)
  WHERE catalog_type = 'plantilla_contrato';

CREATE UNIQUE INDEX IF NOT EXISTS configuration_catalogs_contract_default_unique_idx
  ON configuration_catalogs (
    COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    catalog_type
  )
  WHERE catalog_type = 'plantilla_contrato'
    AND status = 'activo'
    AND payload->>'isDefault' = 'true';
