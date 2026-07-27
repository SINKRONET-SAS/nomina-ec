# Plan Haiky - HAIKY-MONETIZACION-AUTOMATICA-2026

| Campo | Valor |
|---|---|
| Plan | `HAIKY-MONETIZACION-AUTOMATICA-2026` |
| Codigo | `MSF26` |
| Fecha diagnostico | `2026-07-27` |
| Superficie | BACKEND (paymentController, fiscalInvoiceService, cron-jobs), FRONTEND-WEB (Superadmin, historial) |
| Estado | `MSF26-00 diagnostico completado` |
| Base AuditLock | `RFI26` firma `898FF1C11BF8BB4892E8ACD84722EA5198139A18F62BAB07B93A28F4FCC44B97` |

---

## 1. Contexto

Diagnostico integral del proceso de monetizacion, canales de pago, cobro y facturacion para identificar pendientes que impiden que el ciclo sea completamente automatico.

### Componentes evaluados

| Componente | Archivo(s) principal(es) | Estado |
|---|---|---|
| PayPhone Gateway | `payphoneGatewayService.js` | Funcional |
| Transferencia bancaria manual | `paymentController.js` (MANUAL_BANK_PROVIDER) | Funcional |
| Plan/Suscripcion | `planCapabilityService.js`, `planTrialService.js` | Funcional |
| Facturacion fiscal | `fiscalInvoiceService.js`, `facturadorClient.js` | Funcional (sin reintentos) |
| Cron jobs | `cron-jobs.js` | 5 crons activos, ninguno de billing |
| Superadmin | `superadminService.js`, `superadminController.js` | Funcional |
| Stripe | `paymentController.js` (buildPaymentCapabilities) | Declarado, no implementado |

### Flujo actual de pago

1. Owner selecciona plan → `createCheckoutIntent` → PayPhone Prepare API → checkout URL
2. PayPhone callback/webhook → `confirmPayment` / `payphoneWebhook` → `markTransactionApproved`
3. `markTransactionApproved` → `activateSubscriptionForTransaction` → UPSERT suscripcion `active`
4. `markTransactionApproved` → `queueInvoiceForApprovedTransaction` → SINKRONET FACTURADOR (fire-and-forget)

### Flujo alternativo (transferencia bancaria)

1. Superadmin registra transferencia → estado `PENDING_REVIEW`
2. Superadmin confirma → estado `CONFIRMED`
3. Superadmin aplica → `markTransactionApproved` → activa plan + factura

---

## 2. Hallazgos del diagnostico

### 2.1 Renovacion y ciclo de vida

| # | Hallazgo | Severidad | Detalle |
|---|---|---|---|
| M01 | No hay cron de renovacion automatica | CRITICA | `renovacion_automatica` existe en DB pero ningun cron la procesa. Suscripciones expiran sin accion. |
| M02 | No hay notificacion de vencimiento proximo | ALTA | Ningun mecanismo avisa al owner que su suscripcion esta por vencer (7d, 3d, 1d antes). |
| M03 | No hay periodo de gracia post-expiracion | MEDIA | `resolveSubscriptionRuntimeState` retorna `expired` inmediatamente al vencer. Sin gracia de dias. |

### 2.2 Facturacion fiscal

| # | Hallazgo | Severidad | Detalle |
|---|---|---|---|
| M04 | No hay reintentos de facturacion fiscal | ALTA | Si SINKRONET FACTURADOR esta caido al momento del pago, la factura queda `blocked` o `invoice_rejected` sin reintento. |
| M05 | `queueInvoiceForApprovedTransaction` falla silenciosamente | MEDIA | Catch retorna `null`, solo loguea. No hay reconciliacion posterior. |

### 2.3 Visibilidad para el tenant

| # | Hallazgo | Severidad | Detalle |
|---|---|---|---|
| M06 | No hay historial de transacciones para el tenant | MEDIA | `/api/pagos/status` solo muestra suscripcion actual. El owner no puede ver sus pagos anteriores. |
| M07 | No hay validacion coherencia monto vs plan en transferencia manual | MEDIA | Superadmin puede registrar $1 para un plan de $50/mes sin advertencia. |

### 2.4 Declaraciones no funcionales

| # | Hallazgo | Severidad | Detalle |
|---|---|---|---|
| M08 | Stripe declarado en capabilities pero no implementado | BAJA | `buildPaymentCapabilities` retorna Stripe como `blocked_configuration`. Confunde diagnostico. |

---

## 3. Decisiones

- M01: Crear cron `subscription-renewal` que procese suscripciones con `renovacion_automatica = true` y `vence_en` inminente.
- M02: Crear cron `subscription-expiry-notify` que envie email al owner 7 dias antes de vencimiento.
- M03: Documentado; no implementado en esta fase (requiere decision de negocio sobre dias de gracia).
- M04: Crear cron `fiscal-invoice-retry` que reintente facturas `blocked` o `invoice_rejected` con `attempts < 5`.
- M05: Se corrige con M04 (el cron de reintentos cubre facturas fallidas).
- M06: Crear endpoint `/api/pagos/historial` y exponerlo en frontend.
- M07: Agregar advertencia en `createManualBankTransfer` cuando monto difiere >20% del precio del plan.
- M08: Documentado; no se remueve de capabilities (futuro uso planificado).

---

## 4. Fases

| Fase | Objetivo |
|---|---|
| MSF26-00 | Diagnostico integral, gobierno y despliegue documental Haiky |
| MSF26-01 | Cron de renovacion automatica y notificacion de vencimiento proximo |
| MSF26-02 | Cron de reintentos de facturacion fiscal automaticos |
| MSF26-03 | Historial de pagos para tenant y validacion coherencia monto-plan |
| MSF26-04 | QA, regresion y cierre AuditLock |
