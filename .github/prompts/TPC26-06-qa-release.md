# TPC26-06 - QA, seguridad, legal y cierre

## Plan

`HAIKY-PLANTILLAS-CONTRATOS-CLIENTE-2026`

## Precondición y aprobación

- Validar AuditLock firmado para `TPC26-05`.
- Requerir autorización explícita del usuario para cierre, commit y push.

## Objetivo

Cerrar el plan con evidencia reproducible, compatibilidad, controles de acceso, revisión legal y trazabilidad de publicación.

## Gates

- Tests backend focalizados y suite completa disponible.
- `node --check` en servicios y scripts modificados.
- `npm.cmd run contracts` o gate contractual vigente.
- `npx.cmd prisma validate` y migración reversible si aplica.
- Build de `frontend-web`.
- Pruebas de aislamiento tenant, permisos, aliases y plantillas inactivas.
- Pruebas de snapshot, descarga histórica y generación bajo demanda/automática.
- Validación UTF-8 sin BOM, mojibake y `git diff --check`.
- Auditoría de almacenamiento antes/después y `dry-run` de rollback.

## Cierre documental

- Actualizar plan, contexto y AuditLock con resultados reales; no declarar gates no ejecutados.
- Registrar bloqueos externos, revisión laboral pendiente y siguiente acción.
- Commit esperado: `phase: TPC26-06 task: qa-release`.
