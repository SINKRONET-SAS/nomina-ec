# DCF26-12 - QA, limpieza y release anti-churn

Plan: `HAIKY-DIAGNOSTICO-CIERRE-FUNCIONAL-NOMINA-EC-2026`  
Prioridad: P0

## Objetivo

Cerrar DCF26 con pruebas E2E, datos DEMO, limpieza de codigo/documentos muertos y evidencia de release.

## Alcance

- E2E minimo: registro, parametrizacion, carga legal, empleados DEMO, asistencia, nomina, banco, RDEP precheck, dashboard.
- Datos smoke no reales.
- Limpieza o archivado de `docs2/Qwen_python_*.py`.
- Consolidacion de planes para evitar churn documental.
- Medicion de pruebas lentas y plan de optimizacion.

## Reglas

- No borrar evidencia historica sin dejar indice o justificacion.
- No usar datos reales.
- No cerrar si quedan pantallas P0 sin accion real.

## Entregables

- Runbook E2E reproducible.
- Reporte de pruebas y capturas.
- Limpieza documentada de codigo muerto.
- AuditLock final DCF26.
- Reporte `REPORTE_DCF26_12_QA_LIMPIEZA_RELEASE.md`.

## Gates

- Backend tests.
- Frontend build.
- App store check.
- Smoke E2E DEMO documentado.
