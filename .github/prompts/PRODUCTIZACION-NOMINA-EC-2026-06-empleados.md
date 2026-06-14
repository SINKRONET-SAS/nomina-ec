# PNE26-06 - Empleados, contratos y ficha laboral

Ejecutar solo con aprobacion explicita.

Objetivo: implementar una ficha laboral completa y segura.

Tareas:
- Modelar o ajustar empleado, contrato, departamento, cargo, centro de costo, sueldo, fecha ingreso/salida y estado laboral.
- Validar cedula ecuatoriana.
- Cifrar datos bancarios; mostrar solo cuenta enmascarada.
- Crear CRUD y detalle con documentos, roles, marcaciones, novedades y equipos.
- Registrar auditoria de cambios sensibles.

Validaciones:
- Tests de validacion de cedula y cifrado.
- Tests CRUD por tenant.
- Reporte `docs/REPORTE_PNE26_06_EMPLEADOS.md`.
- AuditLock firmado.

No hacer:
- No guardar cuentas bancarias en texto plano.
