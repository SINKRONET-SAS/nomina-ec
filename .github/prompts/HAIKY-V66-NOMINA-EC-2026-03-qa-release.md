# HAIKY V66 03 - QA release

Usar `.github/CODEX_CONTEXT.md` y `RULES.md`.

Objetivo: cerrar V66 con validacion, AuditLock, commit y push a `main`.

Tareas:

- Ejecutar tests backend especificos.
- Ejecutar build PWA, contratos, mobile check y `git diff --check`.
- Verificar UTF-8 sin BOM en archivos modificados.
- Firmar `AuditLock.json` con fase V66.
- Commit con `phase: V66 task: cierre-hallazgos-v66`.
- Push a `origin main`.
