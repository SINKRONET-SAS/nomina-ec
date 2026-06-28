ALTER TABLE empleados
  ADD COLUMN IF NOT EXISTS referencia_no_convive_nombres VARCHAR(160) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS referencia_no_convive_email VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS referencia_no_convive_telefono VARCHAR(40) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS domicilio_lat DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS domicilio_lng DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS croquis_domicilio_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS croquis_domicilio_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
