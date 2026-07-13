# RPE26-04 - QA release, AuditLock y publicacion

Objetivo: validar que RPE26 no introduce regresiones y dejar cierre auditable.

Reglas:
- No cerrar fase con gates fallidos.
- Actualizar `.vscode/AuditLock.json` y `.vscode/AudiLock.json` con firma.
- Commit debe incluir `phase: RPE26-04` y `task: reportes-entidades`.

Tareas:
- Ejecutar targeted tests backend de IESS y rutas.
- Ejecutar contracts y build web.
- Ejecutar `git diff --check`.
- Actualizar reporte de ejecucion con gates reales.
- Commit y push.

Cierre:
- Worktree comprometido y enviado al remoto.

