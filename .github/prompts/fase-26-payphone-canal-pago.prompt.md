# Fase 26 - PayPhone como canal de pago

Actua bajo `RULES.md`.

Objetivo: integrar PayPhone para checkout de planes y add-ons de Nómina-Ec.

Tareas:

- Validar AuditLock de fase 25.
- Revisar referencia `sinkroniq-mobile/backend/src/routes/paymentRoutes.js`, `paymentController.js` y `planPricing.js`.
- Definir variables `PAYPHONE_TOKEN`, `PAYPHONE_STORE_ID`, `PAYPHONE_BASE_URL`, URLs de confirmacion/webhook y modo mock.
- Crear checkout intent backend sin exponer secretos al cliente.
- Manejar centavos, IVA, idempotencia, conciliacion y reintentos.
- Crear pantallas de resultado en PWA y app movil.
- Bloquear modo mock en produccion.

Cierre:

- Tests de payload PayPhone e IVA.
- Tests de webhook idempotente.
- Smoke sandbox documentado sin secretos.
- AuditLock firmado para fase 26.
