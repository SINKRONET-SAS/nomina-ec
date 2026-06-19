# DVN26-01 - Parametros legales, IESS e IR

Plan: `HAIKY-DIAGNOSTICO-V2-NOMINA-EC-2026`  
Prioridad: P0.

## Objetivo

Resolver E-01, E-03, E-04 y D-05 sobre parametros legales: IESS 9.45/9.95, gastos personales SRI, tabla IR editable y versionada.

## Reglas

- No fijar 9.95% como productivo sin evidencia contable o planilla IESS vigente.
- Si la validacion esta pendiente, exponer bloqueo profesional en UI.
- El motor debe leer parametros validados desde BD/version, no desde constantes aisladas.

## Entregables

- Servicio backend de parametros legales con estado de validacion.
- UI de tabla IR editable con vigencia, fuente y responsable.
- Soporte para gastos personales con tope vigente.
- Tests de calculo IR e IESS.
- Reporte `REPORTE_DVN26_01_PARAMETROS_LEGALES.md`.

## Gate

Backend tests, frontend build, Prisma validate y evidencia de bloqueo si IESS sigue pendiente.
