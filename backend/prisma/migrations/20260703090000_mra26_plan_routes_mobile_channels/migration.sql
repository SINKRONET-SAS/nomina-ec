ALTER TABLE "planes_comerciales"
ADD COLUMN IF NOT EXISTS "app_movil" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "rutas_campo" BOOLEAN NOT NULL DEFAULT false;

UPDATE "planes_comerciales"
SET
  "app_movil" = CASE
    WHEN "id" IN ('TRIAL', 'MICRO', 'PYME', 'EMPRESA', 'CORPORATIVO') THEN true
    ELSE "app_movil"
  END,
  "rutas_campo" = CASE
    WHEN "id" IN ('PYME', 'EMPRESA', 'CORPORATIVO') THEN true
    ELSE "rutas_campo"
  END,
  "metadata" = COALESCE("metadata", '{}'::jsonb) || jsonb_build_object(
    'mra26', jsonb_build_object(
      'appMovilCanalMonetizado', true,
      'rutasCampoCanalMonetizado', true
    )
  ),
  "updated_at" = NOW()
WHERE "id" IN ('TRIAL', 'MICRO', 'PYME', 'EMPRESA', 'CORPORATIVO');
