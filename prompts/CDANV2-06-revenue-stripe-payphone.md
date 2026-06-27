# CDANV2-06 - Revenue Stripe o bloqueo visible

Objetivo: cerrar `MON-V2-01`.

Requisitos:
- Preservar PayPhone como proveedor real existente.
- Si `PAYMENT_PROVIDER=stripe`, habilitar solo con webhook firmado e idempotente.
- Si Stripe no esta completo, bloquear con mensaje claro en API y PWA.
- No activar planes sin conciliacion del proveedor.
- Tests de webhook o tests de bloqueo.
- Documentar variables en runbook sin secretos.
