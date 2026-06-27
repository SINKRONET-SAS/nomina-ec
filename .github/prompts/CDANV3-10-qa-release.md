# CDANV3-10 - QA y release

Objetivo: cerrar CDANV3 con evidencia completa.

Ejecutar:
- `npm.cmd run contracts`
- `npm.cmd run prisma:validate`
- `npm.cmd run test:backend`
- `npm.cmd run build:web`
- `npm.cmd run check:mobile`
- Smokes focales Payphone, seed Render, auth claims y movilizacion.

Actualizar:
- Reporte final `REPORTE_CDANV3_10_QA_RELEASE.md`.
- `.github/CODEX_CONTEXT.md`.
- `.vscode/AuditLock.json`.

Cierre:
- Commit `phase: CDANV3-10 task: qa-release`.
- Push a la rama activa si el usuario lo solicita o si el flujo de cierre ya lo requiere.
