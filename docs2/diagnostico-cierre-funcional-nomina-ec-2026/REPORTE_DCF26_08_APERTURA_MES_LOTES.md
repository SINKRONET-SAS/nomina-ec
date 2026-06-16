# Reporte DCF26-08 - Apertura de mes y lotes de novedades

## Resultado

DCF26-08 queda cerrada como fase runtime. El cierre mensual dejo de ser una pantalla que solo calculaba/cerraba y ahora opera el ciclo mensual completo: apertura de periodo, lotes de novedades por alcance, calculo, cierre y estado visible del periodo.

## Cambios funcionales

- Se agrego `payroll_periods` para estado formal por tenant, anio y mes.
- Se agrego `novelty_batches` para lotes de novedades con idempotencia y auditoria.
- Se agrego `novelty_batch_id` en `novedades_asistencia`.
- Se agrego `monthlyPeriodService` con:
  - validacion de periodo.
  - apertura idempotente.
  - consulta de estado mensual.
  - creacion de lotes por empresa, departamento, cargo o empleado.
  - insercion real de novedades con `ON CONFLICT DO NOTHING`.
  - actualizacion del estado del periodo a `novelties_loaded`, `calculated`, `closed` o `reopened`.
- Se agregaron endpoints:
  - `GET /api/nomina/periodo/:anio/:mes`
  - `POST /api/nomina/periodo/abrir`
  - `POST /api/nomina/novedades/lote`
- Se actualizo `CerrarMes` como pantalla de operacion mensual:
  - apertura de periodo.
  - resumen de nominas y novedades.
  - formulario de lote de novedades.
  - calculo de nomina.
  - cierre con confirmacion en UI, sin `alert()` ni `confirm()` nativos.
  - tabla de lotes recientes.
- Se actualizo `OperacionIntegral`: apertura de mes y lotes ya no aparece bloqueado.

## Validaciones ejecutadas

- `npx.cmd prisma validate` en `backend`: PASS.
- `node --check src/services/monthlyPeriodService.js`: PASS.
- `node --check src/controllers/nominaController.js`: PASS.
- `node --check src/app.js`: PASS.
- `npm.cmd test -- monthlyPeriodService.test.js --runInBand`: PASS, 1 suite, 4 tests.
- `npm.cmd run build` en `frontend-web`: PASS.
- `git diff --check`: PASS, solo avisos CRLF esperados en Windows.

## Riesgos residuales

- Rollback de lotes queda estructuralmente preparado, pero aun no expuesto como accion operativa.
- Los alcances reales usan campos disponibles en empleados: empresa, departamento, cargo o empleado. Centros de costo formales requieren completar el mapeo organizativo.
- El cierre actual marca nominas como cerradas; aprobacion previa por responsable queda fuera de esta fase.
