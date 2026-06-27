# Reporte CDANV2-06 - Revenue y pagos

Fecha: 2026-06-27.

Resultado: cerrado por evidencia previa.

## Evidencia

- `backend/src/controllers/paymentController.js` detecta `PAYMENT_PROVIDER=stripe` y lo bloquea si faltan `STRIPE_SECRET_KEY` o `STRIPE_WEBHOOK_SECRET`.
- Si Stripe esta declarado pero no implementado, el backend devuelve `checkoutAvailable: false` y `blockedReason` visible.
- PayPhone permanece como canal real con `payphoneGatewayService`, checkout y confirmacion.
- La generacion de archivo bancario no esta mezclada con reportes de entidades; vive como flujo de pagos bancarios con seleccion de banco.

## Decision

No se habilita Stripe parcial. El cierre valido es bloqueo comercial visible y PayPhone preservado.

