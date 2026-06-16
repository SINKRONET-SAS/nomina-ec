# DCF26-00 - Baseline consultiva

Plan: `HAIKY-DIAGNOSTICO-CIERRE-FUNCIONAL-NOMINA-EC-2026`  
Prioridad: P0  
Estado esperado: completed documental.

## Objetivo

Dejar firmado el diagnostico consultivo, matriz de hallazgos, contexto, prompts y AuditLock antes de tocar runtime.

## Reglas

- Leer `RULES.md` antes de ejecutar.
- No modificar runtime en esta fase.
- Registrar hallazgos con evidencia de archivo y linea.
- Confirmar gates locales: backend tests, frontend build, Prisma validate y app store readiness cuando sea posible.
- AuditLock debe quedar firmado.

## Entregables

- `docs2/PLAN_HAIKY_DIAGNOSTICO_CIERRE_FUNCIONAL_NOMINA_EC_2026.md`
- `docs2/diagnostico-cierre-funcional-nomina-ec-2026/REPORTE_DCF26_01_DIAGNOSTICO_CONSULTIVO.md`
- `docs2/diagnostico-cierre-funcional-nomina-ec-2026/MATRIZ_DCF26_HALLAZGOS.md`
- Prompts DCF26-00..12.
- Actualizacion de `CODEX_CONTEXT.md` y `.vscode/AuditLock.json`.

## Gate de cierre

La fase solo cierra si el plan identifica bugs, promesas no cumplidas, codigo muerto y pantallas sin funcionalidad real con criterio de cierre funcional.
