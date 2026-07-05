# MGR26-03 - QA y cierre

Aplicar `RULES.md` y `.github/CODEX_CONTEXT.md`.

Objetivo: validar MGR26, cerrar gobierno y dejar commit/push.

Gates:

- `node --check backend/src/controllers/mobileController.js`
- `node --check backend/src/services/routeVisitService.js`
- `npm.cmd --workspace=backend test -- --runTestsByPath src/controllers/mobileController.test.js src/app.routes.test.js --runInBand`
- `npm.cmd run contracts`
- `npm.cmd run check:mobile`
- `git diff --check`
- UTF-8 sin BOM de archivos modificados `.js`, `.mjs`, `.json`, `.md`.

Cierre:

- Actualizar reporte MGR26 con gates reales.
- Actualizar `.github/CODEX_CONTEXT.md`.
- Actualizar `.vscode/AuditLock.json` con firma.
- Commit: `phase: MGR26-03 task: mobile gestion rutas zonas`.
- Push a `origin/main`.
