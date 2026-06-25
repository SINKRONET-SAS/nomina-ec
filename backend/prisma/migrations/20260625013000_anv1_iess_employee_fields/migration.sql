ALTER TABLE empleados
  ADD COLUMN IF NOT EXISTS iess_afiliado BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS iess_tipo_relacion VARCHAR(60) NOT NULL DEFAULT 'relacion_dependencia';

UPDATE empleados
SET iess_afiliado = true
WHERE iess_afiliado IS NULL;

UPDATE empleados
SET iess_tipo_relacion = 'relacion_dependencia'
WHERE iess_tipo_relacion IS NULL OR BTRIM(iess_tipo_relacion) = '';

CREATE INDEX IF NOT EXISTS empleados_tenant_iess_tipo_idx
  ON empleados (tenant_id, iess_tipo_relacion, activo);
