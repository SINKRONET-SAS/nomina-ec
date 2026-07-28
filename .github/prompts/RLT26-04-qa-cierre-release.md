# RLT26-04 — QA, cierre y release

## Objetivo

Verificar que los reportes nuevos no generen regresiones y cerrar el gobierno del plan.

## Requisitos

1. Ejecutar tests backend completos y pruebas enfocadas.
2. Ejecutar `prisma validate`, parseo/build frontend y `git diff --check`.
3. Revisar catálogo, endpoint, controles frontend, aislamiento tenant y auditoría.
4. Confirmar que no hay archivos fuera de `nuevo_nomina`, cambios de lockfile no intencionales ni mojibake nuevo.
5. Verificar que provisión mensual, pago de rol, pago de anticipo y descuento de anticipo no se mezclan en los reportes ni en los asientos.
6. Actualizar plan, `CODEX_CONTEXT.md` y `AuditLock.json` a cerrado.
7. Crear commit con `phase: RLT26-04; task: cerrar reportes laborales` y hacer push a `main`.

## Criterio de salida

No declarar verde una suite no ejecutada. Si un entorno impide una validación, corregir dependencias reproduciblemente o dejar el plan bloqueado con evidencia concreta antes del commit.
