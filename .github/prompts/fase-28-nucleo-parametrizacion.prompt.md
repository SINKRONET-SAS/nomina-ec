# Fase 28 - Núcleo de parametrización

Ejecutar solo con aprobación explícita.

## Contexto obligatorio

- Leer `RULES.md`.
- Leer `.vscode/AuditLock.json`.
- Confirmar que la fase 27.2 está firmada.
- Revisar `docs2/PLAN_HAIKY_NOMINA_EC_REVISADO.md` y `docs2/PLAN_HAIKY_LANDING_PWA_AUTH_PAYPHONE.md`.

## Objetivo

Crear el núcleo común para catálogos globales y catálogos por tenant con vigencia, estado, auditoría y RBAC.

## Alcance

- Diseñar tablas Prisma para configuración global y por tenant.
- Definir estados: `borrador`, `activo`, `inactivo`, `bloqueado`, `archivado`.
- Agregar vigencia `validFrom` y `validTo`.
- Agregar auditoría de creación, actualización, aprobación y bloqueo.
- Crear servicios backend base y endpoints protegidos.
- Crear primera pantalla administrativa de configuración.

## Validaciones

- `npx prisma validate`.
- `npx prisma migrate deploy` en local.
- `node --check` en backend modificado.
- `npm run build` en frontend.
- Tests de RBAC para SUPERADMIN, OWNER y ADMIN_RRHH.
- AuditLock firmado.
