ALTER TABLE "empleados"
  ADD COLUMN IF NOT EXISTS "fecha_nacimiento" DATE;

ALTER TABLE "empleados"
  ADD COLUMN IF NOT EXISTS "provincia_codigo" VARCHAR(10) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "ciudad_codigo" VARCHAR(10) NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS "ecuador_provinces" (
  "code" VARCHAR(10) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "region" VARCHAR(40) NOT NULL DEFAULT '',
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "ecuador_provinces_pkey" PRIMARY KEY ("code")
);

CREATE TABLE IF NOT EXISTS "ecuador_cities" (
  "code" VARCHAR(10) NOT NULL,
  "province_code" VARCHAR(10) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "ecuador_cities_pkey" PRIMARY KEY ("code"),
  CONSTRAINT "ecuador_cities_province_code_fkey" FOREIGN KEY ("province_code") REFERENCES "ecuador_provinces"("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "ecuador_provinces" ("code", "name", "region") VALUES
  ('01', 'Azuay', 'sierra_amazonia'),
  ('02', 'Bolivar', 'sierra_amazonia'),
  ('03', 'Canar', 'sierra_amazonia'),
  ('04', 'Carchi', 'sierra_amazonia'),
  ('05', 'Cotopaxi', 'sierra_amazonia'),
  ('06', 'Chimborazo', 'sierra_amazonia'),
  ('07', 'El Oro', 'costa_galapagos'),
  ('08', 'Esmeraldas', 'costa_galapagos'),
  ('09', 'Guayas', 'costa_galapagos'),
  ('10', 'Imbabura', 'sierra_amazonia'),
  ('11', 'Loja', 'sierra_amazonia'),
  ('12', 'Los Rios', 'costa_galapagos'),
  ('13', 'Manabi', 'costa_galapagos'),
  ('14', 'Morona Santiago', 'sierra_amazonia'),
  ('15', 'Napo', 'sierra_amazonia'),
  ('16', 'Pastaza', 'sierra_amazonia'),
  ('17', 'Pichincha', 'sierra_amazonia'),
  ('18', 'Tungurahua', 'sierra_amazonia'),
  ('19', 'Zamora Chinchipe', 'sierra_amazonia'),
  ('20', 'Galapagos', 'costa_galapagos'),
  ('21', 'Sucumbios', 'sierra_amazonia'),
  ('22', 'Orellana', 'sierra_amazonia'),
  ('23', 'Santo Domingo de los Tsachilas', 'costa_galapagos'),
  ('24', 'Santa Elena', 'costa_galapagos')
ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name", "region" = EXCLUDED."region", "active" = true;

INSERT INTO "ecuador_cities" ("code", "province_code", "name") VALUES
  ('0101', '01', 'Cuenca'),
  ('0201', '02', 'Guaranda'),
  ('0301', '03', 'Azogues'),
  ('0401', '04', 'Tulcan'),
  ('0501', '05', 'Latacunga'),
  ('0601', '06', 'Riobamba'),
  ('0701', '07', 'Machala'),
  ('0801', '08', 'Esmeraldas'),
  ('0901', '09', 'Guayaquil'),
  ('1001', '10', 'Ibarra'),
  ('1101', '11', 'Loja'),
  ('1201', '12', 'Babahoyo'),
  ('1301', '13', 'Portoviejo'),
  ('1401', '14', 'Morona'),
  ('1501', '15', 'Tena'),
  ('1601', '16', 'Pastaza'),
  ('1701', '17', 'Quito'),
  ('1801', '18', 'Ambato'),
  ('1901', '19', 'Zamora'),
  ('2001', '20', 'San Cristobal'),
  ('2101', '21', 'Lago Agrio'),
  ('2201', '22', 'Orellana'),
  ('2301', '23', 'Santo Domingo'),
  ('2401', '24', 'Santa Elena')
ON CONFLICT ("code") DO UPDATE SET "province_code" = EXCLUDED."province_code", "name" = EXCLUDED."name", "active" = true;

CREATE TABLE IF NOT EXISTS "employee_family_dependents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "nombres" VARCHAR(120) NOT NULL,
  "apellidos" VARCHAR(120) NOT NULL DEFAULT '',
  "identificacion" VARCHAR(20) NOT NULL DEFAULT '',
  "parentesco" VARCHAR(40) NOT NULL,
  "fecha_nacimiento" DATE,
  "discapacidad" BOOLEAN NOT NULL DEFAULT false,
  "porcentaje_discapacidad" DECIMAL(5,2),
  "documento_url" TEXT NOT NULL DEFAULT '',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "employee_family_dependents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "employee_family_dependents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "employee_family_dependents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "employee_family_dependents_employee_idx"
  ON "employee_family_dependents" ("tenant_id", "employee_id", "activo");
