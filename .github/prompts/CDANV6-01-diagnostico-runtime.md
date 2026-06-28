# CDANV6-01 - Diagnostico runtime

Objetivo: contrastar HAL-1 a HAL-9 contra el repo actual antes de aplicar fixes.

Reglas:
- Requiere aprobacion explicita.
- Leer `RULES.md` y `.github/CODEX_CONTEXT.md`.
- No aplicar scripts descargados literalmente.
- Revisar archivos afectados con `rg` y lectura directa.
- Identificar falsos positivos, cierres previos y brechas reales.
- Crear `REPORTE_CDANV6_01_BASELINE_RUNTIME.md`.
- Actualizar AuditLock y commit `phase: CDANV6-01 task: diagnostico-runtime`.
