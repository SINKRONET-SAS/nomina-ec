# Plan Haiky - HAIKY-CARGOS-RANGOS-SALARIALES-ESTRUCTURA-2026

| Campo | Valor |
|-------|-------|
| Plan | HAIKY-CARGOS-RANGOS-SALARIALES-ESTRUCTURA-2026 |
| Codigo | CRS26 |
| Estado | CRS26-00..07 ejecutadas localmente |
| Fase actual | CRS26-07 cerrada localmente |
| Alcance | crear cargos/puestos con rango salarial, vigencia y consumo de estructura organizativa; asignar empleados a cargos desde catalogo real |
| Requerimiento fuente | "Se requiere crear cargos con un rango salarial y que consuman la estructura organizativa; el empleado debe ser asignado a un cargo o puesto llamando a la tabla de cargos." |
| Repo objetivo | `C:\proyectos web\nuevo_nomina` |
| Matriz | `docs2/cargos-rangos-salariales-estructura-2026/MATRIZ_CRS26_REQUERIMIENTOS.md` |
| Contrato | `docs2/cargos-rangos-salariales-estructura-2026/CONTRATO_CRS26_CARGOS_RANGOS_SALARIALES.md` |
| Reporte baseline | `docs2/cargos-rangos-salariales-estructura-2026/REPORTE_CRS26_00_BASELINE.md` |
| Reporte cierre | `docs2/cargos-rangos-salariales-estructura-2026/REPORTE_CRS26_07_CIERRE_QA.md` |
| AuditLock | `.vscode/AuditLock.json` |
| Prompts | `.github/prompts/CARGOS-RANGOS-SALARIALES-ESTRUCTURA-2026-{00..07}-*.md` |
| RULES | `RULES.md` |

## Objetivo

CRS26 convierte el campo libre `cargo` en un dominio operativo gobernado por tabla de cargos/puestos. Cada cargo debe pertenecer a una unidad organizativa vigente, tener rango salarial minimo/maximo, moneda, vigencia, estado y reglas de uso. El empleado debe escoger el cargo desde el catalogo, no escribirlo manualmente, y el sistema debe usar esa relacion en alta, edicion, importacion, nomina, reportes, documentos y novedades por alcance.

El plan evita crear otro catalogo decorativo. La tabla de cargos debe consumir `organization_units`, integrarse con empleados y mantener compatibilidad gradual con el campo historico `empleados.cargo` mientras se migra a `cargo_id`/`position_id`.

## Diagnostico inicial verificado

- `backend/prisma/schema.prisma` tiene `Employee.cargo` como `String` y `organizationUnitId` opcional.
- `frontend-web/src/pages/Empleados/NuevoEmpleado.jsx` permite escribir `Cargo` como texto libre.
- `backend/src/controllers/empleadoController.js` inserta y actualiza `cargo` como string.
- `backend/src/services/employeeImportService.js` mapea `position`/`cargo` a string.
- `backend/src/services/monthlyPeriodService.js` usa alcance `position` con `AND cargo = $2`.
- `backend/src/services/payrollReportService.js` filtra y exporta `e.cargo`.
- No existe tabla `cargos`, `job_positions` o equivalente que consuma `organization_units`.

## Reglas CRS26

- No iniciar runtime sin aprobacion explicita del prompt de fase.
- No mantener cargos como texto libre para nuevos empleados despues de CRS26-05.
- No crear cargos sin unidad organizativa vigente, salvo cargo global con regla explicita y visible.
- Cada cargo debe tener codigo unico por tenant, nombre, unidad organizativa, rango salarial minimo/maximo, moneda, vigencia, estado y auditoria.
- El sueldo del empleado debe validarse contra el rango salarial del cargo. Fuera de rango debe bloquear o requerir excepcion auditable segun politica definida en CRS26-02.
- No eliminar cargos con consumos: empleados asignados, nominas cerradas, documentos, importaciones confirmadas, novedades por alcance o reportes historicos.
- Cambios de rango salarial deben versionarse o dejar historial suficiente para explicar calculos pasados.
- La importacion masiva debe resolver cargos por codigo/nombre y reportar errores por fila si no hay match.
- Los reportes por persona y estructura deben poder agrupar por cargo y unidad organizativa.
- Todo avance funcional debe quedar visible en PWA para OWNER/RRHH.
- Commits esperados si se ejecuta runtime: `phase: CRS26-XX task: ...`.

