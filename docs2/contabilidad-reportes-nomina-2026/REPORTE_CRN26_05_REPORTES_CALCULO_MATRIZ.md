# Reporte CRN26-05 - Reportes de calculo y matriz

## Estado

Completado localmente.

## Entregables

- Nuevo codigo de reporte `PAYROLL_EMPLOYEE_DETAIL`.
- Nuevo codigo de reporte `PAYROLL_BENEFITS_MATRIX`.
- El detalle por empleado exporta una fila por concepto/fuente.
- La matriz genera filas por empleado y columnas dinamicas por conceptos presentes en el periodo.
- La matriz incluye conciliacion contra total ingresos, total deducciones, provisiones, costo empleador y neto.
- Si no existen lineas normalizadas por ser historico, el reporte reconstruye desde `detalle_calculo`.

## Gate

- Pruebas unitarias agregadas para detalle por empleado y matriz conciliada: PASS.
