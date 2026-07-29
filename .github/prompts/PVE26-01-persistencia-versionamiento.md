# PVE26-01 — Persistencia inmutable

Lee `RULES.md`, el Plan Haiky PVE26 y `CODEX_CONTEXT.md`. La salida debe ser para usuarios de nómina ecuatoriana, no para acceso directo a la base de datos.

## Tareas

1. Crear migración reversible para metadatos de versión: número, motivo y relación con la versión reemplazada/restaurada.
2. Mantener la fila histórica inmutable. Cerrar la vigente e insertar una nueva en la misma operación transaccional.
3. Validar `valid_from`, alcance tenant/global, estados de validación y compatibilidad con el loader de valores obligatorios.
4. Conservar snapshots de nóminas y asientos cerrados; nunca recalcularlos por modificar una parametrización.
5. Agregar pruebas de creación, edición, cierre, restauración y bloqueo de inconsistencias.

## Salida y puerta de fase

Migración, servicio y pruebas pasan. El SQL debe incluir instrucciones claras de rollback sin borrar versiones. Firmar `PVE26-01` en AuditLock antes de tocar la API.
