# CDAN26-06 - Revenue y pagos

Cerrar `MON-NEC-01`: implementar Stripe o proveedor aprobado, o bloquear productivamente el pago con mensaje claro si faltan credenciales.

Requisitos:
- Checkout real/sandbox segun entorno.
- Webhook con firma, idempotencia y conciliacion.
- Estados de suscripcion visibles.
- No activar plan sin pago confirmado.
- AuditLock firmado.

