# Reporte CRS26-06 - Nomina, novedades y reportes consumen cargo real

## Alcance ejecutado

CRS26-06 conecta consumidores secundarios con `job_positions` sin romper historicos que aun dependan del snapshot `empleados.cargo`.

## Cambios runtime

- `monthlyPeriodService.buildEmployeeQuery('position')` ahora acepta `position_id`, codigo, nombre del cargo real o snapshot historico `cargo`.
- Los lotes de novedades por cargo pueden operar con valores existentes de la pantalla actual y tambien con identificadores reales.
- `payrollReportService.getPayrollRows` une `nominas -> empleados -> job_positions`.
- El filtro de reportes por cargo acepta id, codigo, nombre o snapshot historico.
- Los reportes tabulares exportan `Codigo cargo` y `Cargo`.
- `nominaController.listarPorPeriodo` muestra cargo real mediante `COALESCE(job_positions.name, empleados.cargo)`.

## Pruebas ejecutadas

- `npm.cmd test -- monthlyPeriodService.test.js payrollReportService.test.js` en `backend`: PASS, 2 suites y 10 tests.
- `node --check backend/src/controllers/nominaController.js`: PASS.

## Compatibilidad historica

`empleados.cargo` se conserva como snapshot para contratos, documentos ya generados, invitaciones y empleados legacy. Los nuevos flujos usan `position_id` como fuente operativa.

## Riesgos residuales

- QA integral CRS26-07 debe ejecutar Prisma validate, backend tests ampliados y build PWA.
- Validar visualmente que la pantalla de cierre muestra cargos esperados para los 30 empleados demo.
