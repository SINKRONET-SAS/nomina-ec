# Reporte CRN26-06 - Reportes contables

## Estado

Completado localmente.

## Entregables

- Nuevo codigo de reporte `PAYROLL_ACCOUNTING_REPORT`.
- Generacion desde lineas normalizadas y mappings vigentes del tenant.
- Asientos por concepto con cuenta debe/haber, empleado, cedula, centro de costo y referencia.
- Validacion fail-closed: si falta mapping requerido o debe/haber no balancea, se lanza error visible.
- Compatibilidad conservada con `PAYROLL_ACCOUNTING_ENTRIES` legacy.

## Exportacion

`PAYROLL_ACCOUNTING_REPORT` se exporta como XLSX/CSV desde `/api/reportes/nomina/exportar`.

## Gate

- Prueba unitaria de balance contable CRN26 con mapping custom: PASS.
- Prueba legacy de asientos balanceados: PASS.
