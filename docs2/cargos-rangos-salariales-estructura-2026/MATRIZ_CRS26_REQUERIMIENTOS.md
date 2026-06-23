# Matriz CRS26 - Cargos, rangos salariales y estructura organizativa

| ID | Prioridad | Area | Requerimiento | Criterio de cierre | Fase |
|----|-----------|------|---------------|--------------------|------|
| CRS26-R01 | P0 | Modelo | Crear tabla de cargos/puestos por tenant. | Existe tabla versionada con codigo unico por tenant, nombre, descripcion, estado, vigencia y auditoria. | CRS26-02 - cerrado |
| CRS26-R02 | P0 | Estructura | Cada cargo consume unidad organizativa. | Cargo referencia `organization_units.id`; no se puede crear cargo con unidad inexistente o inactiva. | CRS26-02/03 - cerrado |
| CRS26-R03 | P0 | Rangos | Cargo tiene rango salarial minimo/maximo. | Minimo y maximo son numericos, no negativos, misma moneda y `min <= max`. | CRS26-02/03 - cerrado |
| CRS26-R04 | P0 | Empleados | Empleado se asigna a cargo desde tabla. | Alta/edicion de empleado usa selector de cargos; no texto libre para nuevos registros. | CRS26-05 - cerrado |
| CRS26-R05 | P0 | Validacion | Sueldo del empleado se valida contra rango. | Sueldo fuera de rango bloquea por politica CRS26. | CRS26-05 - cerrado |
| CRS26-R06 | P0 | CRUD | OWNER/RRHH puede administrar cargos. | Pantalla permite crear, editar, inactivar y eliminar si no hay consumos. | CRS26-04 - cerrado |
| CRS26-R07 | P0 | Eliminacion | No eliminar cargo consumido. | Delete responde 409 con detalle si hay empleados, nominas, novedades, documentos o historico asociado. | CRS26-03/04 - cerrado |
| CRS26-R08 | P0 | Migracion | Migrar `empleados.cargo` historico. | Empleados existentes quedan vinculados cuando haya match; los no resueltos quedan reportados sin perdida de texto historico. | CRS26-02/07 - cerrado |
| CRS26-R09 | P0 | Importacion | Importacion masiva resuelve cargo por codigo/nombre. | Preview muestra error por fila si cargo no existe o sueldo esta fuera de rango. | CRS26-05 - cerrado |
| CRS26-R10 | P1 | Novedades | Alcance por cargo usa catalogo real. | `monthlyPeriodService` deja de depender solo de string `cargo` para nuevos lotes. | CRS26-06 - cerrado |
| CRS26-R11 | P1 | Reportes | Reportes agrupan por cargo y unidad. | Excel/PDF/CSV muestran cargo real, unidad, rango y conteos cuando aplique. | CRS26-06 - cerrado |
| CRS26-R12 | P1 | Documentos | Contratos y documentos usan nombre del cargo real. | Generadores consumen relacion de cargo sin perder fallback historico. | CRS26-06 - cerrado |
| CRS26-R13 | P0 | Seguridad | Aislamiento tenant e indices. | Indices por tenant/unidad/estado/vigencia; RLS o patron tenant consistente. | CRS26-02/07 - cerrado |
| CRS26-R14 | P0 | QA | Pruebas y rollback. | Tests backend, build web, migrate deploy, smoke PWA y rollback documentado pasan. | CRS26-07 - cerrado |

## Estado inicial

| Punto | Estado verificado |
|-------|-------------------|
| Campo cargo actual | `empleados.cargo` texto libre. |
| Estructura | `organization_units` existe y ya se usa para readiness de asistencia. |
| Alta/edicion empleado | `NuevoEmpleado.jsx` muestra campo `Cargo` manual. |
| Importacion | `employeeImportService` mapea `position`/`cargo` a string. |
| Novedades por alcance | `monthlyPeriodService` usa `scopeType=position` con filtro `cargo = $2`. |
| Reportes | `payrollReportService` filtra/exporta `e.cargo`. |
| Tabla de cargos | No existe en schema actual. |

## Politicas cerradas

- Sueldo fuera de rango: bloqueo duro en alta, edicion e importacion.
- Cargos globales: no habilitados; todo cargo pertenece a tenant y unidad organizativa.
- Vigencia/estado: cargos inactivos no aparecen como opcion operativa; historicos conservan snapshot.
- Historial: `empleados.cargo` conserva etiqueta historica y `position_id` gobierna nuevos flujos.
