ALTER TABLE planes_comerciales
  ADD COLUMN IF NOT EXISTS iess_establecimientos_max INTEGER NOT NULL DEFAULT 1;
