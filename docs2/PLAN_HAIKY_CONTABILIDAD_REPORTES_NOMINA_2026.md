# Plan Haiky - HAIKY-CONTABILIDAD-REPORTES-NOMINA-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-CONTABILIDAD-REPORTES-NOMINA-2026 |
| Codigo | CRN26 |
| Estado | CRN26-00..08 ejecutadas localmente |
| Fase actual | CRN26-08 cierre QA local |
| Alcance | esquema contable por parametro de nomina, consumo de calculos en reportes por empleado y consolidados, matriz empleados x beneficios y reportes contables de nomina |
| Requerimiento fuente | "Es necesario desplegar el esquema contable de cada uno de los parametros, consumir y desplegar los calculos de nomina en reportes tanto a nivel de un empleado como de todos los empleados con filas los empleados y columnas los beneficios, adicionalmente que se despliegue los reportes contables relativos a nomina." |
| Repo objetivo | `C:\proyectos web\nuevo_nomina` |
| Matriz | `docs2/contabilidad-reportes-nomina-2026/MATRIZ_CRN26_REQUERIMIENTOS.md` |
| Contrato | `docs2/contabilidad-reportes-nomina-2026/CONTRATO_CRN26_ESQUEMA_REPORTES_CONTABLES.md` |
| Runbook | `docs2/contabilidad-reportes-nomina-2026/RUNBOOK_CRN26_QA_RELEASE.md` |
| Reporte baseline | `docs2/contabilidad-reportes-nomina-2026/REPORTE_CRN26_00_BASELINE.md` |
| Reportes runtime | `docs2/contabilidad-reportes-nomina-2026/REPORTE_CRN26_01_DIAGNOSTICO_RUNTIME.md` .. `REPORTE_CRN26_08_CIERRE_QA.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Prompts | `.github/prompts/CONTABILIDAD-REPORTES-NOMINA-2026-{00..08}-*.md` |
| RULES | `RULES.md` |

## Objetivo

CRN26 cierra de forma definitiva la brecha de reporteria contable y operacional de nomina. El sistema debe dejar de depender de columnas fijas o cuentas hardcodeadas para contabilidad y debe exponer, por tenant y periodo, el origen de cada valor calculado, su parametro legal u operativo, su cuenta contable, su centro de costo y su asiento esperado.

El resultado debe permitir tres vistas verificables:

- Detalle por empleado: rol calculado con desglose completo de ingresos, deducciones, beneficios, provisiones y parametros aplicados.
- Consolidado de todos los empleados: filas por empleado y columnas dinamicas por beneficio/concepto, manteniendo columnas fijas de estructura, centro de costo y totales.
- Reportes contables: asientos de devengamiento, provisiones y pago con debe/haber balanceado, cuenta contable configurable y trazabilidad a nomina, empleado, periodo y concepto.

## Diagnostico inicial

El repo ya contiene piezas parciales:

- `backend/src/config/accounting-mapping-defaults.json` define un catalogo base de conceptos, pero no hay gobierno runtime completo por tenant, vigencia, validacion ni UI operativa.
- `backend/src/services/calculoNominaService.js` guarda `detalle_calculo` con varios conceptos, pero no normaliza cada concepto como linea contable/reportable versionada.
- `backend/src/services/payrollReportService.js` exporta detalle tabular y asientos contables iniciales, pero las cuentas y agrupaciones son estaticas y no cubren matriz empleado x beneficios dinamica.
- `frontend-web/src/pages/Nomina/DescargarReportes.jsx` expone reportes internos, pero no despliega administracion del esquema contable ni preview de reportes contables con validaciones.

CRN26 debe convertir esas piezas en un flujo gobernado, auditable y visible.

## Principios funcionales

- Cada parametro/concepto que participa en nomina debe tener codigo canonico, tipo, naturaleza contable, formula de origen, cuenta debe/haber, vigencia y estado.
- El tenant puede ajustar cuentas contables y centros de costo sin alterar la formula legal ni el calculo historico.
- El calculo de nomina debe producir un snapshot reportable por concepto para no recalcular historicos con reglas nuevas.
- Las filas de reportes deben incluir `tenantId`, periodo, empleado, unidad, centro de costo, concepto, monto, fuente y correlationId cuando aplique.
- La matriz empleados x beneficios debe crear columnas dinamicas a partir de beneficios y conceptos activos en el periodo, con totales conciliables.
- Los asientos contables deben balancear por periodo, centro de costo y asiento. Si no balancean, el reporte falla con error visible.
- No se generan reportes oficiales ocultos solo en backend; toda configuracion y descarga debe estar expuesta en PWA.

## Modelo conceptual

| Entidad | Rol |
|---------|-----|
| `payroll_concept_catalog` | Catalogo canonico de conceptos: sueldo, horas extra, IESS, IR, beneficios, provisiones, neto banco. |
| `payroll_accounting_mapping` | Configuracion por tenant, concepto, vigencia, cuenta debe/haber, centro de costo y regla de asiento. |
| `payroll_calculation_lines` | Snapshot por nomina y concepto con monto, signo, fuente, parametro, metadata y estado. |
| `payroll_report_profile` | Perfil de reporte: matriz empleado x beneficios, detalle empleado, asientos, resumen contable. |
| `payroll_accounting_entries` | Lineas contables generadas desde snapshots y mapping, con debe/haber, referencia y balance. |
| `payroll_report_exports` | Evidencia de exportaciones con hash, filtros, usuario, correlationId y archivo generado. |

## Fases

| Fase | Prioridad | Estado inicial | Resumen |
|------|-----------|----------------|---------|
| CRN26-00 | P0 | completed_documental | Baseline documental, matriz, contrato, runbook, prompts, contexto y AuditLock sin tocar runtime. |
| CRN26-01 | P0 | completed_local | Diagnostico runtime de parametros, calculo, beneficios, reportes, contabilidad, PWA y permisos. |
| CRN26-02 | P0 | completed_local | Modelo de datos y contrato de conceptos contables/reportables con vigencia, RLS, indices y rollback. |
| CRN26-03 | P0 | completed_local | Backend de esquema contable: CRUD controlado, defaults, overrides por tenant, validaciones y auditoria. |
| CRN26-04 | P0 | completed_local | Motor de nomina emite lineas de calculo normalizadas por concepto sin romper `detalle_calculo` historico. |
| CRN26-05 | P0 | completed_local | Reportes de calculo: detalle por empleado y matriz todos los empleados x beneficios/conceptos. |
| CRN26-06 | P0 | completed_local | Reportes contables: asientos de devengamiento, provisiones, pago, balance y exportacion XLSX/CSV. |
| CRN26-07 | P0 | completed_local | Frontend PWA: esquema contable, filtros, descargas y navegacion operativa. |
| CRN26-08 | P0 | completed_local | QA, migraciones, rollback, pruebas, AuditLock y release gate. |

## Entregables esperados

- Catalogo canonico de conceptos de nomina con tipo: ingreso, deduccion, provision, pasivo, pago o informativo.
- Mapeo contable por tenant con cuenta debe, cuenta haber, nombre de cuenta, centro de costo, asiento, vigencia y estado.
- Validacion de mapeo incompleto antes de cerrar nomina o generar reporte contable.
- Snapshot de lineas de calculo por empleado y periodo.
- Reporte por empleado con todos los calculos y parametros usados.
- Reporte consolidado con filas por empleado y columnas dinamicas por beneficios/conceptos.
- Reporte contable de asientos balanceados por periodo, empleado, centro de costo y asiento.
- UI en PWA para administrar esquema contable y descargar reportes.
- Auditoria de exportaciones y cambios de mapping.
- Pruebas unitarias/backend, build PWA, validacion Prisma y smoke de reportes.

## Gates globales

- `npx.cmd prisma validate` en `backend` si se modifica schema.
- `npx.cmd prisma migrate deploy` si se agregan migraciones.
- `npm.cmd test -- payrollReportService.test.js calculoNominaService.test.js --runInBand` en `backend`.
- Tests nuevos de mapping contable, snapshots de calculo, matriz beneficios y balance contable.
- `npm.cmd run build` en `frontend-web`.
- Smoke PWA para configurar cuenta contable, calcular nomina, exportar matriz y generar asientos balanceados.
- Gate UTF-8 sin BOM para `.js`, `.jsx`, `.md`, `.json` modificados.
- AuditLock firmado por fase segun `RULES.md`.

## Riesgos residuales

- Las cuentas contables reales dependen del plan de cuentas de cada empresa y deben validarse con contador antes de produccion.
- Cambiar mappings no altera lineas de calculo ya persistidas, pero el asiento se genera con mapping vigente del periodo; el contador debe cerrar vigencias cuando apruebe cambios.
- La matriz dinamica puede crecer mucho; se deben definir limites y streaming/exportacion eficiente para tenants con alta cardinalidad de conceptos.
- Los reportes contables deben diferenciar reporte operativo de asiento oficial importable a ERP.

## Ejecucion local CRN26-01..08

Se aprobo ejecutar todas las fases runtime en una sola corrida. El cierre local implementa:

- `payroll_accounting_mappings` por tenant con vigencia, RLS, indices, defaults auditables y CRUD desde configuracion.
- `payroll_calculation_lines` como snapshot normalizado por nomina, empleado, concepto, fuente, parametro legal, centro de costo y metadata.
- Servicio `payrollAccountingService` con catalogo canonico, semilla default, lineas normalizadas, matriz empleados x conceptos y asientos balanceados.
- Endpoints dedicados `GET/POST/PUT /api/nomina/contabilidad/...` y compatibilidad con `/api/configuracion/payrollAccountingMappings`.
- Exportador de nomina con `PAYROLL_EMPLOYEE_DETAIL`, `PAYROLL_BENEFITS_MATRIX` y `PAYROLL_ACCOUNTING_REPORT`.
- PWA de parametrizacion con formulario de esquema contable y PWA de reportes con opciones CRN26.

Gates ejecutados:

- `npx.cmd prisma validate` en `backend`: PASS.
- `npx.cmd prisma migrate deploy` en `backend`: PASS, aplico `20260624210000_crn26_payroll_accounting_reports`.
- `npm.cmd test -- payrollReportService.test.js calculoNominaService.test.js --runInBand` en `backend`: PASS, 2 suites y 19 tests.
- `node --check` de servicios/controladores CRN26: PASS.
- `npm.cmd run build` en `frontend-web`: PASS.
