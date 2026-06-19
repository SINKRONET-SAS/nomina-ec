# DVN26-04 - Beneficios, cuotas y cierre idempotente

Plan: `HAIKY-DIAGNOSTICO-V2-NOMINA-EC-2026`  
Prioridad: P1.

## Objetivo

Resolver B-06 y reforzar cierre de nomina: cuotas pagadas, prestamos, anticipos, idempotencia, reversa y auditoria.

## Reglas

- No incrementar cuotas dos veces si el cierre se reintenta.
- Toda actualizacion debe tener lote, periodo, usuario y audit log.
- Reapertura o reversa debe estar documentada.

## Entregables

- Servicio de cierre con transaccion.
- Actualizacion de cuotas y estado `pagado`.
- UI de detalle de descuentos y beneficios aplicados.
- Tests de idempotencia.
- Reporte `REPORTE_DVN26_04_BENEFICIOS_CIERRE.md`.

## Gate

Tests backend, build frontend y evidencia de no doble descuento.
