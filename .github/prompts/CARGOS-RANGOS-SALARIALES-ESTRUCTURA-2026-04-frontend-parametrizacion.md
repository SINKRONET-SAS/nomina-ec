# CRS26-04 - Frontend parametrizacion de cargos

Actua bajo `RULES.md`.

Objetivo: dejar visible la administracion de cargos para OWNER/RRHH.

Tareas:

- Validar AuditLock CRS26-03.
- Agregar categoria "Cargos y puestos" en Parametrizacion.
- Crear formulario con unidad organizativa, codigo, nombre, rango salarial, moneda, vigencia y estado.
- Agregar listado con busqueda/filtros por unidad, estado y vigencia.
- Implementar editar, inactivar y eliminar si no hay consumos.
- Mostrar bloqueos de eliminacion con detalle comprensible.

Cierre:

- `npm.cmd run build` en frontend-web pasa.
- Smoke manual de pantalla de parametrizacion documentado.
- Commit esperado: `phase: CRS26-04 task: frontend cargos parametrizacion`.
