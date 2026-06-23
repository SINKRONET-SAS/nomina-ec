# CRS26-05 - Empleados asignados a cargos

Actua bajo `RULES.md`.

Objetivo: hacer que alta, edicion, lista e importacion de empleados consuman la tabla de cargos.

Tareas:

- Validar AuditLock CRS26-04.
- Reemplazar campo manual de cargo por selector de cargo filtrado por unidad organizativa.
- Validar sueldo del empleado contra rango salarial del cargo.
- Mantener snapshot historico de nombre de cargo donde sea necesario.
- Ajustar lista de empleados para mostrar cargo real y unidad.
- Ajustar importacion masiva para resolver `positionCode`/`position` contra catalogo.
- Reportar errores por fila si cargo no existe, esta inactivo o sueldo queda fuera de rango.

Cierre:

- Tests backend de empleados/importacion pasan.
- Build frontend pasa.
- Commit esperado: `phase: CRS26-05 task: empleados consumen cargos`.
