# CPD26-03 - QA release

Ejecutar gates de cierre CPD26:

- `node --check scripts/verify-system-contracts.mjs`.
- `npm.cmd run contracts`.
- `git diff --check`.
- Verificacion UTF-8 sin BOM en archivos `.js`, `.md`, `.json` y `.yaml` modificados.

Actualizar reporte, `.github/CODEX_CONTEXT.md`, `.vscode/AuditLock.json`, commit con `phase: CPD26-03 task: costos-produccion-documentos` y push.
