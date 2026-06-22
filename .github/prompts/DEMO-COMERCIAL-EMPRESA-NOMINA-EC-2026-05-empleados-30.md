# DCEN26-05 - 30 empleados ficticios completos

Actua bajo `RULES.md`.

Objetivo: crear 30 empleados ficticios con fichas completas para presentacion comercial.

Tareas:

- Validar AuditLock DCEN26-04.
- Generar 30 empleados con ingreso entre 2015 y 2026.
- Completar fecha de nacimiento, cedula ficticia valida, domicilio, provincia/ciudad, cargo, unidad, zona, jornada, region de decimo cuarto, pago y contrato demo.
- Distribuir empleados entre Quito y Guayaquil.

Cierre:

- Lista y ficha de empleados muestran datos completos.
- Seed idempotente y rollback seguro.
- AuditLock firmado para DCEN26-05.
- Commit esperado: `phase: DCEN26-05 task: empleados demo`.
