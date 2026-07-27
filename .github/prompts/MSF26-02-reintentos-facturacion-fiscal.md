# MSF26-02 — Reintentos de facturacion fiscal automaticos

## Objetivo
Implementar cron job que reintente emision de facturas fiscales que quedaron en estado `blocked` o `invoice_rejected` con menos de 5 intentos.

## Hallazgos que resuelve
- M04: No hay reintentos de facturacion fiscal (ALTA)
- M05: queueInvoiceForApprovedTransaction falla silenciosamente (MEDIA)

## Archivos a modificar
- `backend/src/config/cron-jobs.js` — agregar cron de reintentos
- `backend/src/services/fiscalInvoiceService.js` — agregar `retryPendingInvoices()`

## Especificacion tecnica

### Cron: Reintento de facturas fiscales
- Schedule: `0 10 * * 1-5` (diario 10am Ecuador, lun-vie)
- Query: `fiscal_invoice_requests` con `status IN ('blocked', 'invoice_rejected') AND attempts < 5 AND payment_transaction_id IS NOT NULL`
- Accion: para cada registro, llamar `requestInvoiceForTransaction` con los datos existentes
- Incrementar `attempts` en cada intento
- Log: `CRON_FISCAL_INVOICE_RETRY` con tenantId, externalReference, attempt, resultado
- Backoff: no reintentar si `updated_at` fue hace menos de 1 hora (evitar flood)

### Modificacion a fiscalInvoiceService
- Agregar funcion `retryPendingInvoices()` que encapsule la query y el loop
- Exportar la funcion para que cron-jobs la invoque

## Criterio de cierre
- Cron registrado en `cron-jobs.js`
- Funcion `retryPendingInvoices` implementada y exportada
- `node --check` PASS para archivos modificados
- Test existente de `fiscalInvoiceService` no regresiona
