CREATE TABLE IF NOT EXISTS job_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  organization_unit_id UUID NOT NULL,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(160) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  salary_min DECIMAL(12, 2) NOT NULL DEFAULT 0,
  salary_max DECIMAL(12, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'activo',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT job_positions_tenant_id_fkey
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT job_positions_organization_unit_id_fkey
    FOREIGN KEY (organization_unit_id)
    REFERENCES organization_units(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT job_positions_salary_range_check
    CHECK (salary_min >= 0 AND salary_max >= 0 AND salary_min <= salary_max),
  CONSTRAINT job_positions_status_check
    CHECK (status IN ('activo', 'inactivo', 'archivado')),
  CONSTRAINT job_positions_effective_range_check
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS job_positions_unique_tenant_code
  ON job_positions (tenant_id, code);

CREATE INDEX IF NOT EXISTS job_positions_unit_status_idx
  ON job_positions (tenant_id, organization_unit_id, status);

CREATE INDEX IF NOT EXISTS job_positions_status_vigencia_idx
  ON job_positions (tenant_id, status, effective_from, effective_to);

ALTER TABLE empleados
  ADD COLUMN IF NOT EXISTS position_id UUID NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'empleados_position_id_fkey'
  ) THEN
    ALTER TABLE empleados
      ADD CONSTRAINT empleados_position_id_fkey
      FOREIGN KEY (position_id)
      REFERENCES job_positions(id)
      ON DELETE RESTRICT
      ON UPDATE CASCADE
      NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS empleados_position_idx
  ON empleados (tenant_id, position_id);

WITH legacy_positions AS (
  SELECT
    e.tenant_id,
    ou.id AS organization_unit_id,
    'LEGACY_' || UPPER(SUBSTRING(MD5(e.tenant_id::text || '|' || ou.id::text || '|' || LOWER(TRIM(e.cargo))) FROM 1 FOR 10)) AS code,
    TRIM(e.cargo) AS name,
    MIN(e.sueldo_bruto_mensual)::DECIMAL(12, 2) AS salary_min,
    MAX(e.sueldo_bruto_mensual)::DECIMAL(12, 2) AS salary_max,
    MIN(e.fecha_ingreso)::DATE AS effective_from,
    COUNT(*)::INT AS employee_count
  FROM empleados e
  JOIN organization_units ou
    ON ou.tenant_id = e.tenant_id
   AND (
      ou.code = NULLIF(e.unidad_organizativa_codigo, '')
      OR ou.code = NULLIF(e.departamento, '')
      OR ou.name = NULLIF(e.departamento, '')
      OR ou.cost_center_code = NULLIF(e.departamento, '')
   )
  WHERE TRIM(COALESCE(e.cargo, '')) <> ''
  GROUP BY e.tenant_id, ou.id, TRIM(e.cargo)
)
INSERT INTO job_positions (
  tenant_id,
  organization_unit_id,
  code,
  name,
  description,
  salary_min,
  salary_max,
  currency,
  effective_from,
  status,
  metadata
)
SELECT
  tenant_id,
  organization_unit_id,
  code,
  name,
  'Cargo migrado desde empleados.cargo; revisar rango salarial antes de uso productivo.',
  salary_min,
  salary_max,
  'USD',
  COALESCE(effective_from, CURRENT_DATE),
  'activo',
  jsonb_build_object(
    'source', 'CRS26_migration',
    'reviewRequired', true,
    'employeeCount', employee_count
  )
FROM legacy_positions
ON CONFLICT (tenant_id, code) DO NOTHING;

UPDATE empleados e
SET position_id = jp.id,
    updated_at = NOW()
FROM organization_units ou
JOIN job_positions jp
  ON jp.tenant_id = ou.tenant_id
 AND jp.organization_unit_id = ou.id
WHERE e.tenant_id = ou.tenant_id
  AND e.position_id IS NULL
  AND TRIM(COALESCE(e.cargo, '')) <> ''
  AND (
    ou.code = NULLIF(e.unidad_organizativa_codigo, '')
    OR ou.code = NULLIF(e.departamento, '')
    OR ou.name = NULLIF(e.departamento, '')
    OR ou.cost_center_code = NULLIF(e.departamento, '')
  )
  AND jp.code = 'LEGACY_' || UPPER(SUBSTRING(MD5(e.tenant_id::text || '|' || ou.id::text || '|' || LOWER(TRIM(e.cargo))) FROM 1 FOR 10));

ALTER TABLE job_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_job_positions_policy ON job_positions;
CREATE POLICY tenant_job_positions_policy ON job_positions
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());