## Fases

| Fase | Prioridad | Estado inicial | Resumen |
|------|-----------|----------------|---------|
| CRS26-00 | P0 | completed_documental | Baseline documental, matriz, contrato, prompts, contexto y AuditLock sin tocar runtime. |
| CRS26-01 | P0 | completed_local | Diagnostico runtime: esquema, controladores, importacion, reportes, nomina, demo y riesgos de migracion. |
| CRS26-02 | P0 | completed_local | Modelo de datos y migracion: tabla de cargos, relacion con estructura organizativa, indices, RLS, vigencia e historial. |
| CRS26-03 | P0 | completed_local | Backend: CRUD de cargos, validaciones de rango salarial, bloqueos de eliminacion y auditoria. |
| CRS26-04 | P0 | completed_local | Frontend parametrizacion: pantalla de cargos con crear, editar, inactivar, eliminar si no hay consumos y filtros por unidad. |
| CRS26-05 | P0 | completed_local | Empleados: alta, edicion, lista e importacion consumen tabla de cargos; sueldo validado contra rango. |
| CRS26-06 | P1 | completed_local | Nomina, documentos, novedades y reportes consumen cargo real y mantienen compatibilidad historica. |
| CRS26-07 | P0 | completed_local | QA, migraciones, seed/demo, rollback, evidencia, AuditLock y release gate. |

## Entregables esperados

- Tabla `job_positions` o nombre equivalente definido segun convencion del repo, con indices por tenant, unidad, codigo, estado y vigencia.
- Relacion `empleados.position_id`/`cargo_id` hacia cargos, con migracion gradual desde `empleados.cargo`.
- Servicio backend para cargos con validacion de rango salarial y consumo de `organization_units`.
- Parametrizacion PWA con listado, busqueda, filtros, crear, editar, inactivar y eliminar si no hay consumos.
- Nuevo/editar empleado con selector de cargo filtrado por unidad organizativa.
- Importacion masiva con columna `positionCode` o `position` resolviendo contra catalogo.
- Reportes y filtros por cargo real, conservando etiqueta historica para registros anteriores.
- Tests unitarios/integracion para CRUD, eliminacion bloqueada, validacion de sueldo y migracion.
- Runbook de migracion y rollback documentado.

## Gates globales

- `npx.cmd prisma validate` en `backend`.
- `npx.cmd prisma migrate deploy` si se agregan migraciones.
- `npm.cmd test -- --runInBand` en `backend`.
- `npm.cmd run build` en `frontend-web`.
- Smoke PWA de Parametrizacion, Nuevo Empleado, Lista Empleados y Reportes.
- Verificacion de importacion masiva con cargo valido, cargo inexistente y sueldo fuera de rango.
- Gate UTF-8 sin BOM para `.js`, `.jsx`, `.md`, `.json` modificados.
- AuditLock firmado por fase.

## Cierre local CRS26

- Nombre fisico definido: `job_positions`.
- Politica definida: sueldo fuera de rango bloquea alta, edicion e importacion.
- Empleados existentes migrados localmente con backfill: 12 cargos y 30 empleados enlazados.
- Scopes de novedades por cargo aceptan `position_id`, codigo, nombre y snapshot historico.
- Reportes tabulares exportan codigo de cargo y cargo real.
- Gates finales: Prisma validate, migrate deploy, backend tests completos, build PWA y smoke DB local.

## Riesgos residuales

- Validacion visual con usuarios reales antes de demo comercial.
- Si el negocio requiere excepciones salariales, crear fase futura con aprobacion y auditoria explicita.
