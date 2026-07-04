# HSH26-05 QA Release

Objetivo: cerrar HSH26 con validacion, reporte y AuditLock.

Tareas:
- Ejecutar build web.
- Ejecutar `git diff --check`.
- Validar UTF-8 sin BOM en archivos modificados.
- Actualizar `.github/CODEX_CONTEXT.md`.
- Firmar `.vscode/AuditLock.json`.

Gates:
- `npm.cmd --workspace=frontend-web run build`
- `git diff --check`
- UTF-8 sin BOM
