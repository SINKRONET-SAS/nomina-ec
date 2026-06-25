-- DOC26 - Acta de entrega de dotacion y equipos generada por el sistema

ALTER TYPE "LegalDocumentType" ADD VALUE IF NOT EXISTS 'acta_entrega_dotacion';

ALTER TABLE "acta_entrega_equipos"
  ADD COLUMN IF NOT EXISTS "items" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "fecha_entrega" DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS "documento_legal_id" UUID;

UPDATE "acta_entrega_equipos"
SET "items" = jsonb_build_array(jsonb_build_object(
  'categoria', 'equipo',
  'descripcion', "descripcion",
  'cantidad', 1,
  'serial', COALESCE("serial", ''),
  'estado', 'entregado'
))
WHERE jsonb_array_length(COALESCE("items", '[]'::jsonb)) = 0;

CREATE UNIQUE INDEX IF NOT EXISTS "acta_entrega_equipos_documento_legal_id_key"
  ON "acta_entrega_equipos"("documento_legal_id")
  WHERE "documento_legal_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "acta_entrega_equipos_tenant_fecha_entrega_idx"
  ON "acta_entrega_equipos"("tenant_id", "fecha_entrega");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'acta_entrega_equipos_documento_legal_id_fkey'
  ) THEN
    ALTER TABLE "acta_entrega_equipos"
      ADD CONSTRAINT "acta_entrega_equipos_documento_legal_id_fkey"
      FOREIGN KEY ("documento_legal_id") REFERENCES "documentos_legales"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
