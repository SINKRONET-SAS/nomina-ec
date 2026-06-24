# Plan Haiky - HAIKY-AUDITORIA-INTEGRAL-V55-NOMINA-EC-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-AUDITORIA-INTEGRAL-V55-NOMINA-EC-2026 |
| Codigo | AIV55 |
| Estado | AIV55-00..05 ejecutadas localmente |
| Fase actual | AIV55-05 cierre QA local |
| Alcance | cierre de hallazgos V55 sobre rendimiento de nomina, legal Ecuador, PWA, app movil, LOPDP, auditoria y comunicaciones |
| Repo objetivo | `C:\proyectos web\nuevo_nomina` |
| Fuente de auditoria | `C:\proyectos web\sinkroniq-cloud-flow\src\pages\AuditoriaIntegral2026V55.jsx` y `src/pages/v55/v55data.jsx` |
| Matriz | `docs2/auditoria-integral-v55-nomina-ec-2026/MATRIZ_AIV55_HALLAZGOS.md` |
| Runbook | `docs2/auditoria-integral-v55-nomina-ec-2026/RUNBOOK_AIV55_QA_CIERRE.md` |
| Prompts | `.github/prompts/AUDITORIA-INTEGRAL-V55-NOMINA-EC-2026-{00..05}-*.md` |
| AuditLock | `.vscode/AuditLock.json` |
| RULES | `RULES.md` |

## Objetivo

AIV55 convierte la auditoria integral V55 en una linea Haiky ejecutable. No aplica scripts copiados de la auditoria: primero contrasta cada hallazgo contra el codigo actual, reconoce cierres heredados de E2E26/CRS26/DCEN26 y corrige solo las brechas vigentes con exposicion visible cuando afecta experiencia de usuario.

## Fases

| Fase | Prioridad | Estado | Resumen |
|------|-----------|--------|---------|
| AIV55-00 | P0 | completed_local | Baseline, contraste de hallazgos, plan, matriz, prompts y candado. |
| AIV55-01 | P0 | completed_local | Nomina legal: confirmar N+1 ya cerrado, agregar modalidad de fondo de reserva y detalle de calculo. |
| AIV55-02 | P0 | completed_local | PWA operativa: novedades faltantes, ficha empleado con fondo de reserva y consentimiento WhatsApp, landing sin jerga. |
| AIV55-03 | P1 | completed_local | App movil: textos humanizados, tipos de marcacion legibles y navegacion de periodos en autoservicio. |
| AIV55-04 | P0 | completed_local | LOPDP y auditoria: WhatsApp fail-closed por consentimiento y auditService con sanitizacion/trazabilidad. |
| AIV55-05 | P0 | completed_local | QA, migraciones, build/test, UTF-8, reporte y AuditLock final. |

## Decisiones de contraste

- BUG-C01 ya estaba corregido: `getLegalParametersForTenant` se carga una sola vez en `calcularNominaMensual` y se pasa a `calcularEmpleado`.
- LEG-C01 ya estaba corregido: `region_decimo_cuarto` existe, tiene constraint y el calculo conserva `decimoCuartoRegion`.
- BUG-H01 queda cubierto por E2E26: login es tenant-aware, valida claves por candidato y exige RUC si el correo pertenece a varias empresas.
- DEAD/ELIM sobre `docs2`, `RULES.md` y `CODEX_CONTEXT.md` se rechaza para este repo porque `RULES.md` y el contexto operativo ordenan conservarlos como gobierno Haiky vigente.

## Reglas AIV55

- No copiar scripts V55 literalmente; adaptar al schema real.
- No cerrar WhatsApp si no hay consentimiento explicito en ficha de empleado.
- Fondo de reserva debe quedar visible en ficha empleado, persistido en DB y reflejado en `detalle_calculo`.
- Las mejoras de copy no deben usar codigos internos Haiky ni jerga contable innecesaria en la UI publica.
- Cada fase debe actualizar AuditLock y usar commits esperados `phase: AIV55-XX task: ...`.

## Gates globales

- `npx.cmd prisma validate` en `backend`.
- `npm.cmd test -- calculoNominaService.test.js communicationService.test.js --runInBand` en `backend`.
- `npm.cmd run build` en `frontend-web`.
- `npm.cmd run check:stores` en `app-movil`.
- Gate UTF-8 sin BOM de archivos modificados `.js`, `.md`, `.json`.
