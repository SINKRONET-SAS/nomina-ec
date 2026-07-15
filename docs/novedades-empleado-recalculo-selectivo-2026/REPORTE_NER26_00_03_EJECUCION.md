# Reporte NER26 - Novedades de empleado y recalculo selectivo 2026

Plan: `HAIKY-NOVEDADES-EMPLEADO-RECALCULO-SELECTIVO-2026`
Fases: `NER26-00` a `NER26-03`
Estado: `completed-pass`
Fecha: 2026-07-15

## Resultado funcional

El flujo de correccion de novedades consumidas por rol deja de depender del descarte global del periodo.

Cuando una novedad ya fue usada por un rol de pago, la PWA muestra la accion para liberar solo el calculo del empleado afectado. El backend invalida unicamente el rol borrador del empleado seleccionado y sus lineas de calculo asociadas por cascada, con filtros obligatorios:

- `tenant_id`
- `anio`
- `mes`
- `empleado_id`

Despues de corregir y aprobar la novedad, la PWA permite recalcular solo ese empleado mediante un lote de calculo con `scope = employee`.

## Cambios backend

- `payrollLifecycleService.invalidateEmployeePayrollForNovelty()` invalida calculo individual dentro de transaccion.
- `calculoNominaService.calcularNominaEmpleado()` recalcula un solo empleado sin recorrer ni reescribir roles de otros empleados.
- `nominaController` expone:
  - `POST /api/nomina/:anio/:mes/empleados/:empleadoId/invalidar-calculo`
  - `POST /api/nomina/:anio/:mes/empleados/:empleadoId/recalcular`
- `novedadController.listarPendientes(scope=operativas)` incluye novedades consumidas para que RRHH pueda corregirlas desde la pantalla operativa.
- `app.routes.test.js` valida RBAC, usuario fresco y modulo `nomina` para las rutas nuevas.

## Cambios frontend

- `NovedadesPendientes.jsx` muestra novedades consumidas por rol con estado `Usada en rol`.
- La tabla agrega accion `Liberar calculo solo de este empleado`.
- Luego de editar y aprobar, la tabla muestra accion `Recalcular solo este empleado`.
- `CerrarMes.jsx` desambigua el descarte global como `Descartar calculo del periodo`.

## Riesgos controlados

- Periodo cerrado retorna `NOMINA_CERRADA_REQUIERE_REAPERTURA`; no muta roles finales.
- Si la novedad no pertenece al empleado y periodo seleccionados, retorna `NOVEDAD_SCOPE_NO_SELECTIVO`.
- El delete de rol borrador exige `tenant_id`, `anio`, `mes`, `empleado_id` e `id`.
- La auditoria registra `novedades.empleado.invalidar_calculo` y `nomina.empleado.recalcular` con `correlationId`.

## Validacion ejecutada

- `node --check backend/src/services/payrollLifecycleService.js`: PASS.
- `node --check backend/src/services/calculoNominaService.js`: PASS.
- `node --check backend/src/controllers/nominaController.js`: PASS.
- `node --check backend/src/controllers/novedadController.js`: PASS.
- `npm.cmd --workspace=backend test -- payrollLifecycleService.test.js nominaController.test.js novedadController.test.js app.routes.test.js --runInBand`: PASS, 4 suites / 65 tests.
- `npm.cmd --workspace=frontend-web run build`: PASS, 1534 modules, 100 precache entries.
- `npm.cmd run contracts`: PASS.
- `npm.cmd run prisma:validate`: PASS.
- `python -m json.tool .vscode/AuditLock.json`: PASS.
- UTF-8 sin BOM en archivos NER26: PASS.
- `git diff --check` limitado a archivos NER26: PASS.

Nota de worktree:

- `git diff --check` global detecta marcadores de conflicto previos en `.github/workflows/eas-preview.yml`, `app-movil/src/App.js` y `app-movil/src/screens/PermisosScreen.js`. Esos archivos no pertenecen a NER26 y no se incluyen en el commit de este cierre.

## Pendientes externos

- Validar el flujo en Render con datos reales de prueba antes de operar en periodo productivo.
- Mantener bloqueada la correccion de roles cerrados hasta que exista una reapertura legalmente gobernada.
