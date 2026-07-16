# TPC26-02 - Catálogo por cliente y migración reversible

## Plan

`HAIKY-PLANTILLAS-CONTRATOS-CLIENTE-2026`

## Precondición y aprobación

- Validar AuditLock firmado para `TPC26-01`.
- Requerir aprobación explícita del usuario antes de crear migraciones, seeds o cambios de API.

## Objetivo

Persistir activaciones, versiones, default, orden y aliases por tenant con la menor ampliación de esquema posible y con rollback verificable.

## Tareas

- Implementar el modelo aprobado en TPC26-01, priorizando la fuente de verdad existente.
- Crear índices y restricciones para evitar duplicidad por tenant, clave y versión.
- Migrar claves actuales de `empleados.tipo_contrato` sin alterar documentos históricos.
- Definir default activo por tenant, estados, permisos `owner`/`admin_rrhh` y aprobación.
- Crear script `dry-run` y reversión que conserve evidencias emitidas.
- Actualizar contratos de API solo con campos opcionales y compatibilidad para `tipoContrato`.

## Cierre

- Prisma/migraciones, tests de permisos y rollback deben pasar.
- La PWA todavía no debe mostrar opciones no expuestas por backend.
- AuditLock firmado antes de TPC26-03.
- Commit esperado: `phase: TPC26-02 task: catalogo-tenant-migracion`.
