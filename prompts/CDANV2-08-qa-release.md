# CDANV2-08 - QA y release gate

Objetivo: cierre integral CDANV2.

Ejecutar:
- `npm.cmd run contracts`
- `npm.cmd run prisma:validate`
- `npm.cmd run test:backend`
- `npm.cmd run build:web`
- `npm.cmd run check:mobile`
- Pruebas especificas de fases CDANV2.

Cerrar:
- Matriz sin P0 pendientes.
- Runbook actualizado.
- `.github/CODEX_CONTEXT.md` consolidado.
- `AuditLock.json` firmado.
- Commit `phase: CDANV2-08 task: qa-release`.
