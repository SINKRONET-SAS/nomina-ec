# Open Haiky Plan - HAIKY-AUDITORIA-NOMINA-EC-2026-V1

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-AUDITORIA-NOMINA-EC-2026-V1 |
| Codigo | ANV1 |
| Estado | ANV1-01..08 ejecutadas localmente; validacion final pendiente |
| Fase actual | ANV1-08 QA y release gate |
| Alcance | cierre definitivo de auditoria Nomina-Ec V1: seguridad de repo, calculos legales Ecuador, LOPDP, monetizacion, superadmin, naming, paridad mobile, cifrado y QA |
| Fuente auditoria | `C:\proyectos web\sinkroniq-cloud-flow\src\pages\AuditoriaNominaEC2026V1.jsx` y `C:\proyectos web\sinkroniq-cloud-flow\src\pages\v_nominaec\nominaec_v1_data.jsx` |
| Requerimiento fuente | "auditoria-nomina-ec-2026-v1. Resumen de los 14 hallazgos confirmados con codigo fuente leido directamente..." |
| Matriz | `docs2/auditoria-nomina-ec-2026-v1/MATRIZ_ANV1_HALLAZGOS.md` |
| Contrato | `docs2/auditoria-nomina-ec-2026-v1/CONTRATO_ANV1_CIERRE_DEFINITIVO.md` |
| Runbook | `docs2/auditoria-nomina-ec-2026-v1/RUNBOOK_ANV1_QA_RELEASE.md` |
| Reporte baseline | `docs2/auditoria-nomina-ec-2026-v1/REPORTE_ANV1_00_BASELINE.md` |
| Prompts | `.github/prompts/AUDITORIA-NOMINA-EC-2026-V1-{00..08}-*.md` |
| AuditLock | `.vscode/AuditLock.json` |
| RULES | `RULES.md` |

## Resumen ANV1

ANV1 formaliza la respuesta a la auditoria Nomina-Ec 2026 V1. El objetivo no es maquillar hallazgos ni convertir scripts propuestos en parches literales: el cierre debe validar cada punto contra el codigo real de `nuevo_nomina`, aplicar cambios por fases aprobadas, exponer controles en frontend cuando impacten operacion o supervision, y dejar evidencia de QA.

El resumen del usuario prioriza 14 brechas comerciales, legales y de seguridad. La fuente leida tambien contiene hallazgos adicionales de deuda y paridad. ANV1 gobierna todos los hallazgos relevantes, separando los P0 inmediatos de los P1/P2 para evitar regresiones.

## Hallazgos priorizados

| Codigo | Prioridad | Bloque | Riesgo | Cierre esperado |
|--------|-----------|--------|--------|-----------------|
| SEC-C01 | P0 | Seguridad repo | `CODEX_CONTEXT.md` en raiz publica puede exponer arquitectura interna. | Mover contexto interno a ubicacion gobernada o reducir exposicion publica con contrato de operacion para Codex. |
| SEC-C03 | P0 | Seguridad repo | `render.yaml`, DB `plan_haiky` y usuario `haiky_migration` revelan naming interno. | Plan de renombre seguro sin romper Render ni migraciones. |
| BRAND-C01 | P0 | Branding/naming | `PLAN HAIKY` visible en comentarios, logs o artefactos. | Nomina-Ec visible en runtime; Haiky solo metodologia/documentacion interna. |
| LEG-C02 | P0 | Legal nomina | Horas extra sin validacion legal semanal y tipo 50/100. | Validacion fail-closed, warning visible y pruebas. |
| LEG-C03 | P0 | Legal nomina | D13/D14 sin periodo legal ni region. | Motor con periodos correctos, region, retrocompatibilidad y pruebas. |
| LEG-H01 | P0 | Legal/IESS | IESS no diferencia afiliacion/tipo de relacion. | Modelo de afiliacion/tipo contrato y calculo condicionado. |
| SEC-H01/LEG-H02 | P0 | LOPDP | Datos salariales/personales sin control granular y sin audit log de lectura. | RBAC de lectura, minimizacion de campos, auditoria de accesos. |
| MON-C01 | P0 | Monetizacion | PayPhone en mock puede impedir cobro real. | Gate de produccion, credenciales reales, bloqueo visible si mock. |
| MON-H01 | P1 | Monetizacion | Landing con precios hardcodeados y sin IVA claro. | Landing consume planes reales o contrato estatico validado; IVA visible. |
| SADM-C01 | P0 | Superadmin | Falta pantalla `Superadmin.jsx`. | PWA superadmin usable para tenants, planes, incidentes, parametros. |
| SADM-H01 | P1 | Superadmin legal | Parametros legales sin UI de gobierno superadmin. | UI y backend de parametros con vigencia, fuente y auditoria. |
| HUM-H01/H02 | P2 | UX | Textos visibles con errores de tildes o tono. | Correccion UI visible y checklist de textos. |
| HUM-M01 | P2 | Mobile | App movil con paridad limitada. | Priorizar rol de pago, permisos/documentos y estados claros. |
| GAP-H01 | P1 | Suscripciones | No hay cron de vencimientos/dunning. | Cron idempotente, emails y bloqueo por plan. |
| GAP-H02 | P0 | Datos bancarios | Riesgo de cuenta bancaria en texto plano. | Verificar cifrado real, migracion si aplica, pruebas y auditoria. |
| DUP-H01/DUP-M01 | P2 | Deuda tecnica | Duplicacion utilitaria y arquitectura `pg`/Prisma hibrida. | Contrato de arquitectura, no migracion masiva sin fase. |

