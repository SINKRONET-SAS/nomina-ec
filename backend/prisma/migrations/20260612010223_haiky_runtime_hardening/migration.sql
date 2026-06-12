-- AlterTable
ALTER TABLE "acta_entrega_equipos" ADD COLUMN     "observaciones" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "serial" VARCHAR(120) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "datos_anteriores" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "datos_nuevos" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "ip_address" VARCHAR(80);

-- AlterTable
ALTER TABLE "documentos_legales" ADD COLUMN     "firmado" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "marcaciones" ADD COLUMN     "dentro_perimetro" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "distancia_metros" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "ip_address" VARCHAR(80);

-- AlterTable
ALTER TABLE "nominas" ADD COLUMN     "anticipos" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "detalle_calculo" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "prestamos" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "radio_perimetro_metros" INTEGER NOT NULL DEFAULT 100;

-- CreateTable
CREATE TABLE "parametros_legales" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "anio" INTEGER NOT NULL,
    "pais" VARCHAR(2) NOT NULL DEFAULT 'EC',
    "salario_basico" DECIMAL(12,2) NOT NULL,
    "aporte_personal_pct" DECIMAL(6,4) NOT NULL,
    "aporte_patronal_pct" DECIMAL(6,4) NOT NULL,
    "tabla_impuesto_renta" JSONB NOT NULL,
    "decimo_cuarto_costa_mes" INTEGER NOT NULL,
    "decimo_cuarto_sierra_mes" INTEGER NOT NULL,
    "jornada_maxima_semanal" INTEGER NOT NULL DEFAULT 40,
    "fuente" TEXT NOT NULL DEFAULT 'pendiente_validacion_oficial',
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parametros_legales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfiles_bancarios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "banco_codigo" VARCHAR(20) NOT NULL,
    "banco_nombre" VARCHAR(120) NOT NULL,
    "delimiter" VARCHAR(5) NOT NULL DEFAULT ';',
    "encoding" VARCHAR(20) NOT NULL DEFAULT 'utf8',
    "date_format" VARCHAR(40) NOT NULL DEFAULT 'YYYYMMDD',
    "include_header" BOOLEAN NOT NULL DEFAULT true,
    "include_trailer" BOOLEAN NOT NULL DEFAULT true,
    "field_map" JSONB NOT NULL DEFAULT '{}',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "perfiles_bancarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parametros_legales_tenant_id_anio_pais_key" ON "parametros_legales"("tenant_id", "anio", "pais");

-- CreateIndex
CREATE UNIQUE INDEX "perfiles_bancarios_tenant_id_banco_codigo_key" ON "perfiles_bancarios"("tenant_id", "banco_codigo");

-- AddForeignKey
ALTER TABLE "parametros_legales" ADD CONSTRAINT "parametros_legales_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfiles_bancarios" ADD CONSTRAINT "perfiles_bancarios_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
