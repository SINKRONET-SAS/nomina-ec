# Runbook CDANV6S QA Release

## Preparacion

1. Leer `RULES.md`.
2. Leer `.github/CODEX_CONTEXT.md`.
3. Confirmar que la fuente V6 viene de `sinkroniq-cloud-flow` y no de los artefactos CDANV6 historicos.
4. Ejecutar `git status --short` y separar cambios ajenos.

## Verificacion runtime

1. Confirmar `render.yaml`: seed admins y variables PayPhone.
2. Confirmar `GET /api/nomina/:id/rol-pdf` antes de rutas genericas.
3. Confirmar `nominaController.descargarRolPDF` y `payrollRolePdfService.generatePayrollRolePdf`.
4. Confirmar `communicationService.sendRolPagoDisponible` y su uso en `cerrarMes`.
5. Confirmar mobile: tabs de permisos y movilizacion, SQLite local y endpoint `/api/mobile/permisos`.

## Gates

```powershell
npm.cmd --workspace=backend test -- app.routes.test.js nominaController.test.js communicationService.test.js payrollRolePdfService.test.js mobileController.test.js --runInBand
npm.cmd run prisma:validate
npm.cmd run check:mobile
git diff --check
```

## Cierre

1. Actualizar `.github/CODEX_CONTEXT.md`.
2. Actualizar `.vscode/AuditLock.json` con hash previo y firma.
3. Stage explicito de artefactos CDANV6S.
4. Commit `phase: CDANV6S-05 task: cierre-v6-sinkflow`.
5. Push a la rama activa.
