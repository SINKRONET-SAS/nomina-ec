# OAP26-05 - QA y cierre

Contexto base: `RULES.md` y `.github/CODEX_CONTEXT.md`.

Objetivo: validar OAP26 completo, actualizar `AuditLock.json`, preparar commit y push.

Checks requeridos:
- Tests backend focalizados de periodos, configuracion, contratos y rutas.
- Prisma validate.
- Build PWA.
- `git diff --check`.
- Escaneo UTF-8 sin BOM y mojibake en archivos modificados.

El commit debe incluir `phase: OAP26` y `task: 05.qa-release`.
