# PVE26-04 — Regresión, cierre y publicación

Lee `RULES.md`, el Plan Haiky PVE26, `CODEX_CONTEXT.md` y todos los artefactos de fases anteriores.

## Tareas

1. Ejecutar suites backend completas y enfocadas, Prisma validate, `node --check`, parseo/build frontend y `git diff --check`.
2. Validar que edición, carga obligatoria, historial, comparación, restauración, permisos y cálculos existentes no regresen.
3. Confirmar UTF-8 sin BOM en archivos nuevos/modificados y revisar que no haya remanentes de cambios fuera de alcance.
4. Cerrar plan, contexto y AuditLock con evidencia real, fase `PVE26-04` y firma encadenada.
5. Revisar diff final, crear commit con formato `phase: PVE26-04 task: versionar parametros legales`, y hacer push a `main` solo si todas las puertas pasan.

## Criterio de cierre

No declarar PASS por una prueba omitida. Si una dependencia del entorno impide una validación, resolverla o dejar el trabajo bloqueado antes del commit.
