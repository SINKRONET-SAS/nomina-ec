# AIV75-26-01 — Contrato y pruebas del reintento fiscal

Requiere aprobación explícita y `AIV75-26-00` firmado.

Trabaja sobre `backend/src/services/fiscalInvoiceService.js` y pruebas enfocadas. Reutiliza `retryPendingInvoices`; no copies las APIs asumidas por `v75data.jsx`.

Prueba elegibilidad de estados, máximo de intentos, backoff, límite por corrida, tenant, idempotencia y continuidad cuando una factura falla. Todo error debe incluir `code`, `statusCode`, `correlationId` y `userId` cuando exista. No cambies contratos públicos ni despliegue en esta fase.

Cierra con suite enfocada, `node --check`, archivos modificados y AuditLock firmado.
