# Open Haiky Plan - HAIKY-CIERRE-DEFINITIVO-AUDITORIA-NOMINA-EC-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-CIERRE-DEFINITIVO-AUDITORIA-NOMINA-EC-2026 |
| Codigo | CDAN26 |
| Estado | CDAN26-00..08 ejecutadas localmente; QA especifico verde |
| Fase actual | CDAN26-08 QA release |
| Alcance | cierre definitivo de hallazgos confirmados de Auditoria Integral Nomina-EC V1 sobre seguridad, legal laboral, SRI, calculo transaccional, pagos, comunicaciones, fondo de reserva y superadmin |
| Fuente auditoria | `C:\proyectos web\sinkroniq-cloud-flow\src\pages\AuditoriaNominaEC2026V1.jsx`, `src/pages\v_nominaec\nominaec_v1_data.jsx`, `nominaec_v1_hallazgos.jsx`, `nominaec_v1_scripts.jsx`, `nominaec_v2_hallazgos.jsx`, `nominaec_v2_scripts.jsx`, `AuditoriaNominaEC2026V2.jsx` |
| Matriz | `docs2/cierre-definitivo-auditoria-nomina-ec-2026/MATRIZ_CDAN26_HALLAZGOS.md` |
| Contrato | `docs2/cierre-definitivo-auditoria-nomina-ec-2026/CONTRATO_CDAN26_CIERRE_DEFINITIVO.md` |
| Runbook | `docs2/cierre-definitivo-auditoria-nomina-ec-2026/RUNBOOK_CDAN26_QA_RELEASE.md` |
| Prompts | `prompts/CDAN26-{00..08}-*.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Contexto | `CODEX_CONTEXT.md` sin secretos |
| RULES | `RULES.md` |

## Resumen CDAN26

CDAN26 convierte la respuesta de auditoria en un plan ejecutable para cerrar definitivamente los hallazgos confirmados, evitando reabrir falsos positivos ya descartados. La fase 00 no modifica runtime: deja gobierno, trazabilidad, prompts, matriz, contrato, runbook y lock. Las fases 01 a 08 requieren aprobacion explicita antes de tocar codigo, datos, migraciones o infraestructura.

El objetivo de cierre no es copiar scripts de auditoria de forma literal. Cada fase debe leer el codigo real de `nuevo_nomina`, adaptar el cambio al schema vigente, exponer controles frontend cuando afecten operacion o supervision, ejecutar pruebas, dejar evidencia y firmar `AuditLock.json`.

## Hallazgos confirmados P0/P1

| ID | Prioridad | Area | Hallazgo | Cierre definitivo |
|----|-----------|------|----------|-------------------|
| SEC-NEC-01 | P0 | Seguridad | `render.yaml` expone `plan_haiky` / `haiky_migration` publicamente. | Renombre/rotacion controlada de naming interno, variables seguras, plan de rollback y verificacion sin secretos. |
| LEG-NEC-02 | P0 | Legal CT | Sin guard SBU USD 460/2026. | Parametro legal vigente obligatorio, bloqueo de nominas con salario base inferior y excepciones auditables. |
| LEG-NEC-03 | P0 | Legal SRI | Sin Formulario 107 individual. | Generacion individual anual en PDF por empleado, ficha tecnica versionada, UI de descarga y bloqueo si faltan datos. |
| BUG-NEC-01 | P0 | Bug | `calcularMes()` actualiza `payroll_periods` fuera de transaccion. | Calculo y estado de periodo dentro de transaccion atomica, idempotencia y recuperacion ante fallo parcial. |
| MON-NEC-01 | P0 | Revenue | Sin integracion de pagos Stripe; botones no funcionales. | Canal de pagos real o bloqueo comercial visible; webhook, idempotencia, conciliacion y estados de suscripcion. |
| COM-NEC-01 | P0 | Email | Sin `sendRolPagoDisponible()`. | Notificacion real al empleado cuando el rol queda disponible, auditoria de entrega y estado visible. |
| LEG-NEC-01 | P0 | Legal CT | Fondo de Reserva sin modalidad MENSUAL/IESS por empleado. | Modalidad por empleado, calculo diferenciado, migracion segura, UI y reporte. |
| SADM-NEC-01 | P1 | SuperAdmin | Sin interfaz web para parametros legales anuales. | Pantalla superadmin con vigencia, fuente, auditoria, aprobacion y bloqueo de parametros incompletos. |

## Confirmado como correcto y protegido

- `bcryptjs` para contrasenas.
- `normalizePhone()` con prefijo 593 Ecuador.
- `Intl.DateTimeFormat` con `America/Guayaquil`.
- Parametros legales versionados por tenant/anio.
- ExcelJS para AEB bancario.

Estos puntos no deben ser parcheados como si fueran fallas. CDAN26 debe agregar contratos estaticos o pruebas de regresion cuando el riesgo de reintroduccion sea alto.

## Fases CDAN26

| Fase | Prioridad | Estado | Resumen |
|------|-----------|--------|---------|
| CDAN26-00 | P0 | completed_documental | Baseline, matriz, contrato, runbook, prompts, contexto raiz no sensible y AuditLock. |
| CDAN26-01 | P0 | completed_local | Diagnostico runtime: reconciliada auditoria contra codigo real, schema, rutas, UI y pruebas existentes. |
| CDAN26-02 | P0 | completed_local | Seguridad Render/naming: `render.yaml` activo usa Nomina-Ec; variables Stripe no sensibles agregadas. |
| CDAN26-03 | P0 | completed_local | Legal laboral: guard SBU, Fondo de Reserva existente, UI legal y novedades manuales/carga masiva. |
| CDAN26-04 | P0 | completed_local | SRI Formulario 107 individual en PDF con precheck, descarga, auditoria y version de plantilla. |
| CDAN26-05 | P0 | completed_local | Calculo transaccional: `calcularMes()` atomico con cliente transaccional compartido. |
| CDAN26-06 | P0 | completed_local | Revenue/pagos: PayPhone preservado y Stripe bloqueado explicitamente si se declara sin implementacion. |
| CDAN26-07 | P0 | completed_local | Comunicaciones rol de pago: `sendRolPagoDisponible()` conectado al cierre y auditado. |
| CDAN26-08 | P0 | completed_local | QA release: contratos, Prisma, backend, build web y mobile verdes. |

## Reglas de ejecucion

- No iniciar runtime sin aprobacion explicita del prompt de fase.
- No aplicar scripts de auditoria literalmente sin contrastar schema, servicios, rutas, permisos y pruebas actuales.
- No tocar secretos reales ni escribirlos en docs, prompts, commits, logs o `AuditLock.json`.
- Todo cierre que afecte operacion debe quedar visible en frontend o con bloqueo claro y siguiente accion.
- Todo flujo alternativo debe fallar con error/log explicito; prohibidos fallos silenciosos.
- Toda migracion debe tener rollback o estrategia documentada de reversa.
- Cada fase debe actualizar `AuditLock.json` con `phaseCompleted`, `filesModified`, `validationChecks` y `signature`.
- Commits esperados: `phase: CDAN26-XX task: ...`.

## Gates de cierre

- `npm run contracts`.
- `npm run prisma:validate`.
- `npm run test:backend`.
- `npm run build:web`.
- `npm run check:mobile`.
- Smoke PWA con rutas de superadmin, parametros legales, cierre de mes, roles de pago, pagos y Formulario 107.
- Verificacion estatica: no quedan referencias publicas a `plan_haiky` / `haiky_migration` en runtime o infraestructura expuesta.
- Verificacion transaccional: no se actualiza estado de periodo fuera de la transaccion de calculo.
- Verificacion legal funcional: SBU, Fondo de Reserva, Formulario 107 y parametros anuales quedan visibles y auditables.
