# TPC26-00 - Baseline y gobierno documental

## Plan

`HAIKY-PLANTILLAS-CONTRATOS-CLIENTE-2026`

## Objetivo

Registrar el requerimiento de refactorizar las plantillas de contratos para que sean parametrizables, seleccionables por cliente y eficientes en almacenamiento, sin tocar runtime en esta fase.

## Lecturas obligatorias

- `RULES.md`
- `.github/CODEX_CONTEXT.md`
- `.vscode/AuditLock.json`
- `docs2/PLAN_HAIKY_PLANTILLAS_CONTRATOS_CLIENTE_2026.md`

## Tareas

- Confirmar el inventario de las 17 plantillas JSON actuales.
- Confirmar rutas, permisos, aliases, campo `empleados.tipo_contrato`, generación automática y metadata de documentos.
- Registrar que `configuration_catalogs` existe y que la decisión de reutilizarlo queda para TPC26-01.
- Crear o actualizar el contexto, los prompts y el AuditLock únicamente como artefactos documentales.

## Prohibiciones

- No modificar backend, frontend, Prisma, seeds ni almacenamiento.
- No eliminar plantillas ni documentos.
- No iniciar TPC26-01 sin aprobación explícita del usuario y AuditLock válido.

## Cierre

- `phaseCompleted` debe quedar en `TPC26-00`.
- `AuditLock.json` debe registrar archivos, checks y firma SHA256.
- Commit esperado si se solicita publicar: `phase: TPC26-00 task: baseline-gobierno`.
