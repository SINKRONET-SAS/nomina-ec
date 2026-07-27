# MSF26-00 — Diagnostico integral monetizacion y gobierno documental

## Objetivo
Diagnostico del proceso de monetizacion, canales de pago, cobro y facturacion. Identificar pendientes para automatizacion completa.

## Entregables
- `docs2/PLAN_HAIKY_MONETIZACION_AUTOMATICA_2026.md` — plan Haiky con hallazgos y fases
- `.github/CODEX_CONTEXT.md` — actualizado con MSF26 como plan actual
- `.github/prompts/MSF26-00` a `MSF26-04` — prompts de fase
- `.vscode/AuditLock.json` — firmado para MSF26-00

## Archivos evaluados
- `backend/src/controllers/paymentController.js` — 1645 lineas, flujo completo PayPhone + transferencia manual
- `backend/src/services/payphoneGatewayService.js` — integracion PayPhone
- `backend/src/services/paymentPricingService.js` — calculo IVA 15%
- `backend/src/services/paymentReferenceService.js` — generador de referencias
- `backend/src/services/planCapabilityService.js` — capabilities por plan
- `backend/src/services/planTrialService.js` — trial y estado runtime
- `backend/src/services/fiscalInvoiceService.js` — emision factura electronica
- `backend/src/services/facturadorClient.js` — cliente SINKRONET FACTURADOR
- `backend/src/services/superadminService.js` — asignacion directa de planes
- `backend/src/controllers/fiscalBillingController.js` — endpoints facturacion
- `backend/src/middleware/planCapability.js` — middleware capabilities
- `backend/src/config/cron-jobs.js` — 5 crons activos, ninguno de billing
- `backend/src/app.js` — rutas de pago y facturacion

## Hallazgos (8)
- M01: No hay cron de renovacion automatica (CRITICA)
- M02: No hay notificacion de vencimiento proximo (ALTA)
- M03: No hay periodo de gracia post-expiracion (MEDIA — decision de negocio)
- M04: No hay reintentos de facturacion fiscal (ALTA)
- M05: queueInvoiceForApprovedTransaction falla silenciosamente (MEDIA)
- M06: No hay historial de transacciones para el tenant (MEDIA)
- M07: No hay validacion coherencia monto vs plan en transferencia manual (MEDIA)
- M08: Stripe declarado pero no implementado (BAJA — documentado)

## Criterio de cierre
- Plan doc generado y completo
- CODEX_CONTEXT.md actualizado
- Phase prompts desplegados
- AuditLock firmado para MSF26-00
