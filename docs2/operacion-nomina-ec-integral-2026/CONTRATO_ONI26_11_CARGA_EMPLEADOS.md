# Contrato ONI26-11 - Carga Masiva de Empleados

## Alcance

Definir plantilla y flujo de carga masiva de empleados con prevalidacion, confirmacion, importacion, reporte de errores y rollback.

## Reglas

- Ninguna fila se importa si existen errores P0.
- La prevalidacion produce reporte tabular.
- La confirmacion del usuario es obligatoria.
- Cada importacion genera `importBatchId`.
- El rollback conserva auditoria.
