# CDANV3-03 - Webhook Payphone

Objetivo: activar planes solo cuando Payphone confirme un pago valido.

Implementar:
- Endpoint webhook Payphone antes del parser JSON si requiere raw body.
- Validacion de referencia, tenant, plan, monto, estado aprobado e idempotencia.
- Auditoria con correlationId, tenant, usuario si existe y transactionId.
- Estado visible en PWA si Payphone no esta configurado.

Prohibido:
- Reemplazar Payphone por Stripe.
- Activar planes desde callback frontend sin confirmacion backend.

Validar:
- Webhook aprobado activa plan.
- Webhook rechazado no activa plan.
- Reenvio del mismo webhook es idempotente.

Cierre:
- Reporte `REPORTE_CDANV3_03_PAYPHONE_WEBHOOK.md`.
- AuditLock firmado.
- Commit `phase: CDANV3-03 task: payphone-webhook`.
