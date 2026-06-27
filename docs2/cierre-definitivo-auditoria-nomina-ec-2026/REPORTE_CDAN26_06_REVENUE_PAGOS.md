# Reporte CDAN26-06 - Revenue y pagos

## Cierre

El sistema conserva PayPhone como canal real existente y agrega contrato multi-proveedor:

- `PAYMENT_PROVIDER=payphone` mantiene el checkout PayPhone actual.
- `PAYMENT_PROVIDER=stripe` exige `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET`.
- Si Stripe esta declarado, la API bloquea el checkout con mensaje claro porque el backend aun no habilita checkout Stripe.
- La UI de planes ya muestra `blockedReason`, evitando botones de pago falsamente funcionales.

## Archivos principales

- `backend/src/controllers/paymentController.js`
- `render.yaml`
- `frontend-web/src/pages/Planes.jsx`

## Validacion

- `paymentController.test.js`

## Riesgo residual

Implementar Stripe real requiere fase adicional de checkout session, webhook firmado, conciliacion e idempotencia; CDAN26 evita prometer Stripe activo sin esa implementacion.

