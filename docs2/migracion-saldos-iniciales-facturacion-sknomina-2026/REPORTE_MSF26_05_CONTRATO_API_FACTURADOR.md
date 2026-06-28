# REPORTE MSF26-05 - Contrato API facturador

Fecha: 2026-06-28  
Estado: completed_local

## Implementacion

- Cliente API: `backend/src/services/facturadorClient.js`.
- Readiness comercial:
  - `SINKRONET_FACTURADOR_BASE_URL`
  - `SINKRONET_FACTURADOR_API_KEY`
  - `SINKRONET_FACTURADOR_INVOICE_PATH`
  - `SINKRONET_FACTURADOR_HEALTH_PATH`
  - `SINKRONET_FACTURADOR_WEBHOOK_SECRET`
- No se guardan secretos ni URLs privadas en repo.

## Reglas

- Emision fiscal falla cerrada si falta URL o credencial server-to-server.
- Timeout controlado por `SINKRONET_FACTURADOR_TIMEOUT_MS`.
- Cabeceras enviadas: `X-Api-Key`, `Idempotency-Key`, `X-Correlation-Id`.
- El webhook exige firma HMAC SHA-256 y usa cuerpo crudo de Express cuando esta disponible.

## Resultado

SKNOMINA queda integrado por contrato API y mantiene SINKRONET FACTURADOR como fuente fiscal.
