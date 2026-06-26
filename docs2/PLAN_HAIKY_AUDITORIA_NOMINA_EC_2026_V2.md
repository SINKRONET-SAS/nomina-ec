# Open Haiky Plan - HAIKY-AUDITORIA-NOMINA-EC-2026-V2

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-AUDITORIA-NOMINA-EC-2026-V2 |
| Codigo | ANV2 |
| Estado | ANV2-00..06 ejecutadas localmente; QA verde |
| Fase actual | ANV2-06 QA y release local |
| Alcance | cierre definitivo de hallazgos V2: emails reales, zona horaria America/Guayaquil y firmas legales en documentos laborales |
| Fuente auditoria | `C:\proyectos web\sinkroniq-cloud-flow\src\pages\AuditoriaNominaEC2026V2.jsx`, `src/pages/v_nominaec/nominaec_v2_scripts.jsx`, `src/pages/v_nominaec/nominaec_v2_hallazgos.jsx` |
| Requerimiento fuente | "4 falsos positivos de V1 corregidos... Hallazgos nuevos criticos EMAIL-C01, TZ-C01, LEG-H01" |
| Matriz | `docs2/auditoria-nomina-ec-2026-v2/MATRIZ_ANV2_HALLAZGOS.md` |
| Contrato | `docs2/auditoria-nomina-ec-2026-v2/CONTRATO_ANV2_CIERRE_DEFINITIVO.md` |
| Runbook | `docs2/auditoria-nomina-ec-2026-v2/RUNBOOK_ANV2_QA_RELEASE.md` |
| Reporte baseline | `docs2/auditoria-nomina-ec-2026-v2/REPORTE_ANV2_00_BASELINE.md` |
| Reportes runtime | `docs2/auditoria-nomina-ec-2026-v2/REPORTE_ANV2_01_DIAGNOSTICO_RUNTIME.md` .. `REPORTE_ANV2_06_QA_RELEASE.md` |
| Prompts | `.github/prompts/AUDITORIA-NOMINA-EC-2026-V2-{00..06}-*.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Contexto | `.github/CODEX_CONTEXT.md`; no reintroducir `CODEX_CONTEXT.md` sensible en raiz |
| RULES | `RULES.md` |

## Resumen ANV2

ANV2 responde a la auditoria Nomina-Ec 2026 V2. La fase 00 no modifica runtime: deja plan, matriz, contrato, runbook, prompts, contexto y AuditLock. Las fases posteriores deben ejecutarse solo con aprobacion explicita.

La auditoria V2 corrige cuatro falsos positivos de V1:

- `templateGenerator.js` usa `tenant.razon_social`; no corresponde afirmar que imprime "PLAN HAIKY".
- Las consultas `db.query()` revisadas son parametrizadas; no se confirma SQL injection por concatenacion directa.
- La provision mensual de decimo tercero como `1/12` es correcta para rol mensual, sin cerrar la necesidad de periodo legal acumulado en reportes anuales.
- `AutoservicioScreen.js` si carga rol de pago; el alcance es incompleto, no inexistente.

Los hallazgos vigentes ANV2 son P0 por riesgo comercial, operativo y legal: sin proveedor SMTP real no llegan correos; defaults de mes/anio con `new Date()` pueden romper America/Guayaquil al borde del mes; roles, contratos y documentos laborales deben incorporar bloque de firma del representante legal y trabajador segun revision legal ecuatoriana.

## Fases ANV2

| Fase | Prioridad | Estado | Resumen |
|------|-----------|--------|---------|
| ANV2-00 | P0 | completed_documental | Baseline, matriz, contrato, runbook, prompts, contexto y AuditLock sin runtime. |
| ANV2-01 | P0 | completed_local | Diagnostico runtime: falsos positivos V1 reconciliados y brechas EMAIL/TZ/LEG clasificadas. |
| ANV2-02 | P0 | completed_local | Comunicaciones reales: proveedor, readiness, modo dev explicito, bloqueo productivo, auditoria y pruebas. |
| ANV2-03 | P0 | completed_local | Timezone Ecuador: helper unico America/Guayaquil, defaults PWA/API y contrato estatico. |
| ANV2-04 | P0 | completed_local | Firmas legales: representante legal/delegado, trabajador, version de plantilla en roles, contratos y actas. |
| ANV2-05 | P1 | completed_local | Frontend operativo: estados de correo, periodo Ecuador y documentos/firma visibles. |
| ANV2-06 | P0 | completed_local | QA, pruebas backend/PWA/mobile, smoke PWA, AuditLock y release gate. |

## Ejecucion ANV2

- EMAIL-C01: cerrado con proveedor explicito `COMMUNICATION_PROVIDER`, `COMMUNICATION_DEV_MODE`, `COMMUNICATION_REQUIRE_REAL_PROVIDER`, bloqueo productivo sin SMTP real, auditoria y pantalla de estado.
- TZ-C01: cerrado con `currentPeriodEC()`/`currentPeriodInEcuador()`, pantallas de nomina/reportes alineadas a `America/Guayaquil` y contrato estatico anti-regresion.
- LEG-H01: cerrado con bloque de recepcion/firma en roles de pago, identificacion del representante legal en contratos y actas, metadata documental y estado visible en PWA.
- Contexto seguro: `CODEX_CONTEXT.md` no existe en raiz; el contexto operativo permanece en `.github/CODEX_CONTEXT.md`.
- Gates ANV2-06: `npm.cmd run contracts` PASS, `npm.cmd run prisma:validate` PASS, `npm.cmd run test:backend` PASS con 44 suites y 174 tests, `npm.cmd run build:web` PASS, `npm.cmd --workspace=frontend-web run smoke:pwa` PASS, `npm.cmd run check:mobile` PASS.

## Reglas ANV2

- No iniciar runtime sin aprobacion explicita del prompt de fase.
- No reintroducir `CODEX_CONTEXT.md` sensible en raiz; el contexto operativo vive en `.github/CODEX_CONTEXT.md`.
- No prometer entrega de emails si `COMMUNICATION_PROVIDER`, SMTP/API key y remitente verificado no estan configurados.
- En produccion, el modo dev de comunicaciones debe fallar con bloqueo visible, no simular exito.
- Todo default de periodo operativo debe derivarse con zona `America/Guayaquil` o configuracion tenant equivalente.
- Todo documento laboral generado debe tener version de plantilla, datos del empleador, representante legal, trabajador, firma/aceptacion y estado de revision legal.
- Las referencias al Codigo del Trabajo requieren revision profesional antes de release comercial; este plan no sustituye asesoramiento legal.
- Cada fase debe cerrar con pruebas, evidencia, AuditLock firmado y commit `phase: ANV2-XX task: ...`.

## Gates de cierre

- `npm run contracts`.
- `npm run prisma:validate`.
- `npm run test:backend`.
- `npm run build:web`.
- `npm run check:mobile`.
- Smoke de login/refresh, envio de email sandbox/dev controlado, defaults de periodo Ecuador y generacion documental.
- Verificacion estatica: cero `new Date()` directo para defaults de periodo en pantallas de nomina/reportes.
- Verificacion estatica: `.env.example` contiene variables de proveedor de comunicaciones y modo dev bloqueado para produccion.
- Verificacion documental: roles, contratos y actas muestran bloque de firma y datos de representante legal.
