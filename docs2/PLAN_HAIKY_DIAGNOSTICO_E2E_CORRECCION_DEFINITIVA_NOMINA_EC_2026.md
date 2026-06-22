# Plan Haiky - HAIKY-DIAGNOSTICO-E2E-CORRECCION-DEFINITIVA-NOMINA-EC-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-DIAGNOSTICO-E2E-CORRECCION-DEFINITIVA-NOMINA-EC-2026 |
| Codigo | E2E26 |
| Estado | E2E26-01..09 ejecutadas localmente |
| Fase actual | E2E26-09 cerrada localmente |
| Alcance | correccion definitiva del flujo end-to-end de Nomina-Ec: registro, tenant, usuarios, empleados, app movil, marcaciones, novedades, calculo, cierre, reapertura, roles PDF y gates operativos |
| Fuente de requerimiento | `G:\ARVIEDO\Diagnostico_E2E.docx` |
| Repo objetivo | `C:\proyectos web\nuevo_nomina` |
| Matriz | `docs2/diagnostico-e2e-correccion-definitiva-nomina-ec-2026/MATRIZ_E2E26_HALLAZGOS.md` |
| Reporte baseline | `docs2/diagnostico-e2e-correccion-definitiva-nomina-ec-2026/REPORTE_E2E26_00_BASELINE.md` |
| Runbook | `docs2/diagnostico-e2e-correccion-definitiva-nomina-ec-2026/RUNBOOK_E2E26_CORRECCION_DEFINITIVA.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Prompts | `.github/prompts/DIAGNOSTICO-E2E-CORRECCION-DEFINITIVA-NOMINA-EC-2026-{00..09}-*.md` |
| RULES | `RULES.md` |

## Objetivo

E2E26 convierte el diagnostico end-to-end en una linea Haiky ejecutable para endurecer Nomina-Ec como sistema operativo real de nomina Ecuador. El diagnostico confirma que el sistema ya no es una demo: existen rutas, modelos y pantallas para registro publico, usuarios, empleados, invitaciones moviles, marcaciones, novedades, calculo, cierre, reapertura, roles PDF, documentos legales y reportes.

El riesgo principal ya no es ausencia de modulos, sino consistencia transaccional, trazabilidad operativa, control de estados y experiencia guiada del proceso completo. E2E26 debe cerrar esa brecha con gates fail-closed, auditoria visible, estados de periodo coherentes y evidencia de QA.

## Reglas E2E26

- No iniciar runtime sin aprobacion explicita del prompt de fase.
- No aplicar scripts propuestos del diagnostico literalmente; traducirlos a Express/PostgreSQL/Prisma/React/Expo del repo actual.
- Todo cambio backend que bloquee operacion debe quedar visible en PWA o app movil con mensaje claro y siguiente accion.
- No prometer nomina cerrada "inmutable absoluta" si existe reapertura; usar "reapertura controlada con reverso/auditoria".
- No cerrar nomina si existen errores por empleado, novedades pendientes, empleados activos sin nomina valida o roles requeridos faltantes.
- No permitir marcacion movil si falta unidad, zona, jornada o periodo operacional.
- No permitir operacion sensible si el tenant no completo el estado operacional minimo.
- Toda modificacion salarial, contractual, de jornada, unidad o zona debe ser auditable por usuario, fecha, valor anterior y valor nuevo.
- La app movil y README deben prometer lo mismo: foto/GPS/almuerzo solo si estan implementados y probados.
- Cada fase debe firmar AuditLock y usar commit `phase: E2E26-XX task: ...`.

## Fases

| Fase | Prioridad | Estado inicial | Resumen |
|------|-----------|----------------|---------|
| E2E26-00 | P0 | completed_documental | Baseline documental desde Diagnostico_E2E, matriz, runbook, prompts, contexto y AuditLock sin tocar runtime. |
| E2E26-01 | P0 | completed_local | Estado operacional del tenant con prechequeo E2E26 antes de calculo/cierre y blockers visibles en PWA. |
| E2E26-02 | P0 | completed_local | Identidad y login tenant-aware con RUC opcional en web/app y bloqueo de email multi-tenant ambiguo. |
| E2E26-03 | P0 | completed_local | Empleado operativo: cedula unica por tenant, importacion/alta ajustada y migracion local aplicada. |
| E2E26-04 | P1 | completed_local | Invitaciones app: expiracion automatica de pendientes vencidas al listar/reintentar. |
| E2E26-05 | P0 | completed_local | Asistencia movil coherente: inicio/fin de almuerzo en app y secuencia diaria validada en backend. |
| E2E26-06 | P1 | completed_local | Novedades por periodo bloquean calculo/cierre si quedan pendientes. |
| E2E26-07 | P0 | completed_local | Calculo transaccional: `calculation_failed` si existen errores por empleado. |
| E2E26-08 | P0 | completed_local_with_pdf_warning | Cierre con preclose gate y reapertura controlada; roles PDF quedan como warning operativo si faltan. |
| E2E26-09 | P0 | completed_local | QA E2E: migracion, seed demo reset/reseed/verify, backend tests, PWA smoke, app stores y Expo doctor. |

## Scripts de referencia del diagnostico

El diagnostico propone scripts concretos para `backend/scripts/`. E2E26 los trata como referencia funcional:

- `diagnose-e2e-process.js`: radiografia por tenant y periodo.
- `expire-employee-app-invites.js`: cierre de invitaciones vencidas.
- `preclose-payroll-gate.js`: bloqueo previo al cierre.
- `audit-payroll-reopen-risk.js`: riesgo por reapertura y beneficios descontados.

Antes de implementar, cada script debe verificarse contra el esquema real, nombres de tablas reales, RLS/multi-tenant, servicios existentes y convenciones actuales.

## Entregables esperados

- Estado operacional del tenant visible y auditable.
- Login sin ambiguedad multi-tenant.
- Ficha de empleado con estados preliminar/operativo y auditoria de cambios sensibles.
- Invitaciones moviles con expiracion automatica y tablero RRHH.
- Marcacion movil alineada con lo prometido en README, API y app.
- Novedades con periodo, lotes y reglas de cierre claras.
- Calculo de nomina transaccional y fail-closed.
- Cierre atomico con roles PDF y beneficios consistentes.
- Reapertura con reverso o rectificacion auditable.
- Scripts de diagnostico/gate operativos y reportes de evidencia.

## Gates globales

- `npx.cmd prisma validate` en `backend`.
- `npx.cmd prisma migrate deploy` si hay migraciones.
- `npm.cmd test -- --runInBand` en `backend`.
- `npm.cmd run build` y `npm.cmd run smoke:pwa` en `frontend-web` si se toca PWA.
- `npm.cmd run doctor` o `npx.cmd expo-doctor` en `app-movil` si se toca mobile.
- Smoke E2E: registro tenant -> onboarding -> empleado -> invitacion -> marcacion -> novedad -> calculo -> cierre -> rol -> reapertura controlada.
- Gate UTF-8 sin BOM para `.js`, `.jsx`, `.md`, `.json` modificados.
- Revision de que no queden promesas falsas en README, landing, PWA ni app.
- AuditLock firmado por fase.

## Riesgos y bloqueos

- Cualquier cambio en cierre/reapertura toca datos contables y requiere pruebas profundas.
- Cambiar unicidad de cedula o login multi-tenant puede requerir migracion y plan de compatibilidad.
- Foto obligatoria en marcacion implica LOPDP/biometria/imagen y debe tener base legal, consentimiento y minimizacion.
- Reversos de beneficios pueden requerir contrato contable antes de produccion.
- Canales email/WhatsApp dependen de credenciales externas reales.

## Cierre local 2026-06-22

Cambios runtime aplicados:

- Migracion `20260622164000_e2e26_employee_cedula_by_tenant`.
- Servicio `operationalReadinessService` para prechequeos de nomina.
- Login tenant-aware en backend, PWA y app movil.
- Expiracion automatica de invitaciones vencidas.
- Secuencia de marcacion diaria con almuerzo.
- Estado `calculation_failed` en errores por empleado.
- Preclose gate y reapertura controlada.
- Blockers/warnings visibles en pantalla de cierre.

Gates ejecutados:

- `npx.cmd prisma validate`: PASS.
- `npx.cmd prisma migrate deploy`: PASS.
- `npm.cmd run seed:demo:reset`: PASS.
- `npm.cmd run seed:demo`: PASS.
- `npm.cmd run seed:demo:verify`: PASS.
- `npm.cmd test -- --runInBand`: PASS, 27 suites / 105 tests.
- `npm.cmd run smoke:pwa`: PASS.
- `npm.cmd run check:stores`: PASS.
- `npm.cmd run doctor`: PASS, 18/18 checks.
