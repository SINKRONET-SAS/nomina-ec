# Reporte ANV2-00 - Baseline documental

## Alcance

Se creo baseline documental para `HAIKY-AUDITORIA-NOMINA-EC-2026-V2` sin tocar runtime.

## Fuentes declaradas

- `C:\proyectos web\sinkroniq-cloud-flow\src\pages\AuditoriaNominaEC2026V2.jsx`
- `C:\proyectos web\sinkroniq-cloud-flow\src\pages\v_nominaec\nominaec_v2_scripts.jsx`
- `C:\proyectos web\sinkroniq-cloud-flow\src\pages\v_nominaec\nominaec_v2_hallazgos.jsx`

## Hallazgos base

- V1 contiene cuatro falsos positivos corregidos que ANV2-01 debe evidenciar contra codigo actual.
- EMAIL-C01 requiere proveedor SMTP/API real y bloqueo visible si no existe.
- TZ-C01 requiere helper America/Guayaquil para defaults de periodo.
- LEG-H01 requiere bloque de firmas y datos de representante legal en documentos laborales generados.

## Artefactos creados

- `docs2/PLAN_HAIKY_AUDITORIA_NOMINA_EC_2026_V2.md`
- `docs2/auditoria-nomina-ec-2026-v2/MATRIZ_ANV2_HALLAZGOS.md`
- `docs2/auditoria-nomina-ec-2026-v2/CONTRATO_ANV2_CIERRE_DEFINITIVO.md`
- `docs2/auditoria-nomina-ec-2026-v2/RUNBOOK_ANV2_QA_RELEASE.md`
- `.github/prompts/AUDITORIA-NOMINA-EC-2026-V2-00..06-*.md`
- `.github/CODEX_CONTEXT.md`
- `.vscode/AuditLock.json`

## Decision de contexto

No se reintrodujo `CODEX_CONTEXT.md` sensible en raiz. ANV1 movio el contexto operativo a `.github/CODEX_CONTEXT.md` y el contrato raiz lo protege. ANV2 conserva esa decision.

## Estado

ANV2-00 queda completada documentalmente. ANV2-01 requiere aprobacion explicita antes de diagnostico runtime.
