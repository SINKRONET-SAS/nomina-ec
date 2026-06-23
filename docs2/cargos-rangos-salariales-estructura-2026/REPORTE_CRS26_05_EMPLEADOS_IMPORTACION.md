# Reporte CRS26-05 - Empleados e importacion consumen cargos reales

## Alcance ejecutado

CRS26-05 deja de tratar el cargo del trabajador como texto libre en los flujos principales. El empleado queda enlazado a `job_positions.position_id`, mientras `empleados.cargo` se conserva como snapshot historico del nombre del cargo.

## Cambios runtime backend

- `empleadoController.listar/obtener` retorna `position_id`, codigo de cargo y rango salarial con `LEFT JOIN job_positions`.
- `crear` exige cargo parametrizado, valida sueldo contra rango y deriva `cargo` y `unidad_organizativa_codigo` desde `job_positions`.
- `actualizar` revalida el cargo cuando cambia `position_id`, cargo, sueldo o unidad organizativa.
- `employeeImportService` reconoce columnas `cargo`, `position`, `position_code`, `cargo_codigo` y `job_position_code`.
- La prevalidacion de importacion bloquea cargos inexistentes, inactivos, de otra unidad o con sueldo fuera de rango.
- El commit de importacion guarda `position_id`, snapshot `cargo` y `unidad_organizativa_codigo`.

## Cambios runtime PWA

- `NuevoEmpleado.jsx` consulta `jobPositions` y reemplaza el campo manual "Cargo" por selector de cargo/puesto.
- El selector se filtra por unidad organizativa cuando esta seleccionada.
- La pantalla muestra el rango salarial del cargo y bloquea guardar si el sueldo esta fuera de rango.

## Pruebas ejecutadas

- `npm.cmd test -- empleadoController.test.js employeeImportService.test.js` en `backend`: PASS, 2 suites y 11 tests.
- `npm.cmd run build` en `frontend-web`: PASS, `built in 5.99s`, PWA generated.

## Riesgos residuales

- CRS26-06 debe ajustar reportes, novedades y filtros por `position_id` con compatibilidad historica.
- Algunos empleados legacy pueden conservar `cargo` snapshot si no fueron backfilled; CRS26-02 ya vinculo los 30 empleados demo.
