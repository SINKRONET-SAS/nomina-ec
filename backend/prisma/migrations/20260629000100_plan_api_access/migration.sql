ALTER TABLE "planes_comerciales"
ADD COLUMN IF NOT EXISTS "api_access" BOOLEAN NOT NULL DEFAULT false;