## Fases ANV1

| Fase | Prioridad | Estado | Resumen |
|------|-----------|--------|---------|
| ANV1-00 | P0 | completed_documental | Baseline, matriz, contrato, runbook, prompts, contexto y AuditLock sin runtime. |
| ANV1-01 | P0 | completed_local | Diagnostico runtime contra auditoria fuente y `nuevo_nomina`. |
| ANV1-02 | P0 | completed_local | `CODEX_CONTEXT.md` movido a `.github`, naming runtime/Render/env saneado. |
| ANV1-03 | P0 | completed_local | Horas extra con limite semanal, IESS por relacion laboral y periodos de decimos en detalle. |
| ANV1-04 | P0 | completed_local | RBAC y auditoria de lectura salarial; supervisor recibe datos redactados. |
| ANV1-05 | P0 | completed_local | PayPhone basado en `sinkroniq-mobile`: Prepare/Confirm, referencia unica, monto verificado y planes versionados. |
| ANV1-06 | P0 | completed_local | Ruta/pagina `Superadmin.jsx` visible y protegida. |
| ANV1-07 | P1 | completed_local | PWA de planes bloquea checkout si PayPhone no esta configurado; ficha laboral expone IESS. |
| ANV1-08 | P0 | in_validation | Contratos, pruebas, migraciones, build y AuditLock. |

## Reglas ANV1

- No iniciar runtime sin aprobacion explicita del prompt de fase.
- No aplicar scripts de la auditoria literalmente sin contrastar contra el schema y codigo actual de `nuevo_nomina`.
- No mover `CODEX_CONTEXT.md` si eso rompe el flujo operativo de Codex sin dejar ruta nueva documentada y actualizada.
- No renombrar base de datos, usuario Render o servicios productivos sin plan de migracion y rollback.
- No recalcular beneficios historicos cerrados sin snapshot, periodo legal, tenant y autorizacion.
- Todo ajuste de D13, D14, horas extra e IESS debe tener pruebas unitarias y fixtures con periodos borde.
- Todo acceso a datos salariales/personales debe tener rol explicito, minimizacion y auditoria de lectura cuando aplique.
- PayPhone no puede mostrarse como cobro real si esta en modo mock; la UI debe exponer bloqueo o modo sandbox.
- Superadmin debe quedar visible en PWA y protegido por RBAC; no se acepta cierre solo backend.
- Commits esperados: `phase: ANV1-XX task: ...`.

## Gates de cierre

- `npm run contracts`.
- `npm run prisma:validate`.
- `npm run test:backend`.
- `npm run build:web`.
- `npm run check:mobile`.
- Smoke PWA con backend local para rutas afectadas.
- Verificacion estatica: cero `PLAN HAIKY` visible en runtime publico, salvo documentacion interna autorizada.
- Evidencia de que PayPhone productivo no opera en mock sin bloqueo visible.
- Evidencia de que D13/D14/hora extra/IESS tienen pruebas de borde.
- AuditLock firmado por fase.
