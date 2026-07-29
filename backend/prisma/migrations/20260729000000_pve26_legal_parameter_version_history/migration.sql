-- PVE26: metadatos para historial inmutable de parámetros legales.
ALTER TABLE legal_parameter_versions
  ADD COLUMN IF NOT EXISTS version_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS version_reason VARCHAR(80) NOT NULL DEFAULT 'carga_inicial',
  ADD COLUMN IF NOT EXISTS replaces_version_id UUID NULL;

ALTER TABLE legal_parameter_versions
  DROP CONSTRAINT IF EXISTS legal_parameter_versions_replaces_version_fk;

ALTER TABLE legal_parameter_versions
  ADD CONSTRAINT legal_parameter_versions_replaces_version_fk
  FOREIGN KEY (replaces_version_id)
  REFERENCES legal_parameter_versions(id)
  ON DELETE SET NULL;

UPDATE legal_parameter_versions
SET version_number = 1
WHERE version_number IS NULL OR version_number < 1;

CREATE INDEX IF NOT EXISTS legal_parameter_versions_history_idx
  ON legal_parameter_versions (
    tenant_id,
    period_year,
    parameter_key,
    valid_from DESC,
    version_number DESC,
    created_at DESC
  );

-- Rollback manual, sin borrar historial:
-- ALTER TABLE legal_parameter_versions DROP CONSTRAINT IF EXISTS legal_parameter_versions_replaces_version_fk;
-- DROP INDEX IF EXISTS legal_parameter_versions_history_idx;
-- ALTER TABLE legal_parameter_versions DROP COLUMN IF EXISTS replaces_version_id;
-- ALTER TABLE legal_parameter_versions DROP COLUMN IF EXISTS version_reason;
-- ALTER TABLE legal_parameter_versions DROP COLUMN IF EXISTS version_number;
