# E2E26-03 - Empleados y ficha operativa

Actua bajo `RULES.md`.

Objetivo: separar ficha preliminar de empleado operativo y auditar cambios laborales sensibles.

Tareas:

- Validar AuditLock E2E26-02.
- Revisar modelo Employee, controladores, importacion, terminacion, contrato y cuenta bancaria.
- Resolver politica de cedula global vs cedula por tenant con migracion compatible si aplica.
- Eliminar fallback inseguro de clave bancaria en ambientes no demo.
- Registrar auditoria para sueldo, jornada, contrato, unidad, zona, fecha ingreso y banco.
- Exponer estado de ficha/documento en PWA.

Cierre:

- Solo empleados operativos participan en nomina/asistencia.
- Cambios sensibles quedan auditados.
- AuditLock firmado para E2E26-03.
- Commit esperado: `phase: E2E26-03 task: empleado operativo auditoria`.
