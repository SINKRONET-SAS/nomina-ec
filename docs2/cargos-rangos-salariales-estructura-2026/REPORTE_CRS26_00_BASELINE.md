# Reporte CRS26-00 - Baseline documental

Fecha local: 2026-06-22.

## Alcance ejecutado

Se desplego documentalmente el plan `HAIKY-CARGOS-RANGOS-SALARIALES-ESTRUCTURA-2026` para responder al requerimiento de cargos/puestos con rango salarial que consuman estructura organizativa y sean usados por empleados desde una tabla real.

No se modifico runtime, base de datos ni pantallas operativas en CRS26-00.

## Evidencia revisada

- `RULES.md`: reglas Haiky vigentes.
- `CODEX_CONTEXT.md`: contexto operativo actual.
- `.vscode/AuditLock.json`: candado previo E2E26.
- `backend/prisma/schema.prisma`: `Employee.cargo` existe como texto libre.
- `backend/src/controllers/empleadoController.js`: alta/edicion usa `cargo`.
- `frontend-web/src/pages/Empleados/NuevoEmpleado.jsx`: campo `Cargo` manual.
- `backend/src/services/employeeImportService.js`: importacion usa `position`/`cargo`.
- `backend/src/services/monthlyPeriodService.js`: alcance por `position` filtra por string `cargo`.
- `backend/src/services/payrollReportService.js`: reportes filtran/exportan `e.cargo`.

## Hallazgo raiz

El sistema trata el cargo como texto descriptivo, no como entidad gobernada. Esto impide:

- validar rangos salariales;
- saber que cargos pertenecen a cada unidad;
- eliminar/modificar cargos con control de consumo;
- reportar consistentemente por cargo;
- importar empleados con validacion de cargo;
- mantener historico confiable ante cambios de nombre o rango.

## Artefactos creados

- `docs2/PLAN_HAIKY_CARGOS_RANGOS_SALARIALES_ESTRUCTURA_2026.md`
- `docs2/cargos-rangos-salariales-estructura-2026/MATRIZ_CRS26_REQUERIMIENTOS.md`
- `docs2/cargos-rangos-salariales-estructura-2026/CONTRATO_CRS26_CARGOS_RANGOS_SALARIALES.md`
- `docs2/cargos-rangos-salariales-estructura-2026/REPORTE_CRS26_00_BASELINE.md`
- `.github/prompts/CARGOS-RANGOS-SALARIALES-ESTRUCTURA-2026-00..07-*.md`
- `CODEX_CONTEXT.md`
- `.vscode/AuditLock.json`

## Estado

CRS26-00 queda `completed_documental`.

La ejecucion runtime debe iniciar solo con aprobacion explicita de CRS26-01.
