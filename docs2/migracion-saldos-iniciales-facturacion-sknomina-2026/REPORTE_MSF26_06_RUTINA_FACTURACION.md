# REPORTE MSF26-06 - Rutina facturable

Fecha: 2026-06-28  
Estado: completed_local

## Backend

- Servicio: `backend/src/services/fiscalInvoiceService.js`.
- Controlador: `backend/src/controllers/fiscalBillingController.js`.
- Pago Payphone: `markTransactionApproved()` dispara `queueInvoiceForApprovedTransaction()`.

## Flujo

1. Payphone aprueba la transaccion.
2. SKNOMINA activa la suscripcion.
3. SKNOMINA registra o actualiza solicitud fiscal idempotente.
4. Si el facturador esta listo, envia payload a SINKRONET FACTURADOR.
5. Guarda estado `invoice_requested`, `invoice_authorized`, `invoice_rejected` o `blocked`.
6. Webhook firmado actualiza referencias: numero, clave de acceso, RIDE/XML si el facturador los devuelve.

## Seguridad operacional

- Una falla fiscal no revierte un pago aprobado.
- El bloqueo fiscal queda visible en PWA.
- Reintentos usan idempotencia `SKNOMINA-{referencia}`.
