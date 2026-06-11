-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('superadmin', 'owner', 'admin_rrhh', 'supervisor', 'empleado');

-- CreateEnum
CREATE TYPE "AttendanceMarkType" AS ENUM ('inicio_jornada', 'fin_jornada', 'inicio_almuerzo', 'fin_almuerzo');

-- CreateEnum
CREATE TYPE "AttendanceNoveltyType" AS ENUM ('falta', 'atraso', 'salida_temprana', 'hora_extra_50', 'hora_extra_100');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('pendiente', 'aprobado', 'rechazado');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('borrador', 'cerrada', 'pagada');

-- CreateEnum
CREATE TYPE "LegalDocumentType" AS ENUM ('contrato', 'acta_finiquito', 'rol_pago', 'certificado');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ruc" VARCHAR(13),
    "razon_social" VARCHAR(200) NOT NULL,
    "nombre_comercial" VARCHAR(200),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "configuracion" JSONB NOT NULL DEFAULT '{}',
    "ubicacion_lat" DECIMAL(10,7),
    "ubicacion_lng" DECIMAL(10,7),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "rol" "UserRole" NOT NULL,
    "nombres" VARCHAR(120) NOT NULL DEFAULT '',
    "apellidos" VARCHAR(120) NOT NULL DEFAULT '',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_acceso" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empleados" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "cedula" VARCHAR(10) NOT NULL,
    "nombres" VARCHAR(120) NOT NULL,
    "apellidos" VARCHAR(120) NOT NULL,
    "cargo" VARCHAR(120) NOT NULL DEFAULT '',
    "departamento" VARCHAR(120) NOT NULL DEFAULT '',
    "sueldo_bruto_mensual" DECIMAL(12,2) NOT NULL,
    "fecha_ingreso" DATE NOT NULL,
    "fecha_salida" DATE,
    "tipo_contrato" VARCHAR(60) NOT NULL DEFAULT 'indefinido',
    "cuenta_bancaria_cifrada" BYTEA,
    "banco" VARCHAR(80) NOT NULL DEFAULT '',
    "tipo_cuenta" VARCHAR(40) NOT NULL DEFAULT '',
    "direccion_domicilio" TEXT NOT NULL DEFAULT '',
    "telefono" VARCHAR(40) NOT NULL DEFAULT '',
    "email_personal" VARCHAR(255) NOT NULL DEFAULT '',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empleados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marcaciones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empleado_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tipo_marcacion" "AttendanceMarkType" NOT NULL,
    "timestamp" TIMESTAMPTZ(6) NOT NULL,
    "latitud" DECIMAL(10,7),
    "longitud" DECIMAL(10,7),
    "foto_url" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marcaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "novedades_asistencia" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empleado_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "tipo_novedad" "AttendanceNoveltyType" NOT NULL,
    "minutos" INTEGER NOT NULL DEFAULT 0,
    "justificacion" TEXT NOT NULL DEFAULT '',
    "estado" "ApprovalStatus" NOT NULL DEFAULT 'pendiente',
    "aprobado_por" UUID,
    "aprobado_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "novedades_asistencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nominas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "empleado_id" UUID NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "dias_trabajados" INTEGER NOT NULL DEFAULT 30,
    "sueldo_bruto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "horas_extras_50" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "horas_extras_100" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_ingresos" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "aporte_iess_personal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "impuesto_renta" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_deducciones" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "neto_recibir" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estado" "PayrollStatus" NOT NULL DEFAULT 'borrador',
    "rol_pdf_url" TEXT,
    "cerrado_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nominas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_legales" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "empleado_id" UUID,
    "tipo_documento" "LegalDocumentType" NOT NULL,
    "documento_url" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_legales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expira_en" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sesiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acta_entrega_equipos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empleado_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "descripcion" TEXT NOT NULL,
    "devuelto" BOOLEAN NOT NULL DEFAULT false,
    "devuelto_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acta_entrega_equipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "user_id" UUID,
    "correlation_id" VARCHAR(120) NOT NULL,
    "accion" VARCHAR(120) NOT NULL,
    "entidad" VARCHAR(120) NOT NULL,
    "entidad_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_ruc_key" ON "tenants"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_tenant_id_email_key" ON "usuarios"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "empleados_cedula_key" ON "empleados"("cedula");

-- CreateIndex
CREATE INDEX "empleados_tenant_id_activo_idx" ON "empleados"("tenant_id", "activo");

-- CreateIndex
CREATE INDEX "marcaciones_tenant_id_empleado_id_timestamp_idx" ON "marcaciones"("tenant_id", "empleado_id", "timestamp");

-- CreateIndex
CREATE INDEX "novedades_asistencia_tenant_id_estado_idx" ON "novedades_asistencia"("tenant_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "novedades_asistencia_empleado_id_fecha_tipo_novedad_key" ON "novedades_asistencia"("empleado_id", "fecha", "tipo_novedad");

-- CreateIndex
CREATE INDEX "nominas_tenant_id_anio_mes_idx" ON "nominas"("tenant_id", "anio", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "nominas_tenant_id_empleado_id_anio_mes_key" ON "nominas"("tenant_id", "empleado_id", "anio", "mes");

-- CreateIndex
CREATE INDEX "documentos_legales_tenant_id_empleado_id_idx" ON "documentos_legales"("tenant_id", "empleado_id");

-- CreateIndex
CREATE INDEX "acta_entrega_equipos_tenant_id_empleado_id_devuelto_idx" ON "acta_entrega_equipos"("tenant_id", "empleado_id", "devuelto");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_user_id_created_at_idx" ON "audit_logs"("tenant_id", "user_id", "created_at");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marcaciones" ADD CONSTRAINT "marcaciones_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marcaciones" ADD CONSTRAINT "marcaciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novedades_asistencia" ADD CONSTRAINT "novedades_asistencia_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "novedades_asistencia" ADD CONSTRAINT "novedades_asistencia_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nominas" ADD CONSTRAINT "nominas_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nominas" ADD CONSTRAINT "nominas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_legales" ADD CONSTRAINT "documentos_legales_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_legales" ADD CONSTRAINT "documentos_legales_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acta_entrega_equipos" ADD CONSTRAINT "acta_entrega_equipos_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
