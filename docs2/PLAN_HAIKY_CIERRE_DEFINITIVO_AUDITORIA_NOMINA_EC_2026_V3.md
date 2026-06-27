# PLAN HAIKY - CIERRE DEFINITIVO AUDITORIA NOMINA-EC 2026 V3

## Identificacion

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-CIERRE-DEFINITIVO-AUDITORIA-NOMINA-EC-2026-V3 |
| Codigo | CDANV3 |
| Estado | CDANV3-00 documental creado; runtime pendiente de aprobacion por fase |
| Fecha base | 2026-06-27 |
| Fuente auditoria | `C:\proyectos web\sinkroniq-cloud-flow\src\pages\AuditoriaNominaEC2026V3.jsx` |
| Hallazgos fuente | `C:\proyectos web\sinkroniq-cloud-flow\src\pages\v_nominaec\nominaec_v3_hallazgos.jsx` |
| Scripts fuente | `C:\proyectos web\sinkroniq-cloud-flow\src\pages\v_nominaec\nominaec_v3_scripts.jsx` |
| Matriz | `docs2/cierre-definitivo-auditoria-nomina-ec-2026-v3/MATRIZ_CDANV3_HALLAZGOS.md` |
| Contrato | `docs2/cierre-definitivo-auditoria-nomina-ec-2026-v3/CONTRATO_CDANV3_CIERRE_DEFINITIVO.md` |
| Runbook | `docs2/cierre-definitivo-auditoria-nomina-ec-2026-v3/RUNBOOK_CDANV3_QA_RELEASE.md` |
| Prompts | `.github/prompts/CDANV3-{00..10}-*.md` |
| AuditLock | `.vscode/AuditLock.json` |

## Alcance activo

CDANV3 responde a la auditoria Nomina-EC V3 y consolida el cierre definitivo de brechas nuevas sin reabrir falsos positivos ya refutados. El alcance activo prioriza:

- Pipeline Render con `seed:admins` idempotente y variables de superadmin sin secretos en repositorio.
- Webhook Payphone real para confirmar pagos y activar planes, preservando Payphone como canal ecuatoriano vigente.
- Autenticacion JWT con claims para evitar una consulta a base por cada request normal, manteniendo verificacion fresca en operaciones criticas.
- Modulo de gastos de movilizacion con SQLite offline en app movil, sincronizacion backend, aprobacion PWA y generacion de anticipo.
- Empresa DEMO con datos smoke de movilizacion para validar el flujo completo sin datos reales.
- Validaciones de roles PDF/reportes, cron de nomina, periodo Ecuador, textos comerciales y tildes UTF-8.
- Limpieza controlada de duplicidad en validacion de periodo y candidatos de configuracion sin uso.

## Confirmado como falso positivo o cierre previo

- `superadminController.js` y `superadminService.js` existen; no crear duplicados.
- `payrollReportService.js` existe con pdfmake, ExcelJS y S3; la brecha es verificar rutas/consumo, no recrear el servicio.
- `backend/scripts/seed-superadmin-owner.js` existe; la brecha real es conectarlo a `render.yaml`.
- El canal de pagos activo es Payphone; no sustituir por Stripe ni prometer Stripe incompleto.
- El seed de superadmin debe ser idempotente y depender de variables `sync: false`, no de credenciales hardcodeadas.

## Fases

| Fase | Prioridad | Estado inicial | Objetivo |
|------|-----------|----------------|----------|
| CDANV3-00 | P0 | completed_documental | Crear plan, matriz, contrato, runbook, prompts, contexto y AuditLock sin tocar runtime. |
| CDANV3-01 | P0 | pending_approval | Diagnostico runtime contra repo actual: confirmar FP, rutas, Payphone, auth, Render, mobile y reportes. |
| CDANV3-02 | P0 | pending_approval | Pipeline Render: ejecutar `seed:admins` en build/deploy con variables seguras y preflight visible. |
| CDANV3-03 | P0 | pending_approval | Payphone: webhook firmado/validado, reconciliacion de monto, activacion de plan y auditoria. |
| CDANV3-04 | P0 | pending_approval | Auth JWT: claims completos, compatibilidad con tokens legados y `requireFreshUser` para operaciones criticas. |
| CDANV3-05 | P0 | pending_approval | Movilizacion mobile: SQLite offline, pantalla de gastos, cierre mensual y sincronizacion. |
| CDANV3-06 | P0 | pending_approval | Movilizacion backend: migracion, servicio, endpoints, reglas de aprobacion/rechazo y anticipo. |
| CDANV3-07 | P0 | pending_approval | Movilizacion PWA y DEMO: aprobacion RRHH/Owner, datos smoke, navegacion y reportes descargables. |
| CDANV3-08 | P1 | pending_approval | Reportes, cron, periodo Ecuador y ortografia comercial UTF-8 sin mensajes tecnicos. |
| CDANV3-09 | P1 | pending_approval | Limpieza controlada de duplicidad/candidatos sin uso con evidencia de no regresion. |
| CDANV3-10 | P0 | pending_approval | QA, migraciones, rollback, pruebas web/mobile/backend, AuditLock firmado, commit y release. |

## Reglas operativas

- No iniciar fases runtime sin aprobacion explicita del usuario.
- Aplicar `RULES.md` a todo archivo `.js`, `.md` y `.json`.
- No crear `CODEX_CONTEXT.md` en la raiz; el contexto vive en `.github/CODEX_CONTEXT.md`.
- No hardcodear secretos, tokens, usuarios reales, URLs privadas ni credenciales.
- No aplicar literalmente scripts de auditoria si contradicen el schema/runtime real.
- Payphone debe fallar cerrado si no puede validar pago, monto, tenant, plan o correlacion.
- Movilizacion debe funcionar offline en mobile y sincronizar sin perder gastos locales.
- Toda aprobacion/rechazo de movilizacion debe quedar visible para empleado y RRHH/Owner.
- La empresa DEMO debe contener datos ficticios y smoke reproducible; nunca datos reales.
- Cada fase cierra con pruebas, reporte, `AuditLock.json` firmado y commit `phase: CDANV3-XX task: ...`.

## Gates esperados por cierre

- `npm.cmd run contracts`
- `npm.cmd run prisma:validate`
- `npm.cmd run test:backend`
- `npm.cmd run build:web`
- `npm.cmd run check:mobile`
- Pruebas focales de Payphone webhook, auth claims, movilizacion mobile/backend/PWA y seed DEMO.

## Riesgos residuales controlados

- Payphone productivo requiere credenciales reales y confirmacion contractual del proveedor.
- Movilizacion puede requerir revision laboral/contable para tratamiento como anticipo o reembolso.
- SQLite mobile requiere prueba en dispositivo/Expo Go, no solo parse estatico.
- Render debe validarse en ambiente staging antes de produccion.
