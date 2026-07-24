# NAR26-06 — QA, cierre de gobierno y publicación

Ejecutar en orden: pruebas focalizadas NAR26, `npm run contracts`, `npm run prisma:validate`, `npm run test:backend`, `npm run build:web`, `git diff --check` y validaciones de UTF-8 sin BOM.

Revisar migraciones y regresiones: roles mensuales, anticipos existentes, carga masiva de novedades, cargos individuales, DPA y verificación de delegados. Corregir cualquier fallo encontrado antes del cierre.

Actualizar `CODEX_CONTEXT.md` y `AuditLock.json` con fases completas, archivos, checks, hash de la cadena y firma final. Revisar `git status`, agregar solo artefactos y código del plan, crear commit con `phase: NAR26-06` y `task: ...`, y hacer push a `main`.
