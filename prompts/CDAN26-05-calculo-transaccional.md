# CDAN26-05 - Calculo mensual transaccional

Cerrar `BUG-NEC-01`: asegurar que `calcularMes()` no actualice `payroll_periods` fuera de la transaccion del calculo.

Requisitos:
- Calculo, roles, totales y estado del periodo se confirman o revierten juntos.
- Idempotencia de reintento.
- Estado de fallo visible.
- Prueba de fallo parcial.
- AuditLock firmado.

