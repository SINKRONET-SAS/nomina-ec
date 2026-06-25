# Reporte CRN26-04 - Motor de lineas de calculo

## Estado

Completado localmente.

## Entregables

- `calculoNominaService` ahora obtiene el `id` de la nomina insertada/actualizada.
- Al recalcular una nomina borrador se regeneran sus `payroll_calculation_lines`.
- Las lineas incluyen concepto, categoria, monto, fuente, fuente legal, centro de costo, unidad y cargo.
- Si una nomina existente no esta en estado `borrador`, no se actualiza ni se regeneran lineas.
- `detalle_calculo` se mantiene para compatibilidad historica.

## Conceptos normalizados

Sueldo, horas extra, bonos, comisiones, fondo de reserva pagado, IESS personal, impuesto a la renta, descuentos por faltas, anticipos, prestamos, IESS patronal, decimos, vacaciones, fondo de reserva IESS y pago neto banco.

## Gate

- `npm.cmd test -- payrollReportService.test.js calculoNominaService.test.js --runInBand`: PASS.
