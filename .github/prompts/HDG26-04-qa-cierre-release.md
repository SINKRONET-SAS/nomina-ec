# HDG26-04 - QA, cierre y release

Ejecuta pruebas del servicio/controlador, contratos de rutas, suites backend, `npx prisma validate`, `npm run contracts`, build frontend, `git diff --check`, UTF-8 sin BOM y verificacion de que `sinkroniq-mobile` no cambio.

Revisa que los cambios locales previos de anticipos sigan presentes y que el boton/columna de monto de novedades no se pierda.

Actualiza `.github/CODEX_CONTEXT.md`, cierra AuditLock con checks reales, fuerza el alta de `docs2` ignorado cuando corresponda, y realiza commit/push en `main` con el formato de fase y tarea requerido.
