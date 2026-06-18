ALTER TABLE organization_units
  ADD COLUMN IF NOT EXISTS work_zone_id UUID NULL;

UPDATE organization_units AS unit
SET work_zone_id = (
      SELECT zone.id
      FROM work_zones AS zone
      WHERE zone.tenant_id = unit.tenant_id
        AND zone.status = 'activo'
      ORDER BY zone.created_at ASC, zone.id ASC
      LIMIT 1
    ),
    updated_at = now(),
    metadata = COALESCE(unit.metadata, '{}'::jsonb) || jsonb_build_object(
      'workZoneAutoAssignedAt',
      now(),
      'workZoneAutoAssignedReason',
      'Migracion: cada unidad organizativa debe tener una zona de marcacion.'
    )
WHERE unit.work_zone_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM work_zones AS zone
    WHERE zone.tenant_id = unit.tenant_id
      AND zone.status = 'activo'
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organization_units_work_zone_id_fkey'
  ) THEN
    ALTER TABLE organization_units
      ADD CONSTRAINT organization_units_work_zone_id_fkey
      FOREIGN KEY (work_zone_id)
      REFERENCES work_zones(id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organization_units_work_zone_required'
  ) THEN
    ALTER TABLE organization_units
      ADD CONSTRAINT organization_units_work_zone_required
      CHECK (work_zone_id IS NOT NULL)
      NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS organization_units_work_zone_idx
  ON organization_units (tenant_id, work_zone_id, status);
