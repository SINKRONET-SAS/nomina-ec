# CDANV5-01 - Legal EC y PayPhone

Objetivo: validar SBU 482, IESS 9.45 y PayPhone por Confirmation API.

Checks:
- `backend/src/config/legal-ecuador.js` no contiene SBU runtime 470/509 para 2026.
- `payphoneGatewayService` llama `/api/button/V2/Confirm`.
- No inventar header `x-payphone-signature`.
