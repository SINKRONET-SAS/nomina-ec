# CDANV2-05 - Cierre mensual idempotente

Objetivo: cerrar `BUG-V2-03`.

Requisitos:
- Revisar estado actual de `cerrarMes()`.
- Aplicar bloqueo transaccional o update condicional atomico.
- Evitar doble cierre, doble notificacion y doble auditoria.
- Responder idempotentemente si el periodo ya esta cerrado.
- Prueba concurrente o simulacion de doble request.
- Mantener compatibilidad con reapertura controlada existente.
