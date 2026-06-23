# CRS26-03 - Backend CRUD y validaciones

Actua bajo `RULES.md`.

Objetivo: exponer servicios backend para administrar cargos y validar consumo seguro.

Tareas:

- Validar AuditLock CRS26-02.
- Implementar CRUD de cargos con tenant obligatorio.
- Validar unidad organizativa activa del mismo tenant.
- Validar rango salarial, vigencia y estado.
- Bloquear eliminacion si hay consumos en empleados, nominas, novedades, documentos, importaciones o historico.
- Auditar crear, editar, inactivar y eliminar.
- Agregar pruebas de servicio/controlador.

Cierre:

- Tests backend pasan.
- Errores devuelven `code`, `statusCode` y mensaje en espanol.
- Commit esperado: `phase: CRS26-03 task: backend cargos validaciones`.
