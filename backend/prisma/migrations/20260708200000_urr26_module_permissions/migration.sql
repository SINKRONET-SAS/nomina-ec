-- URR26: Agregar columna module_permissions a usuarios
-- Permite overrides de permisos por modulo del sistema.
-- NULL = usar permisos por defecto del rol.
-- Objeto JSON = { "nomina": false, "documentos": true, ... }

ALTER TABLE "usuarios" ADD COLUMN "module_permissions" JSONB DEFAULT NULL;

-- Indice parcial para buscar usuarios con overrides activos
CREATE INDEX "idx_usuarios_module_permissions" ON "usuarios" ("tenant_id") WHERE "module_permissions" IS NOT NULL;
