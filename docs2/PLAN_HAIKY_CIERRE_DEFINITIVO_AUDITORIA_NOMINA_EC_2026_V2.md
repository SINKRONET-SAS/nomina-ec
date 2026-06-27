# Plan Haiky - Cierre definitivo Auditoria Nomina-Ec 2026 V2

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-CIERRE-DEFINITIVO-AUDITORIA-NOMINA-EC-2026-V2 |
| Codigo | CDANV2 |
| Estado | CDANV2-08 ejecutado localmente; QA y push final pendientes |
| Fuente auditoria | `C:\proyectos web\sinkroniq-cloud-flow\src\pages\AuditoriaNominaEC2026V2.jsx` |
| Hallazgos | `C:\proyectos web\sinkroniq-cloud-flow\src\pages\v_nominaec\nominaec_v2_hallazgos.jsx` |
| Scripts fuente | `C:\proyectos web\sinkroniq-cloud-flow\src\pages\v_nominaec\nominaec_v2_scripts.jsx` |
| Matriz | `docs2/cierre-definitivo-auditoria-nomina-ec-2026-v2/MATRIZ_CDANV2_HALLAZGOS.md` |
| Contrato | `docs2/cierre-definitivo-auditoria-nomina-ec-2026-v2/CONTRATO_CDANV2_CIERRE_DEFINITIVO.md` |
| Runbook | `docs2/cierre-definitivo-auditoria-nomina-ec-2026-v2/RUNBOOK_CDANV2_QA_RELEASE.md` |
| Prompts | `prompts/CDANV2-{00..08}-*.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Contexto | `.github/CODEX_CONTEXT.md` |

## Objetivo

Cerrar definitivamente la auditoria V2 nueva sin reintroducir falsos positivos ni romper avances previos de ANV1, ANV2 y CDAN26. El plan cubre autenticacion JWT, superadmin, seed inicial seguro, reportes de rol de pago, cierre transaccional, pagos Stripe/PayPhone, LOPDP para auditoria de comunicaciones, UX/ortografia y QA.

## Regla especial SBU 2026

`SEC-V2-01` queda clasificado como falso positivo controlado: no se debe cambiar el SBU 2026 a USD 470. El valor operativo actual USD 482 se conserva hasta que una fuente oficial versionada indique lo contrario. La fuente juridica externa revisada indica que el Acuerdo Ministerial MDT-2025-195 fija el SBU 2026 en USD 482. La fase runtime debe adjuntar fuente oficial o evidencia legal revisada antes de tocar parametros legales productivos.

## Fases

| Fase | Prioridad | Estado | Alcance |
|------|-----------|--------|---------|
| CDANV2-00 | P0 | completed_documental | Baseline documental, matriz, contrato, runbook, prompts, contexto y AuditLock. |
| CDANV2-01 | P0 | completed_runtime | Diagnostico runtime contra repo real y reconciliacion de falsos positivos. |
| CDANV2-02 | P0 | completed_runtime | Auth JWT con claims y revocacion/fresh-user para operaciones criticas. |
| CDANV2-03 | P0 | completed_previo | Superadmin y seed inicial seguro sin secretos ni datos reales. |
| CDANV2-04 | P0 | completed_previo | Roles PDF/reportes de nomina: botones reales, no 500/404. |
| CDANV2-05 | P0 | completed_runtime | Cierre mensual idempotente con bloqueo transaccional y evidencia. |
| CDANV2-06 | P0 | completed_previo | Revenue: Stripe bloqueado o webhook real; PayPhone preservado. |
| CDANV2-07 | P1 | completed_runtime | LOPDP, UX, ortografia, periodo y reportes visibles. |
| CDANV2-08 | P0 | completed_local | QA, contratos, pruebas, build, AuditLock final y release gate. |

## No negociables

- Runtime ejecutado por solicitud explicita del usuario el 2026-06-27.
- No crear `CODEX_CONTEXT.md` en raiz; el contexto vive en `.github/CODEX_CONTEXT.md`.
- No aplicar scripts fuente literalmente si contradicen el estado real del repo.
- No usar SBU 2026 = USD 470 sin fuente oficial vigente y aprobacion legal.
- Todo cierre funcional debe quedar visible en PWA o app cuando afecte operacion.
- Cada fase debe cerrar con pruebas, reporte y `AuditLock.json` firmado.
