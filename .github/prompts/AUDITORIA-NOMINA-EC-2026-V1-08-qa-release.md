# ANV1-08 QA y release gate

Objetivo: cerrar ANV1 con evidencia.

Instrucciones:
- Ejecutar `npm run contracts`, `npm run prisma:validate`, `npm run test:backend`, `npm run build:web`, `npm run check:mobile`.
- Ejecutar smoke visual de rutas afectadas si la herramienta esta disponible.
- Validar `git diff --check`.
- Actualizar reportes, `CODEX_CONTEXT` en `.github`, `.vscode/AuditLock.json`.
- Commit final o consolidado con formato Haiky y push.
- Commit esperado: `phase: ANV1-08 task: qa release`.
