# HAIKY-AUDITORIA-INTEGRAL-2026-05 - QA release

Objetivo: cerrar la auditoria con gates, AuditLock, revision de diff, commit y push.

Reglas:
- Commit debe incluir `phase:` y `task:` segun `RULES.md`.
- No pushear si `validate`, `haiky:solution` o `git diff --check` detectan regresion.
- No incluir secretos, certificados, tokens, credenciales ni URLs privadas.
- Documentar cualquier gate no ejecutado con causa concreta.

Tareas:
- Ejecutar `npm.cmd run audit:integral`.
- Ejecutar `npm.cmd run haiky:solution`.
- Ejecutar `npm.cmd run validate`.
- Ejecutar `git diff --check`.
- Revisar `git status --short`, `git diff --stat` y cambios sensibles.
- Actualizar `.github/CODEX_CONTEXT.md`, `docs2`, prompts y AuditLock.
- Hacer commit y push a `main`.

Cierre:
- `.vscode/AuditLock.json` y `.vscode/AudiLock.json` firmados.
- Commit local creado con `phase:` y `task:`.
- Push exitoso a `origin/main`.
