# HNBE26-04 - Motor de calculo de nomina

Fecha: 2026-06-12

## Estado actual

`backend/src/services/calculoNominaService.js` calcula nomina mensual con empleados activos, novedades aprobadas, horas extra, IESS personal, impuesto a la renta, faltas, deducciones y neto.

## Cambios aplicados

- Validacion explicita de periodo de nomina.
- Detalle de calculo ampliado con:
  - Aporte patronal.
  - Provision de decimo tercero.
  - Provision de decimo cuarto.
  - Provision de vacaciones.
  - Provision de fondos de reserva desde el primer anio cumplido.
  - Costo empleador.
- Tests unitarios para fondos de reserva.
- Ruta de reapertura controlada de nomina: `POST /api/nomina/reabrir`, con motivo obligatorio y auditoria.

## Pendientes productivos

- Casos dorados oficiales por escenarios reales.
- Cabecera de periodo de nomina con `idempotency_key`.
- Recalculo con version exacta de parametros legales.
- Bloqueo por novedades pendientes antes del cierre.

