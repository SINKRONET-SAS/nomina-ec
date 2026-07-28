# BPR26-02 — API, contabilidad y descargas

## Autorización

Ejecutar esta fase después de BPR26-01 firmado.

## Instrucciones

1. Exponer una única API de roles de beneficios para listar, crear borrador, aprobar, cerrar y descargar.
2. Incluir vista tabular XLSX y rol PDF con auditoría y desglose por empleado.
3. Clasificar líneas con `provision_mensual`, `ajuste_provision_beneficio` y `pago_rol`.
4. Reutilizar el catálogo contable existente y agregar conceptos explícitos sin duplicar la lógica de nómina mensual.
5. No declarar completado un pago si la fuente legal o los parámetros requeridos están incompletos.

## Salida obligatoria

Pruebas de contrato/servicio, sintaxis y AuditLock actualizado a `BPR26-02`.
