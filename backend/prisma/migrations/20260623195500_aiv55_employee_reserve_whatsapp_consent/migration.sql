ALTER TABLE "empleados"
  ADD COLUMN IF NOT EXISTS "modalidad_fondo_reserva" VARCHAR(40) NOT NULL DEFAULT 'mensual';

ALTER TABLE "empleados"
  ADD COLUMN IF NOT EXISTS "whatsapp_consent_at" TIMESTAMPTZ(6);

ALTER TABLE "empleados"
  DROP CONSTRAINT IF EXISTS "empleados_modalidad_fondo_reserva_check";

ALTER TABLE "empleados"
  ADD CONSTRAINT "empleados_modalidad_fondo_reserva_check"
  CHECK ("modalidad_fondo_reserva" IN ('mensual', 'iess_directo'));

COMMENT ON COLUMN "empleados"."modalidad_fondo_reserva" IS
  'AIV55: mensual = se paga en rol; iess_directo = deposito al IESS segun eleccion del trabajador.';

COMMENT ON COLUMN "empleados"."whatsapp_consent_at" IS
  'AIV55: consentimiento explicito para comunicaciones laborales por WhatsApp.';
