# MSF26-06 - Rutina facturable e idempotente

Objetivo: disparar factura fiscal desde eventos comerciales SKNOMINA.

Instrucciones:

- Requiere aprobacion explicita.
- Aplicar `RULES.md`.
- Identificar evento facturable: pago confirmado, renovacion, activacion pagada o cargo manual aprobado.
- Construir payload fiscal con perfil del cliente, plan, periodo, subtotal, IVA, descuento y forma de pago.
- Usar `Idempotency-Key` y registrar estado.
- Implementar webhook firmado de actualizacion fiscal.
- No activar planes desde estado fiscal; facturacion y cobro deben quedar conciliados pero separados.

Salida esperada:

- Servicio/rutina backend con tests.
- Webhook firmado.
- Reporte `REPORTE_MSF26_06_RUTINA_FACTURACION.md`.
- AuditLock firmado.
