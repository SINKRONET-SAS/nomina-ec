-- CRN26 - Indice unico y limpieza de tipos de novedad duplicados.

DROP INDEX IF EXISTS novelty_type_configs_unique_scope;

UPDATE novelty_type_configs
SET
  code = regexp_replace(
    regexp_replace(LOWER(BTRIM(code)), '[^a-z0-9_]+', '_', 'g'),
    '^_+|_+$',
    '',
    'g'
  ),
  updated_at = NOW()
WHERE code <> regexp_replace(
  regexp_replace(LOWER(BTRIM(code)), '[^a-z0-9_]+', '_', 'g'),
  '^_+|_+$',
  '',
  'g'
);

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY
        COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
        LOWER(BTRIM(code))
      ORDER BY
        valid_from DESC,
        updated_at DESC,
        created_at DESC,
        id DESC
    ) AS rn
  FROM novelty_type_configs
  WHERE status = 'activo'
    AND valid_to IS NULL
)
UPDATE novelty_type_configs n
SET
  status = 'inactivo',
  valid_to = CASE
    WHEN n.valid_from <= CURRENT_DATE - 1 THEN CURRENT_DATE - 1
    ELSE n.valid_from
  END,
  updated_at = NOW()
FROM ranked r
WHERE n.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS novelty_type_configs_active_code_norm_idx
  ON novelty_type_configs (
    COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    LOWER(BTRIM(code))
  )
  WHERE status = 'activo' AND valid_to IS NULL;

CREATE INDEX IF NOT EXISTS novelty_type_configs_scope_code_norm_lookup_idx
  ON novelty_type_configs (
    COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    LOWER(BTRIM(code)),
    status,
    valid_from DESC
  );
