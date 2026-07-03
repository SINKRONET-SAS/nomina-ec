# DPS26-10 QA release

Objetivo: cerrar DPS26 con QA integral, observabilidad, documentacion y release.

Requiere aprobacion explicita del usuario.

Tareas:
- Ejecutar gates completos aplicables.
- Validar dependencias, builds, tests y mobile readiness.
- Revisar logs estructurados, mensajes comerciales y ausencia de PII.
- Actualizar runbooks y reportes finales.
- Firmar `AuditLock.json`.
- Preparar commit y push solo si el usuario lo solicita.

Gates:
- `npm.cmd run contracts`
- `npm.cmd run prisma:validate`
- `npm.cmd --workspace=backend test -- --runInBand`
- `npm.cmd --workspace=frontend-web run build`
- `npm.cmd run check:mobile`
- `git diff --check`
