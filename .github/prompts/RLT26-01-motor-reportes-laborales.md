# RLT26-01 — motor anual y catálogo

## Objetivo

Agregar al motor central los reportes anuales `LABORAL_DECIMO_TERCERO`, `LABORAL_DECIMO_CUARTO`, `LABORAL_PARTICIPACION_UTILIDADES`, `LABORAL_SALARIO_DIGNO` y `LABORAL_BENEFICIOS_ACUMULADOS`.

## Requisitos

- Reutilizar `getPayrollRows` para no crear una segunda fuente de datos.
- Agregar filas por empleado para todo el ejercicio y conservar filtros por empleado, departamento, cargo y centro de costo.
- Incluir columnas específicas y hoja `Auditoria` con parámetros, fórmula, referencia, advertencia preparatoria y correlation ID.
- Mantener RBAC/capability y compatibilidad del endpoint `/api/reportes/nomina/:anio/consolidado`.
- No hacer cambios de esquema si no son imprescindibles.
- Mantener en la parametrización contable el momento económico (`provision_mensual`, `pago_rol`, `pago_anticipo`, `descuento_rol`) y exponerlo en las líneas/asientos.

## Validación

`node --check`, pruebas unitarias del servicio y al menos una prueba de contrato del endpoint anual.
