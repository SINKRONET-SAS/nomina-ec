# HAIKY AIV2-04 - Backend, API y legal Ecuador

Objetivo:
- Confirmar que facturacion electronica se integra con SINKRONET FACTURADOR por API SINKRONIQ-MOBILE.
- No duplicar XML, firma electronica, autorizacion SRI ni RIDE en SKNOMINA.
- Revisar cumplimiento Ecuador 2026 para SRI y LOPDP con fuentes oficiales.
- Mantener establecimientos IESS parametrizables y monetizables por plan.

Gates:
- `npm.cmd --workspace=backend test -- paymentController.test.js fiscalInvoiceService.test.js --runInBand`
- `node scripts/verify-system-contracts.mjs`
- Cualquier recomendacion legal debe estar marcada como tecnica/operativa y sujeta a revision juridica final.
