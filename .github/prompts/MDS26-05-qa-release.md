# MDS26-05 - QA y release

Aplicar `RULES.md` y `.github/CODEX_CONTEXT.md`.

Objetivo: validar todo el plan con gates de calidad y cerrar gobierno.

Tareas:

- `npm --workspace=backend test`: todos los tests pasan.
- `npm --workspace=frontend-web run build`: build limpio.
- `npm run contracts`: contratos del sistema pasan.
- `git diff --check`: sin problemas de whitespace.
- Crear reporte de ejecucion en `docs2/mensualizacion-decimos-sknomina-2026/`.
- Actualizar `AuditLock.json` con estado `completed-pass`.
- Actualizar `CODEX_CONTEXT.md` con plan cerrado.
- Commit y push a main.

Cierre:

- Todos los gates verdes.
- AuditLock firmado.
- Codigo en main y disponible para produccion.
