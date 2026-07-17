# Prompt RDE26P2-04 — QA, cierre y entrega

Ejecuta la validación completa de RDE26P2.

- `npm.cmd run contracts`
- `npm.cmd run prisma:validate`
- pruebas backend completas y pruebas focalizadas de identidad/documentos
- `npm.cmd run build` en `frontend-web`
- `node --check` en backend modificado
- validación UTF-8 sin BOM y `git diff --check`
- cierra AuditLock con fase RDE26P2-04 y resumen de archivos/checks
- crea commit con formato `phase: RDE26P2-04 task: ...`
- publica en `origin/main`

Si un check externo no está disponible, regístralo como bloqueo verificable; no declares PASS sin evidencia.
